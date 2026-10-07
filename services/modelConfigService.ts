/**
 * Model Configuration Service for NKI Studio & AI Photo Studio
 * Controls which Gemini models and image resolutions are used across
 * Studio features (Inpainting, Wardrobe, Sculptor, Gobo, Atmosphere, Segmentation).
 */

export interface StudioModelConfig {
  studioModel: string;
  analysisModel: string;
  maxDimension: number; // e.g. 1536 or 2048 for high-res crisp outputs
  jpegQuality: number;  // e.g. 0.92 for high fidelity
  upscaleModel?: string; // 'gemini-3-pro-image' | 'gemini-3.1-flash-image' | 'auto'
  upscaleTargetRes?: '4k' | '2k' | '1k';
  upscalePreset?: 'portrait' | 'fashion' | 'cinematic' | 'anime' | 'faithful';
  upscaleFaceEnhance?: boolean;
  upscaleClarityBoost?: number;
}

const STORAGE_KEY_STUDIO_CONFIG = 'nki_studio_model_config';

export const DEFAULT_STUDIO_CONFIG: StudioModelConfig = {
  studioModel: 'gemini-3.1-flash-image', // High quality, fast, native image generation
  analysisModel: 'gemini-2.5-flash',
  maxDimension: 1536, // Sharp HD (fixes 480px blurriness)
  jpegQuality: 0.92,
  upscaleModel: 'gemini-3-pro-image',
  upscaleTargetRes: '4k',
  upscalePreset: 'portrait',
  upscaleFaceEnhance: true,
  upscaleClarityBoost: 15
};

export const AVAILABLE_STUDIO_MODELS = [
  {
    id: 'gemini-3-pro-image',
    label: 'Pro 3 Image (Paid Tier)',
    description: 'Chất lượng cao nhất, sắc nét 2K/4K, chi tiết vải và tóc chân thực nhất'
  },
  {
    id: 'gemini-3.1-flash-image',
    label: 'Flash 3.1 Image (Khuyên dùng)',
    description: 'Cân bằng hoàn hảo giữa tốc độ nhanh và độ sắc nét cao'
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    label: 'Flash 3.1 Lite Image',
    description: 'Tốc độ siêu nhanh, tiêu thụ ít token'
  },
  {
    id: 'imagen-3.0-generate-002',
    label: 'Google Imagen 3 (HQ)',
    description: 'Độ chân thực hình ảnh quang học cao cấp'
  },
  {
    id: 'gemini-2.5-flash-image',
    label: 'Flash 2.5 Image',
    description: 'Mô hình thế hệ trước'
  }
];

export const AVAILABLE_ANALYSIS_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Phân tích đa phương thức nhanh và chuẩn xác' },
  { id: 'gemini-3.1-flash', label: 'Gemini 3.1 Flash', description: 'Mô hình tư duy phân tích thế hệ mới' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Phân tích chiều sâu cho bài toán phức tạp' }
];

export const RESOLUTION_OPTIONS = [
  { value: 2048, label: 'Siêu Nét 2K (2048px)', description: 'Chất lượng tối đa, vải vóc và vân da sắc nét tuyệt đối' },
  { value: 1536, label: 'Độ Nét Cao HD (1536px)', description: 'Chuẩn studio chuyên nghiệp, cân bằng tốc độ' },
  { value: 1024, label: 'Tiêu Chuẩn (1024px)', description: 'Tiết kiệm dung lượng và thời gian xử lý' }
];

export function getStudioModelConfig(): StudioModelConfig {
  if (typeof window === 'undefined') return DEFAULT_STUDIO_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDIO_CONFIG);
    if (!raw) return DEFAULT_STUDIO_CONFIG;
    return { ...DEFAULT_STUDIO_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to parse studio model config:', e);
    return DEFAULT_STUDIO_CONFIG;
  }
}

export function saveStudioModelConfig(config: Partial<StudioModelConfig>): StudioModelConfig {
  const current = getStudioModelConfig();
  const updated = { ...current, ...config };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_STUDIO_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('nki_studio_config_updated', { detail: updated }));
  }
  return updated;
}
