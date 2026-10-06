import { rateLimitTracker } from './rateLimitService';

export type TaskType = 
  | 'json_to_img' 
  | 'pose' 
  | 'compose' 
  | 'reference' 
  | 'upscale' 
  | 'custom';

export type TaskStatus = 
  | 'queued' 
  | 'processing' 
  | 'cooling' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface GenerationTask {
  id: string;
  type: TaskType;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  status: TaskStatus;
  execute: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SynapticCoolingState {
  isActive: boolean;
  reason: string;
  totalDurationSeconds: number;
  remainingSeconds: number;
  retryAttempt: number;
  maxRetries: number;
  targetTimestamp: number;
  failedTaskId: string | null;
  failedTaskTitle: string | null;
}

export interface GenerationQueueState {
  items: GenerationTask[];
  activeTask: GenerationTask | null;
  isProcessing: boolean;
  isPaused: boolean;
  synapticCooling: SynapticCoolingState | null;
  stats: {
    totalEnqueued: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

// Helper to detect rate limit / 429 errors
export const isRateLimitError = (error: any): { isRateLimit: boolean; waitSeconds: number } => {
  if (!error) return { isRateLimit: false, waitSeconds: 0 };
  
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || '');
  const errStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error) || '');
  const lowerStr = errStr.toLowerCase();

  const isRateLimit = 
    status === 429 ||
    code === '429' ||
    code === 'RESOURCE_EXHAUSTED' ||
    Boolean(error?.isRateLimit) ||
    lowerStr.includes('429') ||
    lowerStr.includes('resource_exhausted') ||
    lowerStr.includes('quota exceeded') ||
    lowerStr.includes('rate limit') ||
    lowerStr.includes('too many requests') ||
    lowerStr.includes('exceeded your current quota');

  let waitSeconds = 0;
  const match = errStr.match(/retry in ([0-9.]+)\s*s/i) || errStr.match(/wait ([0-9.]+)\s*s/i);
  if (match && match[1]) {
    const s = parseFloat(match[1]);
    if (!isNaN(s) && s > 0) {
      waitSeconds = s;
    }
  }

  if (error?.retryAfterSeconds && typeof error.retryAfterSeconds === 'number') {
    waitSeconds = Math.max(waitSeconds, error.retryAfterSeconds);
  }

  return { isRateLimit, waitSeconds };
};

class GenerationQueueService {
  private items: GenerationTask[] = [];
  private activeTask: GenerationTask | null = null;
  private isProcessing = false;
  private isPaused = false;
  private synapticCooling: SynapticCoolingState | null = null;
  private listeners: ((state: GenerationQueueState) => void)[] = [];
  private coolingTimer: any = null;
  private stats = {
    totalEnqueued: 0,
    completed: 0,
    failed: 0,
    cancelled: 0
  };

