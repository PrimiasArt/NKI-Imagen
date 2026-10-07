/**
 * Advanced Super-Resolution & Optical Upscale Engine for NKI Studio v4.3
 * Provides professional presets (Portrait, Fashion, Cinematic, Anime, Faithful),
 * engine selection (Pro 3, Flash 3.1, Lite), aspect-ratio preserving calculations,
 * and browser-native luminance unsharp mask / micro-contrast clarity boosting.
 */

export type UpscaleTargetRes = '4k' | '2k' | '1k';
export type UpscaleModelId = 'auto' | 'gemini-3-pro-image' | 'gemini-3.1-flash-image' | 'gemini-3.1-flash-lite-image';
export type UpscalePresetId = 'portrait' | 'fashion' | 'cinematic' | 'anime' | 'faithful';
export type UpscaleFidelityLevel = 'subtle' | 'balanced' | 'rich';
export type UpscaleDenoiseLevel = 'low' | 'medium' | 'high';

export interface UpscaleStudioSettings {
  targetRes: UpscaleTargetRes;
  model: UpscaleModelId;
  preset: UpscalePresetId;
  fidelity: UpscaleFidelityLevel;
  denoise: UpscaleDenoiseLevel;
  faceEnhance: boolean;
  clarityBoost: number; // 0 to 50 (%)
  customGuidance: string;
}

export const DEFAULT_UPSCALE_SETTINGS: UpscaleStudioSettings = {
  targetRes: '4k',
  model: 'gemini-3-pro-image',
  preset: 'portrait',
  fidelity: 'rich',
  denoise: 'medium',
  faceEnhance: true,
  clarityBoost: 15,
  customGuidance: ''
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
    description: 'Phục hồi thớ dệt vải (lụa, denim, len, da thuộc), phụ kiện, trang sức ánh kim lấp lánh và đường may.'
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
    desc: 'Tự động chọn Pro 3 cho độ phân giải 4K và Flash 3.1 cho độ phân giải 2K.'
  }
];

