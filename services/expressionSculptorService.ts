import { getGeminiClient, compressBase64Image, prepareInlineData, callWithRetry, trackRequest } from './geminiService';
import { getStudioModelConfig } from './modelConfigService';

export type GazeDirection =
  | 'center_direct'
  | 'glance_left'
  | 'glance_right'
  | 'dreamy_up'
  | 'introspective_down'
  | 'side_profile';

export type EyeOpenness =
  | 'default'
  | 'wide_open'
  | 'smize_squint'
  | 'winking'
  | 'peaceful_closed';

export type IrisColor =
  | 'original'
  | 'hazel_brown'
  | 'sapphire_blue'
  | 'emerald_green'
  | 'smoky_gray'
  | 'amber_gold'
  | 'deep_obsidian';

export type MoodVibe =
  | 'confident'
  | 'enigmatic'
  | 'dramatic'
  | 'serene'
  | 'fierce'
  | 'joyful_playful'
  | 'seductive'
  | 'stoic_editorial';

export type LipStyle =
  | 'natural'
  | 'plump_glossy'
  | 'parted_editorial'
  | 'mona_lisa_smirk'
  | 'subtle_pout';

export type JawlineSculpt =
  | 'original'
  | 'chiseled_sharp'
  | 'slender_vline'
  | 'soft_rounded';

export type CheekboneSculpt =
  | 'original'
  | 'high_fashion_lift'
  | 'soft_apple_cheeks';

export type HairFlow =
  | 'original'
  | 'voluminous_blowout'
  | 'windblown_strands'
  | 'sleek_tucked';

export interface ExpressionParams {
  smileIntensity: number; // -50 (Solemn/Serious) to 100 (Radiant Smile)
  gazeDirection: GazeDirection;
  eyeOpenness?: EyeOpenness;
  irisColor?: IrisColor;
  moodVibe: MoodVibe;
  lipStyle?: LipStyle;
  jawlineSculpt?: JawlineSculpt;
  cheekboneSculpt?: CheekboneSculpt;
  hairFlow?: HairFlow;
  ageShift?: number; // -30 (Youthful) to +40 (Distinguished Elder)
  headPoseYaw?: number; // -30 (Turn Left) to +30 (Turn Right)
  headPosePitch?: number; // -20 (Look Down) to +20 (Look Up)
  headPoseRoll?: number; // -15 (Tilt Left) to +15 (Tilt Right)
  skinRetouchLevel: number; // 0 (raw) to 100 (high-end frequency separation)
  customSculptDirective?: string;
  customModel?: string;
}

export const GAZE_OPTIONS: { id: GazeDirection; label: string; icon: string; cue: string }[] = [
  { id: 'center_direct', label: 'Nhìn Thẳng Camera', icon: '👁️', cue: 'Direct magnetic eye contact penetrating into the camera lens' },
  { id: 'glance_left', label: 'Liếc Sang Trái', icon: '👈', cue: 'Subtle gaze shifted toward screen left, thoughtful side glance' },
  { id: 'glance_right', label: 'Liếc Sang Phải', icon: '👉', cue: 'Reflective side glance toward screen right' },
  { id: 'dreamy_up', label: 'Nhìn Lên Mơ Mộng', icon: '✨', cue: 'Eyes elevated slightly upward, contemplative dreamy aspiration' },
  { id: 'introspective_down', label: 'Nhìn Xuống Trầm Tư', icon: '💭', cue: 'Gaze lowered modestly, introspective calm emotion' },
  { id: 'side_profile', label: 'Góc Nhìn Nghiêng 3/4', icon: '👤', cue: 'Elegant three-quarter profile gaze looking into the distance' }
];