  constructor() {
    // Check if window is available to bind unhandled rejection or logging
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearCoolingTimer();
      });
    }
  }

  public getState(): GenerationQueueState {
    return {
      items: [...this.items],
      activeTask: this.activeTask ? { ...this.activeTask } : null,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      synapticCooling: this.synapticCooling ? { ...this.synapticCooling } : null,
      stats: { ...this.stats }
    };
  }

  public subscribe(listener: (state: GenerationQueueState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => {
      try {
        l(state);
      } catch (err) {
        console.error('[GenerationQueue] Listener error:', err);
      }
    });
  }

  /**
   * Adds one or multiple tasks to the queue and starts processing.
   */
  public enqueue(
    taskInput: Omit<GenerationTask, 'id' | 'status' | 'retryCount' | 'createdAt'> | Array<Omit<GenerationTask, 'id' | 'status' | 'retryCount' | 'createdAt'>>
  ): string[] {
    const inputs = Array.isArray(taskInput) ? taskInput : [taskInput];
    const generatedIds: string[] = [];

    for (const input of inputs) {
      const id = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const task: GenerationTask = {
        ...input,
        id,
        status: 'queued',
        retryCount: 0,
        maxRetries: input.maxRetries ?? 4,
        createdAt: Date.now()
      };
      this.items.push(task);
      this.stats.totalEnqueued++;
      generatedIds.push(id);
    }

    this.notify();
    this.processNext();
    return generatedIds;
  }

  /**
   * Main queue execution loop.
   */
  private async processNext() {
    // If currently running, paused, or cooling, do nothing
    if (this.isProcessing || this.isPaused || this.synapticCooling?.isActive) {
      return;
    }

    // Find next queued task
    const nextTaskIndex = this.items.findIndex(item => item.status === 'queued' || item.status === 'retrying');
    if (nextTaskIndex === -1) {
      this.activeTask = null;
      this.isProcessing = false;
      this.notify();
      return;
    }

    const task = this.items[nextTaskIndex];
    task.status = 'processing';
    this.activeTask = task;
    this.isProcessing = true;
    this.notify();

    try {
      console.log(`[GenerationQueue] Executing task "${task.title}" (ID: ${task.id}, Attempt: ${task.retryCount + 1}/${task.maxRetries + 1})...`);
      const result = await task.execute();

      // Task succeeded
      task.status = 'completed';
      task.completedAt = Date.now();
      task.error = undefined;
      this.stats.completed++;

      console.log(`[GenerationQueue] Task "${task.title}" completed successfully.`);

      if (task.onSuccess) {
        try {
          task.onSuccess(result);
        } catch (callbackErr) {
          console.error('[GenerationQueue] onSuccess callback error:', callbackErr);
        }
      }

      this.activeTask = null;
      this.isProcessing = false;
      this.notify();

      // Immediate tiny tick to process the next item
      setTimeout(() => this.processNext(), 100);
    } catch (error: any) {
      console.error(`[GenerationQueue] Task "${task.title}" failed:`, error);
      
      const { isRateLimit, waitSeconds } = isRateLimitError(error);

      if (isRateLimit && task.retryCount < task.maxRetries) {
        // RATE LIMIT / 429 DETECTED: Trigger Synaptic Cooling & Exponential Backoff
        task.retryCount++;
        task.status = 'cooling';
        task.error = error?.message || 'Rate limit 429 exceeded';

        this.triggerSynapticCooling(task, waitSeconds, error?.message || 'Google Gemini Quota Exceeded (429)');
      } else {
        // Permanent failure or max retries exhausted
        task.status = 'failed';
        task.completedAt = Date.now();
        task.error = error?.message || 'Execution failed';
        this.stats.failed++;

        if (task.onError) {
          try {
            task.onError(error);
          } catch (callbackErr) {
            console.error('[GenerationQueue] onError callback error:', callbackErr);
          }
        }

        this.activeTask = null;
        this.isProcessing = false;
        this.notify();

        // Continue with the remaining queue items
        setTimeout(() => this.processNext(), 200);
      }
    }
  }

  /**
   * Activates Synaptic Cooling with Exponential Backoff strategy.
   */
  private triggerSynapticCooling(task: GenerationTask, requestedWaitSec: number, reason: string) {
    this.clearCoolingTimer();

    // Exponential Backoff calculation:
    // Base: 15s. Multiplier: 2. Max: 90s.
    // Attempt 1: 15s
    // Attempt 2: 30s
    // Attempt 3: 60s
    // Attempt 4+: 90s
    // Add 10-20% randomized jitter to prevent simultaneous collision
    const baseWait = 15;
    const exponentialWait = Math.min(baseWait * Math.pow(2, task.retryCount - 1), 90);
    const calculatedWait = Math.max(requestedWaitSec || 0, exponentialWait);
    const jitter = 0.9 + Math.random() * 0.25; // 0.9x ~ 1.15x
    const finalSeconds = Math.max(8, Math.round(calculatedWait * jitter));

    const targetTimestamp = Date.now() + finalSeconds * 1000;

    this.synapticCooling = {
      isActive: true,
      reason,
      totalDurationSeconds: finalSeconds,
      remainingSeconds: finalSeconds,
      retryAttempt: task.retryCount,
      maxRetries: task.maxRetries,
      targetTimestamp,
      failedTaskId: task.id,
      failedTaskTitle: task.title
    };

    // Pause the queue automatically
    this.isPaused = true;
    this.isProcessing = false;

    // Synchronize with RateLimitTracker for the system bar
    rateLimitTracker.recordQuotaExhausted(finalSeconds, `[Synaptic Cooling] ${reason}`);

    console.warn(
      `[Synaptic Cooling] Engaged! Rate limit hit on "${task.title}". Backoff attempt ${task.retryCount}/${task.maxRetries}. Pausing queue for ${finalSeconds}s...`
    );

    this.notify();

    // Start 1-second countdown ticker
    this.coolingTimer = setInterval(() => {
      if (!this.synapticCooling || !this.synapticCooling.isActive) {
        this.clearCoolingTimer();
        return;
      }

      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((this.synapticCooling.targetTimestamp - now) / 1000));
      this.synapticCooling.remainingSeconds = remaining;

      if (remaining <= 0) {
        console.log('[Synaptic Cooling] Cooldown finished! Resuming queue and retrying task...');
        this.clearCoolingTimer();
        this.synapticCooling = null;
        this.isPaused = false;

        // Mark task as retrying
        if (task.status === 'cooling') {
          task.status = 'retrying';
        }

        this.notify();
        this.processNext();
      } else {
        this.notify();
      }
    }, 1000);
  }

  private clearCoolingTimer() {
    if (this.coolingTimer) {
      clearInterval(this.coolingTimer);
      this.coolingTimer = null;
    }
  }

  /**
   * Skips remaining cooling and immediately retries the cooling task.
   */
  public forceRetryNow() {
    if (!this.synapticCooling || !this.synapticCooling.isActive) return;

    console.log('[Synaptic Cooling] User requested immediate forced retry.');
    const coolingTaskId = this.synapticCooling.failedTaskId;
    
    this.clearCoolingTimer();
    this.synapticCooling = null;
    this.isPaused = false;

    if (coolingTaskId) {
      const task = this.items.find(t => t.id === coolingTaskId);
      if (task && task.status === 'cooling') {
        task.status = 'retrying';
      }
    }

    this.notify();
    this.processNext();
  }

  /**
   * Pauses the queue manually.
   */
  public pauseQueue() {
    this.isPaused = true;
    this.notify();
  }

  /**
   * Resumes the queue manually.
   */
  public resumeQueue() {
    this.isPaused = false;
    this.notify();
    this.processNext();
  }

  /**
   * Cancels a specific task by ID.
   */
  public cancelTask(taskId: string) {
    const task = this.items.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === 'queued' || task.status === 'cooling' || task.status === 'retrying') {
      task.status = 'cancelled';
      task.completedAt = Date.now();
      this.stats.cancelled++;

      // If the cancelled task was the cooling one, dismiss cooling
      if (this.synapticCooling?.failedTaskId === taskId) {
        this.clearCoolingTimer();
        this.synapticCooling = null;
        this.isPaused = false;
      }

      this.notify();
      this.processNext();
    }
  }

  /**
   * Cancels all queued, cooling, or pending tasks.
   */
  public cancelAllPending() {
    this.clearCoolingTimer();
    this.synapticCooling = null;
    this.isPaused = false;

    this.items.forEach(task => {
      if (task.status === 'queued' || task.status === 'cooling' || task.status === 'retrying') {
        task.status = 'cancelled';
        task.completedAt = Date.now();
        this.stats.cancelled++;
      }
    });

    this.notify();
  }

  /**
   * Clears completed or cancelled items from the history list.
   */
  public clearFinished() {
    this.items = this.items.filter(
      item => item.status === 'processing' || item.status === 'queued' || item.status === 'cooling' || item.status === 'retrying'
    );
    this.notify();
  }
}

export const generationQueue = new GenerationQueueService();
