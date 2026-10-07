import { ImagePromptJson, PromptQualityResult } from '../types';
import { getGeminiClient } from './geminiService';

// AI generic trap keywords that lower image synthesis realism
export const AI_TRAP_KEYWORDS = [
  'photorealistic',
  'hyperrealistic',
  'ultra-realistic',
  '8k',
  '4k',
  'octane render',
  'unreal engine',
  'trending on artstation',
  'masterpiece',
  'award winning',
  'insanely detailed',
  'cinematic 8k',
  'super detailed'
];

/**
 * Calculates a comprehensive prompt quality score (0 - 100) and provides actionable feedback.
 * Operates purely locally and instantly without network overhead.
 */
export function calculatePromptQuality(json: Partial<ImagePromptJson>): PromptQualityResult {
  let subjectScore = 0;
  let lightingScore = 0;
  let compositionScore = 0;
  let cameraScore = 0;
  let styleScore = 0;
  let detailsScore = 0;

  const strengths: string[] = [];
  const improvements: string[] = [];
  const warnings: string[] = [];
  const detectedAiTraps: string[] = [];

  const fullText = Object.values(json).filter(Boolean).join(' ').toLowerCase();

  // 1. Detect AI Buzzword Traps
  AI_TRAP_KEYWORDS.forEach(trap => {
    if (fullText.includes(trap)) {
      detectedAiTraps.push(trap);
    }
  });

  if (detectedAiTraps.length > 0) {
    warnings.push(`Chứa ${detectedAiTraps.length} từ khóa bẫy AI (${detectedAiTraps.slice(0, 3).join(', ')}...) làm giảm độ tự nhiên của ảnh.`);
  }

  // 2. Evaluate Subject (0 - 20 pts)
  const subject = (json.subject || '').trim();
  if (subject.length > 10) {
    subjectScore = 15;
    if (subject.length > 35) subjectScore = 20;
    strengths.push('Chủ thể xác định rõ ràng, có ngữ cảnh và hành động cụ thể.');
  } else if (subject.length > 0) {
    subjectScore = 8;
    improvements.push('Chủ thể còn ngắn. Hãy thêm bối cảnh, trang phục hoặc tâm trạng cụ thể.');
  } else {
    improvements.push('Thiếu chủ thể chính (Subject)!');
  }

  // 3. Evaluate Lighting (0 - 20 pts)
  const lighting = (json.lighting || '').trim().toLowerCase();
  const proLightingTerms = ['rim light', 'volumetric', 'chiaroscuro', 'softbox', 'golden hour', 'diffused', 'backlit', 'god rays', 'neon', 'ambient', 'dramatic', 'bioluminescent'];
  if (lighting.length > 5) {
    lightingScore = 12;
    if (proLightingTerms.some(t => lighting.includes(t))) {
      lightingScore = 20;
      strengths.push('Hệ thống ánh sáng điện ảnh chuyên nghiệp với nguồn sáng rõ ràng.');
    }
  } else {
    improvements.push('Cần bổ sung ánh sáng (Lighting) như rim light, volumetric hoặc golden hour để tạo chiều sâu.');
  }

  // 4. Evaluate Composition (0 - 15 pts)
  const comp = (json.composition || '').trim().toLowerCase();
  const proCompTerms = ['rule of thirds', 'golden ratio', 'leading lines', 'symmetry', 'foreground', 'depth', 'bokeh', 'centered', 'framing'];
  if (comp.length > 5) {
    compositionScore = 10;
    if (proCompTerms.some(t => comp.includes(t))) {
      compositionScore = 15;
      strengths.push('Bố cục chặt chẽ theo quy tắc thị giác chuyên nghiệp.');
    }
  } else {
    improvements.push('Bổ sung bố cục (Composition) như rule of thirds, leading lines hoặc depth layering.');
  }

  // 5. Evaluate Camera Angle & Optics (0 - 15 pts)
  const cam = (json.camera_angle || '').trim().toLowerCase();
  const proCamTerms = ['low angle', 'high angle', 'wide angle', 'telephoto', 'macro', 'eye level', 'dutch angle', 'drone', 'close-up', 'full body', '35mm', '50mm', '85mm', 'f/1.4', 'f/2.8'];
  if (cam.length > 4) {
    cameraScore = 10;
    if (proCamTerms.some(t => cam.includes(t))) {
      cameraScore = 15;
      strengths.push('Góc máy và tiêu cự được định vị rõ nét.');
    }
  } else {
    improvements.push('Nên xác định góc máy hoặc tiêu cự ống kính (35mm, 85mm, low-angle...).');
  }

  // 6. Evaluate Art Style & Color Palette (0 - 15 pts)
  const style = (json.art_style || '').trim();
  const color = (json.color_palette || '').trim();
  if (style.length > 3) styleScore += 8;
  if (color.length > 3) styleScore += 7;
  if (styleScore >= 12) {
    strengths.push('Phong cách nghệ thuật và bảng màu đồng bộ.');
  } else {
    improvements.push('Thêm phong cách mỹ thuật hoặc gam màu chủ đạo để định hình thẩm mỹ.');
  }

  // 7. Evaluate Texture & Micro Details (0 - 15 pts)
  const texture = (json.texture || '').trim();
  const skin = (json.skin_texture || '').trim();
  const details = (json.additional_details || '').trim();
  if (texture.length > 4 || skin.length > 4) detailsScore += 8;
  if (details.length > 10) detailsScore += 7;
  if (detailsScore >= 12) {
    strengths.push('Chi tiết vi mô và bề mặt chất liệu rất phong phú.');
  }

  // Check Contradictions
  if (cam.includes('macro') && (comp.includes('aerial') || cam.includes('wide angle'))) {
    warnings.push('Cảnh báo xung đột: Không nên kết hợp ống kính Macro cận cảnh với góc rộng Aerial.');
  }

  // Calculate Total & Apply Penalties
  let totalScore = subjectScore + lightingScore + compositionScore + cameraScore + styleScore + detailsScore;
  
  // Deduct points for AI traps
  totalScore = Math.max(10, totalScore - (detectedAiTraps.length * 6));
  totalScore = Math.min(100, Math.round(totalScore));

  let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'D';
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 78) grade = 'A';
  else if (totalScore >= 60) grade = 'B';
  else if (totalScore >= 40) grade = 'C';

  return {
    score: totalScore,
    grade,
    dimensionScores: {
      subject: Math.round((subjectScore / 20) * 100),
      lighting: Math.round((lightingScore / 20) * 100),
      composition: Math.round((compositionScore / 15) * 100),
      camera: Math.round((cameraScore / 15) * 100),
      style: Math.round((styleScore / 15) * 100),
      details: Math.round((detailsScore / 15) * 100),
    },
    strengths,
    improvements,
    warnings,
    detectedAiTraps
  };
}

