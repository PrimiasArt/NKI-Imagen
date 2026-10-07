import { BiometricProfile, DualCharacterPairing, DualCharacterConfig, CharacterPersona } from '../types';
import { getGeminiClient, compressBase64Image, prepareInlineData, callWithRetry } from './geminiService';
import { getStudioModelConfig } from './modelConfigService';

// Local & In-Memory Cache for instant 0ms retrieval of analyzed biometric profiles
const memoryBiometricCache = new Map<string, BiometricProfile>();
const STORAGE_KEY_BIOMETRIC_CACHE = 'nki_biometric_profiles_cache';

/**
 * Generates a short deterministic cache key from image data
 */
function getImageFingerprint(base64: string): string {
  if (!base64) return '';
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const len = clean.length;
  if (len < 100) return clean;
  // Sample head, middle, and tail
  return `${len}_${clean.slice(0, 32)}_${clean.slice(Math.floor(len / 2), Math.floor(len / 2) + 32)}_${clean.slice(-32)}`;
}

/**
 * Initializes biometric cache from localStorage
 */
function loadBiometricCacheFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BIOMETRIC_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          memoryBiometricCache.set(k, v as BiometricProfile);
        });
      }
    }
  } catch (e) {
    console.warn('[BiometricCoreService] Failed loading biometric cache:', e);
  }
}

/**
 * Persists current cache with LRU limitation
 */
function persistBiometricCache() {
  if (typeof window === 'undefined') return;
  try {
    const entries = Array.from(memoryBiometricCache.entries());
    // Keep up to 60 most recent profiles
    const trimmed = entries.slice(-60);
    const obj = Object.fromEntries(trimmed);
    localStorage.setItem(STORAGE_KEY_BIOMETRIC_CACHE, JSON.stringify(obj));
  } catch (e) {
    console.warn('[BiometricCoreService] Failed persisting biometric cache:', e);
  }
}

// Trigger initial cache load
if (typeof window !== 'undefined') {
  loadBiometricCacheFromStorage();
}

/**
 * Advanced Google Vision Biometric Analyzer
 * Uses Gemini Multimodal Vision with forensic precision to extract facial geometry,
 * bone structure, eyes, hair, ethnicity, age, and a rich biometric descriptor for image generation.
 */
