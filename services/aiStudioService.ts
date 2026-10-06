/**
 * AI Photo Studio Service for NKI Imagen
 * 
 * STRICT CONSTRAINT: This service is ONLY called on-demand when the user explicitly triggers:
 * 1. Generative Fill (Text-guided inpainting on masked region)
 * 2. Magic Eraser (Content-aware object removal on masked region)
 * 3. Magic Expand (Outpainting canvas extension)
 * 4. Background Replacement
 * 
 * All sliders, color adjustments, crop, layers, and masks run 100% locally with 0 API tokens.
 */

import {
  getGeminiClient,
  compressBase64Image,
  prepareInlineData,
  callWithRetry,
  trackRequest
} from './geminiService';

export interface AiStudioGenerationOptions {
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
}

/**
 * Executes Generative Fill (Inpainting) using Gemini Multimodal.
 * Replaces the region covered by white mask pixels according to the user's prompt.
 */
export const runGenerativeFill = async (
  baseImage: string,
  maskDataUrl: string,
  prompt: string,
  options: AiStudioGenerationOptions = {}
): Promise<{ resultImage: string; modelUsed: string }> => {
  trackRequest(2800, "Studio Generative Fill");

  const requestedModel = options.model || 'gemini-3.1-flash-lite-image';
  const modelsToTry = [
    requestedModel,
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  // Compress images to avoid payload / token overflow
  const compressedBase = await compressBase64Image(baseImage);
  const compressedMask = await compressBase64Image(maskDataUrl);

  const baseInline = prepareInlineData(compressedBase, 'image/png');
  const maskInline = prepareInlineData(compressedMask, 'image/png');

  const instructionsText = `You are a world-class professional AI photo retouching and inpainting engine (Photoshop Generative Fill grade).
I have provided two images:
1. ORIGINAL BASE IMAGE.
2. INPAINTING BINARY MASK: Where WHITE (#FFFFFF) pixels represent the EXACT REGION to generate / modify, and BLACK (#000000) pixels represent pixels that MUST BE PRESERVED 100% UNCHANGED.

USER INPAINTING DIRECTIVE:
"${prompt}"

CRITICAL INPAINTING RULES:
1. EDIT ONLY THE WHITE MASK: You must modify ONLY the contents inside the white mask area.
2. SEAMLESS HARMONIZATION: Match the exact camera focal length, optical grain, lighting angles, color palette, reflections, shadow gradients, and depth of field of the surrounding image.
3. PRESERVE UNTOUCHED REGIONS: The unmasked (black mask) portions must remain identical in structure, character likeness, environment, and textures.
4. Clean boundary blending with zero seam lines, no haloing, and no floating artifacts.
Output ONLY the final composite image.`;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const parts: any[] = [];
      if (baseInline) parts.push(baseInline);
      if (maskInline) parts.push(maskInline);
      parts.push({ text: instructionsText });

      const client = getGeminiClient();
      const config: any = {};
      if (options.aspectRatio) {
        config.imageConfig = { aspectRatio: options.aspectRatio };
      }

      const response = await callWithRetry(() => client.models.generateContent({
        model,
        contents: { parts },
        config
      }), 3, 2000);

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === "SAFETY") {
        throw new Error("Generative Fill was blocked by safety filters. Please refine the prompt or mask area.");
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return {
              resultImage: `data:${mime};base64,${part.inlineData.data}`,
              modelUsed: model
            };
          }
        }
      }
    } catch (err: any) {
      console.warn(`Generative fill with model ${model} failed:`, err);
      lastError = err;
      const errStr = typeof err === 'string' ? err : (err?.message || "");
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Generative Fill failed across all available AI engines.");
};

/**
 * Executes Content-Aware Magic Eraser (Object Removal Inpainting).
 * Removes unwanted objects/people in the masked region and seamlessly reconstructs background textures.
 */
export const runMagicEraser = async (
  baseImage: string,
  maskDataUrl: string,
  options: AiStudioGenerationOptions = {}
): Promise<{ resultImage: string; modelUsed: string }> => {
  trackRequest(2800, "Studio Magic Eraser");

  const requestedModel = options.model || 'gemini-3.1-flash-lite-image';
  const modelsToTry = [
    requestedModel,
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const compressedBase = await compressBase64Image(baseImage);
  const compressedMask = await compressBase64Image(maskDataUrl);

  const baseInline = prepareInlineData(compressedBase, 'image/png');
  const maskInline = prepareInlineData(compressedMask, 'image/png');

  const instructionsText = `You are a professional Content-Aware Magic Eraser engine.
I have provided:
1. ORIGINAL PHOTO.
2. REMOVAL MASK: The WHITE (#FFFFFF) region marks the object, person, text, watermark, or element that MUST BE COMPLETELY ERASED. BLACK (#000000) pixels are untouched.

MAGIC ERASER RULES:
1. COMPLETE OBJECT REMOVAL: Erase everything indicated by the white mask entirely.
2. BACKGROUND RECONSTRUCTION: Intelligently reconstruct the natural background behind the erased object (synthesize matching walls, floor tiles, grass, trees, clouds, water, fabric, or depth).
3. MATCH LIGHTING & TEXTURE: The filled area must have identical grain, ambient lighting, color temperature, and perspective as the rest of the image.
4. ZERO REPETITION PATTERNS: Do not create noticeable clone-stamp patterns or unnatural blurs.
Output ONLY the clean retouched image.`;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const parts: any[] = [];
      if (baseInline) parts.push(baseInline);
      if (maskInline) parts.push(maskInline);
      parts.push({ text: instructionsText });

      const client = getGeminiClient();
      const config: any = {};
      if (options.aspectRatio) {
        config.imageConfig = { aspectRatio: options.aspectRatio };
      }

      const response = await callWithRetry(() => client.models.generateContent({
        model,
        contents: { parts },
        config
      }), 3, 2000);

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === "SAFETY") {
        throw new Error("Magic Eraser request was blocked by safety filters. Please adjust the masked area.");
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return {
              resultImage: `data:${mime};base64,${part.inlineData.data}`,
              modelUsed: model
            };
          }
        }
      }
    } catch (err: any) {
      console.warn(`Magic Eraser with model ${model} failed:`, err);
      lastError = err;
      const errStr = typeof err === 'string' ? err : (err?.message || "");
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Magic Eraser failed across all available AI engines.");
};

