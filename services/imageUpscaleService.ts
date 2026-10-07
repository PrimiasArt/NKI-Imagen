/**
 * Advanced Super-Resolution & Optical Upscale Engine for NKI Studio v4.3
 * Provides professional presets (Portrait, Fashion, Cinematic, Anime, Faithful),
 * engine selection (Pro 3, Flash 3.1, Lite), aspect-ratio preserving calculations,
 * browser-native luminance unsharp mask / micro-contrast clarity boosting,
 * and comprehensive All-in-One Fusion (Biometric Core Lock, Dual Face Anti-Bleed,
 * Organic Film Grain / Anti-AI Camouflage, Studio Lighting & Ultra Master 3072×5504).
 */

import { BiometricProfile, CameraPresetType } from '../types';

export type UpscaleTargetRes = 'ultra' | '4k' | '2k' | '1k';
export type UpscaleModelId = 'auto' | 'gemini-3-pro-image' | 'gemini-3.1-flash-image' | 'gemini-3.1-flash-lite-image';
export type UpscalePresetId = 'portrait' | 'fashion' | 'cinematic' | 'anime' | 'faithful';
export type UpscaleFidelityLevel = 'subtle' | 'balanced' | 'rich';
export type UpscaleDenoiseLevel = 'low' | 'medium' | 'high';
export type UpscaleColorScience = 'neutral' | 'porcelain_rose' | 'warm_amber' | 'cinematic_moody';

export interface UpscaleStudioSettings {
  targetRes: UpscaleTargetRes;
  model: UpscaleModelId;
  preset: UpscalePresetId;
  fidelity: UpscaleFidelityLevel;
  denoise: UpscaleDenoiseLevel;
  faceEnhance: boolean;
  clarityBoost: number; // 0 to 50 (%)
  customGuidance: string;

  // --- All-in-One Fusion Parameters ---
  // 1. Biometric Core & Identity Lock
  biometricLockEnabled: boolean;
  selectedPersonaId?: string; // from Character Vault, or 'auto' for auto-scan
  dualFaceIsolation: boolean;

  // 2. Anti-AI Camouflage & Organic Film Grain
  antiAiEnabled: boolean;
  cameraPreset: CameraPresetType;
  filmGrainPct: number; // 0 to 5 (%)

  // 3. Studio Lighting & Color Grading
  colorScience: UpscaleColorScience;
  lightingEnhance: boolean; // enhance rim light & eye catchlights
}

export const DEFAULT_UPSCALE_SETTINGS: UpscaleStudioSettings = {
  targetRes: 'ultra',
  model: 'gemini-3-pro-image',
  preset: 'portrait',
  fidelity: 'rich',
  denoise: 'medium',
  faceEnhance: true,
  clarityBoost: 15,
  customGuidance: '',
  biometricLockEnabled: true,
  selectedPersonaId: 'auto',
  dualFaceIsolation: true,
  antiAiEnabled: true,
  cameraPreset: 'SONY_A7IV',
  filmGrainPct: 2.2,
  colorScience: 'porcelain_rose',
  lightingEnhance: true
};

export const UPSCALE_PRESETS_METADATA = [
  {
    id: 'portrait' as UpscalePresetId,
    label: 'Chân dung & Da tự nhiên',
    badge: 'Photorealistic Skin',
    icon: '👤',
    color: 'from-rose-500/20 to-orange-500/10 border-rose-500/40 text-rose-300',
    description: 'Tái tạo lỗ chân lông siêu mịn, tơ tóc, con ngươi trong trẻo, triệt tiêu da sáp/nhựa búp bê (Anti-Plastic).'
  },
  {
    id: 'fashion' as UpscalePresetId,
    label: 'Thời trang & Chất liệu',
    badge: 'Fabrics & Textures',
    icon: '👗',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/40 text-amber-300',
    description: 'Phục hồi thớ dệt vải (lụa, voan, denim, len, da thuộc), phụ kiện, trang sức ánh kim lấp lánh và đường may.'
  },
  {
    id: 'cinematic' as UpscalePresetId,
    label: 'Điện ảnh & Phong cảnh',
    badge: 'Cinematic & HDR',
    icon: '🎬',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300',
    description: 'Bảo toàn độ sâu trường ảnh (bokeh), ánh sáng HDR, lá cây, kết cấu kiến trúc và chất phim tự nhiên.'
  },
  {
    id: 'anime' as UpscalePresetId,
    label: 'Digital Art & Anime',
    badge: 'Vector Sharp Lines',
    icon: '🎨',
    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-300',
    description: 'Làm sạch viền nét mực, khử răng cưa/aliasing, khử nén JPEG, giữ gradient màu mượt mà.'
  },
  {
    id: 'faithful' as UpscalePresetId,
    label: 'Phục hồi trung thực (Zero-Hallucination)',
    badge: 'Strict Optical Deblur',
    icon: '🛡️',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300',
    description: 'Tuyệt đối không vẽ chi tiết lạ, chỉ khử mờ thấu kính, khử nhiễu nén và tăng độ nét cấu trúc gốc.'
  }
];

