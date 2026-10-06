import React, { useState, useEffect } from 'react';
import { generationQueue, GenerationQueueState, GenerationTask } from '../services/generationQueueService';
import { useTranslation } from '../services/i18nService';

interface GenerationQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerationQueueDrawer: React.FC<GenerationQueueDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const [queueState, setQueueState] = useState<GenerationQueueState>(() => generationQueue.getState());

  useEffect(() => {
    const unsubscribe = generationQueue.subscribe((state) => {
      setQueueState(state);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const cooling = queueState.synapticCooling;
  const isCooling = cooling?.isActive;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: GenerationTask['status']) => {
    switch (status) {
      case 'processing':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary-500/20 text-primary-300 border border-primary-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(var(--primary-500-rgb),0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-ping"></span>
            {t('queue.processing', 'Đang xử lý')}
          </span>
        );
      case 'cooling':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            {t('queue.cooling', 'Làm mát')}
          </span>
        );
      case 'queued':
      case 'retrying':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/60 border border-white/10">
            {t('queue.waiting', 'Chờ thực thi')}
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {t('queue.success', 'Hoàn thành')}
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
            {t('queue.failedStatus', 'Thất bại')}
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 text-white/30 border border-white/5">
            {t('queue.cancelled', 'Đã hủy')}
          </span>
        );
    }
  };

  const getTypeLabel = (type: GenerationTask['type']) => {
    switch (type) {
      case 'json_to_img': return 'JSON to Image';
      case 'pose': return 'Pose Variant';
      case 'compose': return 'Compose Fusion';
      case 'reference': return 'Outfit Ref';
      case 'upscale': return 'Super-Resolution';
      default: return 'Generation';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xl animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl vision-modal shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-black shadow-[0_0_12px_rgba(var(--primary-500-rgb),0.2)]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">{t('queue.title', 'Hàng đợi tạo ảnh (Generation Queue)')}</h3>
                {isCooling && (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[9px] font-black uppercase tracking-widest animate-pulse">
                    {t('queue.coolingActive', 'Synaptic Cooling Active')}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40">
                {t('queue.desc', 'Tự động điều phối yêu cầu, bảo vệ quota API và hạ nhiệt khi gặp rate limit')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all flex items-center justify-center border border-white/10"
            title={t('common.close', 'Đóng')}
          >
            ✕
          </button>
        </div>

        {/* Synaptic Cooling Panel inside Drawer */}
        {isCooling && cooling && (
          <div className="m-6 p-5 rounded-2xl border border-cyan-500/40 bg-cyan-950/30 backdrop-blur-xl shadow-[0_0_25px_rgba(6,182,212,0.2)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex flex-col items-center justify-center text-cyan-300 font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <span className="text-xs font-black">{formatTime(cooling.remainingSeconds)}</span>
                  <span className="text-[7px] uppercase font-bold text-cyan-400/60">Cooldown</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>{t('cooling.title', 'Hạn ngạch Google API 429 • Tự động hạ nhiệt & thử lại')}</span>
                  </h4>
                  <p className="text-xs text-cyan-200/70 mt-0.5 leading-relaxed">
                    {t('cooling.desc', 'Tác vụ tạm chạm giới hạn tần suất. Hàng đợi được tạm dừng tự động và áp dụng chiến thuật Exponential Backoff để bảo vệ hạn ngạch.')} ({cooling.remainingSeconds}s)
                  </p>
                </div>
              </div>

              <button
                onClick={() => generationQueue.forceRetryNow()}
                className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                {t('queue.retryNow', 'Thử lại ngay')}
              </button>
            </div>
          </div>
        )}

        {/* Queue Stats Bar */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs text-white/50 font-mono">
          <div className="flex items-center gap-4">
            <span>{t('queue.total', 'Tổng:')} <strong className="text-white">{queueState.items.length}</strong></span>
            <span>{t('queue.pending', 'Chờ xử lý:')} <strong className="text-primary-300">{queueState.items.filter(i => i.status === 'queued' || i.status === 'cooling' || i.status === 'retrying').length}</strong></span>
            <span>{t('queue.completed', 'Xong:')} <strong className="text-emerald-400">{queueState.stats.completed}</strong></span>
            <span>{t('queue.failed', 'Lỗi:')} <strong className="text-rose-400">{queueState.stats.failed}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {queueState.isPaused ? (
              <button
                onClick={() => generationQueue.resumeQueue()}
                className="text-[10px] font-bold text-emerald-400 hover:underline"
              >
                {t('queue.resume', 'Tiếp tục hàng đợi')}
              </button>
            ) : (
              <button
                onClick={() => generationQueue.pauseQueue()}
                className="text-[10px] font-bold text-amber-400 hover:underline"
              >
                {t('queue.pause', 'Tạm dừng')}
              </button>
            )}
            <span>•</span>
            <button
              onClick={() => generationQueue.clearFinished()}
              className="text-[10px] font-bold text-white/40 hover:text-white/80"
            >
              {t('queue.clearDone', 'Dọn dẹp đã xong')}
            </button>
            <span>•</span>
            <button
              onClick={() => generationQueue.cancelAllPending()}
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
            >
              {t('queue.cancelAll', 'Hủy tất cả')}
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {queueState.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-white/20">
              <span className="text-3xl mb-3">⚡</span>
              <p className="text-xs font-bold uppercase tracking-widest">{t('queue.empty', 'Hàng đợi đang trống')}</p>
              <p className="text-[11px] text-white/30 mt-1 max-w-xs leading-relaxed">
                {t('queue.emptyDesc', 'Khi bạn bấm tạo ảnh (JSON to Image, Pose, Compose, Reference Creation), các yêu cầu sẽ được xếp vào đây để xử lý tuần tự.')}
              </p>
            </div>
          ) : (
            queueState.items.map((task, idx) => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 backdrop-blur-md ${
                  task.status === 'processing'
                    ? 'bg-primary-500/10 border-primary-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                    : task.status === 'cooling'
                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono text-white/40 flex-shrink-0">
                    {idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate max-w-md">
                        {task.title}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-white/40 border border-white/5">
                        {getTypeLabel(task.type)}
                      </span>
                      {getStatusBadge(task.status)}
                    </div>
                    {task.subtitle && (
                      <p className="text-[11px] text-white/40 truncate mt-0.5">
                        {task.subtitle}
                      </p>
                    )}
                    {task.error && (
                      <p className="text-[10px] text-rose-400 mt-1 truncate">
                        {t('common.error', 'Lỗi')}: {task.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {(task.status === 'queued' || task.status === 'cooling' || task.status === 'retrying') && (
                    <button
                      onClick={() => generationQueue.cancelTask(task.id)}
                      className="p-1.5 text-white/30 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title={t('common.cancel', 'Hủy')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-white/40">
          <span>{t('queue.footer', 'Hệ thống bảo vệ hạn ngạch thông minh (Synaptic Cooldown Engine)')}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-white/10 active:scale-95"
          >
            {t('common.close', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FloatingQueueIndicator: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useTranslation();
  const [queueState, setQueueState] = useState<GenerationQueueState>(() => generationQueue.getState());

  useEffect(() => {
    const unsubscribe = generationQueue.subscribe((state) => {
      setQueueState(state);
    });
    return unsubscribe;
  }, []);

  const pendingCount = queueState.items.filter(
    item => item.status === 'queued' || item.status === 'cooling' || item.status === 'retrying' || item.status === 'processing'
  ).length;

  const cooling = queueState.synapticCooling;
  const isCooling = cooling?.isActive;

  if (pendingCount === 0 && !isCooling) return null;

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full border shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
        isCooling
          ? 'bg-zinc-950/85 border-cyan-500/50 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse'
          : 'bg-zinc-950/85 border-primary-500/40 text-primary-300 shadow-[0_0_25px_rgba(99,102,241,0.3)]'
      }`}
    >
      {isCooling ? (
        <>
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-xs font-black uppercase tracking-wider">
            {t('queue.cooling', 'Làm mát')}: {cooling.remainingSeconds}s
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200">
            {pendingCount} {t('queue.waiting', 'chờ')}
          </span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></div>
          <span className="text-xs font-black uppercase tracking-wider text-white">
            {t('queue.badge', 'Hàng đợi AI')}
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300">
            {pendingCount}
          </span>
        </>
      )}
    </button>
  );
};