/**
 * Executes Magic Expand (Outpainting).
 * Expands the canvas of the image to the target aspect ratio seamlessly extending surroundings.
 */
export const runMagicExpand = async (
  baseImage: string,
  targetAspectRatio: string,
  customPrompt?: string,
  options: AiStudioGenerationOptions = {}
): Promise<{ resultImage: string; modelUsed: string }> => {
  trackRequest(2800, "Studio Magic Expand");

  const requestedModel = options.model || 'gemini-3.1-flash-lite-image';
  const modelsToTry = [
    requestedModel,
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const compressedBase = await compressBase64Image(baseImage);
  const baseInline = prepareInlineData(compressedBase, 'image/png');

  const userContext = customPrompt ? `Additional environmental cues: ${customPrompt}.` : "";

  const instructionsText = `You are an expert AI Outpainting and Canvas Extension engine.
I have provided an original photo.
TASK: Expand and outpaint the scene to a target aspect ratio of ${targetAspectRatio}.
${userContext}

OUTPAINTING RULES:
1. CORE RETENTION: Retain the center original composition, character, and key subjects faithfully.
2. NATURAL EXTENSION: Extend the environment outwards seamlessly (sky, horizon, architecture, nature, ground, lighting).
3. PERSPECTIVE & LIGHTING MATCH: Maintain consistent camera lens characteristics (depth of field, focal length, color grading, shadows).
Output ONLY the newly expanded image.`;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const parts: any[] = [];
      if (baseInline) parts.push(baseInline);
      parts.push({ text: instructionsText });

      const client = getGeminiClient();
      const config: any = {
        imageConfig: { aspectRatio: targetAspectRatio }
      };

      const response = await callWithRetry(() => client.models.generateContent({
        model,
        contents: { parts },
        config
      }), 3, 2000);

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === "SAFETY") {
        throw new Error("Magic Expand was blocked by safety filters.");
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return {
              resultImage: `data:${mime};base64,${part.inlineData.data}`,
              modelUsed: model
            };
          }
        }
      }
    } catch (err: any) {
      console.warn(`Magic Expand with model ${model} failed:`, err);
      lastError = err;
      const errStr = typeof err === 'string' ? err : (err?.message || "");
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Magic Expand failed across all available AI engines.");
};

/**
 * Executes AI Background Replacement.
 * Isolates foreground subject and generates a brand new background.
 */
export const runBackgroundReplace = async (
  baseImage: string,
  newBackgroundDescription: string,
  options: AiStudioGenerationOptions = {}
): Promise<{ resultImage: string; modelUsed: string }> => {
  trackRequest(2800, "Studio Background Replace");

  const requestedModel = options.model || 'gemini-3.1-flash-lite-image';
  const modelsToTry = [
    requestedModel,
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const compressedBase = await compressBase64Image(baseImage);
  const baseInline = prepareInlineData(compressedBase, 'image/png');

  const instructionsText = `You are an expert AI photo compositing and background replacement engine.
I have provided an original image.
TASK: Keep the main subject (person/character/object) 100% intact, and completely replace the background with:
"${newBackgroundDescription}"

COMPOSITING RULES:
1. SUBJECT INTEGRITY: Preserve the subject's exact facial features, hair, clothing, body, and pose.
2. ENVIRONMENTAL LIGHTING: Recast subtle ambient light, rim highlights, and reflections onto the subject to naturally integrate them with the new background environment.
3. DEPTH OF FIELD: Match realistic camera focus and bokeh on the new background.
Output ONLY the final composited image.`;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const parts: any[] = [];
      if (baseInline) parts.push(baseInline);
      parts.push({ text: instructionsText });

      const client = getGeminiClient();
      const config: any = {};
      if (options.aspectRatio) {
        config.imageConfig = { aspectRatio: options.aspectRatio };
      }

      const response = await callWithRetry(() => client.models.generateContent({
        model,
        contents: { parts },
        config
      }), 3, 2000);

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === "SAFETY") {
        throw new Error("Background replacement was blocked by safety filters.");
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return {
              resultImage: `data:${mime};base64,${part.inlineData.data}`,
              modelUsed: model
            };
          }
        }
      }
    } catch (err: any) {
      console.warn(`Background replace with model ${model} failed:`, err);
      lastError = err;
      const errStr = typeof err === 'string' ? err : (err?.message || "");
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Background replacement failed across all available AI engines.");
};
