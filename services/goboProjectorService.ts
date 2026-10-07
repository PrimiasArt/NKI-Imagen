import { getGeminiClient, compressBase64Image, prepareInlineData, callWithRetry, trackRequest } from './geminiService';

export type GoboPatternId =
  | 'venetian_blinds'
  | 'palm_fronds'
  | 'tree_branches'
  | 'window_frame'
  | 'prism_rainbow'
  | 'cyber_stripes';

export interface PointLightConfig {
  x: number; // 0 to 100%
  y: number; // 0 to 100%
  radius: number; // 50 to 800 px
  intensity: number; // 0.1 to 2.0
  temperatureK: number; // 2200 to 8000 K
  softness: number; // 0.1 to 1.0
}

export interface GoboPreset {
  id: GoboPatternId;
  name: string;
  category: 'cinematic' | 'organic' | 'scifi';
  icon: string;
  description: string;
}

export const GOBO_PRESETS: GoboPreset[] = [
  {
    id: 'venetian_blinds',
    name: 'Song Sắt Rèm Cửa (Venetian Blinds)',
    category: 'cinematic',
    icon: '🪟',
    description: 'Bóng râm kẻ ngang điện ảnh phong cách trinh thám Film-Noir'
  },
  {
    id: 'palm_fronds',
    name: 'Lá Dừa Nhiệt Đới (Palm Fronds)',
    category: 'organic',
    icon: '🌿',
    description: 'Bóng lá cọ nhiệt đới hắt nắng mùa hè mềm mại'
  },
  {
    id: 'tree_branches',
    name: 'Tán Cây Rừng (Forest Canopy)',
    category: 'organic',
    icon: '🌳',
    description: 'Bóng cành lá rừng tự nhiên lốm đốm nắng vàng'
  },
  {
    id: 'window_frame',
    name: 'Khung Cửa Sổ Loft (Loft Window)',
    category: 'cinematic',
    icon: '🏙️',
    description: 'Bóng khung cửa sổ 4 ô công nghiệp chiếu xiên'
  },
  {
    id: 'prism_rainbow',
    name: 'Lăng Kính Cầu Vồng (Prism Flare)',
    category: 'cinematic',
    icon: '🌈',
    description: 'Quang phổ cầu vồng lăng kính hắt xéo qua gò má'
  },
  {
    id: 'cyber_stripes',
    name: 'Vạch Sáng Cyberpunk (Cyber Slits)',
    category: 'scifi',
    icon: '⚡',
    description: 'Dải sáng neon sắc lạnh công nghệ tương lai'
  }
];

/**
 * Converts Kelvin temperature to approximate RGB color
 */
