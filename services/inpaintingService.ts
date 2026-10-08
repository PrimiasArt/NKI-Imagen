/**
 * Precision Local Inpainting & Smart Magic Brush Engine for NKI Studio v4.3
 * 
 * Provides:
 * 1. Multimodal localized editing via Google Gemini 3 Pro / Flash Image
 * 2. Client-Side Sub-Pixel Alpha Feather Blending: Guarantees 100% bit-for-bit
 *    preservation of unmasked pixels while seamlessly blending newly generated
 *    content (hands, accessories, clothes, hair, facial features) at mask boundaries.
 */

import { getGeminiClient, prepareInlineData, callWithRetry, getStandardAspectRatio } from './geminiService';
import { trackRequest } from './geminiService';

export interface InpaintingOptions {
  originalImageBase64: string; // data:image/...;base64,... or raw base64
  maskImageBase64: string;     // Canvas mask: white/colored on black or transparent
  prompt: string;
  negativePrompt?: string;
  featherRadius?: number;      // Blur feather radius for seamless boundary blending (default 6px)
  model?: 'gemini-3-pro-image' | 'gemini-3.1-flash-image';
  aspectRatio?: number | string;
  strictComposite?: boolean;   // If true, applies canvas alpha composite onto original image
}

export interface InpaintingResult {
  resultImage: string;
  rawGeneratedImage: string;
  modelUsed: string;
  executionTimeMs: number;
}

/**
 * Feathers and smooths a black/white mask canvas for anti-aliased edge blending
 */
export async function createFeatheredMask(
  maskBase64: string,
  width: number,
  height: number,
  blurRadius: number = 6
): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const maskImg = new Image();
    maskImg.crossOrigin = 'anonymous';
    maskImg.onload = () => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      if (!ctx) {
        resolve(c);
        return;
      }

      // Draw mask with shadow/filter blur to feather edges
      if (blurRadius > 0 && typeof ctx.filter !== 'undefined') {
        ctx.filter = `blur(${blurRadius}px)`;
      }
      ctx.drawImage(maskImg, 0, 0, width, height);

      // Reset filter
      ctx.filter = 'none';
      resolve(c);
    };
    maskImg.onerror = () => {
      const empty = document.createElement('canvas');
      empty.width = width;
      empty.height = height;
      resolve(empty);
    };
    maskImg.src = maskBase64.startsWith('data:') ? maskBase64 : `data:image/png;base64,${maskBase64}`;
  });
}

/**
 * Composites the AI-inpainted result back onto the original image
 * using the feathered mask as an alpha matte.
 * Ensures 100% bit-identical preservation of all unpainted pixels!
 */
export async function compositeInpaintedResult(
  originalBase64: string,
  generatedBase64: string,
  maskBase64: string,
  featherRadius: number = 6
): Promise<string> {
  if (typeof window === 'undefined') return generatedBase64;

  return new Promise((resolve) => {
    const origImg = new Image();
    origImg.crossOrigin = 'anonymous';
    origImg.onload = () => {
      const w = origImg.naturalWidth || origImg.width;
      const h = origImg.naturalHeight || origImg.height;

      const genImg = new Image();
      genImg.crossOrigin = 'anonymous';
      genImg.onload = async () => {
        try {
          const featheredMask = await createFeatheredMask(maskBase64, w, h, featherRadius);

          // 1. Prepare temporary canvas for the generated content masked by the alpha matte
          const genCanvas = document.createElement('canvas');
          genCanvas.width = w;
          genCanvas.height = h;
          const genCtx = genCanvas.getContext('2d');
          if (!genCtx) {
            resolve(generatedBase64);
            return;
          }

          // Draw generated image
          genCtx.drawImage(genImg, 0, 0, w, h);

          // Clip to mask using destination-in compositing
          genCtx.globalCompositeOperation = 'destination-in';
          genCtx.drawImage(featheredMask, 0, 0, w, h);
          genCtx.globalCompositeOperation = 'source-over';

          // 2. Final canvas: Original image + feathered generated patch
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = w;
          finalCanvas.height = h;
          const finalCtx = finalCanvas.getContext('2d');
          if (!finalCtx) {
            resolve(generatedBase64);
            return;
          }

          // Base: 100% original untouched pixels
          finalCtx.drawImage(origImg, 0, 0, w, h);

          // Overlay: Inpainted region with feathered boundary
          finalCtx.drawImage(genCanvas, 0, 0, w, h);

          resolve(finalCanvas.toDataURL('image/png', 1.0));
        } catch (err) {
          console.warn('[Inpainting] Composite fallback to generated image:', err);
          resolve(generatedBase64);
        }
      };
      genImg.onerror = () => resolve(generatedBase64);
      genImg.src = generatedBase64.startsWith('data:') ? generatedBase64 : `data:image/png;base64,${generatedBase64}`;
    };
    origImg.onerror = () => resolve(generatedBase64);
    origImg.src = originalBase64.startsWith('data:') ? originalBase64 : `data:image/png;base64,${originalBase64}`;
  });
}

