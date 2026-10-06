export interface TokenUsageEntry {
  id: string;
  timestamp: number;
  action: string;
  tokens: number;
}

export interface RateLimitState {
  rpmUsage: number;
  rpmLimit: number;
  tpmUsage: number;
  tpmLimit: number;
  tpmPercentage: number;
  rpmPercentage: number;
  isWarning: boolean;
  isCritical: boolean;
  cooldownSeconds: number;
  history: TokenUsageEntry[];
  lastAction?: string;
  isServerThrottled?: boolean;
  serverThrottledReason?: string;
  tierName?: string;
}

export const DEFAULT_RPM_LIMIT = 15;
export const DEFAULT_TPM_LIMIT = 200000; // 200k tokens/min for standard Gemini Flash
export const IMAGE_MODEL_FREE_TPM_LIMIT = 30000; // ~30k input tokens/min for image generation preview models

const STORAGE_TPM_LIMIT_KEY = 'hlc_custom_tpm_limit_v2';
const STORAGE_ENTRIES_KEY = 'hlc_tpm_sliding_entries_v2';
const STORAGE_SERVER_COOLDOWN_KEY = 'hlc_server_cooldown_lock_v2';

const getStoredTpmLimit = (): number => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const val = window.localStorage.getItem(STORAGE_TPM_LIMIT_KEY);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return DEFAULT_TPM_LIMIT;
};

const loadStoredEntries = (): TokenUsageEntry[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_ENTRIES_KEY);
    if (!raw) return [];
    const list: TokenUsageEntry[] = JSON.parse(raw);
    const now = Date.now();
    return Array.isArray(list) ? list.filter(e => now - e.timestamp < 60000) : [];
  } catch {
    return [];
  }
};

const loadServerCooldown = (): { until: number; reason: string } | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_SERVER_COOLDOWN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data.until === 'number' && data.until > Date.now()) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};

class RateLimitTracker {
  private rpmLimit = DEFAULT_RPM_LIMIT;
  private tpmLimit = getStoredTpmLimit();
  private entries: TokenUsageEntry[] = loadStoredEntries();
  private listeners: ((state: RateLimitState) => void)[] = [];
  private tickerInterval: any = null;
  private serverCooldown: { until: number; reason: string } | null = loadServerCooldown();

  constructor() {
    if (typeof window !== 'undefined') {
      // Smooth 1-second ticker to decay sliding window and notify subscribers
      this.tickerInterval = setInterval(() => {
        this.pruneAndNotify();
      }, 1000);
    }
  }

