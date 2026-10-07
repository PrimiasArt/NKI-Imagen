import { ImagePromptJson } from '../types';
import { getGeminiClient } from './geminiService';

export interface AestheticDnaSlots {
  colorImageBase64?: string | null;
  opticsImageBase64?: string | null;
  textureImageBase64?: string | null;
  styleImageBase64?: string | null;
}

export interface AestheticDnaResult {
  dnaTitle: string;
  colorPalette: string;
  opticsFormula: string;
  textureSpecs: string;
  artMovement: string;
  masterFormula: string;
  mergedJson: ImagePromptJson;
}

/**
 * Extracts and blends aesthetic DNA across 4 distinct dimensions from reference images.
 */
export async function blendAestheticDna(
  slots: AestheticDnaSlots,
  userSubject: string = 'A cinematic character in a grand atmosphere'
): Promise<AestheticDnaResult> {
  const client = getGeminiClient();

  const parts: any[] = [];

  parts.push({
    text: `You are the Master Aesthetic Geneticist for Google Imagen 3 and Veo.
Your task is to extract individual genetic aesthetic DNA from up to 4 image slots and hybridize them into a groundbreaking, bespoke aesthetic matrix.

Slots:
1. Color DNA: Only extract the lighting temperature, chromatic saturation, shadow tint, and color harmony.
2. Optics DNA: Only extract camera focal length, lens curvature, anamorphic bokeh, and depth of field.
3. Texture DNA: Only extract micro-surface materials (fabrics, skin pores, moisture, metallic grain).
4. Art Style DNA: Only extract artistic movement, painterly vs photorealistic rendering grammar.

Output STRICT JSON with format:
{
  "dnaTitle": "Bespoke Hybrid Aesthetic Name",
  "colorPalette": "Extracted Color Palette description",
  "opticsFormula": "Extracted Optics and Lens description",
  "textureSpecs": "Extracted Micro-surface and Material specs",
  "artMovement": "Extracted Artistic School/Grammar",
  "masterFormula": "Complete unified synthesis prompt integrating all 4 genepools",
  "mergedJson": {
    "subject": "${userSubject}",
    "art_style": "...",
    "posing": "",
    "lighting": "...",
    "color_palette": "...",
    "composition": "...",
    "camera_angle": "...",
    "texture": "...",
    "skin_texture": "...",
    "font": "",
    "mood": "...",
    "additional_details": "..."
  }
}`
  });

  if (slots.colorImageBase64) {
    parts.push({ text: 'Slot 1: COLOR DNA REFERENCE IMAGE:' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: slots.colorImageBase64.replace(/^data:image\/\w+;base64,/, '') } });
  }

  if (slots.opticsImageBase64) {
    parts.push({ text: 'Slot 2: OPTICS & CAMERA DNA REFERENCE IMAGE:' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: slots.opticsImageBase64.replace(/^data:image\/\w+;base64,/, '') } });
  }

  if (slots.textureImageBase64) {
    parts.push({ text: 'Slot 3: TEXTURE & MATERIAL DNA REFERENCE IMAGE:' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: slots.textureImageBase64.replace(/^data:image\/\w+;base64,/, '') } });
  }

  if (slots.styleImageBase64) {
    parts.push({ text: 'Slot 4: ART MOVEMENT DNA REFERENCE IMAGE:' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: slots.styleImageBase64.replace(/^data:image\/\w+;base64,/, '') } });
  }

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: parts,
    config: {
      responseMimeType: 'application/json'
    }
  });

  const text = response.text?.trim() || '{}';
  const parsed = JSON.parse(text);

  return {
    dnaTitle: parsed.dnaTitle || 'Custom Aesthetic Hybrid',
    colorPalette: parsed.colorPalette || 'Balanced cinematic tones',
    opticsFormula: parsed.opticsFormula || '35mm prime f/1.4',
    textureSpecs: parsed.textureSpecs || 'Authentic organic surface',
    artMovement: parsed.artMovement || 'Contemporary Cinematic',
    masterFormula: parsed.masterFormula || '',
    mergedJson: parsed.mergedJson || {
      subject: userSubject,
      art_style: parsed.artMovement || '',
      posing: '',
      lighting: parsed.colorPalette || '',
      color_palette: parsed.colorPalette || '',
      composition: 'Golden ratio framing',
      camera_angle: parsed.opticsFormula || '',
      texture: parsed.textureSpecs || '',
      skin_texture: 'Natural micro-details',
      font: '',
      mood: 'Atmospheric',
      additional_details: '[Aesthetic DNA Hybrid]'
    }
  };
}
