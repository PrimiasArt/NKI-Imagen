/**
 * Biometric Morph Studio (Aging & Emotion Sliders) for NKI Studio v4.3
 * Provides continuous age progression (18-70 years) and granular facial emotion synthesis
 * while locking 100% of the character's core cranial and biometric facial identity.
 */

import { GoogleGenAI } from '@google/genai';
import { getGeminiClient, callWithRetry, trackRequest, prepareInlineData } from './geminiService';

export type FacialEmotionType = 
  | 'radiant_joy'
  | 'fashion_fierce'
  | 'mysterious_allure'
  | 'gentle_serenity'
  | 'surprised_delight'
  | 'melancholic_poetry';

export interface FacialEmotionMeta {
  id: FacialEmotionType;
  label: string;
  icon: string;
  description: string;
  promptDirective: string;
}

export const FACIAL_EMOTIONS: FacialEmotionMeta[] = [
  {
    id: 'radiant_joy',
    label: 'Vui vẻ rạng rỡ',
    icon: '✨',
    description: 'Nụ cười tỏa nắng tự nhiên, ánh mắt sáng lấp lánh biểu lộ niềm vui chân thật',
    promptDirective: 'Radiant authentic warm smile, bright glistening eyes with genuine crow-feet smile crinkles, glowing happy expression'
  },
  {
    id: 'fashion_fierce',
    label: 'Lạnh lùng High-Fashion',
    icon: '⚡',
    description: 'Ánh nhìn sắc sảo đẳng cấp bìa tạp chí Vogue, môi khẽ hé đầy quyền lực',
    promptDirective: 'High-fashion editorial fierce gaze, relaxed slightly parted lips, intense piercing runway model expression'
  },
  {
    id: 'mysterious_allure',
    label: 'Bí ẩn quyến rũ',
    icon: '🌙',
    description: 'Nụ cười mỉm Mona Lisa nửa miệng, ánh nhìn ma mị cuốn hút khó đoán',
    promptDirective: 'Enigmatic alluring half-smile, smoldering magnetic gaze, captivating mysterious cinematic micro-expression'
  },
  {
    id: 'gentle_serenity',
    label: 'Dịu dàng thanh tịnh',
    icon: '🕊️',
    description: 'Gương mặt thư thái bình yên, ánh nhìn ấm áp hiền hòa chữa lành',
    promptDirective: 'Serene tranquil peaceful demeanor, gentle soft relaxing gaze, calm meditative pleasant warmth'
  },
  {
    id: 'surprised_delight',
    label: 'Bất ngờ thích thú',
    icon: '🎉',
    description: 'Đôi mắt mở to tròn ngạc nhiên dễ thương, biểu cảm háo hức sinh động',
    promptDirective: 'Delighted pleasant surprise, wide expressive sparkling eyes, slight gasp of joyful discovery'
  },
  {
    id: 'melancholic_poetry',
    label: 'U buồn thơ mộng',
    icon: '🌧️',
    description: 'Nét trầm tư suy tư nghệ thuật, ánh mắt xa xăm đầy hoài niệm',
    promptDirective: 'Poetic wistful melancholic contemplation, introspective deep gaze looking slightly into the distance, soulful cinematic emotion'
  }
];

export interface BiometricMorphOptions {
  baseImageBase64: string;
  characterName?: string;
  targetAge: number; // 18 to 70
  emotion: FacialEmotionType;
  emotionIntensity: number; // 0 to 100 (%)
  skinTexturePreservation?: boolean;
  modelEngine?: 'gemini-3-pro-image' | 'gemini-3.1-flash-image';
  customGuidance?: string;
}

export interface BiometricMorphResult {
  resultImage: string;
  modelUsed: string;
  targetAge: number;
  emotionLabel: string;
  emotionIntensity: number;
  durationMs: number;
}

/**
 * Builds prompt for aging and emotional morphing
 */
