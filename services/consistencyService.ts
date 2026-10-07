import { CharacterPersona, ImagePromptJson } from '../types';
import { getGeminiClient, compressBase64Image, prepareInlineData, callWithRetry } from './geminiService';
import { getStudioModelConfig } from './modelConfigService';
import { getPersonasDB, savePersonasDB } from './indexedDbService';

const STORAGE_KEY_PERSONAS = 'nki_character_personas';
const STORAGE_KEY_ACTIVE_ID = 'nki_active_persona_id';
const STORAGE_KEY_LOCK_ENABLED = 'nki_persona_lock_enabled';

// Default starter personas to give users immediate value
export const DEFAULT_STARTER_PERSONAS: CharacterPersona[] = [
  {
    id: 'persona_kaelen_01',
    name: 'Kaelen Vance',
    gender: 'Male',
    ageRange: 'Late 20s',
    bodyType: 'Khỏe khoắn thể thao (Athletic Build)',
    faceFeatures: 'Sharp jawline, subtle scar across left eyebrow, piercing hazel eyes, slight stubble',
    hairStyle: 'Undercut dark textured messy hair with subtle silver highlights',
    signatureOutfit: 'Matte black weatherproof tactical trench coat, high collar, dark turtleneck',
    colorPalette: 'Muted charcoal, slate gray, subtle neon cyan accents',
    photos: [],
    seed: 4892011,
    createdAt: Date.now() - 100000,
    isActive: false
  },
  {
    id: 'persona_elena_02',
    name: 'Elena Rostova',
    gender: 'Female',
    ageRange: 'Mid 20s',
    bodyType: 'Thon thả chuẩn người mẫu (Slim Runway)',
    faceFeatures: 'High cheekbones, gentle emerald green eyes, natural subtle freckles across bridge of nose',
    hairStyle: 'Long wavy auburn hair tied in a loose cinematic braid',
    signatureOutfit: 'Vintage tailored linen duster jacket, brass buttons, ivory silk blouse',
    colorPalette: 'Warm amber, sage green, antique ivory, muted copper',
    photos: [],
    seed: 7391024,
    createdAt: Date.now() - 200000,
    isActive: false
  }
];

// In-Memory Personas Cache for instant synchronous reads and 0-latency UI updates
let memoryPersonasCache: CharacterPersona[] | null = null;
let isIndexedDbInitialized = false;

/**
 * Initializes the persona store from IndexedDB and synchronizes with memory cache.
 */
async function initPersonasStore(): Promise<void> {
  if (typeof window === 'undefined' || isIndexedDbInitialized) return;
  try {
    const dbPersonas = await getPersonasDB();
    if (dbPersonas && Array.isArray(dbPersonas) && dbPersonas.length > 0) {
      memoryPersonasCache = dbPersonas;
      window.dispatchEvent(new CustomEvent('nki_personas_updated', { detail: dbPersonas }));
    } else {
      // Check localStorage for migration
      const raw = localStorage.getItem(STORAGE_KEY_PERSONAS);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryPersonasCache = parsed;
            await savePersonasDB(parsed);
          }
        } catch {}
      }
      if (!memoryPersonasCache) {
        memoryPersonasCache = DEFAULT_STARTER_PERSONAS;
        await savePersonasDB(DEFAULT_STARTER_PERSONAS);
      }
    }
    isIndexedDbInitialized = true;
  } catch (err) {
    console.warn('[ConsistencyService] Failed to initialize personas from IndexedDB:', err);
  }
}

// Trigger background initialization
if (typeof window !== 'undefined') {
  initPersonasStore();
}

/**
 * Helper to compress an uploaded File directly to a lightweight Base64 string (~80-150KB).
 * Prevents localStorage/IndexedDB bloat and ensures instantaneous saving.
 */
export async function compressFileToBase64(
  file: File,
  maxDim = 1024,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      if (!raw) return resolve('');
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(raw);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Synchronously retrieves character personas from memory cache or storage.
 */
export function getCharacterPersonas(): CharacterPersona[] {
  if (memoryPersonasCache && memoryPersonasCache.length > 0) {
    return memoryPersonasCache;
  }

  if (typeof window === 'undefined') return DEFAULT_STARTER_PERSONAS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERSONAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryPersonasCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load personas from localStorage:', e);
  }

  memoryPersonasCache = DEFAULT_STARTER_PERSONAS;
  return DEFAULT_STARTER_PERSONAS;
}

/**
 * Persists character persona into both memory cache, IndexedDB (unlimited quota)
 * and safely mirrors to localStorage with QuotaExceeded protection.
 */
