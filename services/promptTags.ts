export type TagCategory = 'lighting' | 'art_style' | 'texture' | 'composition' | 'mood';

export interface PromptTag {
  id: string;
  name: string;
  category: TagCategory;
  description: string;
  keywords?: string[];
}

export const CATEGORY_META: Record<TagCategory, { label: string; icon: string; color: string; bg: string; border: string }> = {
  lighting: {
    label: 'Lighting',
    icon: '⚡',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30'
  },
  art_style: {
    label: 'Art Style',
    icon: '🎨',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30'
  },
  texture: {
    label: 'Texture',
    icon: '💎',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30'
  },
  composition: {
    label: 'Composition',
    icon: '📐',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30'
  },
  mood: {
    label: 'Mood & Color',
    icon: '✨',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30'
  }
};

export const COMMON_PROMPT_TAGS: PromptTag[] = [
  // --- LIGHTING ---
  {
    id: 'l_volumetric',
    name: 'Volumetric god rays',
    category: 'lighting',
    description: 'Cinematic shafts of sunlight streaming through mist or dust motes',
    keywords: ['volumetric', 'rays', 'sunbeams', 'atmosphere', 'sun', 'light']
  },
  {
    id: 'l_chiaroscuro',
    name: 'Dramatic chiaroscuro',
    category: 'lighting',
    description: 'Extreme contrast between dark shadows and bold luminous highlights',
    keywords: ['chiaroscuro', 'dramatic', 'contrast', 'shadows', 'baroque']
  },
  {
    id: 'l_ambient_daylight',
    name: 'Soft ambient daylight',
    category: 'lighting',
    description: 'Gentle, even, natural daylight without harsh shadows',
    keywords: ['soft', 'ambient', 'daylight', 'natural', 'overcast']
  },
  {
    id: 'l_golden_hour',
    name: 'Golden hour warm rim light',
    category: 'lighting',
    description: 'Sunset warm golden glow highlighting subject silhouettes',
    keywords: ['golden', 'hour', 'sunset', 'warm', 'rim', 'silhouette']
  },
  {
    id: 'l_cyberpunk_neon',
    name: 'Cyberpunk neon lighting',
    category: 'lighting',
    description: 'Vibrant neon reflections with electric cyan and magenta glows',
    keywords: ['neon', 'cyberpunk', 'glow', 'magenta', 'cyan', 'synthwave']
  },
  {
    id: 'l_subsurface',
    name: 'Subsurface scattering (SSS)',
    category: 'lighting',
    description: 'Light penetrating translucent surfaces like skin, jade, or marble',
    keywords: ['subsurface', 'scattering', 'sss', 'skin', 'translucent']
  },
  {
    id: 'l_bioluminescent',
    name: 'Bioluminescent soft glow',
    category: 'lighting',
    description: 'Organic gentle luminescence emitted by glowing flora or fauna',
    keywords: ['bioluminescent', 'glow', 'organic', 'ethereal', 'deepsea']
  },
  {
    id: 'l_studio_highkey',
    name: 'Studio strobe high-key',
    category: 'lighting',
    description: 'Bright commercial studio lighting with crisp softbox illumination',
    keywords: ['studio', 'strobe', 'high-key', 'commercial', 'softbox']
  },
  {
    id: 'l_candlelight',
    name: 'Moody candlelight glow',
    category: 'lighting',
    description: 'Flickering, intimate warm flame light with deep ambient gloom',
    keywords: ['candle', 'candlelight', 'flame', 'intimate', 'warm', 'flicker']
  },
  {
    id: 'l_rembrandt',
    name: 'Rembrandt side lighting',
    category: 'lighting',
    description: 'Classic triangular highlight beneath the shadow-side cheekbone',
    keywords: ['rembrandt', 'portrait', 'triangle', 'classic', 'art']
  },
  {
    id: 'l_dappled',
    name: 'Dappled canopy sunlight',
    category: 'lighting',
    description: 'Sunlight filtering through forest leaves creating scattered patterns',
    keywords: ['dappled', 'forest', 'leaves', 'sunlight', 'komorebi']
  },
  {
    id: 'l_backlit',
    name: 'Backlit halo silhouette',
    category: 'lighting',
    description: 'Strong rear illumination creating an edge glow and radiant outline',
    keywords: ['backlit', 'halo', 'rim', 'silhouette', 'edge', 'glow']
  },

  // --- ART STYLE ---
  {
    id: 's_photorealistic_8k',
    name: 'Photorealistic 8k octane render',
    category: 'art_style',
    description: 'Hyper-detailed realistic rendering with natural physics and optics',
    keywords: ['photorealistic', '8k', 'octane', 'realistic', 'unreal', 'hdr']
  },
  {
    id: 's_ghibli',
    name: 'Studio Ghibli cel-shaded animation',
    category: 'art_style',
    description: 'Lush painterly landscapes with nostalgic hand-drawn character design',
    keywords: ['ghibli', 'anime', 'cel', 'miyazaki', 'handdrawn', 'painterly']
  },
  {
    id: 's_cyberpunk',
    name: 'Cyberpunk retro-synthwave',
    category: 'art_style',
    description: 'Futuristic high-tech low-life aesthetic with retro 80s neon cues',
    keywords: ['cyberpunk', 'synthwave', 'sci-fi', 'futuristic', 'retro']
  },
  {
    id: 's_baroque_oil',
    name: 'Dark Baroque oil painting',
    category: 'art_style',
    description: 'Rich classical oil masterwork with thick brushwork and dramatic depth',
    keywords: ['baroque', 'oil', 'painting', 'classical', 'fineart', 'canvas']
  },
  {
    id: 's_pixar_3d',
    name: 'Modern 3D Pixar stylized render',
    category: 'art_style',
    description: 'Expressive Disney/Pixar character aesthetics with velvety shaders',
    keywords: ['pixar', 'disney', '3d', 'stylized', 'cartoon', 'animation']
  },
  {
    id: 's_charcoal',
    name: 'Charcoal & graphite pencil sketch',
    category: 'art_style',
    description: 'Expressive monochromatic hand-drawn strokes with smudged shading',
    keywords: ['charcoal', 'graphite', 'sketch', 'pencil', 'drawing', 'monochrome']
  },
  {
    id: 's_vogue_editorial',
    name: 'Vogue high-fashion editorial',
    category: 'art_style',
    description: 'Sleek haute-couture fashion photography with sharp color grading',
    keywords: ['vogue', 'editorial', 'fashion', 'model', 'couture', 'photography']
  },
  {
    id: 's_vintage_anime',
    name: 'Vintage 90s retro anime aesthetic',
    category: 'art_style',
    description: 'Classic 1990s analog anime with soft chromatic bloom and film warmth',
    keywords: ['vintage', '90s', 'retro', 'anime', 'cel', 'analog']
  },
  {
    id: 's_concept_matte',
    name: 'Concept art matte digital painting',
    category: 'art_style',
    description: 'Epic cinematic video game keyframe concept art with vast scale',
    keywords: ['concept', 'matte', 'keyframe', 'game', 'digital', 'environment']
  },
  {
    id: 's_watercolor',
    name: 'Traditional wet-on-wet watercolor',
    category: 'art_style',
    description: 'Bleeding pigments with translucent washes and paper blooms',
    keywords: ['watercolor', 'aquarelle', 'wash', 'pigment', 'wet', 'traditional']
  },
  {
    id: 's_claymation',
    name: 'Claymation tactile stop-motion',
    category: 'art_style',
    description: 'Handcrafted plasticine clay models with visible sculpted fingerprints',
    keywords: ['claymation', 'clay', 'stopmotion', 'aardman', 'tactile', 'plasticine']
  },
  {
    id: 's_ukiyo_e',
    name: 'Ukiyo-e Japanese woodblock print',
    category: 'art_style',
    description: 'Traditional Edo-period woodcut carving with decorative line art',
    keywords: ['ukiyo-e', 'woodblock', 'japanese', 'print', 'hokusai', 'edo']
  },

  // --- TEXTURE ---
  {
    id: 't_razor_sharp',
    name: 'Razor sharp fine details',
    category: 'texture',
    description: 'Pixel-perfect clarity showing intricate micro-surface elements',
    keywords: ['razor', 'sharp', 'crisp', 'details', 'micro', 'fine']
  },
  {
    id: 't_film_grain',
    name: 'Heavy 35mm film grain',
    category: 'texture',
    description: 'Authentic analog film stock texture with tactile vintage grain',
    keywords: ['grain', 'film', '35mm', 'analog', 'vintage', 'noise']
  },
  {
    id: 't_pore_skin',
    name: 'Pore-level hyper-detailed skin',
    category: 'texture',
    description: 'Realistic skin with subtle pores, peach fuzz, and natural moisture',
    keywords: ['pore', 'skin', 'fuzz', 'detailed', 'dermis', 'wrinkles']
  },
  {
    id: 't_porcelain',
    name: 'Smooth polished porcelain',
    category: 'texture',
    description: 'Immaculately smooth ceramic finish with glassy specular sheen',
    keywords: ['porcelain', 'ceramic', 'smooth', 'glossy', 'polished']
  },
  {
    id: 't_coldpress_paper',
    name: 'Cold-press rough paper texture',
    category: 'texture',
    description: 'Textured handmade cotton paper with organic fibrous grooves',
    keywords: ['paper', 'coldpress', 'rough', 'fibrous', 'cotton']
  },
  {
    id: 't_brushed_metal',
    name: 'Brushed metal with scratches',
    category: 'texture',
    description: 'Industrial anodized aluminum or steel with micro-abrasions',
    keywords: ['brushed', 'metal', 'steel', 'scratches', 'industrial', 'chrome']
  },
  {
    id: 't_weathered_leather',
    name: 'Weathered distressed leather',
    category: 'texture',
    description: 'Aged cracked leather with natural creasing and patinated wear',
    keywords: ['leather', 'distressed', 'weathered', 'creased', 'patina']
  },
  {
    id: 't_wet_reflective',
    name: 'Wet rain-slicked surface',
    category: 'texture',
    description: 'Glistening water droplets, puddles, and mirror-like reflections',
    keywords: ['wet', 'rain', 'puddle', 'reflective', 'droplets', 'gloss']
  },
  {
    id: 't_velvet',
    name: 'Soft plush velvet fabric',
    category: 'texture',
    description: 'Deep light-absorbing fabric with soft direction-shifting sheen',
    keywords: ['velvet', 'fabric', 'plush', 'textile', 'soft']
  },
  {
    id: 't_crystalline',
    name: 'Translucent crystalline refraction',
    category: 'texture',
    description: 'Faceted prismatic crystal or gem with internal rainbow caustics',
    keywords: ['crystalline', 'crystal', 'gem', 'refraction', 'prismatic', 'facets']
  },

  // --- COMPOSITION ---
  {
    id: 'c_wide_cinematic',
    name: 'Cinematic wide-angle establishing shot',
    category: 'composition',
    description: 'Expansive 21:9 anamorphic frame showing deep environmental scale',
    keywords: ['wide', 'cinematic', 'establishing', 'anamorphic', 'landscape']
  },
  {
    id: 'c_heroic_low_angle',
    name: 'Low-angle heroic perspective',
    category: 'composition',
    description: 'Upward-looking angle emphasizing power, stature, and grandeur',
    keywords: ['low-angle', 'heroic', 'perspective', 'powerful', 'monumental']
  },
  {
    id: 'c_close_up_macro',
    name: 'Extreme close-up macro detail',
    category: 'composition',
    description: 'Tight focus magnifying eye iris, intricate jewelry, or small wonders',
    keywords: ['macro', 'close-up', 'iris', 'magnified', 'detail']
  },
  {
    id: 'c_rule_of_thirds',
    name: 'Rule of thirds dynamic composition',
    category: 'composition',
    description: 'Harmonious focal placement creating natural visual flow',
    keywords: ['rule of thirds', 'dynamic', 'composition', 'framing']
  },
  {
    id: 'c_bokeh_dof',
    name: 'Shallow depth of field with creamy bokeh',
    category: 'composition',
    description: 'Subject sharp in focus with dreamily blurred background orbs',
    keywords: ['bokeh', 'depth of field', 'dof', 'blur', 'shallow', 'f1.4']
  },
  {
    id: 'c_symmetrical',
    name: 'Centered symmetrical framing',
    category: 'composition',
    description: 'Wes Anderson-esque geometric alignment and balanced harmony',
    keywords: ['symmetrical', 'centered', 'geometric', 'symmetry', 'harmony']
  },

  // --- MOOD & PALETTE ---
  {
    id: 'm_cyber_cyan_magenta',
    name: 'Electric cyan and neon magenta palette',
    category: 'mood',
    description: 'High-energy retrofuturistic dual-tone color contrast',
    keywords: ['cyan', 'magenta', 'neon', 'palette', 'synthwave', 'duotone']
  },
  {
    id: 'm_golden_amber',
    name: 'Warm golden amber and emerald',
    category: 'mood',
    description: 'Rich luxurious jewel tones evoking warmth and ancient wealth',
    keywords: ['golden', 'amber', 'emerald', 'jewel', 'luxurious', 'warm']
  },
  {
    id: 'm_nordic_desaturated',
    name: 'Muted Nordic desaturated tones',
    category: 'mood',
    description: 'Cold slate greys, pale blues, and understated contemplative vibes',
    keywords: ['nordic', 'desaturated', 'muted', 'slate', 'cold', 'melancholic']
  },
  {
    id: 'm_dreamy_pastel',
    name: 'Dreamy ethereal pastel hues',
    category: 'mood',
    description: 'Gentle lavender, powder pink, mint green, and soft sky tones',
    keywords: ['pastel', 'dreamy', 'ethereal', 'gentle', 'lavender', 'pink']
  },
  {
    id: 'm_ominous_tension',
    name: 'Ominous tension with deep shadows',
    category: 'mood',
    description: 'Foreboding atmospheric weight filled with suspense and intrigue',
    keywords: ['ominous', 'tension', 'suspense', 'dark', 'foreboding', 'shadows']
  }
];