export function buildBiometricMorphPrompt(options: {
  targetAge: number;
  emotionMeta: FacialEmotionMeta;
  emotionIntensity: number;
  characterName?: string;
  customGuidance?: string;
}): string {
  const { targetAge, emotionMeta, emotionIntensity, characterName = 'the person', customGuidance = '' } = options;

  let ageDirective = '';
  if (targetAge < 25) {
    ageDirective = `YOUTHFUL AGE (${targetAge} years old): Plump collagen-rich skin, luminous smooth texture, vibrant fresh dewy youthful complexion with zero fine lines.`;
  } else if (targetAge <= 35) {
    ageDirective = `PRIME ADULT AGE (${targetAge} years old): Defined facial contours, refined mature elegance, smooth well-hydrated skin with subtle natural expression lines.`;
  } else if (targetAge <= 50) {
    ageDirective = `MATURE ADULT AGE (${targetAge} years old): Distinguished graceful maturity, realistic fine laugh lines around the eyes (crow feet), gentle nasolabial depth, dignified and elegant skin texture.`;
  } else {
    ageDirective = `SENIOR ELDER AGE (${targetAge} years old): Noble silver age elegance, authentic natural epidermal wrinkles, delicate temple lines, dignified silver streaks in hair, wise soulful gaze with photorealistic skin aging physics.`;
  }

  return `[SYSTEM INSTRUCTION: BIOMETRIC MORPH & AGING/EMOTION STUDIO]

You are an expert Hollywood digital aging supervisor and neural facial rigging specialist.
Given the input portrait of ${characterName}, apply high-fidelity aging and emotional expression morphing.

PARAMETERS:
- TARGET AGE: ${targetAge} years old.
  ${ageDirective}
- FACIAL EMOTION: "${emotionMeta.label}" at ${emotionIntensity}% intensity.
  Directives: ${emotionMeta.promptDirective}

CRITICAL IDENTITY CONSTRAINTS (100% BIOMETRIC LOCK):
1. PRESERVE CRANIAL GEOMETRY: Do NOT change the eye color, iris patterns, basic nose bridge bone structure, lip curvature, or ear shape.
2. CONTINUITY: Keep the exact same clothing, lighting direction, ambient color grading, background, and camera angle.
3. ORGANIC REALISM: Any added age markers (collagen changes, wrinkles, silver hair) must integrate naturally following authentic human dermatological anatomy. No cartoonish or distorted artifacts.
${customGuidance ? `4. USER NOTES: "${customGuidance.trim()}"` : ''}

OUTPUT:
Generate ONE single photorealistic rendered portrait reflecting the precise target age and facial emotion.`;
}

/**
 * Executes Biometric Aging & Emotion Morphing
 */
export async function performBiometricMorph(options: BiometricMorphOptions): Promise<BiometricMorphResult> {
  const startTime = Date.now();
  trackRequest(3200, "Biometric Morph Studio");

  const {
    baseImageBase64,
    characterName = 'Subject',
    targetAge,
    emotion,
    emotionIntensity,
    modelEngine = 'gemini-3-pro-image',
    customGuidance = ''
  } = options;

  const cleanBase = baseImageBase64.replace(/^data:[^;]+;base64,/, '');
  const baseMime = baseImageBase64.match(/^data:([^;]+);/)?.[1] || 'image/png';

  const emotionMeta = FACIAL_EMOTIONS.find(e => e.id === emotion) || FACIAL_EMOTIONS[0];

  const promptText = buildBiometricMorphPrompt({
    targetAge,
    emotionMeta,
    emotionIntensity,
    characterName,
    customGuidance
  });

  const modelsToTry = [
    modelEngine,
    modelEngine === 'gemini-3-pro-image' ? 'gemini-3.1-flash-image' : 'gemini-3-pro-image'
  ];

  let rawGeneratedImage = '';
  let successfulModel = modelEngine;

  for (const engine of modelsToTry) {
    try {
      console.log(`[Biometric Morph] Synthesizing Age: ${targetAge}, Emotion: ${emotion} with: ${engine}`);

      const parts: any[] = [];

      const inlineBase = prepareInlineData(cleanBase, baseMime);
      if (inlineBase) parts.push(inlineBase);

      parts.push({ text: promptText });

      const client = getGeminiClient();
      const config: any = {
        imageConfig: {
          imageSize: "2K"
        }
      };

      const response = await callWithRetry(() => client.models.generateContent({
        model: engine,
        contents: { parts },
        config
      }));

      if (response && response.candidates && response.candidates[0]?.content?.parts) {
        for (const p of response.candidates[0].content.parts) {
          if (p.inlineData && p.inlineData.data) {
            const mime = p.inlineData.mimeType || 'image/png';
            rawGeneratedImage = `data:${mime};base64,${p.inlineData.data}`;
            successfulModel = engine;
            break;
          }
        }
      }

      if (rawGeneratedImage) break;
    } catch (err: any) {
      console.warn(`[Biometric Morph] Engine ${engine} failed:`, err?.message || err);
    }
  }

  if (!rawGeneratedImage) {
    throw new Error("Không thể chuyển đổi độ tuổi/cảm xúc. Vui lòng kiểm tra lại ảnh gốc hoặc thử lại.");
  }

  const durationMs = Date.now() - startTime;

  return {
    resultImage: rawGeneratedImage,
    modelUsed: successfulModel,
    targetAge,
    emotionLabel: emotionMeta.label,
    emotionIntensity,
    durationMs
  };
}