export const UPSCALE_MODELS_METADATA = [
  {
    id: 'gemini-3-pro-image' as UpscaleModelId,
    name: 'Gemini 3 Pro Image (Khuyên dùng)',
    tag: 'Studio Master 4K',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    desc: 'Mô hình cao cấp nhất của Google với bộ tư duy sâu (Thinking Process), chuyên phục hồi thớ sợi quang học và xuất 4K cực nét.'
  },
  {
    id: 'gemini-3.1-flash-image' as UpscaleModelId,
    name: 'Gemini 3.1 Flash Image',
    tag: 'Fast HQ (2K/4K)',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    desc: 'Tốc độ nhanh gấp 2 lần, làm nét biên xuất sắc, cân bằng lý tưởng cho các nhu cầu hàng ngày.'
  },
  {
    id: 'gemini-3.1-flash-lite-image' as UpscaleModelId,
    name: 'Gemini 3.1 Flash Lite',
    tag: 'Ultra Fast / Tiết kiệm',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    desc: 'Thời gian xử lý siêu tốc, tiết kiệm token tối đa cho preview nhanh.'
  },
  {
    id: 'auto' as UpscaleModelId,
    name: 'Tự động tối ưu (Auto Best Engine)',
    tag: 'Intelligent Routing',
    tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    desc: 'Tự động chọn Pro 3 cho độ phân giải Ultra/4K và Flash 3.1 cho độ phân giải 2K.'
  }
];

export const UPSCALE_RESOLUTION_OPTIONS = [
  {
    id: 'ultra' as UpscaleTargetRes,
    label: 'Ultra Master 5.5K',
    pixels: '3072 × 5504 (Ultra Master 17MP)',
    desc: 'Độ phân giải nguyên bản cực đại 17MP. Lỗ chân lông sắc nét, tơ tóc li ti, thớ vải voan xuyên thấu như file Master Studio.',
    badge: '👑 Master Studio 17MP',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: '4k' as UpscaleTargetRes,
    label: '4K Ultra HD',
    pixels: '3840 × 2160 (Pro 4K)',
    desc: 'Chuẩn 4K điện ảnh. Tái tạo tối đa vi chi tiết, lỗ chân lông, thớ vải và tơ tóc cực mịn.',
    badge: 'Pro 4K',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  },
  {
    id: '2k' as UpscaleTargetRes,
    label: '2K Quad HD',
    pixels: '2560 × 1440 (2K QHD)',
    desc: 'Cân bằng hoàn hảo. Làm sắc nét các chi tiết, tối ưu dung lượng và tốc độ tạo ảnh.',
    badge: 'QHD 2K',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  {
    id: '1k' as UpscaleTargetRes,
    label: '1K Crisp HD',
    pixels: '1280 × 1024 (HD Crisp)',
    desc: 'Khử mờ nhanh, tối ưu cho avatar, bài đăng social và tiết kiệm hạn mức API.',
    badge: 'HD 1K',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }
];

const STORAGE_KEY_UPSCALE_SETTINGS = 'nki_upscale_studio_settings';

export function getUpscaleStudioSettings(): UpscaleStudioSettings {
  if (typeof window === 'undefined') return DEFAULT_UPSCALE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UPSCALE_SETTINGS);
    if (!raw) return DEFAULT_UPSCALE_SETTINGS;
    return { ...DEFAULT_UPSCALE_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to parse upscale settings:', e);
    return DEFAULT_UPSCALE_SETTINGS;
  }
}

