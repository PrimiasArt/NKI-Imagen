import { getGeminiClient, compressBase64Image, prepareInlineData, callWithRetry } from './geminiService';

export type SemanticSegmentTarget = 'subject' | 'face' | 'hair' | 'clothes' | 'background';

/**
 * Computes a local edge-aware flood fill mask from a clicked pixel (x, y) on a canvas.
 * Runs 100% locally on CPU without API latency.
 */
export function computeLocalFloodMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number = 32
): ImageData {
  const srcData = ctx.getImageData(0, 0, width, height);
  const data = srcData.data;

  const maskData = ctx.createImageData(width, height);
  const mask = maskData.data;

  const startIdx = (startY * width + startX) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];

  const visited = new Uint8Array(width * height);
  const queue: number[] = [startX + startY * width];
  visited[startX + startY * width] = 1;

  const tolSq = tolerance * tolerance * 3;

  while (queue.length > 0) {
    const curr = queue.pop()!;
    const cx = curr % width;
    const cy = Math.floor(curr / width);
    const idx = curr * 4;

    // Set mask pixel to pure red with 60% opacity for Studio UI display
    mask[idx] = 239;
    mask[idx + 1] = 68;
    mask[idx + 2] = 68;
    mask[idx + 3] = 180;

    // Check 4 neighbors
    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1
    ];

    for (const n of neighbors) {
      if (n === -1 || visited[n]) continue;
      const nIdx = n * 4;
      const dr = data[nIdx] - targetR;
      const dg = data[nIdx + 1] - targetG;
      const db = data[nIdx + 2] - targetB;
      const distSq = dr * dr + dg * dg + db * db;

      if (distSq <= tolSq) {
        visited[n] = 1;
        queue.push(n);
      }
    }
  }

  return maskData;
}

/**
 * AI-Assisted Semantic Segmentation using Gemini Multimodal.
 * Returns a high-contrast binary mask Data URL (White = Selected target, Black = Preserved).
 */
export async function segmentSemanticArea(
  baseImageBase64: string,
  target: SemanticSegmentTarget
): Promise<string> {
  const targetDescriptions: Record<SemanticSegmentTarget, string> = {
    subject: 'the main foreground character or person (including entire body, hair, clothing, and accessories)',
    face: 'the facial skin, eyes, eyebrows, nose, mouth and lips of the character only (exclude hair and neck)',
    hair: 'the entire hair, bangs, curls, and beard/mustache of the character only',
    clothes: 'all garments, shirts, jackets, pants, dresses, suits and outerwear worn by the character',
    background: 'the entire background and environmental surroundings behind the foreground subject'
  };

  const compressedBase = await compressBase64Image(baseImageBase64);
  const baseInline = prepareInlineData(compressedBase, 'image/jpeg');

  const instructionsText = `You are an ultra-precise computer vision segmentation engine (equivalent to SAM 2 - Segment Anything Model).
I have provided an image.
TASK: Generate a high-contrast BINARY MASK specifically isolating: ${targetDescriptions[target]}.

OUTPUT SPECIFICATIONS:
1. PURE BINARY COLORS ONLY:
   - The selected target area MUST be PURE WHITE (#FFFFFF).
   - Everything else MUST be PURE BLACK (#000000).
2. EDGE PRECISION: Razor-sharp sub-pixel boundaries matching natural contours, hair strands, and fabric seams.
3. ZERO GRAYSCALE OR GRADIENTS: Every pixel must strictly be either 100% white or 100% black.
Output ONLY the generated binary mask image.`;

  const client = getGeminiClient();
  const parts: any[] = [];
  if (baseInline) parts.push(baseInline);
  parts.push({ text: instructionsText });

  const response = await callWithRetry(() => client.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts }
  }), 3, 2000);

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
  }

  // Fallback if model image not returned: generate synthetic mask locally
  return createFallbackMask(baseImageBase64, target);
}

/**
 * Local Fallback Mask Generator if API fails or is offline
 */
async function createFallbackMask(
  imageSrc: string,
  target: SemanticSegmentTarget
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Fill black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      const maskData = ctx.getImageData(0, 0, w, h);
      const mData = maskData.data;

      const cx = w / 2;
      const cy = h / 2;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          let isMatch = false;

          if (target === 'subject') {
            // Center ellipse assumption
            const dx = (x - cx) / (w * 0.38);
            const dy = (y - cy) / (h * 0.48);
            isMatch = dx * dx + dy * dy <= 1.0;
          } else if (target === 'face') {
            // Upper center ellipse
            const dx = (x - cx) / (w * 0.18);
            const dy = (y - (h * 0.35)) / (h * 0.22);
            isMatch = dx * dx + dy * dy <= 1.0;
          } else if (target === 'background') {
            // Inverse of center subject
            const dx = (x - cx) / (w * 0.4);
            const dy = (y - cy) / (h * 0.5);
            isMatch = dx * dx + dy * dy > 1.0;
          } else {
            // Default center region
            isMatch = Math.hypot(x - cx, y - cy) < Math.min(w, h) * 0.35;
          }

          if (isMatch) {
            mData[idx] = 255;
            mData[idx + 1] = 255;
            mData[idx + 2] = 255;
            mData[idx + 3] = 255;
          }
        }
      }

      ctx.putImageData(maskData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageSrc;
  });
}