/**
 * 1-Click Auto-Enrich Prompt:
 * Uses Google Gemini 2.5 Flash to intelligently refine, enrich and calibrate all 12 dimensions
 * of the JSON prompt without altering the user's core concept.
 */
export async function autoEnrichPrompt(currentJson: ImagePromptJson): Promise<ImagePromptJson> {
  const client = getGeminiClient();

  const systemInstruction = `You are a World-Class Hollywood Cinematographer and Fine Art Director for Google Imagen 3.
Your task is to AUTO-ENRICH a 12-field structured JSON prompt to maximum cinematic fidelity.

RULES:
1. PRESERVE the core user subject, characters, and primary artistic intention.
2. ENRICH empty or sparse fields with rich, photochemically authentic photography details:
   - lighting: specific lighting keys (volumetric rim light, softbox 45°, chiaroscuro, bounce fill).
   - composition: classical framing (golden spiral, dynamic symmetry, multi-plane foreground depth).
   - camera_angle: authentic lens & aperture specs (e.g. 50mm f/1.4 prime, eye-level cinematic shot).
   - texture & skin_texture: natural micropore fidelity, real fabric weave, subsurface scattering, authentic skin peach fuzz.
   - color_palette: precise color grades (e.g. Kodak Portra 400 tones, teal-orange split tone, muted amber).
3. STRIP ALL generic AI buzzwords: '8k', 'photorealistic', 'octane render', 'trending on artstation'. Replace with real-world optics & lighting physics.
4. Output STRICT VALID JSON matching exactly the 12 keys provided.`;

  const prompt = `Current JSON to Enrich:
${JSON.stringify(currentJson, null, 2)}

Enrich and return the updated JSON with all 12 keys filled with highest quality cinematic detail.`;

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json'
    }
  });

  const text = response.text?.trim() || '{}';
  const enriched = JSON.parse(text);

  // Fallback merge
  return {
    subject: enriched.subject || currentJson.subject || '',
    art_style: enriched.art_style || currentJson.art_style || '',
    posing: enriched.posing || currentJson.posing || '',
    lighting: enriched.lighting || currentJson.lighting || '',
    color_palette: enriched.color_palette || currentJson.color_palette || '',
    composition: enriched.composition || currentJson.composition || '',
    camera_angle: enriched.camera_angle || currentJson.camera_angle || '',
    texture: enriched.texture || currentJson.texture || '',
    skin_texture: enriched.skin_texture || currentJson.skin_texture || '',
    font: enriched.font || currentJson.font || '',
    mood: enriched.mood || currentJson.mood || '',
    additional_details: enriched.additional_details || currentJson.additional_details || ''
  };
}