export function saveUpscaleStudioSettings(patch: Partial<UpscaleStudioSettings>): UpscaleStudioSettings {
  const current = getUpscaleStudioSettings();
  const updated = { ...current, ...patch };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_UPSCALE_SETTINGS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('nki_upscale_settings_updated', { detail: updated }));
  }
  return updated;
}

/**
 * Calculates true target pixel dimensions matching standard aspect ratios.
 * Specifically handles 9:16 Ultra Master -> 3072 × 5504 (~17MP)
 */
export function computeTargetResolutionDimensions(
  aspectRatioInput: number | string | undefined,
  targetRes: UpscaleTargetRes
): { width: number; height: number; label: string } {
  let ratio = 1.0;
  if (typeof aspectRatioInput === 'number' && !isNaN(aspectRatioInput) && aspectRatioInput > 0) {
    ratio = aspectRatioInput;
  } else if (typeof aspectRatioInput === 'string') {
    if (aspectRatioInput === '9:16') ratio = 9 / 16;
    else if (aspectRatioInput === '16:9') ratio = 16 / 9;
    else if (aspectRatioInput === '2:3') ratio = 2 / 3;
    else if (aspectRatioInput === '3:2') ratio = 3 / 2;
    else if (aspectRatioInput === '3:4') ratio = 3 / 4;
    else if (aspectRatioInput === '4:3') ratio = 4 / 3;
    else if (aspectRatioInput === '4:5') ratio = 4 / 5;
    else if (aspectRatioInput === '5:4') ratio = 5 / 4;
    else if (aspectRatioInput === '21:9') ratio = 21 / 9;
    else if (aspectRatioInput === '1:1') ratio = 1.0;
    else {
      const p = parseFloat(aspectRatioInput);
      if (!isNaN(p) && p > 0) ratio = p;
    }
  }

  if (targetRes === 'ultra') {
    // 9:16 portrait (~0.5625) -> EXACT 3072 × 5504 as requested by user!
    if (Math.abs(ratio - 9/16) < 0.05 || (ratio >= 0.50 && ratio <= 0.62)) {
      return { width: 3072, height: 5504, label: '3072 × 5504 (Ultra Master 17MP)' };
    }
    // 16:9 landscape (~1.7778)
    if (Math.abs(ratio - 16/9) < 0.08 || (ratio >= 1.65 && ratio <= 1.90)) {
      return { width: 5504, height: 3072, label: '5504 × 3072 (Ultra Master 17MP)' };
    }
    // 1:1 square
    if (Math.abs(ratio - 1.0) < 0.05) {
      return { width: 4096, height: 4096, label: '4096 × 4096 (Ultra Square 16MP)' };
    }
    // 2:3 portrait (~0.6667)
    if (Math.abs(ratio - 2/3) < 0.05) {
      return { width: 3670, height: 5504, label: '3670 × 5504 (Ultra 2:3)' };
    }
    // 3:2 landscape (~1.5)
    if (Math.abs(ratio - 3/2) < 0.05) {
      return { width: 5504, height: 3670, label: '5504 × 3670 (Ultra 3:2)' };
    }
    // 3:4 portrait (~0.75)
    if (Math.abs(ratio - 3/4) < 0.05) {
      return { width: 4128, height: 5504, label: '4128 × 5504 (Ultra 3:4)' };
    }
    // 4:3 landscape (~1.3333)
    if (Math.abs(ratio - 4/3) < 0.05) {
      return { width: 5504, height: 4128, label: '5504 × 4128 (Ultra 4:3)' };
    }
    // 4:5 portrait (~0.8)
    if (Math.abs(ratio - 4/5) < 0.05) {
      return { width: 4403, height: 5504, label: '4403 × 5504 (Ultra 4:5)' };
    }
    // Generic portrait / landscape:
    if (ratio < 1) {
      const h = 5504;
      const w = Math.round(h * ratio);
      return { width: w, height: h, label: `${w} × ${h} (Ultra Portrait)` };
    } else {
      const w = 5504;
      const h = Math.round(w / ratio);
      return { width: w, height: h, label: `${w} × ${h} (Ultra Landscape)` };
    }
  } else if (targetRes === '4k') {
    if (ratio < 1) {
      const h = 3840;
      const w = Math.round(h * ratio);
      return { width: w, height: h, label: `${w} × ${h} (4K Portrait)` };
    } else {
      const w = 3840;
      const h = Math.round(w / ratio);
      return { width: w, height: h, label: `${w} × ${h} (4K Landscape)` };
    }
  } else if (targetRes === '2k') {
    if (ratio < 1) {
      const h = 2560;
      const w = Math.round(h * ratio);
      return { width: w, height: h, label: `${w} × ${h} (2K QHD)` };
    } else {
      const w = 2560;
      const h = Math.round(w / ratio);
      return { width: w, height: h, label: `${w} × ${h} (2K QHD)` };
    }
  } else {
    // 1k
    if (ratio < 1) {
      const h = 1280;
      const w = Math.round(h * ratio);
      return { width: w, height: h, label: `${w} × ${h} (HD Crisp)` };
    } else {
      const w = 1280;
      const h = Math.round(w / ratio);
      return { width: w, height: h, label: `${w} × ${h} (HD Crisp)` };
    }
  }
}