export function kelvinToRgb(kelvin: number): { r: number; g: number; b: number } {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

/**
 * Procedurally draws a Gobo shadow/light pattern onto a 2D canvas and returns Data URL.
 */
export function generateProceduralGobo(
  patternId: GoboPatternId,
  width: number,
  height: number,
  lightConfig: PointLightConfig
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { r, g, b } = kelvinToRgb(lightConfig.temperatureK);
  const px = (lightConfig.x / 100) * width;
  const py = (lightConfig.y / 100) * height;

  // Background darkness
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  const grad = ctx.createRadialGradient(px, py, 0, px, py, lightConfig.radius);
  grad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(1, lightConfig.intensity)})`);
  grad.addColorStop(Math.min(0.9, lightConfig.softness), `rgba(0, 0, 0, ${Math.min(1, lightConfig.intensity * 0.8)})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, lightConfig.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Draw Specific Gobo Shadows
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

  if (patternId === 'venetian_blinds') {
    const slatCount = 14;
    const slatH = height / slatCount;
    for (let i = 0; i < slatCount; i += 2) {
      ctx.fillRect(0, i * slatH, width, slatH * 0.7);
    }
  } else if (patternId === 'window_frame') {
    // 4 Panes Window cross
    const thickness = Math.round(width * 0.06);
    ctx.fillRect((width - thickness) / 2, 0, thickness, height);
    ctx.fillRect(0, (height - thickness) / 2, width, thickness);
    // Outer border
    ctx.lineWidth = thickness * 1.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.strokeRect(0, 0, width, height);
  } else if (patternId === 'palm_fronds') {
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const angle = -0.3 + (i * 0.18);
      ctx.ellipse(width * 0.2 + i * (width * 0.1), height * 0.3 + i * (height * 0.05), width * 0.35, height * 0.06, angle, 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (patternId === 'tree_branches') {
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.2);
    ctx.bezierCurveTo(width * 0.4, height * 0.25, width * 0.6, height * 0.5, width, height * 0.4);
    ctx.stroke();
    // Sub branches
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(width * 0.4, height * 0.25);
    ctx.lineTo(width * 0.7, height * 0.1);
    ctx.moveTo(width * 0.6, height * 0.4);
    ctx.lineTo(width * 0.8, height * 0.7);
    ctx.stroke();
  } else if (patternId === 'prism_rainbow') {
    const rainbowGrad = ctx.createLinearGradient(0, 0, width, height);
    rainbowGrad.addColorStop(0.2, 'rgba(255, 0, 0, 0.35)');
    rainbowGrad.addColorStop(0.4, 'rgba(255, 165, 0, 0.35)');
    rainbowGrad.addColorStop(0.6, 'rgba(255, 255, 0, 0.35)');
    rainbowGrad.addColorStop(0.8, 'rgba(0, 255, 128, 0.35)');
    rainbowGrad.addColorStop(1.0, 'rgba(0, 128, 255, 0.35)');
    ctx.fillStyle = rainbowGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (patternId === 'cyber_stripes') {
    const stripeCount = 20;
    const w = width / stripeCount;
    for (let i = 0; i < stripeCount; i += 2) {
      ctx.fillRect(i * w, 0, w * 0.8, height);
    }
  }

  ctx.restore();

  // Warmth Tint Overlay
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * AI Generative Optical Gobo Relight using Gemini.
 */
export async function runGenerativeGoboRelight(
  baseImage: string,
  goboPattern: GoboPreset,
  lightConfig: PointLightConfig
): Promise<{ resultImage: string }> {
  trackRequest(2800, "Studio Gobo Relighting");

  const compressedBase = await compressBase64Image(baseImage);
  const baseInline = prepareInlineData(compressedBase, 'image/jpeg');

  const { r, g, b } = kelvinToRgb(lightConfig.temperatureK);
  const colorDesc = lightConfig.temperatureK < 4000 ? 'warm golden tungsten' : (lightConfig.temperatureK > 6500 ? 'cool moonlight cyan' : 'neutral daylight white');

  const instructionsText = `You are a Hollywood Master Chief Lighting Technician (Gaffer) and VFX Relighting Engine.
I have provided an original photo.
TASK: Physically re-cast optical GOBO SHADOWS and a directional spotlight onto the scene:
1. GOBO PATTERN: ${goboPattern.name} - ${goboPattern.description}.
2. LIGHT SOURCE: A directional spotlight positioned at ~${lightConfig.x}% from left, ~${lightConfig.y}% from top with ${colorDesc} color temperature (${lightConfig.temperatureK}K).
3. 3D CONTOUR ACCURACY: Shadows and light beams MUST naturally wrap and deform across the 3D curves of the character's facial features, jawline, clothing folds, and background geometry.
4. PRESERVE ORIGINAL CHARACTER: Maintain 100% likeness, facial structure, identity, expression, and high-frequency textures (skin pores, clothing weave).
Output ONLY the resulting relit composite image.`;

  const client = getGeminiClient();
  const parts: any[] = [];
  if (baseInline) parts.push(baseInline);
  parts.push({ text: instructionsText });

  const response = await callWithRetry(() => client.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts }
  }), 3, 2000);

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return {
          resultImage: `data:${mime};base64,${part.inlineData.data}`
        };
      }
    }
  }

  throw new Error("Gobo Relighting failed to generate image.");
}