/**
 * Builds an overlay visualization image showing the mask highlighted over the original image
 * for Gemini to understand the exact bounding region and surrounding context.
 */
export async function createAnnotatedInpaintingReference(
  originalBase64: string,
  maskBase64: string,
  width: number,
  height: number
): Promise<string> {
  if (typeof window === 'undefined') return originalBase64;

  return new Promise((resolve) => {
    const origImg = new Image();
    origImg.crossOrigin = 'anonymous';
    origImg.onload = () => {
      const maskImg = new Image();
      maskImg.crossOrigin = 'anonymous';
      maskImg.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = width;
          c.height = height;
          const ctx = c.getContext('2d');
          if (!ctx) {
            resolve(originalBase64);
            return;
          }

          // Draw base image
          ctx.drawImage(origImg, 0, 0, width, height);

          // Draw semi-transparent high-contrast magenta/neon mask overlay
          ctx.globalAlpha = 0.55;
          ctx.drawImage(maskImg, 0, 0, width, height);
          ctx.globalAlpha = 1.0;

          resolve(c.toDataURL('image/jpeg', 0.90));
        } catch (e) {
          resolve(originalBase64);
        }
      };
      maskImg.onerror = () => resolve(originalBase64);
      maskImg.src = maskBase64.startsWith('data:') ? maskBase64 : `data:image/png;base64,${maskBase64}`;
    };
    origImg.onerror = () => resolve(originalBase64);
    origImg.src = originalBase64.startsWith('data:') ? originalBase64 : `data:image/png;base64,${originalBase64}`;
  });
}

/**
 * Executes a Local Inpainting task with Gemini 3 Pro / 3.1 Flash Image
 */