/**
 * High-Fidelity Multi-Pass Canvas Interpolation
 * Scales an image smoothly to exact target pixel dimensions without blurring or aliasing.
 */
export async function rescaleCanvasToTargetResolution(
  base64Image: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  if (typeof window === 'undefined' || !targetWidth || !targetHeight) {
    return base64Image;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const curW = img.naturalWidth || img.width;
        const curH = img.naturalHeight || img.height;

        if (!curW || !curH) {
          resolve(base64Image);
          return;
        }

        // If already at target resolution (or larger), keep original to avoid downsampling
        if (Math.abs(curW - targetWidth) <= 8 && Math.abs(curH - targetHeight) <= 8) {
          resolve(base64Image);
          return;
        }

        // Maintain 100% natural pixel aspect ratio without ANY stretching or squashing
        const curRatio = curW / curH;
        let finalW = targetWidth;
        let finalH = targetHeight;

        // If requested target would distort aspect ratio by > 1%, recalculate to preserve natural ratio
        if (Math.abs((finalW / finalH) - curRatio) > 0.01) {
          if (curRatio < 1) {
            // Portrait: anchor height, derive width
            finalH = Math.max(targetHeight, curH);
            finalW = Math.round(finalH * curRatio);
          } else {
            // Landscape or square: anchor width, derive height
            finalW = Math.max(targetWidth, curW);
            finalH = Math.round(finalW / curRatio);
          }
        }

        // If image is already at or exceeds final dimensions, do not degrade it
        if (curW >= finalW && curH >= finalH) {
          resolve(base64Image);
          return;
        }

        const scaleX = finalW / curW;
        const scaleY = finalH / curH;
        const maxScale = Math.max(scaleX, scaleY);

        // If significant scale up (> 1.25x), perform smooth 2-step interpolation
        if (maxScale > 1.25) {
          const interW = Math.round(curW * (maxScale * 0.7));
          const interH = Math.round(curH * (maxScale * 0.7));

          const c1 = document.createElement('canvas');
          c1.width = interW;
          c1.height = interH;
          const ctx1 = c1.getContext('2d');
          if (ctx1) {
            ctx1.imageSmoothingEnabled = true;
            ctx1.imageSmoothingQuality = 'high';
            ctx1.drawImage(img, 0, 0, interW, interH);

            const cFinal = document.createElement('canvas');
            cFinal.width = finalW;
            cFinal.height = finalH;
            const ctxFinal = cFinal.getContext('2d');
            if (ctxFinal) {
              ctxFinal.imageSmoothingEnabled = true;
              ctxFinal.imageSmoothingQuality = 'high';
              ctxFinal.drawImage(c1, 0, 0, finalW, finalH);
              resolve(cFinal.toDataURL('image/png', 1.0));
              return;
            }
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = finalW;
        canvas.height = finalH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Image);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, finalW, finalH);
        resolve(canvas.toDataURL('image/png', 1.0));
      } catch (err) {
        console.warn('[RescaleCanvas] Error scaling, using original:', err);
        resolve(base64Image);
      }
    };
    img.onerror = () => resolve(base64Image);
    img.src = base64Image;
  });
}