export const EYE_OPENNESS_OPTIONS: { id: EyeOpenness; label: string; icon: string; cue: string }[] = [
  { id: 'default', label: 'Tự Nhiên', icon: '👁️', cue: 'Natural eye aperture and eyelid position' },
  { id: 'smize_squint', label: 'Mắt Cười Quyến Rũ (Smize)', icon: '😏', cue: 'Tyra-Banks style smize with subtly narrowed alluring eyelids and intense focal charm' },
  { id: 'wide_open', label: 'Mắt To Tròn Sáng Sủa', icon: '👀', cue: 'Wide open awakened eyes radiating clarity and alertness' },
  { id: 'winking', label: 'Nháy Mắt Tinh Nghịch', icon: '😉', cue: 'Playful photogenic wink with one eye subtly closed in high fashion poise' },
  { id: 'peaceful_closed', label: 'Nhắm Mắt Thư Thái', icon: '😌', cue: 'Gently closed serene eyelids in meditative bliss' }
];

export const IRIS_COLOR_OPTIONS: { id: IrisColor; label: string; colorCode: string; cue: string }[] = [
  { id: 'original', label: 'Màu Mắt Gốc', colorCode: '#666', cue: 'Preserve authentic native iris color' },
  { id: 'hazel_brown', label: 'Nâu Hạt Dẻ Ấm', colorCode: '#8B4513', cue: 'Warm luminous hazel-brown iris with honey amber striations' },
  { id: 'sapphire_blue', label: 'Xanh Biển Sapphire', colorCode: '#1E40AF', cue: 'Deep piercing crystalline sapphire blue irises with darker limbal ring' },
  { id: 'emerald_green', label: 'Xanh Lục Bảo Emerald', colorCode: '#047857', cue: 'Mesmerizing jewel-toned emerald green eyes with jade undertones' },
  { id: 'smoky_gray', label: 'Xám Khói Huyền Bí', colorCode: '#64748B', cue: 'Mysterious translucent storm gray irises with silver flecks' },
  { id: 'amber_gold', label: 'Vàng Hổ Phách Amber', colorCode: '#D97706', cue: 'Rare luminous golden amber feline irises glowing under light' },
  { id: 'deep_obsidian', label: 'Đen Huyền Tuyển Obsidian', colorCode: '#0F172A', cue: 'Deep enigmatic obsidian jet-black irises with sharp specular reflections' }
];

export const MOOD_OPTIONS: { id: MoodVibe; label: string; icon: string; cue: string }[] = [
  { id: 'confident', label: 'Tự Tin & Quyến Rũ', icon: '🦁', cue: 'Confident charismatic poise, firm jawline, magnetic aura' },
  { id: 'enigmatic', label: 'Bí Ẩn & Cuốn Hút', icon: '🔮', cue: 'Subtle knowing half-smile, enigmatic Mona-Lisa micro-expression' },
  { id: 'dramatic', label: 'Kịch Tính & Xúc Động', icon: '🎭', cue: 'Intense cinematic emotional depth, glistening focused eyes' },
  { id: 'serene', label: 'Bình Yên & Thanh Lịch', icon: '🕊️', cue: 'Tranquil relaxed facial muscles, serene gentle aura' },
  { id: 'fierce', label: 'Mạnh Mẽ & Sắc Sảo', icon: '⚡', cue: 'Fierce determined high-fashion editorial intensity' },
  { id: 'joyful_playful', label: 'Vui Tươi Tinh Nghịch', icon: '🎉', cue: 'Spontaneous joyful micro-expression full of vitality' },
  { id: 'seductive', label: 'Quyến Rũ Nồng Nàn', icon: '🌹', cue: 'Seductive magnetic warmth with soft parted lips and captivating gaze' },
  { id: 'stoic_editorial', label: 'Lạnh Lùng Haute Couture', icon: '🏛️', cue: 'Haute couture high-fashion stoic Runway composure' }
];