export function saveCharacterPersona(persona: CharacterPersona): CharacterPersona[] {
  const current = getCharacterPersonas();
  const idx = current.findIndex(p => p.id === persona.id);
  let updated: CharacterPersona[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = persona;
  } else {
    updated = [persona, ...current];
  }

  // 1. Update in-memory cache immediately
  memoryPersonasCache = updated;

  // 2. Persist to IndexedDB (supports hundreds of megabytes/gigabytes of photos)
  savePersonasDB(updated).catch(err => {
    console.error('[ConsistencyService] Error saving to IndexedDB:', err);
  });

  // 3. Mirror to localStorage safely (catch QuotaExceededError)
  try {
    localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(updated));
  } catch (quotaErr) {
    console.warn('[ConsistencyService] LocalStorage quota exceeded, storing lightweight metadata fallback:', quotaErr);
    try {
      // Store lightweight version without raw heavy photos array in localStorage
      const lightweight = updated.map(p => ({
        ...p,
        photos: p.photos ? p.photos.slice(0, 1) : [] // Keep only 1 avatar photo in localStorage
      }));
      localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(lightweight));
    } catch {}
  }

  // 4. Dispatch update event
  window.dispatchEvent(new CustomEvent('nki_personas_updated', { detail: updated }));
  return updated;
}

/**
 * Deletes a character persona.
 */
export function deleteCharacterPersona(id: string): CharacterPersona[] {
  const current = getCharacterPersonas();
  const updated = current.filter(p => p.id !== id);

  memoryPersonasCache = updated;
  savePersonasDB(updated).catch(console.error);

  try {
    localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(updated));
  } catch {}

  if (getActivePersonaId() === id) {
    setActivePersonaId(null);
  }
  window.dispatchEvent(new CustomEvent('nki_personas_updated', { detail: updated }));
  return updated;
}

export function getActivePersonaId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || null;
}

export function setActivePersonaId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
  }
  window.dispatchEvent(new CustomEvent('nki_active_persona_changed', { detail: id }));
}

export function isConsistencyLockEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_LOCK_ENABLED) === 'true';
}

export function setConsistencyLockEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_LOCK_ENABLED, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('nki_consistency_lock_toggled', { detail: enabled }));
}

export function getActivePersona(): CharacterPersona | null {
  const id = getActivePersonaId();
  if (!id) return null;
  const list = getCharacterPersonas();
  return list.find(p => p.id === id) || null;
}

/**
 * Injects character persona attributes into the prompt JSON while keeping scene details intact.
 */
export function injectPersonaIntoPrompt(prompt: ImagePromptJson, persona: CharacterPersona): ImagePromptJson {
  const personaDesc = `${persona.gender}, ${persona.ageRange}, ${persona.bodyType ? `${persona.bodyType}, ` : ''}${persona.faceFeatures}, with ${persona.hairStyle}, wearing ${persona.signatureOutfit}`;

  // Preserve existing scene while anchoring the character
  let mergedSubject = prompt.subject.trim();
  if (!mergedSubject.includes(persona.name) && !mergedSubject.toLowerCase().includes(persona.gender.toLowerCase())) {
    mergedSubject = `${persona.name} (${personaDesc}), ${mergedSubject}`;
  } else if (!mergedSubject.includes(persona.faceFeatures)) {
    mergedSubject = `${mergedSubject}. Character consistency: ${personaDesc}`;
  }

  // Anchor color palette if persona has a specific palette
  let mergedPalette = prompt.color_palette.trim();
  if (persona.colorPalette && !mergedPalette.includes(persona.colorPalette)) {
    mergedPalette = mergedPalette ? `${mergedPalette}, ${persona.colorPalette}` : persona.colorPalette;
  }

  // Anchor additional details with persona identity seed
  let mergedDetails = prompt.additional_details.trim();
  const identityTag = `[Character Identity Lock: ${persona.name}]`;
  if (!mergedDetails.includes(identityTag)) {
    mergedDetails = mergedDetails ? `${identityTag} ${mergedDetails}` : identityTag;
  }

  return {
    ...prompt,
    subject: mergedSubject,
    color_palette: mergedPalette,
    additional_details: mergedDetails
  };
}

/**
 * Appends a new photo to a persona's photo gallery in the vault.
 */
