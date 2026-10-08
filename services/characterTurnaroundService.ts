/**
 * Character Sheet 360° Studio (Turnaround Matrix) for NKI Studio v4.3
 * Generates industry-standard 8-view turnaround character sheets (Game/VFX/Animation)
 * from a single character image or Character Vault persona.
 * Preserves 100% facial biometrics, costume geometry, and anatomical proportions.
 */

import { GoogleGenAI } from '@google/genai';
import { getGeminiClient, callWithRetry, trackRequest, prepareInlineData } from './geminiService';

export interface TurnaroundAngle {
  id: string;
  degree: number;
  label: string;
  shortLabel: string;
  description: string;
  cameraPrompt: string;
  icon: string;
}

export const TURNAROUND_ANGLES: TurnaroundAngle[] = [
  {
    id: 'front',
    degree: 0,
    label: 'Chính diện',
    shortLabel: '0° Front',
    description: 'Góc nhìn trực diện chính diện từ phía trước, mắt nhìn thẳng ống kính',
    cameraPrompt: 'Direct front view (0 degrees), eye-level camera, facing directly forward towards viewer',
    icon: '👤'
  },
  {
    id: 'front_left_45',
    degree: 45,
    label: 'Chếch trước trái (3/4)',
    shortLabel: '45° 3/4 L',
    description: 'Xoay góc 45 độ sang trái, tôn lên góc cạnh gò má và chi tiết nửa thân',
    cameraPrompt: 'Three-quarter front-left view (45 degrees angle), character turned 45 degrees to their right / viewer left',
    icon: '↖️'
  },
  {
    id: 'side_left_90',
    degree: 90,
    label: 'Nghiêng trái (Profile)',
    shortLabel: '90° Side L',
    description: 'Góc nhìn nghiêng 90 độ hoàn toàn từ bên trái, lộ rõ sống mũi và cằm',
    cameraPrompt: 'Full side profile view from the left (90 degrees angle), silhouette profile of face and body',
    icon: '⬅️'
  },
  {
    id: 'back_left_135',
    degree: 135,
    label: 'Chếch sau lưng trái',
    shortLabel: '135° 3/4 BL',
    description: 'Xoay 135 độ từ phía sau, thấy được gáy, vai và tà áo sau',
    cameraPrompt: 'Three-quarter rear-left view (135 degrees angle), view of back and shoulder angle from the left',
    icon: '↙️'
  },
  {
    id: 'back_180',
    degree: 180,
    label: 'Sau lưng (Back)',
    shortLabel: '180° Back',
    description: 'Góc nhìn từ phía sau hoàn toàn 180 độ, chi tiết tóc sau và lưng áo',
    cameraPrompt: 'Full rear back view (180 degrees), looking directly at the character back, showing back hair, shoulders, spine alignment, and back of outfit',
    icon: '👥'
  },
  {
    id: 'back_right_225',
    degree: 225,
    label: 'Chếch sau lưng phải',
    shortLabel: '225° 3/4 BR',
    description: 'Xoay 225 độ từ phía sau bên phải, quan sát nếp gấp và phụ kiện lưng phải',
    cameraPrompt: 'Three-quarter rear-right view (225 degrees angle), view of back and shoulder from the right',
    icon: '↘️'
  },
  {
    id: 'side_right_270',
    degree: 270,
    label: 'Nghiêng phải (Profile)',
    shortLabel: '270° Side R',
    description: 'Góc nhìn nghiêng 90 độ hoàn toàn từ bên phải',
    cameraPrompt: 'Full side profile view from the right (270 degrees angle), silhouette profile of right side of face and body',
    icon: '➡️'
  },
  {
    id: 'front_right_315',
    degree: 315,
    label: 'Chếch trước phải (3/4)',
    shortLabel: '315° 3/4 R',
    description: 'Xoay 315 độ chếch trước phải, hoàn thiện chu kỳ xoay 360 độ',
    cameraPrompt: 'Three-quarter front-right view (315 degrees angle), character turned 45 degrees to their left / viewer right',
    icon: '↗️'
  }
];

export type TurnaroundRenderMode = 'composite_sheet' | 'single_angle';

export interface TurnaroundExecutionOptions {
  characterImageBase64: string;
  characterName?: string;
  renderMode: TurnaroundRenderMode;
  targetAngleId?: string; // used when renderMode is 'single_angle'
  backgroundStyle?: 'neutral_studio' | 'original' | 'white_cyclorama';
  modelEngine?: 'gemini-3-pro-image' | 'gemini-3.1-flash-image';
  customGuidance?: string;
}

export interface TurnaroundResult {
  resultImage: string;
  renderMode: TurnaroundRenderMode;
  angleId?: string;
  modelUsed: string;
  durationMs: number;
}

/**
 * Builds prompt for a single rotation angle of the character
 */
export function buildSingleAnglePrompt(angle: TurnaroundAngle, options: {
  characterName?: string;
  backgroundStyle?: string;
  customGuidance?: string;
}): string {
  const { characterName = 'the character', backgroundStyle = 'neutral_studio', customGuidance = '' } = options;

  const bgInstruction = 
    backgroundStyle === 'neutral_studio' ? 'Solid clean neutral grey studio backdrop with soft floor shadow.' :
    backgroundStyle === 'white_cyclorama' ? 'Pure white seamless cyclorama studio photography background.' :
    'Retain the original environment and ambient lighting conditions accurately rotated.';

  return `[SYSTEM INSTRUCTION: 360-DEGREE CHARACTER TURNAROUND MATRIX]

You are an expert VFX and 3D character pipeline lead.
Given the reference image of ${characterName}, synthesize the exact same character rotated to the specified camera angle:
ANGLE: ${angle.shortLabel} - ${angle.cameraPrompt}

CRITICAL CONSISTENCY CONSTRAINTS:
1. 100% BIOMETRIC IDENTITY: The face, hair length, hair color, facial proportions, jawline, and skin tone must be IDENTICAL to the reference character, accurately transformed according to 3D perspective and rotational geometry.
2. 100% OUTFIT & ACCESSORY CONTINUITY: The clothing materials, textures, buttons, hemlines, shoes, and jewelry must match the reference image exactly from this new viewing angle.
3. ANATOMICAL NEUTRAL POSE: Character stands in an elegant, neutral A-pose or natural standing posture with feet shoulder-width apart and arms relaxed at sides.
4. BACKGROUND & LIGHTING: ${bgInstruction}
${customGuidance ? `5. ADDITIONAL DIRECTIVE: "${customGuidance.trim()}"` : ''}

OUTPUT:
Generate ONE single cinematic full-length shot of the character captured at this exact angle.`;
}