export const LIP_STYLE_OPTIONS: { id: LipStyle; label: string; cue: string }[] = [
  { id: 'natural', label: 'Môi Tự Nhiên Gốc', cue: 'Preserve natural lip volume and silhouette' },
  { id: 'plump_glossy', label: 'Môi Căng Mọng Đầy Đặn (Plump)', cue: 'Hydrated plump voluptuous lips with subtle gloss highlights' },
  { id: 'parted_editorial', label: 'Hở Môi Nhẹ Editorial (Parted Lips)', cue: 'Sensual subtly parted lips revealing slight edge of top teeth' },
  { id: 'mona_lisa_smirk', label: 'Khẽ Cười Mỉm (Mona Lisa Smirk)', cue: 'Gentle upturned lip corners with knowing micro-smile' },
  { id: 'subtle_pout', label: 'Chu Môi Tinh Tế (Subtle Pout)', cue: 'Gentle fashionable model pout with delicate cupid bow definition' }
];

export const JAWLINE_OPTIONS: { id: JawlineSculpt; label: string; cue: string }[] = [
  { id: 'original', label: 'Góc Hàm Gốc', cue: 'Preserve original jawline bone structure' },
  { id: 'chiseled_sharp', label: 'Góc Cạnh Chiseled Runway', cue: 'Razor-sharp chiseled sculpted jawline with clean mandibular angle shadow' },
  { id: 'slender_vline', label: 'Thon Gọn V-Line Dịu Dàng', cue: 'Elegantly tapered gentle V-line jaw contour with smooth chin taper' },
  { id: 'soft_rounded', label: 'Khuôn Cằm Mềm Mại', cue: 'Soft gentle natural rounded jawline' }
];

export const CHEEKBONE_OPTIONS: { id: CheekboneSculpt; label: string; cue: string }[] = [
  { id: 'original', label: 'Gò Má Gốc', cue: 'Preserve original cheekbones' },
  { id: 'high_fashion_lift', label: 'Gò Má Cao Sắc Nét (High-Lift)', cue: 'Sculpted high fashion cheekbones with natural contour hollowing below zygomatic arch' },
  { id: 'soft_apple_cheeks', label: 'Má Bầu Bĩnh Trẻ Trung (Apple)', cue: 'Youthful plump apple cheeks with radiant dermal fullness' }
];

export const HAIR_FLOW_OPTIONS: { id: HairFlow; label: string; cue: string }[] = [
  { id: 'original', label: 'Tóc Gốc', cue: 'Preserve current hair volume and arrangement' },
  { id: 'voluminous_blowout', label: 'Tóc Bồng Bềnh Salon Blowout', cue: 'Lush voluminous hair with cinematic bounce and root lift' },
  { id: 'windblown_strands', label: 'Mái Bay Lưa Thưa Gió Thổi', cue: 'Delicate windblown strands framing the face naturally as if caught in a gentle studio breeze' },
  { id: 'sleek_tucked', label: 'Tóc Vuốt Ép Gọn Gàng', cue: 'Sleek neatly groomed hair tucked gracefully behind ears' }
];

export interface SculptPreset {
  id: string;
  name: string;
  icon: string;
  params: Partial<ExpressionParams>;
}