export function addPhotoToPersona(personaId: string, photoBase64: string): CharacterPersona | null {
  const current = getCharacterPersonas();
  const persona = current.find(p => p.id === personaId);
  if (!persona) return null;

  const currentPhotos = persona.photos || [];
  const updatedPhotos = [...currentPhotos, photoBase64];
  const updatedPersona: CharacterPersona = {
    ...persona,
    photos: updatedPhotos,
    avatarImage: persona.avatarImage || photoBase64
  };

  saveCharacterPersona(updatedPersona);
  return updatedPersona;
}

/**
 * Appends multiple photos in bulk to a persona's album without race conditions.
 */
export function addPhotosToPersona(personaId: string, newPhotos: string[]): CharacterPersona | null {
  const current = getCharacterPersonas();
  const persona = current.find(p => p.id === personaId);
  if (!persona) return null;

  const currentPhotos = persona.photos || [];
  const updatedPhotos = [...currentPhotos, ...newPhotos];
  const updatedPersona: CharacterPersona = {
    ...persona,
    photos: updatedPhotos,
    avatarImage: persona.avatarImage || newPhotos[0]
  };

  saveCharacterPersona(updatedPersona);
  return updatedPersona;
}

/**
 * Updates an existing persona's profile details.
 */
export function updatePersonaDetails(
  personaId: string,
  partial: Partial<Omit<CharacterPersona, 'id' | 'createdAt'>>
): CharacterPersona | null {
  const current = getCharacterPersonas();
  const persona = current.find(p => p.id === personaId);
  if (!persona) return null;

  const updatedPersona: CharacterPersona = {
    ...persona,
    ...partial
  };

  saveCharacterPersona(updatedPersona);
  return updatedPersona;
}

/**
 * Removes a photo from a persona's gallery by index.
 */
export function removePhotoFromPersona(personaId: string, photoIndex: number): CharacterPersona | null {
  const current = getCharacterPersonas();
  const persona = current.find(p => p.id === personaId);
  if (!persona || !persona.photos) return null;

  const updatedPhotos = persona.photos.filter((_, idx) => idx !== photoIndex);
  let updatedAvatar = persona.avatarImage;
  if (persona.photos[photoIndex] === persona.avatarImage) {
    updatedAvatar = updatedPhotos[0] || undefined;
  }

  const updatedPersona: CharacterPersona = {
    ...persona,
    photos: updatedPhotos,
    avatarImage: updatedAvatar
  };

  saveCharacterPersona(updatedPersona);
  return updatedPersona;
}

/**
 * Sets a specific photo from the gallery as the primary avatar.
 */
export function setPersonaAvatarPhoto(personaId: string, photoBase64: string): CharacterPersona | null {
  const current = getCharacterPersonas();
  const persona = current.find(p => p.id === personaId);
  if (!persona) return null;

  const updatedPersona: CharacterPersona = {
    ...persona,
    avatarImage: photoBase64
  };

  saveCharacterPersona(updatedPersona);
  return updatedPersona;
}

/**
 * AI Multimodal Face Analyzer: Reads facial traits, hair, ethnicity, age, and body type from photo.
 */
export async function analyzeModelFaceTraits(photoBase64: string): Promise<Partial<CharacterPersona>> {
  try {
    const client = getGeminiClient();
    const config = getStudioModelConfig();
    const compressed = await compressBase64Image(photoBase64, 1024, 0.85);
    const inlineData = prepareInlineData(compressed, 'image/jpeg');

    const promptText = `Analyze the person in this photo to create an AI Character Model profile for photorealistic generation consistency.
Return ONLY valid JSON matching this exact structure:
{
  "name": "A creative model name (e.g. 'Aria Vance', 'Linh Dan', 'Liam O\\u0027Connor')",
  "gender": "Nữ | Nam | Non-binary",
  "ageRange": "e.g. '22-25 tuổi', 'Late 20s', '30-35 tuổi'",
  "faceFeatures": "Detailed distinctive facial structure: jawline, cheekbones, nose bridge, eye shape & color, lips, skin marks/freckles/dimples",
  "hairStyle": "Hair color, length, texture, styling or bangs",
  "bodyType": "Vóc dáng người mẫu: e.g. 'Thon thả chuẩn Runway', 'Khỏe khoắn thể thao', 'Thanh tú nhỏ nhắn', 'Đầy đặn quyến rũ'",
  "signatureOutfit": "Characteristic wardrobe style or aesthetic that complements them",
  "colorPalette": "Harmonious 3-4 color tones suited to their undertone"
}`;

    const response = await callWithRetry(() => client.models.generateContent({
      model: config.analysisModel || 'gemini-2.5-flash',
      contents: {
        parts: [inlineData, { text: promptText }]
      }
    }), 2, 1500);

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error('Failed to analyze model face traits:', err);
  }
  return {};
}
