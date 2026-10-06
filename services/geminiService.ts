
import { GoogleGenAI, Type } from "@google/genai";
import { ImagePromptJson, ScriptScene } from "../types";
import { rateLimitTracker, RateLimitState } from "./rateLimitService";
import { recordSuccessfulGenerationPrompt } from "./promptHistoryService";

// Dynamic Google Gemini API Key Management for Standalone Execution
export const getGeminiApiKey = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('gemini_api_key');
      if (stored && stored.trim()) return stored.trim();
    } catch (e) {
      console.warn("localStorage is not accessible:", e);
    }
  }
  return (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
};

export const hasGeminiApiKey = (): boolean => {
  return !!getGeminiApiKey();
};

export const getApiKeySource = (): 'local_storage' | 'env' | 'none' => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('gemini_api_key');
      if (stored && stored.trim()) return 'local_storage';
    } catch {}
  }
  const envKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  if (envKey) return 'env';
  return 'none';
};

export const setGeminiApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    try {
      if (key && key.trim()) {
        localStorage.setItem('gemini_api_key', key.trim());
      } else {
        localStorage.removeItem('gemini_api_key');
      }
      window.dispatchEvent(new CustomEvent('gemini_api_key_changed', { detail: key }));
    } catch (e) {
      console.warn("Failed to save API key to localStorage:", e);
    }
  }
};

export const clearGeminiApiKey = (): void => {
  setGeminiApiKey('');
};

export const getGeminiClient = (): GoogleGenAI => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    const err: any = new Error("Chưa cấu hình Google Gemini API Key. Vui lòng bấm vào nút 'Cài đặt API Key' ở thanh trên cùng để nhập API Key của bạn.");
    err.code = "API_KEY_MISSING";
    throw err;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'hlc-imagen-standalone-v4.3',
      }
    }
  });
};

export const validateApiKey = async (testKey?: string): Promise<{ valid: boolean; message: string }> => {
  const keyToTest = (testKey !== undefined ? testKey : getGeminiApiKey()).trim();
  if (!keyToTest) {
    return { valid: false, message: 'API Key không được để trống.' };
  }
  try {
    const testClient = new GoogleGenAI({ apiKey: keyToTest });
    const res = await testClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping',
      config: { maxOutputTokens: 2 }
    });
    if (res && res.text !== undefined) {
      return { valid: true, message: 'Kết nối thành công! Google Gemini API đã sẵn sàng hoạt động.' };
    }
    return { valid: true, message: 'Kết nối thành công!' };
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.includes('API_KEY_INVALID') || msg.toLowerCase().includes('api key not valid')) {
      return { valid: false, message: 'API Key không hợp lệ. Vui lòng kiểm tra lại khóa API từ Google AI Studio.' };
    }
    if (msg.includes('PERMISSION_DENIED') || msg.toLowerCase().includes('permission denied')) {
      return { valid: false, message: 'Khóa API bị từ chối quyền truy cập hoặc tài khoản chưa kích hoạt Gemini API.' };
    }
    try {
      const testClient = new GoogleGenAI({ apiKey: keyToTest });
      await testClient.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: 'Ping',
        config: { maxOutputTokens: 2 }
      });
      return { valid: true, message: 'Kết nối thành công! Google Gemini API đã sẵn sàng hoạt động.' };
    } catch (e2: any) {
      return { valid: false, message: `Lỗi kết nối tới Google Gemini: ${msg}` };
    }
  }
};

// --- Dynamic Image Generation Models Management ---
export interface ImageModelOption {
  id: string;
  label: string;
  description: string;
  isNew?: boolean;
}

export const DEFAULT_IMAGE_MODELS: ImageModelOption[] = [
  { id: 'gemini-3.1-flash-lite-image', label: 'Flash 3.1 Lite', description: 'Standard Engine' },
  { id: 'gemini-3.1-flash-image', label: 'Flash 3.1', description: 'HQ Engine (Paid)' },
  { id: 'gemini-3-pro-image', label: 'Pro 3', description: 'Pro HQ Engine (Paid)' },
  { id: 'imagen-3.0-generate-002', label: 'Imagen 3 (HQ)', description: 'Photorealistic HQ' },
  { id: 'imagen-3.0-fast-generate-001', label: 'Imagen 3 Fast', description: 'Ultra Fast Generation' },
  { id: 'gemini-2.5-flash-image', label: 'Flash 2.5 Image', description: 'High Speed Flash Engine' }
];

export const getCachedImageModels = (): ImageModelOption[] => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('nki_cached_image_models');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load cached image models:", e);
    }
  }
  return DEFAULT_IMAGE_MODELS;
};