export const SCULPT_PRESETS: SculptPreset[] = [
  {
    id: 'runway_supermodel',
    name: 'Runway Supermodel',
    icon: '👠',
    params: {
      smileIntensity: -10,
      gazeDirection: 'center_direct',
      eyeOpenness: 'smize_squint',
      moodVibe: 'stoic_editorial',
      lipStyle: 'parted_editorial',
      jawlineSculpt: 'chiseled_sharp',
      cheekboneSculpt: 'high_fashion_lift',
      hairFlow: 'windblown_strands',
      skinRetouchLevel: 80
    }
  },
  {
    id: 'hollywood_smile',
    name: 'Hollywood Radiant Smile',
    icon: '✨',
    params: {
      smileIntensity: 85,
      gazeDirection: 'center_direct',
      eyeOpenness: 'default',
      moodVibe: 'joyful_playful',
      lipStyle: 'plump_glossy',
      jawlineSculpt: 'original',
      cheekboneSculpt: 'soft_apple_cheeks',
      hairFlow: 'voluminous_blowout',
      skinRetouchLevel: 70
    }
  },
  {
    id: 'youth_glow',
    name: 'Trẻ Hóa 10 Tuổi (Youth Glow)',
    icon: '⏳',
    params: {
      ageShift: -10,
      smileIntensity: 25,
      gazeDirection: 'center_direct',
      moodVibe: 'serene',
      skinRetouchLevel: 85,
      cheekboneSculpt: 'soft_apple_cheeks'
    }
  },
  {
    id: 'distinguished_age',
    name: 'Lão Hóa Điện Ảnh (Chrono-Shift)',
    icon: '🕰️',
    params: {
      ageShift: 20,
      smileIntensity: -15,
      gazeDirection: 'side_profile',
      moodVibe: 'dramatic',
      skinRetouchLevel: 0
    }
  },
  {
    id: 'mona_lisa_mystery',
    name: 'Mona Lisa Bí Ẩn',
    icon: '🔮',
    params: {
      smileIntensity: 20,
      gazeDirection: 'glance_left',
      moodVibe: 'enigmatic',
      lipStyle: 'mona_lisa_smirk',
      eyeOpenness: 'smize_squint',
      skinRetouchLevel: 75
    }
  }
];

/**
 * Executes Advanced Neural Face Expression, Head Pose, Anatomy & Gaze Sculpting.
 */
export async function runExpressionSculpt(
  baseImage: string,
  params: ExpressionParams
): Promise<{ resultImage: string }> {
  trackRequest(2800, "Studio Expression Sculpt Extended");

  const compressedBase = await compressBase64Image(baseImage);
  const baseInline = prepareInlineData(compressedBase, 'image/jpeg');

  const gazeMeta = GAZE_OPTIONS.find(g => g.id === params.gazeDirection) || GAZE_OPTIONS[0];
  const eyeMeta = EYE_OPENNESS_OPTIONS.find(e => e.id === params.eyeOpenness) || EYE_OPENNESS_OPTIONS[0];
  const irisMeta = IRIS_COLOR_OPTIONS.find(i => i.id === params.irisColor) || IRIS_COLOR_OPTIONS[0];
  const moodMeta = MOOD_OPTIONS.find(m => m.id === params.moodVibe) || MOOD_OPTIONS[0];
  const lipMeta = LIP_STYLE_OPTIONS.find(l => l.id === params.lipStyle) || LIP_STYLE_OPTIONS[0];
  const jawMeta = JAWLINE_OPTIONS.find(j => j.id === params.jawlineSculpt) || JAWLINE_OPTIONS[0];
  const cheekMeta = CHEEKBONE_OPTIONS.find(c => c.id === params.cheekboneSculpt) || CHEEKBONE_OPTIONS[0];
  const hairMeta = HAIR_FLOW_OPTIONS.find(h => h.id === params.hairFlow) || HAIR_FLOW_OPTIONS[0];

  let smileDesc = 'neutral relaxed lips';
  if (params.smileIntensity > 50) {
    smileDesc = 'radiant authentic warm smile showing natural teeth, open zygomaticus muscles and cheerful eye crinkle';
  } else if (params.smileIntensity > 15) {
    smileDesc = 'subtle charming gentle smile with slightly upturned lip corners';
  } else if (params.smileIntensity < -20) {
    smileDesc = 'serious, poised, stoic, solemn and intense closed-lip expression';
  }

  const instructionsText = `You are a Hollywood Master Portrait Visual Effects (VFX) Artist, Digital Sculptor and High-End Editorial Retoucher.
TASK: Physically re-sculpt and adjust the character's facial expression, anatomy, 3D head pose and skin in the provided photo according to these EXACT specifications:

1. MOUTH & SMILE DYNAMICS:
- Smile Expression: ${smileDesc} (Intensity: ${params.smileIntensity}%).
- Lip Silhouette: ${lipMeta.cue}.

2. EYE & GAZE ANATOMY:
- Gaze Vector: ${gazeMeta.cue}.
- Eye Aperture: ${eyeMeta.cue}.
${params.irisColor && params.irisColor !== 'original' ? `- Iris Color Tone: ${irisMeta.cue}.` : ''}

3. FACIAL BONE STRUCTURE & CONTOUR:
- Jawline & Mandible: ${jawMeta.cue}.
- Cheekbones & Zygomatic: ${cheekMeta.cue}.

4. 3D HEAD POSE ORIENTATION:
${params.headPoseYaw ? `- Yaw (Horizontal Turn): ${params.headPoseYaw > 0 ? `Turn head ${params.headPoseYaw}° to the right` : `Turn head ${Math.abs(params.headPoseYaw)}° to the left`}.` : '- Head Yaw: Maintain original angle.'}
${params.headPosePitch ? `- Pitch (Vertical Tilt): ${params.headPosePitch > 0 ? `Tilt head ${params.headPosePitch}° upward` : `Tilt chin ${Math.abs(params.headPosePitch)}° downward`}.` : '- Head Pitch: Maintain original angle.'}
${params.headPoseRoll ? `- Roll (Head Cant): ${params.headPoseRoll > 0 ? `Cant head ${params.headPoseRoll}° to right shoulder` : `Cant head ${Math.abs(params.headPoseRoll)}° to left shoulder`}.` : '- Head Roll: Maintain original angle.'}

5. AGE MORPHING (CHRONO-SHIFT):
${params.ageShift && params.ageShift !== 0 ? (
  params.ageShift < 0 
    ? `- Youth Shift (${params.ageShift} years younger): Rejuvenate dermal elasticity, smooth fine lines, restore youthful collagen fullness while keeping authentic facial identity.` 
    : `- Distinguish Aging (+${params.ageShift} years older): Introduce graceful cinematic age lines, subtle dignified crow's feet and mature character depth while preserving recognizable core identity.`
) : '- Age: Preserve current natural age.'}

