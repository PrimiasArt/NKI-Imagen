import { CharacterPersona, ImagePromptJson } from '../types';

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
    faceFeatures: 'Sharp jawline, subtle scar across left eyebrow, piercing hazel eyes, slight stubble',
    hairStyle: 'Undercut dark textured messy hair with subtle silver highlights',
    signatureOutfit: 'Matte black weatherproof tactical trench coat, high collar, dark turtleneck',
    colorPalette: 'Muted charcoal, slate gray, subtle neon cyan accents',
    seed: 4892011,
    createdAt: Date.now() - 100000,
    isActive: false
  },
  {
    id: 'persona_elena_02',
    name: 'Elena Rostova',
    gender: 'Female',
    ageRange: 'Mid 20s',
    faceFeatures: 'High cheekbones, gentle emerald green eyes, natural subtle freckles across bridge of nose',
    hairStyle: 'Long wavy auburn hair tied in a loose cinematic braid',
    signatureOutfit: 'Vintage tailored linen duster jacket, brass buttons, ivory silk blouse',
    colorPalette: 'Warm amber, sage green, antique ivory, muted copper',
    seed: 7391024,
    createdAt: Date.now() - 200000,
    isActive: false
  }
];

export function getCharacterPersonas(): CharacterPersona[] {
  if (typeof window === 'undefined') return DEFAULT_STARTER_PERSONAS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERSONAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(DEFAULT_STARTER_PERSONAS));
      return DEFAULT_STARTER_PERSONAS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load personas:', e);
    return DEFAULT_STARTER_PERSONAS;
  }
}

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
  localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('nki_personas_updated', { detail: updated }));
  return updated;
}

export function deleteCharacterPersona(id: string): CharacterPersona[] {
  const current = getCharacterPersonas();
  const updated = current.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(updated));
  
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
  const personaDesc = `${persona.gender}, ${persona.ageRange}, ${persona.faceFeatures}, with ${persona.hairStyle}, wearing ${persona.signatureOutfit}`;

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
