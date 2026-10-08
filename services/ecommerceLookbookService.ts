/**
 * Commercial E-Commerce & Lookbook Studio Service
 * NKI Studio v4.3 Breakthrough Pillar 3
 * 
 * Generates synchronized 5-angle commercial product packs and lookbooks
 * optimized for Amazon, Shopify, Zara, and High-Fashion Lookbooks.
 */

export type LookbookAngle = 
  | 'front_hero'
  | 'three_quarter'
  | 'rear_back'
  | 'macro_texture'
  | 'lifestyle_in_situ';

export type LookbookStylePreset = 
  | 'amazon_pure_white'
  | 'zara_editorial'
  | 'scandinavian_daylight'
  | 'luxury_dark_velvet'
  | 'urban_streetwear';

export type ProductCategory = 
  | 'fashion_apparel'
  | 'sneakers_footwear'
  | 'cosmetics_skincare'
  | 'watches_jewelry'
  | 'tech_gadgets';

export interface AngleConfig {
  id: LookbookAngle;
  name: string;
  shortDesc: string;
  cameraPrompt: string;
}

export interface StylePresetConfig {
  id: LookbookStylePreset;
  name: string;
  description: string;
  backgroundLightingPrompt: string;
}

export const ANGLE_CONFIGS: Record<LookbookAngle, AngleConfig> = {
  front_hero: {
    id: 'front_hero',
    name: 'Front Hero Shot (Chính diện)',
    shortDesc: 'Góc thẳng trung tâm chuẩn thương mại điện tử',
    cameraPrompt: 'Straight-on eye-level frontal hero shot, centered symmetrical composition, clean commercial product framing'
  },
  three_quarter: {
    id: 'three_quarter',
    name: '3/4 Perspective Angle (Góc nghiêng 45°)',
    shortDesc: 'Thể hiện chiều sâu và khối 3D sản phẩm',
    cameraPrompt: 'Dynamic 45-degree three-quarter perspective angle, highlighting form factor, depth and side profile contours'
  },
  rear_back: {
    id: 'rear_back',
    name: 'Rear / Back View (Mặt sau)',
    shortDesc: 'Chi tiết khóa kéo, lưng áo hoặc mặt sau',
    cameraPrompt: 'Rear back view perspective, showing back details, tailoring seam lines, back clasp or posterior design'
  },
  macro_texture: {
    id: 'macro_texture',
    name: 'Macro Detail Zoom (Cận cảnh chất liệu)',
    shortDesc: 'Chi tiết từng đường kim mũi chỉ, da, kim loại',
    cameraPrompt: 'Extreme macro close-up telephoto shot, focusing on fabric weave texture, fine stitching, embossed logo, and micro-material grain with shallow depth of field'
  },
  lifestyle_in_situ: {
    id: 'lifestyle_in_situ',
    name: 'Lifestyle In-Situ (Bối cảnh thực tế)',
    shortDesc: 'Người mẫu hoặc không gian đời sống tự nhiên',
    cameraPrompt: 'Aspirational lifestyle editorial shot in natural environment, contextually placed with human interaction, candid fashion atmosphere'
  }
};