  public setTpmLimit(limit: number) {
    this.tpmLimit = Math.max(10000, limit);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_TPM_LIMIT_KEY, this.tpmLimit.toString());
    }
    this.pruneAndNotify();
  }

  public getTpmLimit(): number {
    return this.tpmLimit;
  }

  public getRpmLimit(): number {
    return this.rpmLimit;
  }

  private saveEntries() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_ENTRIES_KEY, JSON.stringify(this.entries.slice(-50)));
      } catch {}
    }
  }

  /**
   * Records an API request and estimated or actual tokens consumed
   */
  public record(action = 'API Request', estimatedTokens = 1500) {
    const entry: TokenUsageEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      action,
      tokens: Math.max(50, Math.round(estimatedTokens))
    };
    this.entries.push(entry);
    this.saveEntries();
    this.pruneAndNotify();
  }

  /**
   * Updates the last entry with actual tokens returned from Gemini API usageMetadata
   */
  public recordActualTokens(actualTokens: number, action?: string) {
    if (actualTokens > 0) {
      const now = Date.now();
      const recentIdx = this.entries.slice().reverse().findIndex(e => now - e.timestamp < 15000);
      if (recentIdx !== -1) {
        const actualIdx = this.entries.length - 1 - recentIdx;
        this.entries[actualIdx].tokens = Math.round(actualTokens);
        if (action) this.entries[actualIdx].action = action;
      } else {
        this.record(action || 'API Response', actualTokens);
      }
      this.saveEntries();
      this.pruneAndNotify();
    }
  }

  /**
   * Called when Google API responds with HTTP 429 / RESOURCE_EXHAUSTED.
   * This immediately syncs the local rate limit bar with Google's actual server lockout!
   */
  public recordQuotaExhausted(cooldownSeconds = 45, reason = 'Google API 429 Quota Exceeded') {
    const now = Date.now();
    const until = now + Math.max(5, cooldownSeconds) * 1000;
    this.serverCooldown = { until, reason };
    
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_SERVER_COOLDOWN_KEY, JSON.stringify(this.serverCooldown));
      } catch {}
    }

    // Add an entry that fills the remaining TPM so the bar turns 100% Critical Red
    const currentUsage = this.entries.reduce((sum, e) => sum + e.tokens, 0);
    const neededToFill = Math.max(this.tpmLimit * 0.95, this.tpmLimit - currentUsage);
    this.entries.push({
      id: `quota_lock_${now}`,
      timestamp: now,
      action: `[429 Lock] ${reason.slice(0, 35)}`,
      tokens: Math.round(neededToFill)
    });
    this.saveEntries();
    this.pruneAndNotify();
  }

  public clearHistory() {
    this.entries = [];
    this.serverCooldown = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_ENTRIES_KEY);
      window.localStorage.removeItem(STORAGE_SERVER_COOLDOWN_KEY);
    }
    this.pruneAndNotify();
  }

  public getState(): RateLimitState {
    const now = Date.now();
    // 60-second sliding window
    const validEntries = this.entries.filter(e => now - e.timestamp < 60000);
    
    let rpmUsage = validEntries.length;
    let tpmUsage = validEntries.reduce((sum, e) => sum + e.tokens, 0);

    // Check if Google's server lock is active
    let isServerThrottled = false;
    let serverThrottledReason: string | undefined;
    let serverCooldownSeconds = 0;

    if (this.serverCooldown && this.serverCooldown.until > now) {
      isServerThrottled = true;
      serverThrottledReason = this.serverCooldown.reason;
      serverCooldownSeconds = Math.ceil((this.serverCooldown.until - now) / 1000);
      // While locked by Google, force usage to at least 95% of limit
      tpmUsage = Math.max(tpmUsage, Math.round(this.tpmLimit * 0.96));
    }

    const tpmPercentage = Math.min(100, Math.round((tpmUsage / this.tpmLimit) * 100));
    const rpmPercentage = Math.min(100, Math.round((rpmUsage / this.rpmLimit) * 100));

    // Calculate seconds until oldest entry expires
    let cooldownSeconds = serverCooldownSeconds;
    if (cooldownSeconds === 0 && validEntries.length > 0) {
      const oldest = Math.min(...validEntries.map(e => e.timestamp));
      cooldownSeconds = Math.max(0, Math.ceil((60000 - (now - oldest)) / 1000));
    }

    const isCritical = isServerThrottled || tpmPercentage >= 80 || rpmPercentage >= 85;
    const isWarning = (tpmPercentage >= 50 && !isCritical) || (rpmPercentage >= 60 && !isCritical);

    const lastEntry = validEntries[validEntries.length - 1];

    let tierName = 'Flash Text (200k)';
    if (this.tpmLimit <= 35000) tierName = 'Image Gen (Free: 30k)';
    else if (this.tpmLimit >= 500000) tierName = 'Pay-As-You-Go (1M)';

    return {
      rpmUsage,
      rpmLimit: this.rpmLimit,
      tpmUsage,
      tpmLimit: this.tpmLimit,
      tpmPercentage,
      rpmPercentage,
      isWarning,
      isCritical,
      cooldownSeconds,
      history: validEntries.slice().reverse(),
      lastAction: lastEntry ? lastEntry.action : undefined,
      isServerThrottled,
      serverThrottledReason,
      tierName
    };
  }

  public subscribe(callback: (state: RateLimitState) => void): () => void {
    this.listeners.push(callback);
    callback(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private pruneAndNotify() {
    const now = Date.now();
    const prevCount = this.entries.length;
    this.entries = this.entries.filter(e => now - e.timestamp < 60000);
    
    // Auto-clear expired server cooldown
    if (this.serverCooldown && this.serverCooldown.until <= now) {
      this.serverCooldown = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_SERVER_COOLDOWN_KEY);
      }
    }

    if (this.entries.length !== prevCount) {
      this.saveEntries();
    }

    if (this.listeners.length > 0) {
      const state = this.getState();
      this.listeners.forEach(cb => {
        try {
          cb(state);
        } catch (err) {
          console.error("Error in rate limit subscriber:", err);
        }
      });
    }
  }
}

export const rateLimitTracker = new RateLimitTracker();

/**
 * Convenience estimate helper for typical Gemini steps
 */
export const ESTIMATED_STEP_COSTS: Record<string, { label: string; tokens: number; description: string }> = {
  img_to_json: {
    label: 'Image Analysis (Ảnh -> JSON)',
    tokens: 2200,
    description: 'Bao gồm phân tích hình ảnh đa phương tiện, trích xuất quang học, bố cục và chi tiết phục trang'
  },
  text_to_json: {
    label: 'Text -> JSON Prompt',
    tokens: 950,
    description: 'Chuyển đổi ý tưởng mô tả văn bản thành cấu trúc JSON chuyên sâu'
  },
  json_to_img: {
    label: 'JSON -> Tạo ảnh AI',
    tokens: 1800,
    description: 'Tạo hình ảnh chất lượng cao từ cấu trúc prompt thông số chi tiết'
  },
  pose_variant: {
    label: 'Biến thể Pose / Dáng điệu',
    tokens: 2400,
    description: 'Giữ nguyên nhân vật và tạo ra tư thế/góc nhìn mới'
  },
  compose_image: {
    label: 'Ghép nhân vật vào bối cảnh',
    tokens: 3200,
    description: 'Hòa trộn nhân vật với hình ảnh background và phục trang tham chiếu'
  },
  refine_json: {
    label: 'Tinh chỉnh Prompt JSON',
    tokens: 1200,
    description: 'Cập nhật và điều chỉnh các trường JSON theo chỉ dẫn tự nhiên'
  },
  script_gen: {
    label: 'Phân cảnh kịch bản phim',
    tokens: 2100,
    description: 'Tạo các phân đoạn storyboard và chỉ đạo nghệ thuật'
  },
  veo3_prompt: {
    label: 'Tạo prompt Veo 3 Video',
    tokens: 1100,
    description: 'Chuyển đổi cảnh và hình ảnh thành prompt camera cinematic cho Veo 3'
  },
  upscale: {
    label: 'Nâng cấp ảnh 2K/4K (Upscale)',
    tokens: 2500,
    description: 'Tái tạo chi tiết siêu phân giải với phản hồi AI quang học'
  }
};