export async function analyzeBiometricFaceCore(
  photoBase64: string,
  nameHint?: string
): Promise<BiometricProfile> {
  if (!photoBase64) {
    throw new Error('No image provided for Biometric Vision analysis');
  }

  const fingerprint = getImageFingerprint(photoBase64);
  if (fingerprint && memoryBiometricCache.has(fingerprint)) {
    const cached = memoryBiometricCache.get(fingerprint)!;
    if (nameHint && (!cached.name || cached.name.startsWith('Model'))) {
      cached.name = nameHint;
    }
    return cached;
  }

  try {
    const client = getGeminiClient();
    const config = getStudioModelConfig();
    const compressed = await compressBase64Image(photoBase64, 1024, 0.85);
    const inlineData = prepareInlineData(compressed, 'image/jpeg');

    const promptText = `You are an elite Google Vision Biometric Forensic Expert and High-End Fashion Casting Director.
Examine this portrait photograph with forensic precision to construct a comprehensive Biometric Profile for photorealistic character replacement and face consistency.

Extract and return strictly a valid JSON object matching this schema without any markdown formatting or commentary:
{
  "name": "${nameHint || 'Model Persona'}",
  "gender": "Female" | "Male" | "Non-binary",
  "estimatedAge": "e.g. '22-25 tuổi' or 'Late 20s'",
  "ethnicity": "e.g. 'East Asian / Vietnamese', 'Caucasian / European', 'Latina', 'Mixed', etc.",
  "faceShape": "e.g. 'Refined V-line oval', 'Symmetrical heart-shaped', 'Contoured angular square'",
  "jawline": "e.g. 'Chiseled sharp mandibular line', 'Soft feminine jaw contour', 'Defined chin'",
  "eyes": {
    "shape": "e.g. 'Almond double-eyelid', 'Deep-set captivating', 'Subtle monolid with upward tilt'",
    "color": "e.g. 'Warm dark amber brown', 'Piercing hazel', 'Emerald green', 'Deep obsidian black'",
    "brows": "e.g. 'Naturally arched refined brows', 'Straight soft feathered eyebrows'"
  },
  "nose": "e.g. 'High straight delicate nasal bridge, refined soft tip', 'Aquiline dignified profile'",
  "lips": "e.g. 'Full plush lips with distinct cupid\\'s bow', 'Soft natural roseate contours'",
  "hair": {
    "color": "e.g. 'Rich dark espresso brown', 'Chestnut auburn', 'Raven black with subtle gloss'",
    "style": "e.g. 'Effortless loose beach waves, center parting', 'Structured slicked back bob'",
    "length": "e.g. 'Long past shoulders', 'Medium clavicle length', 'Short textured'",
    "texture": "e.g. 'Silky wavy', 'Fine straight', 'Voluminous coils'"
  },
  "distinguishingFeatures": "e.g. 'Subtle beauty mark below left eye', 'Delicate natural freckles across nose bridge', 'Distinctive dimple', 'None'",
  "undertone": "e.g. 'Warm golden honey', 'Cool porcelain rosy', 'Neutral olive', 'Sun-kissed bronze'",
  "summaryDescriptor": "A dense, high-potency English biometric descriptive prompt (35-50 words) capturing their exact age, ethnicity, facial geometry, eye shape and color, nose, lips, undertone, and distinct identity, specially engineered for Imagen/Gemini cross-attention identity conditioning."
}`;

    const response = await callWithRetry(() => client.models.generateContent({
      model: config.analysisModel || 'gemini-2.5-flash',
      contents: {
        parts: [inlineData, { text: promptText }]
      }
    }), 2, 1500);

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Google Vision did not return valid JSON biometric data');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<BiometricProfile>;
    
    // Construct guaranteed BiometricProfile
    const profile: BiometricProfile = {
      id: `bio_${Date.now()}`,
      name: nameHint || parsed.name || 'Model Persona',
      gender: parsed.gender === 'Male' ? 'Male' : (parsed.gender === 'Non-binary' ? 'Non-binary' : 'Female'),
      estimatedAge: parsed.estimatedAge || '20-25 tuổi',
      ethnicity: parsed.ethnicity || 'Natural Heritage',
      faceShape: parsed.faceShape || 'Balanced Oval',
      jawline: parsed.jawline || 'Contoured natural jawline',
      eyes: {
        shape: parsed.eyes?.shape || 'Almond eyes',
        color: parsed.eyes?.color || 'Dark brown',
        brows: parsed.eyes?.brows || 'Natural brows'
      },
      nose: parsed.nose || 'Straight refined bridge',
      lips: parsed.lips || 'Natural contoured lips',
      hair: {
        color: parsed.hair?.color || 'Dark hair',
        style: parsed.hair?.style || 'Natural styling',
        length: parsed.hair?.length || 'Medium length',
        texture: parsed.hair?.texture || 'Smooth'
      },
      distinguishingFeatures: parsed.distinguishingFeatures || 'None',
      undertone: parsed.undertone || 'Warm golden',
      summaryDescriptor: parsed.summaryDescriptor || `${parsed.gender || 'Person'}, ${parsed.estimatedAge || '20s'}, ${parsed.faceShape || 'oval face'}, ${parsed.eyes?.color || 'dark'} ${parsed.eyes?.shape || 'eyes'}, natural features`,
      analyzedAt: Date.now()
    };

    if (fingerprint) {
      memoryBiometricCache.set(fingerprint, profile);
      persistBiometricCache();
    }

    return profile;
  } catch (err: any) {
    console.error('[BiometricCoreService] Google Vision Biometric analysis failed:', err);
    // Return graceful fallback profile from name or general assumptions
    const fallbackProfile: BiometricProfile = {
      id: `bio_fallback_${Date.now()}`,
      name: nameHint || 'Model Persona',
      gender: 'Female',
      estimatedAge: '20-25 tuổi',
      ethnicity: 'Natural',
      faceShape: 'Refined oval',
      jawline: 'Sharp defined jawline',
      eyes: { shape: 'Almond eyes', color: 'Deep brown', brows: 'Naturally arched' },
      nose: 'Delicate bridge',
      lips: 'Soft natural lips',
      hair: { color: 'Dark', style: 'Natural wavy', length: 'Long', texture: 'Silky' },
      distinguishingFeatures: 'None',
      undertone: 'Warm golden',
      summaryDescriptor: `${nameHint || 'Model'}, female, mid-20s, elegant defined features, expressive eyes, refined facial bone structure`,
      analyzedAt: Date.now()
    };
    return fallbackProfile;
  }
}

/**
 * Creates an instantaneous BiometricProfile from an existing CharacterPersona in the Vault
 * without requiring a network call.
 */