export const STYLE_PRESET_CONFIGS: Record<LookbookStylePreset, StylePresetConfig> = {
  amazon_pure_white: {
    id: 'amazon_pure_white',
    name: 'Amazon / E-Commerce Pure White',
    description: 'Nền trắng thuần khiết #FFFFFF, bóng đổ nhẹ chân thực, ánh sáng studio chuẩn quốc tế',
    backgroundLightingPrompt: 'pure clean seamless studio white background #FFFFFF, soft realistic contact ground shadow, balanced multi-point softbox studio lighting, commercial catalog photography'
  },
  zara_editorial: {
    id: 'zara_editorial',
    name: 'Zara / Vogue Editorial Studio',
    description: 'Chiaroscuro nghệ thuật, bóng đổ điện ảnh, tone màu thời trang cao cấp châu Âu',
    backgroundLightingPrompt: 'minimalist brutalist concrete studio backdrop, dramatic directional side light with soft feathering, muted European fashion palette, high fashion editorial lookbook aesthetic'
  },
  scandinavian_daylight: {
    id: 'scandinavian_daylight',
    name: 'Scandinavian Warm Daylight',
    description: 'Ánh nắng ban mai tự nhiên, mặt gỗ sáng, rèm lụa và cảm giác ấm áp tinh tế',
    backgroundLightingPrompt: 'warm golden morning sunlight pouring through sheer linen curtains, light oak wood surface, clean Scandinavian interior ambiance, gentle soft shadows'
  },
  luxury_dark_velvet: {
    id: 'luxury_dark_velvet',
    name: 'Luxury Dark Bronze & Velvet',
    description: 'Nền tối quý phái, ánh kim vàng, phản xạ ngọc bích phù hợp trang sức & đồng hồ',
    backgroundLightingPrompt: 'dark matte charcoal podium, rich deep reflections, focused warm golden rim accent lighting, sparkling optical caustics, luxury brand campaign style'
  },
  urban_streetwear: {
    id: 'urban_streetwear',
    name: 'Urban Streetwear & Cyber Matte',
    description: 'Bê tông đường phố, kim loại mờ, ánh sáng moody phù hợp sneaker và techwear',
    backgroundLightingPrompt: 'textured weathered architectural concrete wall, cool daylight with subtle cyan and amber rim accents, urban streetwear magazine visual tone'
  }
};

export const CATEGORY_LABELS: Record<ProductCategory, { name: string; visualHints: string }> = {
  fashion_apparel: {
    name: 'Quần Áo & Thời Trang',
    visualHints: 'luxury fabric draping, authentic cotton/silk/denim fibers, wrinkle texture, crisp silhouette'
  },
  sneakers_footwear: {
    name: 'Giày Sneaker & Footwear',
    visualHints: 'detailed rubber sole treads, premium leather/mesh stitching, lace loops, sculpted midsole curves'
  },
  cosmetics_skincare: {
    name: 'Mỹ Phẩm & Nước Hoa',
    visualHints: 'glass bottle transparency, liquid refraction, fine mist droplets, metallic cap sheen, luxury embossing'
  },
  watches_jewelry: {
    name: 'Đồng Hồ & Trang Sức',
    visualHints: 'sapphire crystal reflection, dial guilloche patterns, polished platinum bevels, sparkling gem facets'
  },
  tech_gadgets: {
    name: 'Đồ Công Nghệ & Phụ Kiện',
    visualHints: 'anodized matte aluminum finishes, precision chamfered edges, glowing OLED display, sleek minimalist industrial design'
  }
};

/**
 * Synthesizes specialized Commercial Product Photography Prompt for a specific angle
 */
export function synthesizeAnglePrompt(
  productName: string,
  category: ProductCategory,
  angle: LookbookAngle,
  stylePreset: LookbookStylePreset,
  extraDetails: string = ''
): string {
  const angleCfg = ANGLE_CONFIGS[angle];
  const styleCfg = STYLE_PRESET_CONFIGS[stylePreset];
  const catCfg = CATEGORY_LABELS[category];

  const detailChunk = extraDetails.trim() ? `Specific details: ${extraDetails.trim()}. ` : '';

  return [
    `Commercial product photography of ${productName}.`,
    `Category: ${catCfg.name}. ${catCfg.visualHints}.`,
    `${detailChunk}`,
    `Camera angle: ${angleCfg.cameraPrompt}.`,
    `Setting & Lighting: ${styleCfg.backgroundLightingPrompt}.`,
    `Hyper-detailed 8K resolution, Hasselblad medium format capture, crystal sharp focus, true color fidelity, zero distortion, master commercial advertising photography.`
  ].join(' ');
}

/**
 * Generate full 5-angle pack prompts in one call
 */
export function generateFull5AnglePack(
  productName: string,
  category: ProductCategory,
  stylePreset: LookbookStylePreset,
  extraDetails: string = ''
): Record<LookbookAngle, string> {
  const angles: LookbookAngle[] = ['front_hero', 'three_quarter', 'rear_back', 'macro_texture', 'lifestyle_in_situ'];
  const pack: Record<string, string> = {};

  angles.forEach(a => {
    pack[a] = synthesizeAnglePrompt(productName, category, a, stylePreset, extraDetails);
  });

  return pack as Record<LookbookAngle, string>;
}
