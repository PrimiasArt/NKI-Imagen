import { ImagePromptJson, PromptSnapshot } from '../types';

const STORAGE_KEY_SNAPSHOTS = 'nki_prompt_snapshots';

export function getPromptSnapshots(): PromptSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load snapshots:', e);
    return [];
  }
}

export function savePromptSnapshot(
  name: string,
  promptJson: ImagePromptJson,
  previewImage?: string,
  tags: string[] = []
): PromptSnapshot {
  const current = getPromptSnapshots();
  const newSnapshot: PromptSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim() || `Snapshot #${current.length + 1}`,
    timestamp: Date.now(),
    promptJson,
    previewImage,
    tags
  };

  // Keep up to 50 snapshots
  const updated = [newSnapshot, ...current.slice(0, 49)];
  localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('nki_snapshots_updated', { detail: updated }));
  return newSnapshot;
}

export function deletePromptSnapshot(id: string): PromptSnapshot[] {
  const current = getPromptSnapshots();
  const updated = current.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('nki_snapshots_updated', { detail: updated }));
  return updated;
}

/**
 * Compactly encodes a prompt JSON or Preset into a shareable URL string
 */
export function encodePromptToShareUrl(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
    // Base64 encode UTF-8
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    return `${origin}#preset=${encodeURIComponent(base64)}`;
  } catch (e) {
    console.error('Encoding error:', e);
    return '';
  }
}

/**
 * Decodes a shareable URL or hash string back into prompt JSON
 */
export function decodePromptFromShareHash(hashOrString: string): any | null {
  try {
    let clean = hashOrString.trim();
    if (clean.includes('#preset=')) {
      clean = clean.split('#preset=')[1];
    }
    const decodedStr = decodeURIComponent(clean);
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(decodedStr), (c: string) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Decoding error:', e);
    return null;
  }
}
