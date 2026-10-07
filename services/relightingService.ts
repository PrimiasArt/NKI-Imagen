import { ImagePromptJson } from '../types';

export interface StudioLight {
  id: string;
  name: string;
  type: 'key' | 'fill' | 'rim';
  azimuthDeg: number;   // 0 to 360 degrees around subject
  elevationDeg: number; // -90 (below) to +90 (overhead)
  intensityPct: number; // 0 to 100%
  colorHex: string;
  colorName: string;
}

export interface RelightingPreset {
  id: string;
  name: string;
  description: string;
  lights: StudioLight[];
}

export const DEFAULT_STUDIO_LIGHTS: StudioLight[] = [
  {
    id: 'key_light',
    name: 'Key Light (Đèn Chính)',
    type: 'key',
    azimuthDeg: 45,
    elevationDeg: 35,
    intensityPct: 90,
    colorHex: '#fffaed',
    colorName: 'Warm Tungsten 3200K'
  },
  {
    id: 'fill_light',
    name: 'Fill Light (Đèn Phụ)',
    type: 'fill',
    azimuthDeg: 300,
    elevationDeg: 15,
    intensityPct: 40,
    colorHex: '#93c5fd',
    colorName: 'Cool Skylight 5600K'
  },
  {
    id: 'rim_light',
    name: 'Rim / Hair Light (Đèn Ven)',
    type: 'rim',
    azimuthDeg: 180,
    elevationDeg: 55,
    intensityPct: 75,
    colorHex: '#f43f5e',
    colorName: 'Neon Rose Kicker'
  }
];

export const RELIGHTING_PRESETS: RelightingPreset[] = [
  {
    id: 'rembrandt',
    name: 'Rembrandt Classic',
    description: 'Ánh sáng kinh điển với tam giác sáng đặc trưng dưới gò má ngược sáng.',
    lights: [
      { id: 'key', name: 'Key', type: 'key', azimuthDeg: 45, elevationDeg: 45, intensityPct: 95, colorHex: '#fff7ed', colorName: 'Soft Tungsten' },
      { id: 'fill', name: 'Fill', type: 'fill', azimuthDeg: 315, elevationDeg: 10, intensityPct: 25, colorHex: '#e2e8f0', colorName: 'Weak Ambient' },
      { id: 'rim', name: 'Rim', type: 'rim', azimuthDeg: 190, elevationDeg: 40, intensityPct: 50, colorHex: '#fdba74', colorName: 'Warm Hair Edge' }
    ]
  },
  {
    id: 'cyberpunk_split',
    name: 'Cyberpunk Neon Split',
    description: 'Đánh đèn tương phản đối xứng hai bên: một bên Neon Cyan, một bên Magenta.',
    lights: [
      { id: 'key', name: 'Key Cyan', type: 'key', azimuthDeg: 60, elevationDeg: 20, intensityPct: 90, colorHex: '#06b6d4', colorName: 'Electric Cyan' },
      { id: 'fill', name: 'Fill Magenta', type: 'fill', azimuthDeg: 300, elevationDeg: 20, intensityPct: 85, colorHex: '#ec4899', colorName: 'Hot Magenta' },
      { id: 'rim', name: 'Rim Backlight', type: 'rim', azimuthDeg: 180, elevationDeg: 70, intensityPct: 80, colorHex: '#a855f7', colorName: 'Purple Halo' }
    ]
  },
  {
    id: 'golden_sunset',
    name: 'Golden Hour Silhouette',
    description: 'Ánh hoàng hôn ngả vàng cam từ sau lưng, tạo viền sáng rực rỡ quanh mái tóc.',
    lights: [
      { id: 'key', name: 'Key Warm', type: 'key', azimuthDeg: 175, elevationDeg: 15, intensityPct: 100, colorHex: '#f59e0b', colorName: 'Deep Golden Sunset' },
      { id: 'fill', name: 'Fill Ambient', type: 'fill', azimuthDeg: 0, elevationDeg: 10, intensityPct: 30, colorHex: '#fed7aa', colorName: 'Warm Bounce' },
      { id: 'rim', name: 'Hair Glint', type: 'rim', azimuthDeg: 165, elevationDeg: 45, intensityPct: 90, colorHex: '#fef08a', colorName: 'Sun Flare' }
    ]
  },
  {
    id: 'dark_noir',
    name: 'Film Noir Chiaroscuro',
    description: 'Bóng đổ sắc lạnh, độ tương phản cực đại, phong cách trinh thám Hollywood thập niên 50.',
    lights: [
      { id: 'key', name: 'Key Hard', type: 'key', azimuthDeg: 80, elevationDeg: 30, intensityPct: 100, colorHex: '#ffffff', colorName: 'Hard Spotlight' },
      { id: 'fill', name: 'Fill', type: 'fill', azimuthDeg: 260, elevationDeg: 0, intensityPct: 10, colorHex: '#0f172a', colorName: 'Near Zero Fill' },
      { id: 'rim', name: 'Venetian Rim', type: 'rim', azimuthDeg: 200, elevationDeg: 30, intensityPct: 60, colorHex: '#cbd5e1', colorName: 'Slit Window Light' }
    ]
  }
];

/**
 * Converts 3D light vectors into precise cinematography lighting instructions.
 */
export function generateRelightingFormula(lights: StudioLight[]): string {
  const parts: string[] = [];

  lights.forEach(l => {
    let positionWord = '';
    if (l.azimuthDeg >= 315 || l.azimuthDeg < 45) positionWord = 'front center';
    else if (l.azimuthDeg >= 45 && l.azimuthDeg < 135) positionWord = 'stage right';
    else if (l.azimuthDeg >= 135 && l.azimuthDeg < 225) positionWord = 'back / rear';
    else positionWord = 'stage left';

    let elevationWord = '';
    if (l.elevationDeg > 45) elevationWord = 'high top-down angle';
    else if (l.elevationDeg < 0) elevationWord = 'dramatic low-angle up-light';
    else elevationWord = 'eye-level 45° angle';

    parts.push(
      `${l.name}: placed at ${positionWord} (${l.azimuthDeg}°) and ${elevationWord}, emitting ${l.colorName} at ${l.intensityPct}% intensity`
    );
  });

  return `Professional 3D Studio Relighting: ${parts.join('; ')}. Physically calibrated shadows, accurate subsurface skin scattering, volumetric light falloff and specular highlights.`;
}

/**
 * Injects 3D virtual gaffer lighting into an existing ImagePromptJson.
 */
export function applyRelightingToPrompt(
  prompt: ImagePromptJson,
  lights: StudioLight[]
): ImagePromptJson {
  const formula = generateRelightingFormula(lights);
  return {
    ...prompt,
    lighting: formula,
    additional_details: prompt.additional_details
      ? `${prompt.additional_details}, [3D Virtual Gaffer Relit]`
      : `[3D Virtual Gaffer Relit]`
  };
}