/**
 * Maps standard JSON property keys to prompt tag categories
 */
export const PROPERTY_TO_CATEGORY: Record<string, TagCategory> = {
  lighting: 'lighting',
  art_style: 'art_style',
  texture: 'texture',
  skin_texture: 'texture',
  composition: 'composition',
  camera_angle: 'composition',
  color_palette: 'mood',
  mood: 'mood'
};

export interface EditorContext {
  activeField: string | null;
  activeCategory: TagCategory | null;
  query: string;
  prefixStart: number;
  prefixEnd: number;
  isInValueString: boolean;
}

/**
 * Analyzes the text and cursor position to detect what JSON field is being edited
 * and what prefix/query word is currently being typed.
 */
export function detectJsonContext(text: string, cursor: number): EditorContext {
  if (cursor < 0 || cursor > text.length) {
    return {
      activeField: null,
      activeCategory: null,
      query: '',
      prefixStart: cursor,
      prefixEnd: cursor,
      isInValueString: false
    };
  }

  const beforeCursor = text.slice(0, cursor);

  // Check if we are inside a string value of a JSON property:
  // e.g. "lighting": "some text, vol|
  // Match: "propertyName"\s*:\s*"([^"\\]*)$
  const propMatch = beforeCursor.match(/"([a-zA-Z0-9_]+)"\s*:\s*"([^"\\]*)$/);

  if (propMatch) {
    const fieldName = propMatch[1];
    const valueSoFar = propMatch[2];
    const mappedCategory = PROPERTY_TO_CATEGORY[fieldName] || null;

    // Get current typing word inside the value (after last comma or start of value)
    const lastCommaIdx = valueSoFar.lastIndexOf(',');
    const currentSegment = lastCommaIdx >= 0 ? valueSoFar.slice(lastCommaIdx + 1) : valueSoFar;
    const query = currentSegment.trimStart();
    const leadingSpaces = currentSegment.length - query.length;
    const prefixStart = cursor - query.length;

    return {
      activeField: fieldName,
      activeCategory: mappedCategory,
      query: query.trim(),
      prefixStart,
      prefixEnd: cursor,
      isInValueString: true
    };
  }

  // Fallback: check if user is typing any general word in the editor
  // Look back to previous whitespace, comma, or quote
  let start = cursor;
  while (start > 0 && !/[\s,:"{}\[\]]/.test(text[start - 1])) {
    start--;
  }
  const generalQuery = text.slice(start, cursor).trim();

  return {
    activeField: null,
    activeCategory: null,
    query: generalQuery,
    prefixStart: start,
    prefixEnd: cursor,
    isInValueString: false
  };
}

