import { PersonalPreset, ImagePromptJson } from '../types';

export const PERSONAL_PRESETS_STORAGE_KEY = 'personal_json_presets';

// Safe Storage Wrapper
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch (e) {
      console.warn("Storage access restricted:", e);
      return null;
    }
  },
  setItem: (key: string, val: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch (e) {
      console.warn("Storage write restricted:", e);
    }
  }
};

export const DEFAULT_PERSONAL_PRESETS: PersonalPreset[] = [
  {
    id: 'preset_default_samurai',
    name: 'Cyber Samurai',
    category: 'Character',
    description: 'Futuristic warrior in lacquered carbon-fiber armor with glowing plasma katana',
    createdAt: 1727000000000,
    data: {
      subject: 'Cyberpunk neo-samurai warrior in dark carbon-fiber lacquered armor, holding a glowing plasma katana, holographic crest on kabuto helmet',
      art_style: 'Futuristic cinematic concept art, photorealistic 8k octane render',
      posing: 'Low stance combat pose ready to strike, intense focused gaze',
      lighting: 'High-contrast neon backlighting, glowing blade reflection, moody rim light',
      texture: 'Weathered carbon fiber armor, scratched metallic gloss, rain droplets',
      mood: 'Fierce, honorable, disciplined'
    }
  },
  {
    id: 'preset_default_watercolor',
    name: 'Ethereal Watercolor',
    category: 'Art Style',
    description: 'Dreamy soft-edge watercolor painting with bleeding pastel pigments',
    createdAt: 1727000001000,
    data: {
      art_style: 'Traditional wet-on-wet watercolor painting, loose brush strokes, bleeding pigments',
      lighting: 'Soft diffused daylight, translucent glowing ambiance',
      color_palette: 'Lavender, peach, sage green, gold leaf accents',
      texture: 'Heavy cold-press cotton watercolor paper texture, rough deckle edges',
      mood: 'Whimsical, serene, dreamy'
    }
  },
  {
    id: 'preset_default_retro_anime',
    name: '90s Retro Anime',
    category: 'Art Style',
    description: 'Vintage 1990s cel-shaded animation aesthetic with analog warmth',
    createdAt: 1727000002000,
    data: {
      art_style: 'Vintage 1990s hand-drawn cel animation, classic anime aesthetic',
      lighting: 'Dramatic lens flare, neon synthwave sunset lighting',
      color_palette: 'Warm sunset orange, cyan, magenta, deep navy',
      texture: 'Subtle VHS tape grain, chromatic aberration, retro scanlines',
      mood: 'Nostalgic, romantic, adventurous'
    }
  }
];

export const loadPersonalPresets = (): PersonalPreset[] => {
  const raw = safeStorage.getItem(PERSONAL_PRESETS_STORAGE_KEY);
  if (!raw) {
    // Seed defaults on initial load
    safeStorage.setItem(PERSONAL_PRESETS_STORAGE_KEY, JSON.stringify(DEFAULT_PERSONAL_PRESETS));
    return DEFAULT_PERSONAL_PRESETS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PERSONAL_PRESETS;
  } catch (e) {
    console.error("Failed to parse personal presets from localStorage:", e);
    return DEFAULT_PERSONAL_PRESETS;
  }
};

export const savePersonalPresetsToStorage = (presets: PersonalPreset[]): void => {
  safeStorage.setItem(PERSONAL_PRESETS_STORAGE_KEY, JSON.stringify(presets));
};

export const createPersonalPreset = (
  name: string,
  category: PersonalPreset['category'],
  data: Partial<ImagePromptJson>,
  description?: string
): PersonalPreset => {
  return {
    id: `preset_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    category,
    description: description?.trim() || '',
    data,
    createdAt: Date.now()
  };
};
