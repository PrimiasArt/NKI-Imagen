import React, { useState, useEffect } from 'react';
import { generationQueue, GenerationQueueState } from '../services/generationQueueService';

interface SynapticCoolingBannerProps {
  onOpenQueueDrawer?: () => void;
  className?: string;
}

export const SynapticCoolingBanner: React.FC<SynapticCoolingBannerProps> = ({
  onOpenQueueDrawer,
  className = ''
}) => {
  const [queueState, setQueueState] = useState<GenerationQueueState>(() => generationQueue.getState());
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const unsubscribe = generationQueue.subscribe((state) => {
      setQueueState(state);
      // Auto-expand when a new cooling starts
      if (state.synapticCooling?.isActive && isMinimized && state.synapticCooling.remainingSeconds > 5) {
        // keep user's minimization unless newly triggered
      }
    });
    return unsubscribe;
  }, [isMinimized]);

  const cooling = queueState.synapticCooling;

  if (!cooling || !cooling.isActive) {
    return null;
  }

  const remaining = cooling.remainingSeconds;
  const total = Math.max(1, cooling.totalDurationSeconds);
  const progressPercent = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pendingCount = queueState.items.filter(
    item => item.status === 'queued' || item.status === 'cooling' || item.status === 'retrying'
  ).length;

  // Minimized floating pill view
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-3 bg-zinc-950/90 border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.35)] backdrop-blur-2xl px-4 py-2.5 rounded-full text-white">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 bg-cyan-400 rounded-full animate-ping absolute"></span>
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full"></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-cyan-300 uppercase">
              Synaptic Cooling
            </span>
            <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
              {formatTime(remaining)}
            </span>
          </div>
          <button
            onClick={() => generationQueue.forceRetryNow()}
            title="Thử lại ngay lập tức"
            className="text-[9px] font-black bg-cyan-500 hover:bg-cyan-400 text-zinc-950 px-2.5 py-1 rounded-full uppercase tracking-wider transition-all"
          >
            Retry Now
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            title="Mở rộng bảng làm mát"
            className="text-white/40 hover:text-white transition-colors text-xs p-1"
          >
            ▲
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full relative overflow-hidden rounded-3xl border border-cyan-500/40 bg-zinc-950/90 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] p-6 my-4 transition-all duration-500 animate-in fade-in zoom-in-95 ${className}`}
    >
      {/* High-tech animated cybernetic background glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Holographic Cooling Gauge & Details */}
        <div className="flex items-center gap-5 w-full md:w-auto">
          {/* Circular Countdown Ring */}
          <div className="relative flex-shrink-0 w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 72 72">
              {/* Background circle track */}
              <circle
                cx="36"
                cy="36"
                r="30"
                className="text-white/10"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Animated Progress Arc */}
              <circle
                cx="36"
                cy="36"
                r="30"
                className="text-cyan-400 transition-all duration-1000 ease-linear"
                strokeWidth="4"
                strokeDasharray={188.5}
                strokeDashoffset={188.5 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-mono font-black text-cyan-300 tracking-tighter drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                {formatTime(remaining)}
              </span>
              <span className="text-[7px] font-black uppercase tracking-widest text-white/40">
                Left
              </span>
            </div>
          </div>

          {/* Text context & status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[9px] font-black uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Synaptic Cooling Active
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-mono font-bold">
                Backoff Attempt {cooling.retryAttempt}/{cooling.maxRetries}
              </span>
              <span className="text-[9px] text-white/40 font-mono hidden sm:inline">
                {pendingCount} yêu cầu đang tạm dừng
              </span>
            </div>

            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>Hạn ngạch Google API 429 • Tự động hạ nhiệt & thử lại</span>
            </h3>

            <p className="text-xs text-white/60 leading-relaxed max-w-xl">
              Tác vụ <span className="text-cyan-300 font-bold">"{cooling.failedTaskTitle || 'Image Generation'}"</span> tạm chạm giới hạn tần suất. Hàng đợi được tạm dừng tự động và áp dụng chiến thuật <span className="text-white font-medium">Exponential Backoff</span> để bảo vệ hạn ngạch.
            </p>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={() => generationQueue.forceRetryNow()}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black rounded-xl text-[10px] tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
            <span>Thử lại ngay</span>
          </button>

          <button
            onClick={() => generationQueue.cancelAllPending()}
            className="px-3.5 py-2.5 bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 border border-white/10 text-white/60 font-bold rounded-xl text-[10px] tracking-wider uppercase transition-all"
            title="Hủy toàn bộ yêu cầu đang chờ"
          >
            Hủy hàng đợi
          </button>

          {onOpenQueueDrawer && (
            <button
              onClick={onOpenQueueDrawer}
              className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold rounded-xl text-[10px] tracking-wider uppercase transition-all"
              title="Xem danh sách hàng đợi"
            >
              Hàng đợi ({pendingCount})
            </button>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            title="Thu nhỏ thanh thông báo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Linear Progress Bar */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono">
        <div className="flex items-center gap-2">
          <span>Thời gian hạ nhiệt: {cooling.totalDurationSeconds}s</span>
          <span>•</span>
          <span className="text-cyan-400 font-bold">Tự động khởi động lại sau {remaining}s</span>
        </div>
        <div className="w-32 bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/10">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