6. HAIR DYNAMICS:
- Hair Staging: ${hairMeta.cue}.

7. EMOTIONAL VIBE & RETOUCH:
- Aura & Vibe: ${moodMeta.cue}.
- Skin Retouch Level: ${params.skinRetouchLevel > 15 ? `High-End Beauty Frequency Separation retouch (${params.skinRetouchLevel}%): soften minor blemishes, red spots, and under-eye shadows while METICULOUSLY PRESERVING 100% of authentic skin pore micro-texture, fine dermal grain, and natural skin translucency (never look plastic, waxy, or artificially blurred).` : 'Maintain 100% raw unaltered skin texture.'}

${params.customSculptDirective ? `8. SPECIAL USER DIRECTIVE: ${params.customSculptDirective}` : ''}

CRITICAL IDENTITY FIDELITY RULES:
- You MUST maintain 100% recognition and likeness of the original character's core facial identity (nose bridge, eye shape, ear placement, distinctive traits).
- Output ONLY the resulting ultra-photorealistic edited photograph.`;

  const client = getGeminiClient();
  const parts: any[] = [];
  if (baseInline) parts.push(baseInline);
  parts.push({ text: instructionsText });

  const studioConfig = getStudioModelConfig();
  const modelsToTry = [
    params.customModel || studioConfig.studioModel,
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-3.1-flash-lite-image',
    'gemini-2.5-flash-image'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await callWithRetry(() => client.models.generateContent({
        model,
        contents: { parts }
      }), 2, 2000);

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
    } catch (err) {
      console.warn(`Model ${model} failed for Expression Sculpting, trying fallback...`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("Expression Sculpting failed across available engines.");
}
