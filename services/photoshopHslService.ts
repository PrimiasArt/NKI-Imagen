/**
 * Photoshop & Lightroom / Camera Raw 8-Channel HSL Selective Color Engine
 * 100% Zero-API, High Performance Client-Side Canvas 2D & Image Processing
 * 
 * Supports discrete color band isolation and manipulation:
 * 1. Reds (345° - 15°)
 * 2. Oranges (15° - 45°: Skin tones, warm highlights)
 * 3. Yellows (45° - 70°)
 * 4. Greens (70° - 160°: Foliage, nature)
 * 5. Cyans (160° - 200°: Water, teal shadows)
 * 6. Blues (200° - 260°: Sky, denim)
 * 7. Purples (260° - 305°)
 * 8. Magentas (305° - 345°)
 */

export type HslColorBand = 
  | 'reds' 
  | 'oranges' 
  | 'yellows' 
  | 'greens' 
  | 'cyans' 
  | 'blues' 
  | 'purples' 
  | 'magentas';

export interface BandAdjustment {
  hue: number;        // -100 to 100 (maps to -30° .. +30° shift)
  saturation: number; // -100 to 100 (% multiplier)
  luminance: number;  // -100 to 100 (% shift)
}

export type HslSettings = Record<HslColorBand, BandAdjustment>;

export const DEFAULT_BAND_ADJUSTMENT: BandAdjustment = {
  hue: 0,
  saturation: 0,
  luminance: 0
};

export const DEFAULT_HSL_SETTINGS: HslSettings = {
  reds: { ...DEFAULT_BAND_ADJUSTMENT },
  oranges: { ...DEFAULT_BAND_ADJUSTMENT },
  yellows: { ...DEFAULT_BAND_ADJUSTMENT },
  greens: { ...DEFAULT_BAND_ADJUSTMENT },
  cyans: { ...DEFAULT_BAND_ADJUSTMENT },
  blues: { ...DEFAULT_BAND_ADJUSTMENT },
  purples: { ...DEFAULT_BAND_ADJUSTMENT },
  magentas: { ...DEFAULT_BAND_ADJUSTMENT }
};

export interface HslPreset {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  settings: Partial<HslSettings>;
}

export const HSL_PRESETS: HslPreset[] = [
  {
    id: 'reset',
    name: 'Mặc định (Reset)',
    description: 'Khôi phục toàn bộ 8 dải màu về giá trị gốc',
    badgeColor: '#71717a',
    settings: DEFAULT_HSL_SETTINGS
  },
  {
    id: 'skin_glow_porcelain',
    name: 'Sáng Da Trắng Hồng (Skin Glow)',
    description: 'Nâng sáng dải Cam & Đỏ, giảm nhẹ bão hòa vàng giúp da trắng hồng rạng rỡ',
    badgeColor: '#f97316',
    settings: {
      reds: { hue: 4, saturation: -5, luminance: 12 },
      oranges: { hue: 6, saturation: -8, luminance: 20 },
      yellows: { hue: -5, saturation: -15, luminance: 8 }
    }
  },
  {
    id: 'cinematic_teal_orange',
    name: 'Hollywood Teal & Orange',
    description: 'Đẩy da về Cam rực rỡ, dìm bầu trời & bóng đổ về Xanh ngọc điện ảnh',
    badgeColor: '#06b6d4',
    settings: {
      oranges: { hue: -5, saturation: 18, luminance: 10 },
      yellows: { hue: -15, saturation: 10, luminance: 5 },
      cyans: { hue: 15, saturation: 35, luminance: -10 },
      blues: { hue: -20, saturation: 30, luminance: -15 }
    }
  },
  {
    id: 'emerald_nature',
    name: 'Xanh Rừng Nhiệt Đới (Emerald)',
    description: 'Xanh lá tươi tắn, lá cây đậm đà không bị ngả vàng',
    badgeColor: '#10b981',
    settings: {
      yellows: { hue: 25, saturation: 15, luminance: -5 },
      greens: { hue: 15, saturation: 35, luminance: 12 },
      cyans: { hue: -10, saturation: 20, luminance: 5 }
    }
  },
  {
    id: 'deep_blue_sky',
    name: 'Bầu Trời Xanh Thẳm (Deep Sky)',
    description: 'Tăng sắc độ xanh dương sâu thẳm, hạ luminance tạo mây trắng tương phản',
    badgeColor: '#3b82f6',
    settings: {
      cyans: { hue: 10, saturation: 25, luminance: -15 },
      blues: { hue: 0, saturation: 40, luminance: -25 }
    }
  },
  {
    id: 'moody_desaturate',
    name: 'Tối Giản Nghệ Thuật (Selective Solo)',
    description: 'Hạ bão hòa toàn bộ các màu nền, chỉ giữ lại màu ấm của chủ thể',
    badgeColor: '#a855f7',
    settings: {
      reds: { hue: 0, saturation: 10, luminance: 5 },
      oranges: { hue: 0, saturation: 15, luminance: 10 },
      yellows: { hue: 0, saturation: -60, luminance: -10 },
      greens: { hue: 0, saturation: -80, luminance: -20 },
      cyans: { hue: 0, saturation: -75, luminance: -20 },
      blues: { hue: 0, saturation: -80, luminance: -20 },
      purples: { hue: 0, saturation: -70, luminance: -15 },
      magentas: { hue: 0, saturation: -60, luminance: -10 }
    }
  }
];