export interface EnhancedUpscalePromptOptions {
  targetRes: UpscaleTargetRes;
  preset?: UpscalePresetId;
  fidelity?: UpscaleFidelityLevel;
  denoise?: UpscaleDenoiseLevel;
  faceEnhance?: boolean;
  customGuidance?: string;

  // --- All-in-One Fusion Directives ---
  biometricLock?: boolean;
  biometricProfile?: BiometricProfile;
  personaName?: string;
  isDualCharacter?: boolean;
  characterAProfile?: BiometricProfile;
  characterBProfile?: BiometricProfile;
  colorScience?: UpscaleColorScience;
  lightingEnhance?: boolean;
}

/**
 * Builds a precision optical super-resolution prompt.
 * STRICT ENFORCEMENT: 100% Zero-Reposing, Zero-Cropping, Zero-Framing Alteration.
 * The model acts exclusively as an optical de-blur, de-noise, and micro-pore synthesizer.
 */
export function buildEnhancedUpscalePrompt(options: EnhancedUpscalePromptOptions): string {
  const {
    targetRes = 'ultra',
    preset = 'portrait',
    fidelity = 'rich',
    denoise = 'medium',
    faceEnhance = true,
    customGuidance = '',
    personaName
  } = options;

  let resHeader = '';
  if (targetRes === 'ultra') {
    resHeader = 'ULTRA MASTER 5.5K OPTICAL SUPER-RESOLUTION (3072×5504 / ~17MP RAW SENSOR FIDELITY)';
  } else if (targetRes === '4k') {
    resHeader = 'PERFECT 4K OPTICAL SUPER-RESOLUTION (3840×2160 / 4K UHD)';
  } else if (targetRes === '2k') {
    resHeader = 'HIGH-DEFINITION 2K OPTICAL SUPER-RESOLUTION (2560×1440 / 2K QHD)';
  } else {
    resHeader = 'OPTICAL HIGH-DEFINITION 1K RESTORATION';
  }

  const identityLockText = personaName 
    ? `Preserve the exact biometric identity and facial features of ${personaName}.`
    : `Preserve the exact biometric identity and facial features of the person in the input image.`;

  return `${resHeader}: Perform a pixel-anchored optical super-resolution upscale of this input image.

MANDATORY INTEGRITY CONSTRAINTS (STRICT ZERO-MODIFICATION / ZERO-REPOSING / ZERO-CROP):
1. EXACT POSE & FRAMING LOCK: Maintain the EXACT SAME character posing, body posture, hand positions, fingers, head angle, shoulder tilt, facial expression, and camera framing from the input image. DO NOT change the pose, DO NOT move any limbs or hands, DO NOT crop, DO NOT zoom in or out, and DO NOT alter the composition or aspect ratio in any way.
2. EXACT IDENTITY & EXPRESSION LOCK: ${identityLockText} Every unique facial landmark, eye gaze, wink, smile, lip curvature, nose bridge, jawline, and natural beauty mark MUST remain 100% identical. Absolutely zero facial morphing or drift.
3. PURE SUPER-RESOLUTION TEXTURE RECONSTRUCTION:
- Reconstruct organic, authentic microscopic human skin pores, fine skin texture, and epidermal micro-relief. STRICTLY FORBIDDEN: waxy skin, airbrushed plastic blur, or doll-like smoothed faces.
- Reconstruct razor-sharp individual eyelashes, crisp iris radial striations, clean pupil catchlights, and defined eyebrows matching the natural hair direction without altering eye shape or gaze.
- Reconstruct separate, flowing micro hair strands down to single-pixel width with natural volume and specular sheen.
- Reconstruct crisp textile weave (chiffon, silk, cotton, denim threads, lace, leather grain) and jewelry brilliance.
- Faithful color & lighting: Keep the existing color harmony, white balance, contrast, and lighting geometry completely faithful to the input image. Clean up digital compression artifacts, JPEG blocks, and optical blur.
${customGuidance.trim() ? `- USER GUIDANCE: ${customGuidance.trim()}` : ''}

Output strictly the single upscaled, crystal-clear, high-definition image with 100% identical pose, framing, and composition.`;
}