/**
 * Builds prompt for a unified panoramic 8-view Character Turnaround Sheet
 */
export function buildCompositeSheetPrompt(options: {
  characterName?: string;
  backgroundStyle?: string;
  customGuidance?: string;
}): string {
  const { characterName = 'the character', backgroundStyle = 'neutral_studio', customGuidance = '' } = options;

  const bgInstruction = 
    backgroundStyle === 'neutral_studio' ? 'Neutral medium-grey studio background with subtle baseline ground shadows.' :
    backgroundStyle === 'white_cyclorama' ? 'Seamless clean white studio cyclorama background.' :
    'Clean consistent studio backdrop.';

  return `[SYSTEM INSTRUCTION: FULL 8-VIEW CHARACTER TURNAROUND MODEL SHEET]

You are an industry-leading Character Supervisor for AAA Games and Cinematic VFX.
Generate a complete, professional, panoramic Character Turnaround Reference Sheet for ${characterName} based on the input reference image.

SHEET COMPOSITION:
- Render the character simultaneously in 8 evenly spaced sequential rotational views side-by-side in a horizontal row across the canvas:
  1. Front View (0°)
  2. 3/4 Front Left (45°)
  3. Left Side Profile (90°)
  4. 3/4 Rear Left (135°)
  5. Back View (180°)
  6. 3/4 Rear Right (225°)
  7. Right Side Profile (270°)
  8. 3/4 Front Right (315°)

STRICT PIPELINE STANDARDS:
- ALIGNED HEIGHT BASELINE: All 8 figures MUST share the exact same height and scale across the sheet (eye level, shoulder level, hip level, and floor level aligned horizontally).
- UNIFIED A-POSE: Character stands in a clean, consistent neutral studio standing pose across all 8 views.
- 100% BIOMETRIC & COSTUME LOCK: Facial structure, hairstyle, fabric drape, seams, shoes, and accessories must remain 100% identical and coherent in all 8 angles.
- BACKGROUND: ${bgInstruction}
${customGuidance ? `- DIRECTIVE: "${customGuidance.trim()}"` : ''}

OUTPUT:
Generate ONE wide panoramic turnaround sheet displaying the 8 synchronized views in perfect orthographic alignment.`;
}

/**
 * Executes Character Turnaround generation
 */
export async function performCharacterTurnaround(options: TurnaroundExecutionOptions): Promise<TurnaroundResult> {
  const startTime = Date.now();
  trackRequest(3500, "Character 360 Turnaround");

  const {
    characterImageBase64,
    characterName = 'Character',
    renderMode,
    targetAngleId = 'front',
    backgroundStyle = 'neutral_studio',
    modelEngine = 'gemini-3-pro-image',
    customGuidance = ''
  } = options;

  const cleanChar = characterImageBase64.replace(/^data:[^;]+;base64,/, '');
  const charMime = characterImageBase64.match(/^data:([^;]+);/)?.[1] || 'image/png';

  let promptText = '';
  let requestedAspect = "1:1";

  if (renderMode === 'composite_sheet') {
    promptText = buildCompositeSheetPrompt({ characterName, backgroundStyle, customGuidance });
    requestedAspect = "16:9"; // Wide panoramic for full 8-view turnaround sheet
  } else {
    const angle = TURNAROUND_ANGLES.find(a => a.id === targetAngleId) || TURNAROUND_ANGLES[0];
    promptText = buildSingleAnglePrompt(angle, { characterName, backgroundStyle, customGuidance });
    requestedAspect = "3:4"; // Full body portrait ratio
  }

  const modelsToTry = [
    modelEngine,
    modelEngine === 'gemini-3-pro-image' ? 'gemini-3.1-flash-image' : 'gemini-3-pro-image'
  ];

  let rawGeneratedImage = '';
  let successfulModel = modelEngine;

  for (const engine of modelsToTry) {
    try {
      console.log(`[Character Turnaround] Synthesizing with engine: ${engine}, mode: ${renderMode}`);

      const parts: any[] = [];

      // 1. Character reference image
      const inlineChar = prepareInlineData(cleanChar, charMime);
      if (inlineChar) parts.push(inlineChar);

      // 2. Turnaround directive
      parts.push({ text: promptText });

      const client = getGeminiClient();
      const config: any = {
        imageConfig: {
          aspectRatio: requestedAspect,
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
      console.warn(`[Character Turnaround] Engine ${engine} failed:`, err?.message || err);
    }
  }

  if (!rawGeneratedImage) {
    throw new Error("Không thể tạo bộ xoay nhân vật. Vui lòng kiểm tra lại ảnh nhân vật hoặc thử lại.");
  }

  const durationMs = Date.now() - startTime;

  return {
    resultImage: rawGeneratedImage,
    renderMode,
    angleId: renderMode === 'single_angle' ? targetAngleId : undefined,
    modelUsed: successfulModel,
    durationMs
  };
}
