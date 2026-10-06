export interface PromptHistoryItem {
  id: string;
  timestamp: number;
  subjectPreview: string;
  jsonString: string;
}

const STORAGE_PROMPT_HISTORY_KEY = 'hlc_recent_generation_jsons_v1';
const MAX_HISTORY = 5;

export const getRecentPromptGenerations = (): PromptHistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PROMPT_HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
};

export const recordSuccessfulGenerationPrompt = (jsonString: string): PromptHistoryItem[] => {
  if (typeof window === 'undefined' || !jsonString || !jsonString.trim()) {
    return getRecentPromptGenerations();
  }

  try {
    let preview = 'Visual Scene';
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.subject) {
        preview = parsed.subject.length > 40 ? parsed.subject.slice(0, 40) + '...' : parsed.subject;
      } else if (parsed.art_style) {
        preview = parsed.art_style.length > 40 ? parsed.art_style.slice(0, 40) + '...' : parsed.art_style;
      }
    } catch {
      preview = 'Custom Prompt';
    }

    const current = getRecentPromptGenerations();
    // Avoid duplicate if consecutive
    if (current.length > 0 && current[0].jsonString.trim() === jsonString.trim()) {
      return current;
    }

    const newItem: PromptHistoryItem = {
      id: `gen_hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      subjectPreview: preview,
      jsonString: jsonString.trim()
    };

    const updated = [newItem, ...current.filter(item => item.jsonString.trim() !== jsonString.trim())].slice(0, MAX_HISTORY);
    window.localStorage.setItem(STORAGE_PROMPT_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('hlc_prompt_history_updated', { detail: updated }));
    return updated;
  } catch (err) {
    console.error("Failed to record prompt history:", err);
    return getRecentPromptGenerations();
  }
};

export const clearPromptHistory = (): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_PROMPT_HISTORY_KEY);
    window.dispatchEvent(new CustomEvent('hlc_prompt_history_updated', { detail: [] }));
  }
};
