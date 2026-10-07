import { getGeminiClient, compressBase64Image, prepareInlineData, callWithRetry, trackRequest } from './geminiService';

export type AtmosphereType =
  | 'cinematic_rain'
  | 'soft_snow'
  | 'volumetric_fog'
  | 'film_halation';

export interface AtmospherePreset {
  id: AtmosphereType;
  name: string;
  icon: string;
  description: string;
  directive: string;
}

export const ATMOSPHERE_PRESETS: AtmospherePreset[] = [
  {
    id: 'cinematic_rain',
    name: 'Mưa Rơi Điện Ảnh (Cinematic Rain)',
    icon: '🌧️',
    description: 'Cơn mưa đêm với vệt hạt chuyển động, da ướt và phản xạ mặt đường',
    directive: 'cinematic torrential rain falling with natural motion-blur streaks, glistening wet skin and damp clothing sheen, optical water droplets catching neon reflections'
  },
  {
    id: 'soft_snow',
    name: 'Tuyết Rơi Mùa Đông (Soft Snow)',
    icon: '❄️',
    description: 'Bông tuyết bay bồng bềnh với hiệu ứng bokeh mờ ở tiền cảnh',
    directive: 'soft floating snowflakes drifting gracefully in the cold winter air, subtle frosty condensation, foreground snowflake bokeh blurred by shallow depth of field'
  },
  {
    id: 'volumetric_fog',
    name: 'Sương Mù & Tia Nắng (Godrays & Mist)',
    icon: '🌫️',
    description: 'Sương mù thể tích cuộn trôi với luồng tia nắng hoàng hôn chiếu xuyên',
    directive: 'dense atmospheric rolling volumetric mist, cinematic golden crepuscular godrays slicing through the haze, deep layered aerial perspective'
  },
  {
    id: 'film_halation',
    name: 'Quầng Sáng Halation 35mm (Kodak 500T)',
    icon: '🎞️',
    description: 'Quầng đỏ cam ấm áp quanh bóng đèn và hạt phim nhựa 35mm hữu cơ',
    directive: 'authentic Kodak Vision3 500T 35mm film halation with warm reddish-orange photochemical glow bleeding around specular highlights, organic cinematic grain'
  }
];

/**
 * Procedurally draws atmosphere effect onto a 2D canvas locally for real-time preview or overlay layer.
 */
export function renderProceduralAtmosphere(
  type: AtmosphereType,
  width: number,
  height: number,
  intensity: number = 0.7
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (type === 'cinematic_rain') {
    ctx.strokeStyle = `rgba(200, 225, 255, ${0.4 * intensity})`;
    ctx.lineWidth = 1.2;
    const count = Math.round(300 * intensity);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const len = 25 + Math.random() * 40;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len * 0.25, y + len);
      ctx.stroke();
    }
  } else if (type === 'soft_snow') {
    const count = Math.round(200 * intensity);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 1 + Math.random() * (4 * intensity);
      const alpha = 0.2 + Math.random() * 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'volumetric_fog') {
    const grad = ctx.createLinearGradient(0, height * 0.3, 0, height);
    grad.addColorStop(0, 'rgba(230, 240, 255, 0)');
    grad.addColorStop(0.5, `rgba(230, 240, 255, ${0.25 * intensity})`);
    grad.addColorStop(1, `rgba(230, 240, 255, ${0.45 * intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'film_halation') {
    // Red-orange edge tint
    const rad = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.7);
    rad.addColorStop(0, 'rgba(255, 75, 20, 0)');
    rad.addColorStop(1, `rgba(255, 60, 20, ${0.25 * intensity})`);
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, width, height);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Runs Generative Volumetric Atmosphere Fusion with Gemini.
 */
export async function runGenerativeAtmosphere(
  baseImage: string,
  type: AtmosphereType,
  intensity: number = 0.8,
  customNotes?: string
): Promise<{ resultImage: string }> {
  trackRequest(2800, "Studio Atmosphere Synthesis");

  const compressedBase = await compressBase64Image(baseImage);
  const baseInline = prepareInlineData(compressedBase, 'image/jpeg');

  const preset = ATMOSPHERE_PRESETS.find(p => p.id === type) || ATMOSPHERE_PRESETS[0];

  const instructionsText = `You are a world-class Hollywood VFX Environmental Compositor.
TASK: Physically integrate a volumetric weather and atmospheric environment into the photo:
1. ATMOSPHERE TYPE: ${preset.name} - ${preset.directive}.
2. INTENSITY: ${Math.round(intensity * 100)}% density.
${customNotes ? `3. USER SPECIAL DIRECTIVE: ${customNotes}` : ''}

PHYSICAL DEPTH RULES:
- The atmospheric particles (rain streaks, snow, fog, or halation) must exist IN 3D SPACE: some pass in front of the lens, some wrap around the character, and some recede into the distant background.
- Recast subtle optical reflections, moist specularity, and wet highlights onto the character's clothing and skin where appropriate.
- Maintain 100% of the character's facial likeness, eyes, identity, and background geometry.
Output ONLY the resulting atmospheric composite photograph.`;

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

  throw new Error("Atmosphere synthesis failed to generate image.");
}