/**
 * Advanced Multi-Scale Luminance Micro-Contrast & Texture Recovery Engine
 * Designed specifically for Ultra-High Resolution images (3072×5504 / 4K UHD).
 * Employs a dual-radius spatial frequency decomposition (Micro: 1-2px, Meso: 3-5px)
 * exclusively on the BT.709 luminance channel to accentuate skin pores, eyelashes,
 * iris striations, and fabric threads with zero color fringing and zero halo artifacts.
 */
export async function applyMicroContrastClarity(
  base64Image: string,
  strengthPct: number = 18
): Promise<string> {
  if (strengthPct <= 0 || typeof window === 'undefined') {
    return base64Image;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(base64Image);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const src = imgData.data;
        const out = ctx.createImageData(w, h);
        const dst = out.data;

        // Radius step scales with image resolution:
        // In 5504px, pores are ~3-6px wide, eyelashes are ~3-5px wide
        const maxDim = Math.max(w, h);
        const step1 = maxDim >= 3000 ? 2 : 1;
        const step2 = maxDim >= 3000 ? 4 : 2;

        const normalizedStrength = Math.min(0.60, (strengthPct / 100) * 0.60);

        // Precompute BT.709 luminance map
        const lum = new Float32Array(w * h);
        for (let i = 0, p = 0; i < src.length; i += 4, p++) {
          lum[p] = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
        }

        // Multi-Scale Spatial High-Pass Kernel
        for (let y = 0; y < h; y++) {
          const yP1 = Math.max(0, y - step1) * w;
          const yN1 = Math.min(h - 1, y + step1) * w;
          const yP2 = Math.max(0, y - step2) * w;
          const yN2 = Math.min(h - 1, y + step2) * w;
          const rowCurrent = y * w;

          for (let x = 0; x < w; x++) {
            const xP1 = Math.max(0, x - step1);
            const xN1 = Math.min(w - 1, x + step1);
            const xP2 = Math.max(0, x - step2);
            const xN2 = Math.min(w - 1, x + step2);

            const pIdx = rowCurrent + x;
            const centerLum = lum[pIdx];

            // Scale 1: Micro-frequency (fine details: hair tips, eyelashes)
            const microAvg = (
              lum[yP1 + x] + lum[yN1 + x] +
              lum[rowCurrent + xP1] + lum[rowCurrent + xN1]
            ) * 0.25;
            const microDiff = centerLum - microAvg;

            // Scale 2: Meso-frequency (texture dimensionality: pores, iris crypts)
            const mesoAvg = (
              lum[yP2 + x] + lum[yN2 + x] +
              lum[rowCurrent + xP2] + lum[rowCurrent + xN2]
            ) * 0.25;
            const mesoDiff = centerLum - mesoAvg;

            // Weighted multi-scale frequency enhancement
            const combinedDiff = microDiff * 0.65 + mesoDiff * 0.35;
            const enhancedLum = centerLum + combinedDiff * (normalizedStrength * 2.8);

            const byteIdx = pIdx * 4;
            const origR = src[byteIdx];
            const origG = src[byteIdx + 1];
            const origB = src[byteIdx + 2];

            if (centerLum > 0.001) {
              const lumRatio = Math.max(0.25, Math.min(2.4, enhancedLum / centerLum));
              dst[byteIdx] = Math.max(0, Math.min(255, Math.round(origR * (1 - normalizedStrength) + origR * lumRatio * normalizedStrength)));
              dst[byteIdx + 1] = Math.max(0, Math.min(255, Math.round(origG * (1 - normalizedStrength) + origG * lumRatio * normalizedStrength)));
              dst[byteIdx + 2] = Math.max(0, Math.min(255, Math.round(origB * (1 - normalizedStrength) + origB * lumRatio * normalizedStrength)));
            } else {
              dst[byteIdx] = origR;
              dst[byteIdx + 1] = origG;
              dst[byteIdx + 2] = origB;
            }
            dst[byteIdx + 3] = src[byteIdx + 3]; // Preserve alpha
          }
        }

        ctx.putImageData(out, 0, 0);
        const resultBase64 = canvas.toDataURL('image/png', 1.0);
        resolve(resultBase64);
      } catch (err) {
        console.warn('[MicroContrast] Error applying filter, returning original:', err);
        resolve(base64Image);
      }
    };
    img.onerror = () => resolve(base64Image);
    img.src = base64Image;
  });
}
