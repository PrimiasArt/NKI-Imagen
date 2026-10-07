import { getGeminiClient, compressBase64Image, prepareInlineData, callWithRetry, trackRequest } from './geminiService';

export type GazeDirection =
  | 'center_direct'
  | 'glance_left'
  | 'glance_right'
  | 'dreamy_up'
  | 'introspective_down';

export type MoodVibe =
  | 'confident'
  | 'enigmatic'
  | 'dramatic'
  | 'serene'
  | 'fierce';

export interface ExpressionParams {
  smileIntensity: number; // -50 (Solemn/Serious) to 100 (Radiant Smile)
  gazeDirection: GazeDirection;
  moodVibe: MoodVibe;
  skinRetouchLevel: number; // 0 (raw) to 100 (high-end frequency separation)
}

export const GAZE_OPTIONS: { id: GazeDirection; label: string; icon: string; cue: string }[] = [
  { id: 'center_direct', label: 'Nhìn Thẳng Camera', icon: '👁️', cue: 'Direct magnetic eye contact penetrating into the camera lens' },
  { id: 'glance_left', label: 'Liếc Sang Trái', icon: '👈', cue: 'Subtle gaze shifted toward screen left, thoughtful side glance' },
  { id: 'glance_right', label: 'Liếc Sang Phải', icon: '👉', cue: 'Reflective side glance toward screen right' },
  { id: 'dreamy_up', label: 'Nhìn Lên Mơ Mộng', icon: '✨', cue: 'Eyes elevated slightly upward, contemplative dreamy aspiration' },
  { id: 'introspective_down', label: 'Nhìn Xuống Trầm Tư', icon: '💭', cue: 'Gaze lowered modestly, introspective calm emotion' }
];

export const MOOD_OPTIONS: { id: MoodVibe; label: string; icon: string; cue: string }[] = [
  { id: 'confident', label: 'Tự Tin & Quyến Rũ', icon: '🦁', cue: 'Confident charismatic poise, firm jawline, magnetic aura' },
  { id: 'enigmatic', label: 'Bí Ẩn & Cuốn Hút', icon: '🔮', cue: 'Subtle knowing half-smile, enigmatic Mona-Lisa micro-expression' },
  { id: 'dramatic', label: 'Kịch Tính & Xúc Động', icon: '🎭', cue: 'Intense cinematic emotional depth, glistening focused eyes' },
  { id: 'serene', label: 'Bình Yên & Thanh Lịch', icon: '🕊️', cue: 'Tranquil relaxed facial muscles, serene gentle aura' },
  { id: 'fierce', label: 'Mạnh Mẽ & Sắc Sảo', icon: '⚡', cue: 'Fierce determined high-fashion editorial intensity' }
];

/**
 * Executes Neural Face Expression and Gaze Sculpting with Gemini.
 */
export async function runExpressionSculpt(
  baseImage: string,
  params: ExpressionParams
): Promise<{ resultImage: string }> {
  trackRequest(2800, "Studio Expression Sculpt");

  const compressedBase = await compressBase64Image(baseImage);
  const baseInline = prepareInlineData(compressedBase, 'image/jpeg');

  const gazeMeta = GAZE_OPTIONS.find(g => g.id === params.gazeDirection) || GAZE_OPTIONS[0];
  const moodMeta = MOOD_OPTIONS.find(m => m.id === params.moodVibe) || MOOD_OPTIONS[0];

  let smileDesc = 'neutral relaxed lips';
  if (params.smileIntensity > 50) {
    smileDesc = 'radiant authentic warm smile showing natural teeth and cheerful eye crinkle';
  } else if (params.smileIntensity > 15) {
    smileDesc = 'subtle charming gentle smile with upturned lip corners';
  } else if (params.smileIntensity < -20) {
    smileDesc = 'serious, poised, stoic and solemn closed-lip expression';
  }

  let retouchDesc = '';
  if (params.skinRetouchLevel > 20) {
    retouchDesc = `High-End Beauty Editorial Frequency Separation skin retouch: smooth out redness, blemishes, and harsh under-eye shadows while METICULOUSLY PRESERVING 100% of authentic skin pore micro-texture, fine peach fuzz, and natural dermal specularity (never look like plastic or airbrushed wax).`;
  }

  const instructionsText = `You are a Hollywood Master Portrait VFX Retoucher and Facial Expression Sculptor.
TASK: Adjust the facial expression and gaze of the character in the photo:
1. MOUTH & SMILE: ${smileDesc} (intensity: ${params.smileIntensity}%).
2. EYE GAZE DIRECTION: ${gazeMeta.cue}.
3. EMOTIONAL VIBE: ${moodMeta.cue}.
4. SKIN FINISH: ${retouchDesc || 'Maintain natural raw skin texture.'}

CRITICAL IDENTITY RETENTION:
- You must PRESERVE 100% of the character's core identity, bone structure, facial geometry, nose shape, eye shape, eyebrows, hairline, clothing, and background.
- Adjust ONLY micro-muscles of expression, pupil position, and skin tone evening.
Output ONLY the resulting retouched photorealistic portrait.`;

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

  throw new Error("Expression Sculpting failed to generate image.");
}
