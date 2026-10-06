import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  RateLimitState, 
  rateLimitTracker, 
  ESTIMATED_STEP_COSTS,
  IMAGE_MODEL_FREE_TPM_LIMIT,
  DEFAULT_TPM_LIMIT 
} from '../services/rateLimitService';

interface RealtimeRateLimitBarProps {
  className?: string;
  onNavigateToStep?: (stepId: string) => void;
}

export const RealtimeRateLimitBar: React.FC<RealtimeRateLimitBarProps> = ({ 
  className = '' 
}) => {
  const [state, setState] = useState<RateLimitState>(() => rateLimitTracker.getState());
  const [showPlanner, setShowPlanner] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showUltraGuide, setShowUltraGuide] = useState(false);
  const [customTpm, setCustomTpm] = useState<string>(() => rateLimitTracker.getTpmLimit().toString());

  useEffect(() => {
    const unsubscribe = rateLimitTracker.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const tpmPercentage = state.tpmPercentage;
  const rpmPercentage = state.rpmPercentage;
  const tokensRemaining = Math.max(0, state.tpmLimit - state.tpmUsage);

  // Status colors & labels
  let statusColor = 'from-emerald-500 to-teal-400';
  let statusBadgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let statusLabel = 'An toàn';
  let statusIcon = '🟢';

  if (state.isServerThrottled) {
    statusColor = 'from-red-600 via-rose-600 to-amber-600 animate-pulse';
    statusBadgeColor = 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse';
    statusLabel = 'Google 429: Đang chờ Cooldown';
    statusIcon = '⛔';
  } else if (state.isCritical) {
    statusColor = 'from-red-600 via-rose-500 to-amber-500 animate-pulse';
    statusBadgeColor = 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
    statusLabel = 'Cận 429! Chờ cooldown';
    statusIcon = '🔴';
  } else if (state.isWarning) {
    statusColor = 'from-amber-500 to-orange-400';
    statusBadgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    statusLabel = 'Cẩn trọng';
    statusIcon = '🟡';
  }

  const handleApplyCustomTpm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customTpm.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 10000) {
      rateLimitTracker.setTpmLimit(parsed);
      setShowConfig(false);
    }
  };

  return (
    <div className={`w-full relative ${className}`}>
      {/* Compact Status Pill Bar */}
      <div className="backdrop-blur-xl bg-zinc-950/60 hover:bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-1.5 shadow-md transition-all flex items-center justify-between gap-3 text-xs">
        {/* Left: Status indicator & Live TPM/RPM */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 flex-none">
            <span className="text-xs">{statusIcon}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80 hidden sm:inline">
              Rate Limit
            </span>
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBadgeColor}`}>
              {statusLabel}
            </span>
          </div>

          {state.cooldownSeconds > 0 && (
            <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/30 flex items-center gap-1 animate-pulse flex-none">
              ⏳ Reset {state.cooldownSeconds}s
            </span>
          )}

          {/* Mini progress bar inside the pill */}
          <div className="w-16 sm:w-24 h-1.5 bg-white/10 rounded-full overflow-hidden flex-none hidden md:block">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${statusColor} transition-all duration-500`}
              style={{ width: `${Math.max(4, Math.min(100, tpmPercentage))}%` }}
            />
          </div>
        </div>

        {/* Right: Numbers & Trigger buttons */}
        <div className="flex items-center gap-2.5 text-[10px] font-mono flex-none">
          <div className="flex items-center gap-1 text-white/90">
            <span className="text-white/40 font-sans font-bold">TPM:</span>
            <span className={`font-bold ${state.isCritical ? 'text-rose-400' : 'text-primary-300'}`}>
              {(state.tpmUsage / 1000).toFixed(1)}k
            </span>
            <span className="text-white/40">/ {(state.tpmLimit / 1000).toFixed(0)}k</span>
          </div>

          <div className="w-px h-3 bg-white/10 hidden sm:block"></div>

          <div className="items-center gap-1 text-white/90 hidden sm:flex">
            <span className="text-white/40 font-sans font-bold">RPM:</span>
            <span className={`font-bold ${state.rpmUsage >= 12 ? 'text-red-400' : 'text-emerald-300'}`}>
              {state.rpmUsage}
            </span>
            <span className="text-white/40">/{state.rpmLimit}</span>
          </div>

          <div className="w-px h-3 bg-white/10"></div>

          <button
            type="button"
            onClick={() => setShowPlanner(true)}
            className="px-2 py-1 rounded-lg text-[9px] font-sans font-black uppercase tracking-wider transition-all flex items-center gap-1 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 active:scale-95"
            title="Xem chi tiết bảng tính toán token và hạn ngạch"
          >
            <span>🧮</span>
            <span className="hidden sm:inline">Định mức</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfig(true)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Cài đặt hạn ngạch TPM"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Server Throttled Compact Alert Banner if locked */}
      {state.isServerThrottled && (
        <div className="mt-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/40 rounded-xl flex items-center justify-between text-[10px] text-red-200 animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <span>⛔</span>
            <span className="font-bold text-red-300">Google API 429 Quota Exceeded:</span>
            <span>Chờ {state.cooldownSeconds}s để tiếp tục.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPlanner(true)}
            className="text-[9px] font-bold text-amber-300 underline hover:text-amber-200 ml-2"
          >
            Xem hướng dẫn
          </button>
        </div>
      )}

      {/* --- MODAL: BẢNG TÍNH TOÁN TOKEN & HẠN NGẠCH (PORTAL) --- */}
      {showPlanner && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-slate-950/95 backdrop-blur-2xl p-6 lg:p-8 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10 space-y-5 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-lg">
                  🧮
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Định Mức & Tiêu Thụ Token Google Gemini
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Hạn ngạch khả dụng hiện tại: <strong className="text-emerald-400 font-mono">{tokensRemaining.toLocaleString()} tokens</strong> / 60 giây ({state.tierName})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPlanner(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-all text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Diagnostic Information */}
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200/90 leading-relaxed space-y-2">
              <strong className="text-blue-300 font-bold flex items-center gap-1.5">
                <span>💡</span>
                <span>Vì sao có thể gặp lỗi 429 Quota Exceeded trên gói Free Tier?</span>
              </strong>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-blue-100/80">
                <li><strong>Hạn ngạch riêng của Model tạo ảnh:</strong> Google cấp 200,000 TPM cho mô hình văn bản Flash, nhưng mô hình tạo ảnh (Image Generation) có giới hạn nghiêm ngặt hơn (~30,000 tokens/phút).</li>
                <li><strong>Hạn ngạch ngày (RPD):</strong> Gói Free Tier giới hạn khoảng 20-50 lượt tạo ảnh mỗi ngày.</li>
                <li><strong>Ảnh tham chiếu (Pose / Identity / Compose):</strong> Đã được nén tự động xuống 512px để tiết kiệm token tối đa.</li>
              </ul>
            </div>

            {/* Quick estimate grid */}
            <div>
              <h4 className="text-xs font-black uppercase text-white/70 tracking-wider mb-2.5">
                Ước tính số lần tạo khả dụng trong 60 giây tới:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {Object.entries(ESTIMATED_STEP_COSTS).map(([key, item]) => {
                  const canAfford = tokensRemaining >= item.tokens;
                  const timesLeft = Math.floor(tokensRemaining / item.tokens);

                  return (
                    <div 
                      key={key}
                      className={`p-3 rounded-2xl border transition-all ${
                        canAfford 
                          ? 'bg-white/[0.03] border-white/5 hover:border-white/20' 
                          : 'bg-red-500/10 border-red-500/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-white/90 leading-tight">
                          {item.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-primary-300 bg-primary-500/15 px-1.5 py-0.5 rounded">
                          ~{item.tokens} tok
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 line-clamp-1 mb-2">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                        <span className={canAfford ? 'text-emerald-400' : 'text-red-400'}>
                          {canAfford ? `✓ Còn ~${timesLeft} lần` : '✗ Hết quota 60s'}
                        </span>
                        <span className="text-white/30 font-mono">
                          {((item.tokens / state.tpmLimit) * 100).toFixed(1)}% TPM
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent 60s Requests History */}
            {state.history.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <div className="text-xs font-black uppercase tracking-wider text-white/60 mb-2 flex items-center justify-between">
                  <span>Lịch sử API trong 60s ({state.history.length} request):</span>
                  <button 
                    onClick={() => rateLimitTracker.clearHistory()}
                    className="text-[9px] text-white/40 hover:text-red-400 transition-colors uppercase font-bold"
                  >
                    Xóa lịch sử mô phỏng
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {state.history.map((entry) => {
                    const elapsedSec = Math.floor((Date.now() - entry.timestamp) / 1000);
                    const remainingSec = Math.max(0, 60 - elapsedSec);
                    return (
                      <div 
                        key={entry.id}
                        className="flex items-center justify-between text-[10px] py-1.5 px-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono"
                      >
                        <span className="text-white/80 font-sans font-medium">{entry.action}</span>
                        <div className="flex items-center gap-3 text-white/40">
                          <span className="text-primary-300 font-bold">+{entry.tokens.toLocaleString()} tokens</span>
                          <span>Hồi sau {remainingSec}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPlanner(false)}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: CẤU HÌNH HẠN NGẠCH TPM (PORTAL) --- */}
      {showConfig && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-950/95 backdrop-blur-2xl p-6 lg:p-8 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                <span>⚙️</span>
                <span>Cài Đặt Hạn Ngạch Google Gemini TPM</span>
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-white/40 hover:text-white text-sm font-bold">✕</button>
            </div>
            
            <form onSubmit={handleApplyCustomTpm} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/70 font-semibold block">Hạn ngạch tùy chỉnh (Tokens Per Minute):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    value={customTpm}
                    onChange={(e) => setCustomTpm(e.target.value)}
                    placeholder="200000"
                    className="glass-input rounded-xl px-4 py-2 text-xs font-mono text-white flex-1"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Lưu
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black uppercase text-white/50 tracking-wider block">Chọn nhanh hạn ngạch:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { 
                      setCustomTpm(IMAGE_MODEL_FREE_TPM_LIMIT.toString()); 
                      rateLimitTracker.setTpmLimit(IMAGE_MODEL_FREE_TPM_LIMIT); 
                      setShowConfig(false); 
                    }}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      state.tpmLimit === IMAGE_MODEL_FREE_TPM_LIMIT 
                        ? 'bg-primary-500/20 text-primary-300 border-primary-500/40' 
                        : 'bg-white/5 hover:bg-white/10 text-white/60 border-white/5'
                    }`}
                  >
                    <span className="text-[11px] font-bold block">30k TPM</span>
                    <span className="text-[8px] text-white/40 block">Tạo ảnh Free</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setCustomTpm(DEFAULT_TPM_LIMIT.toString()); 
                      rateLimitTracker.setTpmLimit(DEFAULT_TPM_LIMIT); 
                      setShowConfig(false); 
                    }}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      state.tpmLimit === DEFAULT_TPM_LIMIT 
                        ? 'bg-primary-500/20 text-primary-300 border-primary-500/40' 
                        : 'bg-white/5 hover:bg-white/10 text-white/60 border-white/5'
                    }`}
                  >
                    <span className="text-[11px] font-bold block">200k TPM</span>
                    <span className="text-[8px] text-white/40 block">Flash Text Free</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setCustomTpm('1000000'); 
                      rateLimitTracker.setTpmLimit(1000000); 
                      setShowConfig(false); 
                    }}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      state.tpmLimit === 1000000 
                        ? 'bg-primary-500/20 text-primary-300 border-primary-500/40' 
                        : 'bg-white/5 hover:bg-white/10 text-white/60 border-white/5'
                    }`}
                  >
                    <span className="text-[11px] font-bold block">1M TPM</span>
                    <span className="text-[8px] text-white/40 block">Pay-as-you-go</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