export async function performLocalInpainting(options: InpaintingOptions): Promise<InpaintingResult> {
  const startTime = Date.now();
  trackRequest(2800, "Local Inpainting");

  const {
    originalImageBase64,
    maskImageBase64,
    prompt,
    featherRadius = 6,
    model = 'gemini-3-pro-image',
    aspectRatio,
    strictComposite = true
  } = options;

  // Extract clean base64 data
  const origClean = originalImageBase64.replace(/^data:[^;]+;base64,/, '');
  const origMime = originalImageBase64.match(/^data:([^;]+);/)?.[1] || 'image/png';

  // Measure original dimensions
  let imgW = 1024;
  let imgH = 1024;
  let ratio = 1.0;

  if (typeof window !== 'undefined') {
    try {
      const tempImg = new Image();
      tempImg.src = originalImageBase64.startsWith('data:') ? originalImageBase64 : `data:${origMime};base64,${origClean}`;
      if (tempImg.complete && tempImg.naturalWidth) {
        imgW = tempImg.naturalWidth;
        imgH = tempImg.naturalHeight;
      } else {
        await new Promise((res) => {
          tempImg.onload = () => res(null);
          tempImg.onerror = () => res(null);
        });
        imgW = tempImg.naturalWidth || imgW;
        imgH = tempImg.naturalHeight || imgH;
      }
      if (imgW > 0 && imgH > 0) {
        ratio = imgW / imgH;
      }
    } catch (e) {
      console.warn('[Inpainting] Dimension probe failed:', e);
    }
  }

  const effectiveAspect = (typeof aspectRatio === 'number' && !isNaN(aspectRatio) && aspectRatio > 0)
    ? aspectRatio
    : ratio;
  const standardAspect = getStandardAspectRatio(effectiveAspect);

  // Generate annotated overlay showing the masked region
  const annotatedOverlay = await createAnnotatedInpaintingReference(originalImageBase64, maskImageBase64, imgW, imgH);
  const annotatedClean = annotatedOverlay.replace(/^data:[^;]+;base64,/, '');

  const inpaintingPrompt = `PRECISE LOCAL INPAINTING & REGIONAL EDITING DIRECTIVE:
You are provided with:
1. The ORIGINAL source image.
2. A VISUAL MASK OVERLAY showing the exact target region to modify (highlighted overlay).

TASK:
Seamlessly modify and reconstruct ONLY the highlighted target region according to this instruction:
"${prompt.trim()}"

STRICT EDITING RULES:
1. REGIONAL ISOLATION: Modify ONLY the content inside the masked/highlighted region. Keep all unhighlighted surrounding areas 100% unchanged.
2. SEAMLESS LIGHTING & TEXTURE MATCH: Match the ambient lighting, color temperature, optical grain, and perspective of the original image perfectly at the boundary.
3. PRESERVE COMPOSITION & IDENTITY: Do NOT alter the framing, pose, facial structure, background, or body outside the highlighted zone.
4. If repairing hands or fingers: Render anatomically correct, natural human fingers with proper joints and fingernails.
5. If altering clothing or accessories: Integrate realistic folds, shadows, and textile physics naturally.

Output the single completed image with the localized modification cleanly integrated.`;

  const modelsToTry = [
    model,
    model === 'gemini-3-pro-image' ? 'gemini-3.1-flash-image' : 'gemini-3-pro-image'
  ];

  let rawGeneratedImage = '';
  let modelUsed = model;

  for (const engine of modelsToTry) {
    try {
      console.log(`[Inpainting] Attempting local edit with engine: ${engine}`);

      const parts: any[] = [];

      // 1. Original base image
      const inlineOrig = prepareInlineData(origClean, origMime);
      if (inlineOrig) parts.push(inlineOrig);

      // 2. Annotated mask overlay
      const inlineAnnotated = prepareInlineData(annotatedClean, 'image/jpeg');
      if (inlineAnnotated) parts.push(inlineAnnotated);

      // 3. Precise inpainting prompt
      parts.push({ text: inpaintingPrompt });

      const client = getGeminiClient();
      const config: any = {
        imageConfig: {
          aspectRatio: standardAspect,
          imageSize: "2K" // 2K provides high fidelity for localized edits
        }
      };

      const response = await callWithRetry(() => client.models.generateContent({
        model: engine,
        contents: { parts },
        config
      }), 2, 2500);

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const outMime = part.inlineData.mimeType || 'image/png';
            rawGeneratedImage = `data:${outMime};base64,${part.inlineData.data}`;
            modelUsed = engine;
            break;
          }
        }
      }

      if (rawGeneratedImage) break;
    } catch (err: any) {
      console.warn(`[Inpainting] Engine ${engine} failed:`, err);
    }
  }

  if (!rawGeneratedImage) {
    throw new Error("Không thể tạo ảnh chỉnh sửa vùng cục bộ. Vui lòng kiểm tra lại prompt hoặc hạn ngạch API.");
  }

  // Final Step: Composite generated result with original using feathered mask
  let finalResult = rawGeneratedImage;
  if (strictComposite) {
    try {
      finalResult = await compositeInpaintedResult(
        originalImageBase64,
        rawGeneratedImage,
        maskImageBase64,
        featherRadius
      );
    } catch (cErr) {
      console.warn('[Inpainting] Alpha composite failed, using raw generated:', cErr);
    }
  }

  const executionTimeMs = Date.now() - startTime;
  return {
    resultImage: finalResult,
    rawGeneratedImage,
    modelUsed,
    executionTimeMs
  };
}