export function convertPersonaToBiometricProfile(persona: CharacterPersona): BiometricProfile {
  const gender = persona.gender === 'Male' ? 'Male' : (persona.gender === 'Non-binary' ? 'Non-binary' : 'Female');
  const summary = `${persona.name}, ${gender}, ${persona.ageRange || 'mid 20s'}, ${persona.bodyType ? `${persona.bodyType}, ` : ''}${persona.faceFeatures || 'striking symmetrical facial structure'}, with ${persona.hairStyle || 'natural hair'}`;
  
  return {
    id: persona.id,
    name: persona.name,
    gender: gender,
    estimatedAge: persona.ageRange || '20-25 tuổi',
    ethnicity: 'Natural Heritage',
    faceShape: persona.faceFeatures.includes('V-line') ? 'V-line oval' : 'Refined oval',
    jawline: persona.faceFeatures.includes('jaw') ? persona.faceFeatures : 'Defined jawline',
    eyes: {
      shape: 'Expressive almond eyes',
      color: 'Natural deep tone',
      brows: 'Naturally groomed'
    },
    nose: 'Straight delicate bridge',
    lips: 'Natural defined contours',
    hair: {
      color: 'Natural tone',
      style: persona.hairStyle || 'Natural styling',
      length: 'Medium to long',
      texture: 'Silky'
    },
    distinguishingFeatures: 'None',
    undertone: 'Harmonious natural undertone',
    summaryDescriptor: summary,
    analyzedAt: Date.now()
  };
}

/**
 * Builds the Single Character Biometric Conditioning Directive
 */
export function buildSingleBiometricPromptDirective(
  profile: BiometricProfile,
  useReferenceHair = false
): string {
  const hairDirective = useReferenceHair
    ? `INHERIT HAIR: Strictly copy the hair style (${profile.hair.style}), length (${profile.hair.length}), and color (${profile.hair.color}) from the reference identity.`
    : `HAIR SPEC: Only inherit facial bone structure, eyes (${profile.eyes.shape}, ${profile.eyes.color}), nose, and lips. Follow prompt text for hair styling.`;

  return `### BIOMETRIC IDENTITY LOCK: ${profile.name.toUpperCase()} ###
IDENTITY ANCHOR: The primary subject in this image must precisely exhibit the facial anatomy of ${profile.name}:
- Biometric Summary: ${profile.summaryDescriptor}
- Facial Geometry: ${profile.faceShape}, ${profile.jawline}, ${profile.undertone} skin tone.
- Eyes & Gaze: ${profile.eyes.shape}, ${profile.eyes.color} iris, ${profile.eyes.brows}.
- Nose & Mouth: ${profile.nose}, ${profile.lips}.
${profile.distinguishingFeatures !== 'None' ? `- Distinctive Marks: ${profile.distinguishingFeatures}.` : ''}
- ${hairDirective}
DIRECTIVE: Maintain high photographic realism and strict biometric facial fidelity matching this identity anchor.`;
}

/**
 * Builds the Advanced Dual-Character Biometric Protocol
 * Solves the identity-bleeding problem when placing 2 models in one photo.
 */
export interface DualBiometricProtocolOptions {
  core1: {
    imageBase64?: string;
    profile?: BiometricProfile;
    name?: string;
    slotLabel?: string;
  };
  core2: {
    imageBase64?: string;
    profile?: BiometricProfile;
    name?: string;
    slotLabel?: string;
  };
  pairing?: DualCharacterPairing;
  useReferenceHair?: boolean;
  antiBleedLock?: boolean;
  spatialArrangement?: 'left-right' | 'foreground-background' | 'interactive';
}

export interface DualBiometricProtocolResult {
  sceneSubjectEnhancement: string;
  characterAInstructions: string;
  characterBInstructions: string;
  antiBleedIsolationContract: string;
  negativePromptAdditions: string;
  detectedPairing: 'FF' | 'MM' | 'MF';
}