export const COLOR_BAND_META: Record<HslColorBand, { label: string; hex: string; centerHue: number }> = {
  reds: { label: 'Đỏ (Reds)', hex: '#ef4444', centerHue: 0 },
  oranges: { label: 'Cam (Oranges - Tone Da)', hex: '#f97316', centerHue: 30 },
  yellows: { label: 'Vàng (Yellows)', hex: '#eab308', centerHue: 60 },
  greens: { label: 'Xanh Lá (Greens)', hex: '#22c55e', centerHue: 120 },
  cyans: { label: 'Xanh Ngọc (Cyans)', hex: '#06b6d4', centerHue: 180 },
  blues: { label: 'Xanh Lam (Blues)', hex: '#3b82f6', centerHue: 240 },
  purples: { label: 'Tím (Purples)', hex: '#a855f7', centerHue: 285 },
  magentas: { label: 'Hồng Tím (Magentas)', hex: '#ec4899', centerHue: 325 }
};

/**
 * Fast RGB to HSL conversion
 * R, G, B in [0..255]
 * Returns: H in [0..360), S in [0..1], L in [0..1]
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) {
    return [0, 0, l];
  }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    case b:
      h = ((r - g) / d + 4) * 60;
      break;
  }

  return [h, s, l];
}

/**
 * Fast HSL to RGB conversion
 * H in [0..360), S in [0..1], L in [0..1]
 * Returns: R, G, B in [0..255]
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return [
    Math.max(0, Math.min(255, Math.round((r1 + m) * 255))),
    Math.max(0, Math.min(255, Math.round((g1 + m) * 255))),
    Math.max(0, Math.min(255, Math.round((b1 + m) * 255)))
  ];
}

/**
 * Calculates weights for each color band based on hue with smooth overlapping Gaussian-like transition.
 */
function getBandWeights(hue: number): Record<HslColorBand, number> {
  const bands: Record<HslColorBand, number> = {
    reds: 0,
    oranges: 0,
    yellows: 0,
    greens: 0,
    cyans: 0,
    blues: 0,
    purples: 0,
    magentas: 0
  };

  const getWeight = (center: number, width: number) => {
    let diff = Math.abs(hue - center);
    if (diff > 180) diff = 360 - diff;
    if (diff >= width) return 0;
    // Cosine smoothing from 1 at center to 0 at width
    return 0.5 * (1 + Math.cos((Math.PI * diff) / width));
  };

  bands.reds = getWeight(0, 30);
  bands.oranges = getWeight(30, 25);
  bands.yellows = getWeight(58, 25);
  bands.greens = getWeight(120, 45);
  bands.cyans = getWeight(180, 30);
  bands.blues = getWeight(230, 35);
  bands.purples = getWeight(280, 28);
  bands.magentas = getWeight(325, 30);

  return bands;
}

/**
 * Applies 8-Band HSL Selective Adjustments in-place to ImageData.
 */
export function applyPhotoshopHslToImageData(
  imageData: ImageData,
  settings: HslSettings
): void {
  // Check if all settings are 0
  let isChanged = false;
  const bandKeys = Object.keys(settings) as HslColorBand[];
  for (const b of bandKeys) {
    const adj = settings[b];
    if (adj.hue !== 0 || adj.saturation !== 0 || adj.luminance !== 0) {
      isChanged = true;
      break;
    }
  }
  if (!isChanged) return;

  const data = imageData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const [h, s, l] = rgbToHsl(r, g, b);
    if (s < 0.04) continue; // Skip achromatic gray/black/white for speed & noise prevention

    const weights = getBandWeights(h);

    let deltaH = 0;
    let deltaS = 0;
    let deltaL = 0;
    let totalWeight = 0;

    for (const band of bandKeys) {
      const w = weights[band];
      if (w > 0) {
        const adj = settings[band];
        // 100 slider = 30 degrees hue shift
        deltaH += (adj.hue * 0.3) * w;
        deltaS += (adj.saturation / 100) * w;
        deltaL += (adj.luminance / 100) * w;
        totalWeight += w;
      }
    }

    if (totalWeight > 0) {
      const newH = ((h + deltaH) % 360 + 360) % 360;
      const newS = Math.max(0, Math.min(1, s * (1 + deltaS)));
      const newL = Math.max(0, Math.min(1, l + deltaL * (l < 0.5 ? l : 1 - l) * 0.9));

      const [newR, newG, newB] = hslToRgb(newH, newS, newL);
      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
    }
  }
}