export const fetchLatestImageModels = async (): Promise<{ models: ImageModelOption[]; count: number; source: 'api' | 'fallback'; message: string }> => {
  const apiKey = getGeminiApiKey();

  const formatModel = (id: string, displayName?: string, description?: string): ImageModelOption => {
    const cleanId = id.replace(/^models\//, '');
    let label = displayName || cleanId;
    let desc = description || 'Google AI Image Model';

    if (cleanId === 'gemini-3.1-flash-lite-image') {
      label = 'Flash 3.1 Lite';
      desc = 'Standard Engine';
    } else if (cleanId === 'gemini-3.1-flash-image') {
      label = 'Flash 3.1';
      desc = 'HQ Engine (Paid)';
    } else if (cleanId === 'gemini-3-pro-image') {
      label = 'Pro 3';
      desc = 'Pro HQ Engine (Paid)';
    } else if (cleanId === 'imagen-3.0-generate-002') {
      label = 'Imagen 3 (HQ)';
      desc = 'Google Imagen Photorealistic';
    } else if (cleanId === 'imagen-3.0-fast-generate-001') {
      label = 'Imagen 3 Fast';
      desc = 'Ultra Fast Generation';
    } else if (cleanId === 'gemini-2.5-flash-image') {
      label = 'Flash 2.5 Image';
      desc = 'High Speed Flash Engine';
    } else if (cleanId.includes('imagen')) {
      label = displayName || cleanId.toUpperCase();
      desc = 'Imagen Engine';
    } else if (cleanId.includes('flash-lite')) {
      label = displayName || 'Flash Lite Image';
      desc = 'Lightweight Fast Engine';
    } else if (cleanId.includes('flash')) {
      label = displayName || 'Flash Image';
      desc = 'High Speed Engine';
    } else if (cleanId.includes('pro')) {
      label = displayName || 'Pro Image';
      desc = 'High Precision Engine';
    }

    return { id: cleanId, label, description: desc };
  };

  if (!apiKey) {
    return {
      models: DEFAULT_IMAGE_MODELS,
      count: DEFAULT_IMAGE_MODELS.length,
      source: 'fallback',
      message: 'Chưa cấu hình API Key. Đang hiển thị danh sách model mặc định.'
    };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.models)) {
        const modelMap = new Map<string, ImageModelOption>();

        // Seed with flagship defaults
        DEFAULT_IMAGE_MODELS.forEach(m => modelMap.set(m.id, m));

        // Scan all models from user's active API endpoint
        data.models.forEach((m: any) => {
          const rawName = (m.name || '').toLowerCase();
          const methods = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
          const cleanId = (m.name || '').replace(/^models\//, '');

          const isImageModel = 
            rawName.includes('image') || 
            rawName.includes('imagen') || 
            methods.includes('generateImages') ||
            (methods.includes('generateContent') && (rawName.includes('flash') || rawName.includes('pro')));

          if (isImageModel && cleanId) {
            if (!modelMap.has(cleanId)) {
              modelMap.set(cleanId, {
                ...formatModel(cleanId, m.displayName, m.description),
                isNew: true
              });
            }
          }
        });

        const list = Array.from(modelMap.values());
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('nki_cached_image_models', JSON.stringify(list));
            window.dispatchEvent(new CustomEvent('nki_models_updated', { detail: list }));
          } catch {}
        }
        return {
          models: list,
          count: list.length,
          source: 'api',
          message: `Đã cập nhật thành công ${list.length} model tạo ảnh từ Google Gemini API!`
        };
      }
    }
  } catch (err) {
    console.warn("API fetch error, using comprehensive model list:", err);
  }

  return {
    models: DEFAULT_IMAGE_MODELS,
    count: DEFAULT_IMAGE_MODELS.length,
    source: 'fallback',
    message: `Đã tải ${DEFAULT_IMAGE_MODELS.length} model tạo ảnh khả dụng.`
  };
};



// --- Helper for inline data sanitization ---
function prepareInlineData(input: string | null | undefined, fallbackMime = "image/jpeg") {
  if (!input) return null;
  let base64 = input.trim();
  let mimeType = fallbackMime;
  if (base64.includes(',')) {
    const parts = base64.split(',');
    base64 = parts[1].trim();
    const match = parts[0].match(/data:([^;]+);/);
    if (match && match[1]) {
      mimeType = match[1];
    }
  }
  return {
    inlineData: {
      mimeType,
      data: base64
    }
  };
}

/**
 * Compresses/downscales a base64 image to conserve API tokens and avoid 200k TPM RESOURCE_EXHAUSTED limits.
 */
export const compressBase64Image = async (
  base64Str: string,
  maxDimension = 480,
  quality = 0.68
): Promise<string> => {
  if (typeof window === 'undefined' || !base64Str) return base64Str;
  
  // Quick check: if base64 length is under 25KB (~18KB raw image), it's already tiny
  if (base64Str.length < 25000) return base64Str;

  return new Promise((resolve) => {
    const img = new Image();
    const src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64Str);

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedBase64 = dataUrl.split(',')[1] || base64Str;
        resolve(compressedBase64);
      } catch (e) {
        console.warn("Image compression failed, using original base64:", e);
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = src;
  });
};

/**
 * Executes a Gemini API call with automatic retry on Rate Limit / Quota Exceeded errors (429 / RESOURCE_EXHAUSTED).
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
  initialDelayMs = 3000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const errStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error) || "");
      
      const isRateLimit = 
        errStr.includes("429") || 
        errStr.includes("RESOURCE_EXHAUSTED") || 
        errStr.toLowerCase().includes("quota exceeded") ||
        errStr.toLowerCase().includes("rate limit") ||
        errStr.toLowerCase().includes("exceeded your current quota");

      const isApiKeyInvalid = 
        errStr.includes("API_KEY_INVALID") || 
        errStr.toLowerCase().includes("api key not valid") || 
        errStr.toLowerCase().includes("invalid api key");

      if (isApiKeyInvalid) {
        const keyErr: any = new Error(
          "Google Gemini API Key không hợp lệ hoặc đã hết hạn. Vui lòng nhấp vào biểu tượng chìa khóa ở thanh trên cùng để kiểm tra lại API Key."
        );
        keyErr.isApiKeyInvalid = true;
        keyErr.code = "API_KEY_INVALID";
        throw keyErr;
      }

      if (isRateLimit) {
        let parsedSec = 45;
        const match = errStr.match(/retry in ([0-9.]+)\s*s/i);
        if (match && match[1]) {
          const s = parseFloat(match[1]);
          if (!isNaN(s) && s > 0) parsedSec = s;
        }

        // Inform RateLimitTracker immediately to trigger 100% Critical Red status & accurate cooldown countdown!
        rateLimitTracker.recordQuotaExhausted(Math.ceil(parsedSec), "Google API Quota Exceeded (429)");

        // Immediately throw rate limit error with structured metadata so the queue can engage Synaptic Cooling
        const rateLimitErr: any = new Error(
          `Hạn ngạch Google API đã hết (429 Quota Exceeded). Cần chờ ~${Math.ceil(parsedSec)}s để hạn ngạch reset.`
        );
        rateLimitErr.isRateLimit = true;
        rateLimitErr.status = 429;
        rateLimitErr.code = 'RESOURCE_EXHAUSTED';
        rateLimitErr.retryAfterSeconds = Math.ceil(parsedSec);
        throw rateLimitErr;
      } else {
        throw error;
      }
    }
  }
}

/**
 * Helper to call Gemini text generation with graceful model fallback (e.g. gemini-2.5-flash -> gemini-3.6-flash -> gemini-2.0-flash).
 */