/**
 * Filters prompt tags by query and category
 */
export function getSuggestedTags(
  query: string,
  preferredCategory?: TagCategory | null,
  filterCategory?: TagCategory | 'all'
): PromptTag[] {
  const cleanQuery = query.toLowerCase().trim();

  let pool = COMMON_PROMPT_TAGS;

  if (filterCategory && filterCategory !== 'all') {
    pool = pool.filter(t => t.category === filterCategory);
  }

  if (!cleanQuery) {
    // Return all or category sorted by preferred category
    if (preferredCategory) {
      return [...pool].sort((a, b) => {
        if (a.category === preferredCategory && b.category !== preferredCategory) return -1;
        if (b.category === preferredCategory && a.category !== preferredCategory) return 1;
        return 0;
      }).slice(0, 8);
    }
    return pool.slice(0, 8);
  }

  // Rank matches
  const matches = pool
    .map(tag => {
      let score = 0;
      const lowerName = tag.name.toLowerCase();
      const lowerDesc = tag.description.toLowerCase();

      if (lowerName === cleanQuery) score += 100;
      else if (lowerName.startsWith(cleanQuery)) score += 50;
      else if (lowerName.includes(cleanQuery)) score += 30;

      if (tag.keywords?.some(k => k.toLowerCase().startsWith(cleanQuery))) score += 25;
      else if (tag.keywords?.some(k => k.toLowerCase().includes(cleanQuery))) score += 15;

      if (lowerDesc.includes(cleanQuery)) score += 10;

      // Boost if it matches active field's category
      if (preferredCategory && tag.category === preferredCategory) {
        score += 20;
      }

      return { tag, score };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(m => m.tag);

  return matches.slice(0, 8);
}
