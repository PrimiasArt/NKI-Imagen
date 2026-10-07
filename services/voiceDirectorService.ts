import { ImagePromptJson } from '../types';
import { getGeminiClient } from './geminiService';

export interface VoiceDirectorResult {
  updatedJson: ImagePromptJson;
  explanation: string;
  changedFields: string[];
}

/**
 * Checks if browser supports Speech Recognition
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Interprets a natural spoken voice directing command and modifies the 12-field JSON prompt accordingly.
 */
export async function executeVoiceDirectorCommand(
  spokenCommand: string,
  currentJson: ImagePromptJson,
  language: string = 'vi-VN'
): Promise<VoiceDirectorResult> {
  const client = getGeminiClient();

  const systemInstruction = `You are the Virtual Assistant Director of an AI Cinema Studio.
The user speaks live directorial instructions to update an image prompt.
Your task:
1. Parse the user's spoken command (in Vietnamese, English, or any language).
2. Identify WHICH of the 12 JSON keys to update:
   [subject, art_style, posing, lighting, color_palette, composition, camera_angle, texture, skin_texture, font, mood, additional_details].
3. ONLY update the fields requested or logically impacted. KEEP all other existing fields UNTOUCHED.
4. If the user asks for something like "Thêm mưa đêm neon", update lighting/mood/additional_details.
5. Provide a short explanation of what you updated (in Vietnamese if the input is Vietnamese, or English).
6. Output strict JSON with format:
{
  "updatedJson": { ...all 12 keys... },
  "explanation": "Brief explanation of updates made",
  "changedFields": ["lighting", "mood"]
}`;

  const prompt = `Current Prompt JSON:
${JSON.stringify(currentJson, null, 2)}

Spoken Director Command:
"${spokenCommand}"

Update the JSON according to this command and return the JSON response.`;

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json'
    }
  });

  const text = response.text?.trim() || '{}';
  const parsed = JSON.parse(text);

  return {
    updatedJson: parsed.updatedJson || currentJson,
    explanation: parsed.explanation || 'Đã cập nhật prompt theo chỉ đạo bằng giọng nói!',
    changedFields: Array.isArray(parsed.changedFields) ? parsed.changedFields : []
  };
}