export async function generateTextContentWithFallback(
  createParams: (model: string) => any,
  models: string[] = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-2.0-flash']
) {
  let lastErr: any = null;
  const client = getGeminiClient();
  for (const m of models) {
    try {
      const params = createParams(m);
      return await callWithRetry(() => client.models.generateContent(params));
    } catch (err: any) {
      lastErr = err;
      const errStr = typeof err === 'string' ? err : (err?.message || "");
      if (
        err?.isRateLimit ||
        err?.isApiKeyInvalid ||
        errStr.includes("429") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("API_KEY_INVALID")
      ) {
        throw err;
      }
      if (
        errStr.includes("404") ||
        errStr.includes("NOT_FOUND") ||
        errStr.toLowerCase().includes("not found") ||
        errStr.toLowerCase().includes("is not supported")
      ) {
        console.warn(`Model ${m} not found or unsupported, attempting fallback...`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// --- Real-time RPM & TPM Rate Limit Tracking ---
export const trackRequest = (estimatedTokens = 1500, action = 'API Request') => {
  rateLimitTracker.record(action, estimatedTokens);
};

export const subscribeToRateLimit = (callback: (usage: number) => void) => {
  return rateLimitTracker.subscribe((state) => callback(state.rpmUsage));
};

export const subscribeToRateLimitStats = (callback: (state: RateLimitState) => void) => {
  return rateLimitTracker.subscribe(callback);
};

export const getRpmLimit = () => rateLimitTracker.getRpmLimit();
export const getTpmLimit = () => rateLimitTracker.getTpmLimit();
export const getRateLimitTracker = () => rateLimitTracker;
// ------------------------------------------------

/**
 * Converts a File object to a Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Fetches an image from a URL, converts it to a Base64 string, and infers its MIME type.
 */
export const imageUrlToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('URL does not point to an image file.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: blob.type });
      };
      reader.onerror = (error) => reject(error);
    });
  } catch (error) {
    console.error("Error fetching or converting image from URL:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load image from URL: ${errorMessage}`);
  }
};

/**
 * Analyzes an image and returns a structured JSON prompt description.
 */
export const analyzeImageToJson = async (base64Image: string, mimeType: string): Promise<ImagePromptJson> => {
  trackRequest(2200, "Image Analysis");
  try {
    const inline = prepareInlineData(base64Image, mimeType);
    const parts: any[] = [];
    if (inline) parts.push(inline);
    parts.push({
      text: `Analyze this image with the precision of a high-end Director of Photography (DoP), Technical Artist, and Costume Historian. Your goal is to extract technical optical details to ensure perfect reproduction of Depth, Texture, Light, and Attire.

      CRITICAL ANALYSIS REQUIREMENTS:

      1. **Texture & Fidelity (MANDATORY)**: 
         - **Grain Structure**: Explicitly categorize as 'Heavy Film Grain', 'Fine Film Grain', 'Digital High ISO Noise', or 'Smooth/Clean'.
         - **Sharpness**: Explicitly categorize as 'Razor Sharp', 'Soft Focus', 'Diffused', or 'Out of Focus'.
         - **Blur**: Identify if present: 'Motion Blurred', 'Hazy', 'Gaussian Blur', or 'Bokeh'.
         - **Surface**: Identify if it mimics a specific medium: 'Canvas Texture', 'Paper Texture', 'Watercolor Paper', 'Glossy', or 'Matte'.
         - **Imperfections**: Look for Chromatic aberration, lens flares, dust, scratches, or compression artifacts.

      2. **Depth of Field & Focal Length**:
         - Estimate the **Focal Length**: (e.g., Ultra-wide 16mm, Standard 35mm, Portrait 85mm, Telephoto 200mm).
         - Analyze **Bokeh**: Is the background creamy, swirling, or sharp? Is the depth of field Shallow (f/1.8) or Deep (f/11)?
         - **Focus Point**: Exactly where is the sharpness focused?

      3. **Lighting Geometry**:
         - Describe the *quality* of light: Hard (harsh shadows), Soft (diffused), Volumetric (god rays/fog), or Ambient.
         - Identify light sources (Rim light, Key light, Practical lights).

      4. **Medium & Artistic Technique**: 
         - Exact Film Stock (e.g., CineStill 800T, Fujifilm) or Render Engine (Octane Path Tracing, Unreal Lumen).
         - **Brushwork/Method**: If painting/art, you MUST identify the technique: 'Impasto brushstrokes' (thick paint), 'Sumi-e ink wash', 'Pointillism' (dots), 'Stippling', 'Dry Brush', 'Palette Knife', 'Glazing', or 'Chiaroscuro' (contrast).

      5. **Posing & Action (CRITICAL)**:
         - Describe the exact physical state, posture, and action of the character(s).
         - Identify weight distribution, limb positioning, and interaction with the environment.

      6. **Fashion, Costume & Accessories (CRITICAL)**:
         - **Cultural Accuracy**: You MUST identify specific traditional garments if present (e.g., 'Ao Dai' (Vietnam), 'Hanbok' (Korea), 'Kimono' (Japan), 'Sari' (India), 'Cheongsam' (China), 'Dirndl' (Germany)).
         - **Forensic Description**: If the specific style name is unknown or ambiguous, DO NOT GUESS. Instead, provide a rigorous visual description:
           - Silhouette/Cut (e.g., "High-collared tunic with waist-high side slits", "Wrapped drape over left shoulder").
           - Fabric properties (e.g., "Sheer silk", "Stiff brocade", "Matte cotton", "Metallic armor").
           - Patterns (e.g., "Gold filigree embroidery", "Lotus flower print", "Geometric weave").
         - **Accessories**: Describe jewelry, headpieces, belts, and props in high detail.

      Fill the JSON fields based on this forensic optical analysis. The 'subject' field must contain the detailed clothing description.`
    });

    const response = await generateTextContentWithFallback((modelName) => ({
      model: modelName,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "The main subject and DETAILED COSTUME DESCRIPTION. Include specific traditional names (e.g., Ao Dai) if identified, otherwise describe cut/fabric/pattern precisely." },
            art_style: { type: Type.STRING, description: "The medium/technique. MUST include specific brush styles (e.g., 'Impasto brushstrokes', 'Sumi-e', 'Pointillism') or lighting techniques (e.g., 'Chiaroscuro') if applicable." },
            posing: { type: Type.STRING, description: "Precise description of posture, action, and physical interaction." },
            lighting: { type: Type.STRING, description: "Technical lighting: Hard/Soft, Color Temperature, Volumetric fog, Rim lighting, Shadows." },
            color_palette: { type: Type.STRING, description: "Dominant colors, grading (e.g., Bleach Bypass, Teal & Orange), and contrast levels." },
            composition: { type: Type.STRING, description: "Framing rule (Thirds/Center), AND specific Focal Length (mm) + Depth of Field (f-stop/Bokeh description)." },
            camera_angle: { type: Type.STRING, description: "Exact angle relative to subject (e.g., Low angle, Eye level, High angle, Dutch tilt)." },
            texture: { type: Type.STRING, description: "MANDATORY: Combine these specific terms: Grain (Heavy/Fine/Digital/Smooth), Sharpness (Razor/Soft), Blur (Motion/Hazy), and Surface (Canvas/Paper)." },
            skin_texture: { type: Type.STRING, description: "Details of human skin (Pores, imperfections, subsurface scattering) or surface material if not human." },
            font: { type: Type.STRING, description: "Typography details: Font family, style (Neon, Metallic, Handwritten), and placement. 'N/A' if no text." },
            mood: { type: Type.STRING, description: "The emotional atmosphere (e.g., Ethereal, Gritty, Melancholic)." },
            additional_details: { type: Type.STRING, description: "Secondary elements, background details, mist, fog, props." }
          },
          required: ["subject", "art_style", "posing", "lighting", "color_palette", "composition", "camera_angle", "texture", "skin_texture", "font", "mood", "additional_details"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    if ((response as any)?.usageMetadata?.totalTokenCount) {
      rateLimitTracker.recordActualTokens((response as any).usageMetadata.totalTokenCount, "Image Analysis");
    }
    
    return JSON.parse(text) as ImagePromptJson;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

/**
 * Refines an existing JSON prompt based on user text instructions.
 */
export const refineJsonWithPrompt = async (
  currentJson: ImagePromptJson,
  refineInstructions: string
): Promise<ImagePromptJson> => {
  trackRequest(1200, "Refine JSON");
  try {
    const response = await generateTextContentWithFallback((modelName) => ({
      model: modelName,
      contents: {
        parts: [
          {
            text: `You are an AI art director. I have a JSON description of an image. I want you to modify specific fields of this JSON based on my instructions, while keeping the rest consistent with the original unless implied otherwise.
            
            Original JSON: ${JSON.stringify(currentJson)}
            
            User Instructions for Refinement: "${refineInstructions}"
            
            Task: Update the JSON fields to reflect the user's instructions. Ensure the output strictly follows the same JSON schema.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            art_style: { type: Type.STRING },
            posing: { type: Type.STRING },
            lighting: { type: Type.STRING },
            color_palette: { type: Type.STRING },
            composition: { type: Type.STRING },
            camera_angle: { type: Type.STRING },
            texture: { type: Type.STRING },
            skin_texture: { type: Type.STRING },
            font: { type: Type.STRING },
            mood: { type: Type.STRING },
            additional_details: { type: Type.STRING }
          },
          required: ["subject", "art_style", "posing", "lighting", "color_palette", "composition", "camera_angle", "texture", "skin_texture", "font", "mood", "additional_details"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    if ((response as any)?.usageMetadata?.totalTokenCount) {
      rateLimitTracker.recordActualTokens((response as any).usageMetadata.totalTokenCount, "Refine JSON");
    }
    return JSON.parse(text) as ImagePromptJson;
  } catch (error) {
    console.error("Error refining JSON:", error);
    throw error;
  }
};

/**
 * Generates variants of the image prompt with different poses.
 */
export const generatePoseVariants = async (
  base64Image: string, 
  mimeType: string, 
  count: number = 3,
  previousPoses: Set<string> | null = null,
  customPrompt?: string,
  poseDetails?: string
): Promise<ImagePromptJson[]> => {
  trackRequest(3200, "Pose Variants");
  try {
    const previousPosesList = previousPoses && previousPoses.size > 0 
      ? Array.from(previousPoses).join(" | ") 
      : "None";

    const kineticIntent = customPrompt ? `KINETIC INTENT (General Context): The image should fall under this category/vibe: "${customPrompt}".` : "";
    const specificDetails = poseDetails ? `SPECIFIC POSE DETAILS (Strict Requirement): You MUST implement these exact actions: "${poseDetails}".` : "";

    const customInstruction = (kineticIntent || specificDetails)
      ? `6. INSTRUCTIONS: ${kineticIntent} ${specificDetails} Weave these seamlessly into the pose variations while ensuring they are the primary driver of the physical state.`
      : "6. DIVERSIFY POSES: Create logically consistent but visually distinct physical actions (e.g., sitting, walking, looking over shoulder, dramatic action).";

    const compressed = await compressBase64Image(base64Image);
    const inline = prepareInlineData(compressed, mimeType);
    const parts: any[] = [];
    if (inline) parts.push(inline);
    parts.push({
      text: `Analyze this image with forensic precision. Your goal is to create ${count} VARIATIONS of the image prompt JSON that change ONLY the subject's pose/action while maintaining absolute character and environmental consistency.

      STRICT CONSISTENCY RULES:
      1. **Costume Persistence**: You MUST meticulously describe the same clothing seen in the reference image (fabrics, patterns, colors, cuts, accessories). If the subject is wearing a specific cultural garment (e.g., Ao Dai, Kimono), you MUST keep it.
      2. **Physical Features**: Hair color/style, eye color, and skin tone MUST remain identical.
      3. **Aesthetic Lock**: The 'art_style', 'lighting', 'color_palette', 'texture', 'skin_texture', and 'mood' MUST be copied exactly from the reference image analysis.
      4. **Compositional Adjustment**: You may adjust 'composition' and 'camera_angle' ONLY as much as necessary to fit the new pose (e.g., changing from a portrait to a full-body shot if the subject is now walking).
      5. **Pose Logic**: Avoid repeating these previously generated poses: [${previousPosesList}].

      ${customInstruction}

      Task: Output an ARRAY of JSON objects. Each object represents a new physical state of the same character in the same world.`
    });

    const response = await generateTextContentWithFallback((modelName) => ({
      model: modelName,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING, description: "Detailed description of character appearance (identical to reference)." },
              art_style: { type: Type.STRING },
              posing: { type: Type.STRING, description: "The NEW action/pose for this variant." },
              lighting: { type: Type.STRING },
              color_palette: { type: Type.STRING },
              composition: { type: Type.STRING },
              camera_angle: { type: Type.STRING },
              texture: { type: Type.STRING },
              skin_texture: { type: Type.STRING },
              font: { type: Type.STRING },
              mood: { type: Type.STRING },
              additional_details: { type: Type.STRING }
            },
            required: ["subject", "art_style", "posing", "lighting", "color_palette", "composition", "camera_angle", "texture", "skin_texture", "font", "mood", "additional_details"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as ImagePromptJson[];
  } catch (error) {
    console.error("Error generating variants:", error);
    throw error;
  }
};

/**
 * Merges a character identity/setting with an outfit reference image to generate a combined ImagePromptJson.
 */
export const mergeCharacterAndOutfit = async (
  charBase64: string,
  charMime: string,
  outfitBase64: string,
  outfitMime: string
): Promise<ImagePromptJson> => {
  trackRequest(3000, "Wardrobe Merge");
  try {
    const parts: any[] = [];
    const compressedChar = await compressBase64Image(charBase64);
    const compressedOutfit = await compressBase64Image(outfitBase64);
    const charInline = prepareInlineData(compressedChar, charMime);
    const outfitInline = prepareInlineData(compressedOutfit, outfitMime);
    if (charInline) parts.push(charInline);
    if (outfitInline) parts.push(outfitInline);
    parts.push({
      text: `You are an expert Technical Director, Fashion Designer, and Art Director. 
      I have provided two images:
      - **Image 1**: The Character, Scene, Background, Posing, Lighting, and Medium reference.
      - **Image 2**: The Outfit / Clothing reference.

      YOUR TASK:
      Generate a single, detailed, structured ImagePromptJson that represents a new cohesive scene where the CHARACTER from Image 1 is wearing the EXACT clothing/outfit from Image 2, while maintaining the same physical pose, camera angle, lighting, background, and art style of Image 1.

      STRICT MERGING RULES:
      1. **Subject Description**: Meticulously describe the person's face, hair, and physical features from Image 1, but describe them wearing the detailed costume from Image 2 (include silhouette, cuts, fabrics, colors, patterns, and accessories).
      2. **Aesthetic Consistency**: Copy or adapt 'art_style', 'lighting', 'color_palette', 'composition', 'camera_angle', 'texture', 'skin_texture', 'mood', and 'additional_details' entirely from Image 1 to ensure the new image has the exact same background and atmosphere.
      3. **Posing**: Retain the posture, action, and physical placement of the character from Image 1.`
    });

    const response = await generateTextContentWithFallback((modelName) => ({
      model: modelName,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "Description of the character from Image 1 wearing the outfit from Image 2." },
            art_style: { type: Type.STRING, description: "Art medium/style of Image 1." },
            posing: { type: Type.STRING, description: "Posture and action of the character in Image 1." },
            lighting: { type: Type.STRING, description: "Atmospheric and geometric lighting of Image 1." },
            color_palette: { type: Type.STRING, description: "Color palette and color grading of Image 1." },
            composition: { type: Type.STRING, description: "Composition and camera focal length of Image 1." },
            camera_angle: { type: Type.STRING, description: "Camera angle relative to character in Image 1." },
            texture: { type: Type.STRING, description: "Texture and grain of Image 1." },
            skin_texture: { type: Type.STRING, description: "Skin rendering detail of character in Image 1." },
            font: { type: Type.STRING, description: "Font or N/A from Image 1." },
            mood: { type: Type.STRING, description: "Atmosphere of Image 1." },
            additional_details: { type: Type.STRING, description: "Background elements, setting, and other props of Image 1." }
          },
          required: ["subject", "art_style", "posing", "lighting", "color_palette", "composition", "camera_angle", "texture", "skin_texture", "font", "mood", "additional_details"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as ImagePromptJson;
  } catch (error) {
    console.error("Error in merging character and outfit:", error);
    throw error;
  }
};

/**
 * Generates images from a JSON prompt description.
 */
export const generateImageFromJson = async (
  promptJson: ImagePromptJson, 
  options: { 
    numberOfImages?: number; 
    referenceImageBase64?: string; 
    faceImageBase64?: string; 
    maleFaceBase64?: string; 
    femaleFaceBase64?: string; 
    aspectRatio?: string;
    imageSize?: string;
    useReferenceHair?: boolean; 
    isDualCharacter?: boolean;
    model?: string;
  }
): Promise<string[]> => {
  
  const count = options.numberOfImages || 1;
  const aspectRatio = options.aspectRatio || "1:1";
  const imageSize = options.imageSize;
  const requestedModel = options.model || 'gemini-3.1-flash-lite-image';
  
  // Detect if strict dual character mode is needed
  const isDualCharacterMode = options.isDualCharacter || !!(options.maleFaceBase64 && options.femaleFaceBase64);
  
  let coreSubject = promptJson.subject;
  if (isDualCharacterMode) {
      coreSubject = `TWO DISTINCT AND INDIVIDUAL CHARACTERS (1 Male and 1 Female) in the same scene. ${promptJson.subject}`;
  }

  const promptText = `Generate an image with the following specifications:
  
  CORE SUBJECT: ${coreSubject}
  
  POSE & ACTION: ${promptJson.posing}

  VISUAL STYLE & MEDIUM: ${promptJson.art_style}
  
  OPTICAL PROPERTIES (CRITICAL):
  - Texture/Grain: ${promptJson.texture}
  - Composition/Depth: ${promptJson.composition}
  - Camera Angle: ${promptJson.camera_angle}
  
  LIGHTING & ATMOSPHERE:
  - Lighting: ${promptJson.lighting}
  - Mood: ${promptJson.mood}
  - Color Palette: ${promptJson.color_palette}
  
  DETAILS:
  - Skin/Surface Details: ${promptJson.skin_texture}
  - Typography/Text: ${promptJson.font}
  - Additional Elements: ${promptJson.additional_details}`;

  const generatedImages: string[] = [];

  for (let i = 0; i < count; i++) {
    trackRequest(1800, "JSON to Image");
    const parts: any[] = [];
    
    // 1. Add Text Prompt First
    parts.push({ text: promptText });
    
    // 2. Add Reference Poses
    if (options.referenceImageBase64) {
      parts.push({ text: "Use the following image purely as a REFERENCE for POSE and COMPOSITION:" });
      const compressedRef = await compressBase64Image(options.referenceImageBase64);
      const inline = prepareInlineData(compressedRef, "image/jpeg");
      if (inline) parts.push(inline);
    }

    // Handle Hair Logic
    const hairInstruction = options.useReferenceHair 
      ? "INHERIT HAIR: You MUST copy the hair style and hair color exactly from the provided reference face. Do NOT inherit any other aspects like lighting or background from the reference."
      : "IGNORE HAIR: Strictly IGNORE the hair from the reference image. Only copy facial features (eyes, nose, mouth, bone structure). Use the hair described in the prompt text.";

    // 3. Handling Faces - Identity Isolation
    if (isDualCharacterMode) {
      parts.push({ text: "### MULTI-IDENTITY PROTOCOL: TWO DISTINCT CHARACTERS ###" });
      parts.push({ text: "SCENE REQUIREMENT: This image MUST feature precisely two separate individuals: one MALE character and one FEMALE character. Their identities must be completely independent." });

      if (options.maleFaceBase64) {
        parts.push({ text: `MALE IDENTITY REFERENCE:` });
        const compressedMale = await compressBase64Image(options.maleFaceBase64);
        const inline = prepareInlineData(compressedMale, "image/jpeg");
        if (inline) parts.push(inline);
        parts.push({ text: `INSTRUCTION: Apply facial features from this reference ONLY to the MALE character. Do not let this identity bleed into the female character. ${hairInstruction}` });
      } else {
        parts.push({ text: "INSTRUCTION: The MALE character should have a generic, distinct male face that is completely DIFFERENT from the female reference if provided." });
      }

      if (options.femaleFaceBase64) {
        parts.push({ text: `FEMALE IDENTITY REFERENCE:` });
        const compressedFemale = await compressBase64Image(options.femaleFaceBase64);
        const inline = prepareInlineData(compressedFemale, "image/jpeg");
        if (inline) parts.push(inline);
        parts.push({ text: `INSTRUCTION: Apply facial features from this reference ONLY to the FEMALE character. Do not let this identity bleed into the male character. ${hairInstruction}` });
      } else {
        parts.push({ text: "INSTRUCTION: The FEMALE character should have a generic, distinct female face that is completely DIFFERENT from the male reference if provided." });
      }
      
      parts.push({ text: "STRICT SEPARATION: Ensure there is zero identity overlap between the male and female characters. They must look like two different people." });
    } else if (options.faceImageBase64) {
      parts.push({ text: `IDENTITY REFERENCE (MAIN CHARACTER):` });
      const compressedFace = await compressBase64Image(options.faceImageBase64);
      const inline = prepareInlineData(compressedFace, "image/jpeg");
      if (inline) parts.push(inline);
      parts.push({ text: `INSTRUCTION: Use this face for the main character. ${hairInstruction}` });
    } else {
      if (options.maleFaceBase64) {
         parts.push({ text: `IDENTITY REFERENCE (MALE CHARACTER):` });
         const compressedMale = await compressBase64Image(options.maleFaceBase64);
         const inline = prepareInlineData(compressedMale, "image/jpeg");
         if (inline) parts.push(inline);
         parts.push({ text: `Use this face for the MALE character. ${hairInstruction}` });
      }
      if (options.femaleFaceBase64) {
         parts.push({ text: `IDENTITY REFERENCE (FEMALE CHARACTER):` });
         const compressedFemale = await compressBase64Image(options.femaleFaceBase64);
         const inline = prepareInlineData(compressedFemale, "image/jpeg");
         if (inline) parts.push(inline);
         parts.push({ text: `Use this face for the FEMALE character. ${hairInstruction}` });
      }
    }

    // Prepare models to try (primary + fallbacks)
    const modelsToTry = [
      requestedModel,
      'gemini-3.1-flash-lite-image',
      'gemini-3.1-flash-image',
      'gemini-3-pro-image',
      'gemini-2.5-flash-image'
    ].filter((m, idx, self) => self.indexOf(m) === idx);

    let imageGenerated = false;
    let lastErr: any = null;

    for (const currentModel of modelsToTry) {
      try {
        // Build imageConfig based on model capabilities
        // Note: gemini-3.1-flash-lite-image only supports aspectRatio, NOT imageSize
        const imageConfig: any = { aspectRatio };
        if (currentModel !== 'gemini-3.1-flash-lite-image' && imageSize) {
          imageConfig.imageSize = imageSize;
        }

        const client = getGeminiClient();
        const response = await callWithRetry(() => client.models.generateContent({
          model: currentModel,
          contents: { parts },
          config: { imageConfig }
        }), 3, 2000);

        const candidate = response.candidates?.[0];
        if (candidate && candidate.finishReason === "SAFETY") {
          throw new Error("The image generation was blocked by safety filters. This usually happens if the prompt or reference image contains restricted content. Please adjust your data and try again.");
        }

        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
               const mime = part.inlineData.mimeType || 'image/png';
               generatedImages.push(`data:${mime};base64,${part.inlineData.data}`);
               imageGenerated = true;
               try {
                 recordSuccessfulGenerationPrompt(JSON.stringify(promptJson, null, 2));
               } catch {}
               break;
            }
          }
        }
        if (imageGenerated) break;
      } catch (err: any) {
        console.warn(`Attempt with model ${currentModel} failed:`, err);
        lastErr = err;
        const errStr = typeof err === 'string' ? err : (err?.message || "");
        const isQuota = errStr.includes("429") || 
                        errStr.includes("RESOURCE_EXHAUSTED") || 
                        errStr.toLowerCase().includes("quota exceeded") ||
                        errStr.toLowerCase().includes("exceeded your current quota");
        if (isQuota) {
          // Immediately throw on 429 quota exhaustion to stop cascading requests to heavier models
          throw err;
        }
      }
    }

    if (!imageGenerated) {
      if (lastErr) throw lastErr;
      throw new Error("The AI model failed to produce a valid image response. Please try again or adjust prompt.");
    }
  }

  return generatedImages;
};

/**
 * Composes new images from a text prompt and multiple component images.
 */
export const composeImageFromPrompt = async (
  prompt: string,
  imageElements: { data: string, mimeType: string }[],
  options: {
    aspectRatio?: string;
    imageSize?: string;
    count?: number;
    model?: string;
    faceImageBase64?: string;
    maleFaceBase64?: string;
    femaleFaceBase64?: string;
    useReferenceHair?: boolean;
    isDualCharacter?: boolean;
  } = {}
): Promise<string[]> => {
  
  const count = options.count || 1;
  const aspectRatio = options.aspectRatio || "1:1";
  const imageSize = options.imageSize;
  const requestedModel = options.model || 'gemini-3.1-flash-lite-image';
  const generatedImages: string[] = [];

  for (let i = 0; i < count; i++) {
    trackRequest(3200, "Compose Image");
    const parts: any[] = [];
    
    // Add all image elements to the prompt parts (compressed if large)
    for (const img of imageElements) {
      const compressedData = await compressBase64Image(img.data);
      const inline = prepareInlineData(compressedData, img.mimeType);
      if (inline) parts.push(inline);
    }

    // Add Base Instructions
    parts.push({
      text: `Create a new image based on the following instructions: "${prompt}". 
      Use the provided images as visual components or style references. 
      Ensure the final image has a cohesive composition, consistent lighting, and style.`
    });

    // 3. Handling Faces - Identity Isolation
    const isDualCharacterMode = options.isDualCharacter || !!(options.maleFaceBase64 && options.femaleFaceBase64);
    
    const hairInstruction = options.useReferenceHair 
      ? "INHERIT HAIR: You MUST copy the hair style and hair color exactly from the provided reference face."
      : "IGNORE HAIR: Strictly IGNORE the hair from the reference image. Use the hair described in the prompt text.";

    if (isDualCharacterMode) {
      parts.push({ text: "### MULTI-IDENTITY PROTOCOL: TWO DISTINCT CHARACTERS ###" });
      parts.push({ text: "SCENE REQUIREMENT: This image MUST feature precisely two separate individuals: one MALE character and one FEMALE character. Their identities must be completely independent." });
      
      if (options.maleFaceBase64) {
        parts.push({ text: `MALE IDENTITY REFERENCE:` });
        const compressedMale = await compressBase64Image(options.maleFaceBase64);
        const inline = prepareInlineData(compressedMale, "image/jpeg");
        if (inline) parts.push(inline);
        parts.push({ text: `INSTRUCTION: Apply facial features from this reference ONLY to the MALE figure. Do not let this identity bleed into the female character. ${hairInstruction}` });
      } else {
        parts.push({ text: "INSTRUCTION: The MALE character should have a generic, distinct male face that is completely DIFFERENT from the female reference if provided." });
      }

      if (options.femaleFaceBase64) {
        parts.push({ text: `FEMALE IDENTITY REFERENCE:` });
        const compressedFemale = await compressBase64Image(options.femaleFaceBase64);
        const inline = prepareInlineData(compressedFemale, "image/jpeg");
        if (inline) parts.push(inline);
        parts.push({ text: `INSTRUCTION: Apply facial features from this reference ONLY to the FEMALE figure. Do not let this identity bleed into the male character. ${hairInstruction}` });
      } else {
        parts.push({ text: "INSTRUCTION: The FEMALE character should have a generic, distinct female face that is completely DIFFERENT from the male reference if provided." });
      }
      
      parts.push({ text: "STRICT SEPARATION: Ensure there is zero identity overlap between the male and female characters. They must look like two different people." });
    } else if (options.faceImageBase64) {
      parts.push({ text: `IDENTITY REFERENCE (MAIN CHARACTER):` });
      const compressedFace = await compressBase64Image(options.faceImageBase64);
      const inline = prepareInlineData(compressedFace, "image/jpeg");
      if (inline) parts.push(inline);
      parts.push({ text: `INSTRUCTION: Use this face for the character. ${hairInstruction}` });
    }

    const modelsToTry = [
      requestedModel,
      'gemini-3.1-flash-lite-image',
      'gemini-3.1-flash-image',
      'gemini-3-pro-image',
      'gemini-2.5-flash-image'
    ].filter((m, idx, self) => self.indexOf(m) === idx);

    let imageGenerated = false;
    let lastErr: any = null;

    for (const currentModel of modelsToTry) {
      try {
        const imageConfig: any = { aspectRatio };
        if (currentModel !== 'gemini-3.1-flash-lite-image' && imageSize) {
          imageConfig.imageSize = imageSize;
        }

        const client = getGeminiClient();
        const response = await callWithRetry(() => client.models.generateContent({
          model: currentModel,
          contents: { parts },
          config: { imageConfig }
        }), 3, 2000);

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              generatedImages.push(`data:${mime};base64,${part.inlineData.data}`);
              imageGenerated = true;
              break;
            }
          }
        }
        if (imageGenerated) break;
      } catch (err: any) {
        console.warn(`Compose with model ${currentModel} failed:`, err);
        lastErr = err;
        const errStr = typeof err === 'string' ? err : (err?.message || "");
        const isQuota = errStr.includes("429") || 
                        errStr.includes("RESOURCE_EXHAUSTED") || 
                        errStr.toLowerCase().includes("quota exceeded") ||
                        errStr.toLowerCase().includes("exceeded your current quota");
        if (isQuota) {
          throw err;
        }
      }
    }

    if (!imageGenerated) {
      if (lastErr) throw lastErr;
      throw new Error("No image generated from composition.");
    }
  }

  return generatedImages;
};

/**
 * Converts user text input into a structured JSON prompt description.
 */
export const textToImagePromptJson = async (userText: string): Promise<ImagePromptJson> => {
  trackRequest(950, "Text to JSON");
  try {
    const response = await generateTextContentWithFallback((modelName) => ({
      model: modelName,
      contents: {
        parts: [
          {
            text: `Translate this image idea into a highly detailed Director of Photography (DoP) prompt JSON.
            
            User Idea: "${userText}"
            
            Fill the following JSON fields to create a photorealistic or stylized image description.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            art_style: { type: Type.STRING },
            posing: { type: Type.STRING },
            lighting: { type: Type.STRING },
            color_palette: { type: Type.STRING },
            composition: { type: Type.STRING },
            camera_angle: { type: Type.STRING },
            texture: { type: Type.STRING },
            skin_texture: { type: Type.STRING },
            font: { type: Type.STRING },
            mood: { type: Type.STRING },
            additional_details: { type: Type.STRING }
          },
          required: ["subject", "art_style", "posing", "lighting", "color_palette", "composition", "camera_angle", "texture", "skin_texture", "font", "mood", "additional_details"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text) as ImagePromptJson;
  } catch (error) {
    console.error("Error converting text to JSON:", error);
    throw error;
  }
};

/**
 * Generates a breakdown of scenes from a movie idea.
 */
export const generateScriptBreakdown = async (idea: string): Promise<ScriptScene[]> => {
    trackRequest(2100, "Script Breakdown");
    try {
        const response = await generateTextContentWithFallback((modelName) => ({
            model: modelName,
            contents: `Break down this movie idea into 3-5 key visual scenes for a script. 
            Idea: ${idea}
            Return a JSON array of scenes.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            scene_number: { type: Type.INTEGER },
                            header: { type: Type.STRING },
                            action: { type: Type.STRING },
                            visual_style: { type: Type.STRING },
                            camera_movement: { type: Type.STRING }
                        },
                        required: ['scene_number', 'header', 'action', 'visual_style', 'camera_movement']
                    }
                }
            }
        }));
        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as ScriptScene[];
    } catch (error) {
        console.error("Error generating script:", error);
        throw error;
    }
};

/**
 * Generates a prompt for Veo 3 video generation.
 */
export const generateVeo3Prompt = async (userPrompt: string, startImageBase64?: string, endImageBase64?: string): Promise<string> => {
    trackRequest(1100, "Veo3 Prompt");
    try {
        const parts: any[] = [{ text: `Enhance this video generation prompt to be highly descriptive for Veo 3 (AI Video Model). 
        Focus on motion, physics, lighting, and camera movement.
        
        User Prompt: ${userPrompt}` }];

        if (startImageBase64) {
             const compressed = await compressBase64Image(startImageBase64);
             const inline = prepareInlineData(compressed, 'image/png');
             if (inline) parts.push(inline);
             parts.push({ text: "The video starts with this image. Describe it briefly to include in the context." });
        }
        if (endImageBase64) {
             const compressed = await compressBase64Image(endImageBase64);
             const inline = prepareInlineData(compressed, 'image/png');
             if (inline) parts.push(inline);
             parts.push({ text: "The video ends with this image. Describe it briefly to include in the context." });
        }

        const response = await generateTextContentWithFallback((modelName) => ({
            model: modelName,
            contents: { parts },
        }));
        return response.text || "";
    } catch (error) {
        console.error("Error generating Veo prompt:", error);
        throw error;
    }
}

/**
 * Helper to resolve the closest standard aspect ratio supported by Gemini
 */
export const getStandardAspectRatio = (
    ratio: number | string | undefined
): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1" => {
    if (!ratio) return "1:1";
    if (typeof ratio === "string") {
        if (["1:1", "3:4", "4:3", "9:16", "16:9", "1:4", "1:8", "4:1", "8:1"].includes(ratio)) {
            return ratio as any;
        }
        const parsed = parseFloat(ratio);
        if (isNaN(parsed)) return "1:1";
        ratio = parsed;
    }
    
    const options: { name: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1"; value: number }[] = [
        { name: "1:1", value: 1.0 },
        { name: "4:3", value: 4/3 },
        { name: "3:4", value: 3/4 },
        { name: "16:9", value: 16/9 },
        { name: "9:16", value: 9/16 },
        { name: "4:1", value: 4.0 },
        { name: "1:4", value: 0.25 },
        { name: "8:1", value: 8.0 },
        { name: "1:8", value: 0.125 }
    ];
    
    let closest = options[0];
    let minDiff = Math.abs(ratio - closest.value);
    
    for (let i = 1; i < options.length; i++) {
        const diff = Math.abs(ratio - options[i].value);
        if (diff < minDiff) {
            minDiff = diff;
            closest = options[i];
        }
    }
    
    return closest.name;
};

/**
 * Upscales an image using either a standard or high-quality engine with robust automatic fallbacks.
 */
export const upscaleImage = async (
    base64Image: string, 
    mimeType: string, 
    is4kOrRes: '4k' | '2k' | boolean = false, 
    customModel?: string,
    aspectRatioInput?: number | string
): Promise<{ image: string; modelUsed: string }> => {
    trackRequest(2500, "Upscale Image");
    
    const modelsToTry = customModel 
        ? [customModel] 
        : ['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-3.1-flash-lite-image'];
        
    const is4k = is4kOrRes === '4k' || is4kOrRes === true;
    const is2k = is4kOrRes === '2k';
    
    let promptText = "";
    if (is4k) {
        promptText = "PERFECT 4K SUPER-RESOLUTION RECONSTRUCTION: Perform an ultra-high-fidelity 4K upscale of this image. CRITICAL RULES:\n" +
            "1. Maintain 100% absolute fidelity to the original content: DO NOT add, remove, or modify any subjects, text, faces, background elements, style, or details.\n" +
            "2. Preserve original colors, lighting, composition, perspective, and aesthetic perfectly.\n" +
            "3. Enhance structural sharpness, clean up edges, and completely eliminate compression artifacts, noise, pixelation, blur, or jpeg blockiness.\n" +
            "4. Synthesize realistic high-frequency micro-textures (like hair strands, skin pores, fabric weave, wood grain, paper texture, or metal brushing) in a style-consistent manner to make the upscaled image appear incredibly crisp, high-definition, and clean.\n" +
            "Output only the perfectly upscaled and sharpened image in pixel-perfect 4K resolution.";
    } else if (is2k) {
        promptText = "PERFECT 2K SUPER-RESOLUTION RECONSTRUCTION: Perform an ultra-high-fidelity 2K upscale of this image. CRITICAL RULES:\n" +
            "1. Maintain 100% absolute fidelity to the original content: DO NOT add, remove, or modify any subjects, text, faces, background elements, style, or details.\n" +
            "2. Preserve original colors, lighting, composition, perspective, and aesthetic perfectly.\n" +
            "3. Enhance structural sharpness, clean up edges, and completely eliminate compression artifacts, noise, pixelation, blur, or jpeg blockiness.\n" +
            "4. Synthesize realistic high-frequency micro-textures (like hair strands, skin pores, fabric weave, wood grain, paper texture, or metal brushing) in a style-consistent manner to make the upscaled image appear incredibly crisp, high-definition, and clean.\n" +
            "Output only the perfectly upscaled and sharpened image in pixel-perfect 2K resolution.";
    } else {
        promptText = "HIGH-FIDELITY SUPER-RESOLUTION UPSCALE: Increase the image resolution while preserving 100% of the original content, style, composition, colors, and layout. Eliminate blurriness and pixelation, sharpen all outlines and micro-details, and output the exact same image in pristine high-resolution.";
    }
    
    const standardAspect = getStandardAspectRatio(aspectRatioInput);
    console.log(`[Upscale] Resolved standard aspect ratio: ${standardAspect} for input: ${aspectRatioInput}`);

    let lastError: any = null;
    
    for (const model of modelsToTry) {
        try {
            console.log(`[Upscale] Attempting super-resolution using engine: ${model}`);
            
            const config: any = {};
            
            if (['gemini-3-pro-image', 'gemini-3.1-flash-image'].includes(model)) {
                config.imageConfig = {
                    aspectRatio: standardAspect,
                    imageSize: is4k ? "4K" : "2K"
                };
            } else if (model === 'gemini-3.1-flash-lite-image') {
                config.imageConfig = {
                    aspectRatio: standardAspect
                };
            }
            
            const inline = prepareInlineData(base64Image, mimeType);
            const parts: any[] = [];
            if (inline) parts.push(inline);
            parts.push({ text: promptText });

            const client = getGeminiClient();
            const response = await callWithRetry(() => client.models.generateContent({
                model: model,
                contents: { parts },
                config: config
            }), 3, 2000);

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        const outMime = part.inlineData.mimeType || 'image/png';
                        return {
                            image: `data:${outMime};base64,${part.inlineData.data}`,
                            modelUsed: model
                        };
                    }
                }
            }
            throw new Error(`Model ${model} returned successfully but did not contain any valid output image data.`);
        } catch (error: any) {
            console.warn(`[Upscale] Engine ${model} failed or rate limited:`, error);
            lastError = error;
        }
    }
    
    throw lastError || new Error("All super-resolution upscale engines failed to execute your request.");
};