export const UPSCALE_RESOLUTION_OPTIONS = [
  {
    id: '4k' as UpscaleTargetRes,
    label: '4K Ultra HD',
    pixels: '3840 × 2160 (Pro 4K)',
    desc: 'Độ phân giải cực đại. Tái tạo tối đa vi chi tiết, lỗ chân lông, thớ vải và tơ tóc cực mịn.'
  },
  {
    id: '2k' as UpscaleTargetRes,
    label: '2K Quad HD',
    pixels: '2560 × 1440 (2K QHD)',
    desc: 'Cân bằng hoàn hảo. Làm sắc nét các chi tiết, tối ưu dung lượng và tốc độ tạo ảnh.'
  },
  {
    id: '1k' as UpscaleTargetRes,
    label: '1K Crisp HD',
    pixels: '1280 × 1024 (HD Crisp)',
    desc: 'Khử mờ nhanh, tối ưu cho avatar, bài đăng social và tiết kiệm hạn mức API.'
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
 * Builds a precision optical super-resolution prompt adapted to user preset & parameters
 */
export function buildEnhancedUpscalePrompt(options: {
  targetRes: UpscaleTargetRes;
  preset?: UpscalePresetId;
  fidelity?: UpscaleFidelityLevel;
  denoise?: UpscaleDenoiseLevel;
  faceEnhance?: boolean;
  customGuidance?: string;
}): string {
  const {
    targetRes = '4k',
    preset = 'portrait',
    fidelity = 'rich',
    denoise = 'medium',
    faceEnhance = true,
    customGuidance = ''
  } = options;

  const resHeader = targetRes === '4k'
    ? 'PERFECT 4K ULTRA-HIGH-RESOLUTION RECONSTRUCTION (3840×2160 / 4K UHD)'
    : (targetRes === '2k'
      ? 'CRISP HIGH-DEFINITION 2K SUPER-RESOLUTION RECONSTRUCTION (2560×1440 / 2K QHD)'
      : 'OPTICAL HIGH-DEFINITION 1K RESTORATION (1024px Crisp)');

  let presetRules = '';
  switch (preset) {
    case 'portrait':
      presetRules = 
        '- BIOMETRIC & DERMAL FIDELITY: Reconstruct organic, lifelike human skin micro-texture, natural microscopic pores, delicate epidermal translucency, and fine peach fuzz. STRICTLY FORBIDDEN: waxy skin, airbrushed plastic blur, doll-like faces, or smoothed-out facial features.\n' +
        '- EYES & GAZE: Render razor-sharp iris radial patterns, crisp specular pupil reflections, clean individual eyelashes, and defined eyebrows with natural hair direction without altering eye shape, gaze, or eye color.\n' +
        '- LIPS & EXPRESSION: Preserve authentic lip grain, vermilion border, and cupids bow with subtle natural hydration highlights.\n' +
        '- HAIR: Render separate, flowing hair strands with realistic specular highlights and natural volume.';
      break;

    case 'fashion':
      presetRules = 
        '- TEXTILE & WEAVE RECONSTRUCTION: Maximize tactile weave clarity of garments (denim twill lines, cotton threads, silk sheen, knit wool texture, fine leather grain, embroidery stitches).\n' +
        '- METALLIC & JEWELRY CLARITY: Sharpen jewelry, metal buckles, zippers, watch components, and faceted gemstones with pristine optical refractions.\n' +
        '- FORM & TAILORING: Preserve crisp creases, drape physics, and silhouette contours cleanly.';
      break;

    case 'cinematic':
      presetRules = 
        '- OPTICAL DEPTH & LENS CHARACTER: Preserve cinematic shallow depth-of-field, authentic optical lens bokeh, and wide dynamic range lighting.\n' +
        '- ENVIRONMENT & ARCHITECTURE: Sharpen architectural lines, brickwork, foliage, tree bark, stone textures, and ambient light bounce while eliminating muddy shadows.\n' +
        '- ORGANIC TEXTURE: Maintain subtle natural film grain while eliminating ugly digital sensor noise.';
      break;

    case 'anime':
      presetRules = 
        '- VECTOR-CRISP LINEART: Sharpen lineart and contours with pristine vector-like smoothness, eliminating any pixel stair-stepping (aliasing) or blur.\n' +
        '- COLOR BLOCKING: Preserve smooth cel-shading gradients and vibrant color balance with zero color bleed or chromatic aberration.\n' +
        '- CLEANUP: Completely eliminate JPEG ringing, artifacting, and halo blocks around ink strokes.';
      break;

    case 'faithful':
    default:
      presetRules = 
        '- ZERO-HALLUCINATION OPTICAL RESTORATION: Do NOT synthesize, invent, or add any new objects, shapes, patterns, or altered elements.\n' +
        '- DEBLUR & SHARPEN: Only de-blur, de-noise, and enhance the micro-contrast of existing optical information in the image with 100% fidelity.';
      break;
  }

  let fidelityDirective = '';
  if (fidelity === 'subtle') {
    fidelityDirective = '- DETAIL SYNTHESIS LEVEL: Strict optical fidelity. Only sharpen existing structures without adding synthetic micro-details.';
  } else if (fidelity === 'rich') {
    fidelityDirective = '- DETAIL SYNTHESIS LEVEL: Rich high-frequency micro-texture synthesis. Inject ultra-fine surface details, realistic material micro-structures, and peak tactile realism.';
  } else {
    fidelityDirective = '- DETAIL SYNTHESIS LEVEL: Balanced natural synthesis. Reconstruct lost micro-details seamlessly with natural physical plausibility.';
  }

  let denoiseDirective = '';
  if (denoise === 'low') {
    denoiseDirective = '- NOISE REDUCTION: Light cleanup. Retain subtle native texture while eliminating JPEG compression blockiness.';
  } else if (denoise === 'high') {
    denoiseDirective = '- NOISE REDUCTION: Aggressive cleanup. Thoroughly eradicate high-ISO grain, chromatic noise, compression artifacts, and blur.';
  } else {
    denoiseDirective = '- NOISE REDUCTION: Balanced cleanup. Remove digital noise and compression artifacts while keeping true surface textures.';
  }

  const faceDirective = faceEnhance
    ? '- FACE PRIORITY ANCHOR: Give top neural focus to the human face(s), guaranteeing zero distortion, maintaining 100% facial identity, and delivering pristine eye clarity.'
    : '';

  const userNotes = customGuidance.trim()
    ? `- CUSTOM USER DIRECTIVE: ${customGuidance.trim()}`
    : '';

  return `${resHeader}: Perform an ultra-high-fidelity optical super-resolution upscale of this image.
CRITICAL INTEGRITY RULES:
1. 100% FIDELITY: Maintain absolute identity, subjects, proportions, lighting, color harmony, and composition. Do not alter facial structure, body shape, or scene layout.
2. ELIMINATE ARTIFACTS: Clean up all compression artifacts, blur, blockiness, and pixelation.
${presetRules}
${fidelityDirective}
${denoiseDirective}
${faceDirective}
${userNotes}
Output strictly the single upscaled, crystal-clear, high-definition image matching these specifications.`;
}

/**
 * Client-Side Luminance Micro-Contrast & Unsharp Clarity Filter
 * Applies a 2-pass spatial frequency clarity boost exclusively to the luminance channel,
 * ensuring zero color distortion, zero chromatic fringing, and deep optical punch.
 */
export async function applyMicroContrastClarity(
  base64Image: string,
  strengthPct: number = 15
): Promise<string> {
  if (strengthPct <= 0 || typeof window === 'undefined') {
    return base64Image;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(base64Image);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const w = canvas.width;
        const h = canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h);
        const src = imgData.data;
        const out = ctx.createImageData(w, h);
        const dst = out.data;

        // Weight factor (0 to 0.45)
        const amount = Math.min(0.45, (strengthPct / 100) * 0.45);

        // Precompute luminance map
        const lum = new Float32Array(w * h);
        for (let i = 0, p = 0; i < src.length; i += 4, p++) {
          // Standard ITU-R BT.709 luminance weights
          lum[p] = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
        }

        // Apply 3x3 Laplacian edge-enhancement to luminance and scale RGB accordingly
        for (let y = 0; y < h; y++) {
          const yPrev = y > 0 ? y - 1 : y;
          const yNext = y < h - 1 ? y + 1 : y;
          const rowCurrent = y * w;
          const rowPrev = yPrev * w;
          const rowNext = yNext * w;

          for (let x = 0; x < w; x++) {
            const xPrev = x > 0 ? x - 1 : x;
            const xNext = x < w - 1 ? x + 1 : x;

            const pIdx = rowCurrent + x;
            const centerLum = lum[pIdx];

            // 4-neighbor cross Laplacian
            const neighborAvg = (
              lum[rowPrev + x] +
              lum[rowNext + x] +
              lum[rowCurrent + xPrev] +
              lum[rowCurrent + xNext]
            ) * 0.25;

            // High-pass difference
            const diff = centerLum - neighborAvg;
            // Enhanced luminance with subtle S-curve contrast boost
            const newLum = centerLum + diff * (amount * 2.2);

            const byteIdx = pIdx * 4;
            const origR = src[byteIdx];
            const origG = src[byteIdx + 1];
            const origB = src[byteIdx + 2];

            if (centerLum > 0.001) {
              const lumRatio = newLum / centerLum;
              // Subtle local contrast blending
              dst[byteIdx] = Math.max(0, Math.min(255, Math.round(origR * (1 - amount) + origR * lumRatio * amount)));
              dst[byteIdx + 1] = Math.max(0, Math.min(255, Math.round(origG * (1 - amount) + origG * lumRatio * amount)));
              dst[byteIdx + 2] = Math.max(0, Math.min(255, Math.round(origB * (1 - amount) + origB * lumRatio * amount)));
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