export function buildDualBiometricPromptProtocol(
  options: DualBiometricProtocolOptions
): DualBiometricProtocolResult {
  const { core1, core2, pairing = 'auto', useReferenceHair = false, antiBleedLock = true } = options;

  // 1. Determine effective genders
  const gender1 = core1.profile?.gender || 'Female';
  const gender2 = core2.profile?.gender || (gender1 === 'Female' ? 'Male' : 'Female');

  let detectedPairing: 'FF' | 'MM' | 'MF' = 'MF';
  if (pairing === 'ff') {
    detectedPairing = 'FF';
  } else if (pairing === 'mm') {
    detectedPairing = 'MM';
  } else if (pairing === 'mf') {
    detectedPairing = 'MF';
  } else {
    // Auto-detect based on profiles
    if (gender1 === 'Female' && gender2 === 'Female') detectedPairing = 'FF';
    else if (gender1 === 'Male' && gender2 === 'Male') detectedPairing = 'MM';
    else detectedPairing = 'MF';
  }

  const name1 = core1.name || core1.profile?.name || (gender1 === 'Male' ? 'Male Character (A)' : 'Female Character (A)');
  const name2 = core2.name || core2.profile?.name || (gender2 === 'Male' ? 'Male Character (B)' : 'Female Character (B)');

  const desc1 = core1.profile?.summaryDescriptor || `${gender1}, refined facial geometry, distinctive bone structure`;
  const desc2 = core2.profile?.summaryDescriptor || `${gender2}, distinct individual facial structure, completely separate appearance`;

  const hairInst1 = useReferenceHair && core1.profile?.hair
    ? `Inherit hair: ${core1.profile.hair.style}, ${core1.profile.hair.color}.`
    : `Follow prompt for hair; adopt facial bone structure from reference.`;

  const hairInst2 = useReferenceHair && core2.profile?.hair
    ? `Inherit hair: ${core2.profile.hair.style}, ${core2.profile.hair.color}.`
    : `Follow prompt for hair; adopt facial bone structure from reference.`;

  // 2. Scene Subject Enhancement
  let sceneSubjectEnhancement = '';
  if (detectedPairing === 'FF') {
    sceneSubjectEnhancement = `TWO DISTINCT INDIVIDUAL WOMEN (${name1} on Left/Foreground and ${name2} on Right/Companion) sharing the same frame.`;
  } else if (detectedPairing === 'MM') {
    sceneSubjectEnhancement = `TWO DISTINCT INDIVIDUAL MEN (${name1} on Left/Foreground and ${name2} on Right/Companion) sharing the same frame.`;
  } else {
    sceneSubjectEnhancement = `A DUAL PAIRING OF ONE MALE AND ONE FEMALE (${name1} and ${name2}) interacting naturally in the same scene.`;
  }

  // 3. Detailed Character A & B Directives
  const characterAInstructions = `### IDENTITY A [CHARACTER 1 / CORE A]: ${name1.toUpperCase()} ###
- Role / Position: Character A (typically left or primary anchor in the composition).
- Gender & Biometric Profile: ${desc1}.
- Specific Facial Anatomy: Eyes (${core1.profile?.eyes?.shape || 'distinctive'}, ${core1.profile?.eyes?.color || 'dark'}), Jaw (${core1.profile?.jawline || 'defined'}), Skin (${core1.profile?.undertone || 'natural'}).
- Hair Directive: ${hairInst1}
- CRITICAL: Apply REFERENCE IMAGE 1 strictly and exclusively to Character A. Do NOT bleed this identity onto Character B.`;

  const characterBInstructions = `### IDENTITY B [CHARACTER 2 / CORE B]: ${name2.toUpperCase()} ###
- Role / Position: Character B (typically right or companion anchor in the composition).
- Gender & Biometric Profile: ${desc2}.
- Specific Facial Anatomy: Eyes (${core2.profile?.eyes?.shape || 'distinctive'}, ${core2.profile?.eyes?.color || 'dark'}), Jaw (${core2.profile?.jawline || 'defined'}), Skin (${core2.profile?.undertone || 'natural'}).
- Hair Directive: ${hairInst2}
- CRITICAL: Apply REFERENCE IMAGE 2 strictly and exclusively to Character B. Do NOT bleed this identity onto Character A.`;

  // 4. Strict Anti-Bleed Isolation Contract
  let antiBleedIsolationContract = '';
  if (antiBleedLock) {
    antiBleedIsolationContract = `### STRICT MULTI-IDENTITY ANTI-BLEED DIRECTIVE (ZERO IDENTITY BLEND) ###
1. ABSOLUTELY NO TWIN SYNDROME: ${name1} and ${name2} MUST have noticeably different facial bone structures, eye contours, nose bridges, and facial silhouettes.
2. ZERO CROSS-CONTAMINATION: Never blend, morph, average, or cross-pollinate features between Reference 1 and Reference 2.
3. CLEAR ROLE SEGREGATION: Both characters must look like two real, separate individuals who were individually cast for this scene.
4. INDEPENDENT EXPRESSIONS: Each person should hold their own natural expression and head angle suitable for the scene composition.`;
  }

  // 5. Negative Prompt Additions
  const negativePromptAdditions = 'identical twins, clone lookalikes, face morphing, blended facial features, identity bleeding, cross-character face contamination, deformed faces, hybrid facial structure, symmetric twin faces';

  return {
    sceneSubjectEnhancement,
    characterAInstructions,
    characterBInstructions,
    antiBleedIsolationContract,
    negativePromptAdditions,
    detectedPairing
  };
}
