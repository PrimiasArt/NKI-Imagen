import React, { useState } from 'react';
import { SemanticSegmentTarget, segmentSemanticArea } from '../../services/neuralSegmentService';

interface SmartSegmentToolbarProps {
  baseImageSrc: string | null;
  onApplyMaskDataUrl: (maskDataUrl: string) => void;
  onClearMask: () => void;
  onInvertMask: () => void;
  hasActiveMask: boolean;
  isMaskVisible: boolean;
  onToggleMaskVisibility: () => void;
}

export const SmartSegmentToolbar: React.FC<SmartSegmentToolbarProps> = ({
  baseImageSrc,
  onApplyMaskDataUrl,
  onClearMask,
  onInvertMask,
  hasActiveMask,
  isMaskVisible,
  onToggleMaskVisibility
}) => {
  const [isSegmenting, setIsSegmenting] = useState<boolean>(false);
  const [activeTarget, setActiveTarget] = useState<SemanticSegmentTarget | null>(null);

  const renderTargetIcon = (id: SemanticSegmentTarget) => {
    switch (id) {
      case 'subject':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'face':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 005 0" />
          </svg>
        );
      case 'hair':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 14c1.5-4 5-8 8-8s6.5 4 8 8M7 16c1-2 3-4 5-4s4 2 5 4M10 18c.5-1 1.2-2 2-2s1.5 1 2 2" />
          </svg>
        );
      case 'clothes':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.5H8l-4 6 3 2.5v9h10v-9l3-2.5-4-6zM9 3.5v2a3 3 0 006 0v-2" />
          </svg>
        );
      case 'background':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-6 4 5 3-3.5L21 17H3z" />
            <circle cx="7" cy="7" r="1.5" />
          </svg>
        );
    }
  };

  const targets: { id: SemanticSegmentTarget; label: string }[] = [
    { id: 'subject', label: 'Chủ thể' },
    { id: 'face', label: 'Khuôn mặt' },
    { id: 'hair', label: 'Mái tóc' },
    { id: 'clothes', label: 'Trang phục' },
    { id: 'background', label: 'Hậu cảnh' }
  ];

  const handleSegment = async (target: SemanticSegmentTarget) => {
    if (!baseImageSrc || isSegmenting) return;
    try {
      setIsSegmenting(true);
      setActiveTarget(target);
      const maskUrl = await segmentSemanticArea(baseImageSrc, target);
      onApplyMaskDataUrl(maskUrl);
    } catch (err) {
      console.error('Lỗi phân đoạn thông minh:', err);
      alert('Không thể tạo mask tự động. Vui lòng thử lại hoặc tô bằng cọ thủ công.');
    } finally {
      setIsSegmenting(false);
      setActiveTarget(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-lg">
      <div className="flex items-center gap-1.5 px-2 border-r border-white/10 text-[10px] font-semibold text-zinc-300">
        <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h10" />
          <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
        <span className="tracking-wider uppercase text-[9px] font-bold text-zinc-400">SAM 2:</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {targets.map((t) => {
          const isActive = activeTarget === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleSegment(t.id)}
              disabled={isSegmenting || !baseImageSrc}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/5'
              } disabled:opacity-40`}
              title={`Tự động khóa vùng ${t.label}`}
            >
              <span className={isActive ? 'text-black' : 'text-zinc-400'}>
                {renderTargetIcon(t.id)}
              </span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {hasActiveMask && (
        <div className="flex items-center gap-1 pl-1.5 border-l border-white/10">
          {/* Invert */}
          <button
            onClick={onInvertMask}
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-[10px] font-medium transition-all flex items-center gap-1"
            title="Đảo ngược vùng chọn mask"
          >
            <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Đảo</span>
          </button>

          {/* Visibility Toggle */}
          <button
            onClick={onToggleMaskVisibility}
            className={`p-1.5 rounded-xl text-[10px] transition-all border ${
              isMaskVisible
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-white/[0.03] text-zinc-500 border-white/5 hover:text-zinc-300'
            }`}
            title={isMaskVisible ? 'Ẩn vùng mask đỏ' : 'Hiện vùng mask đỏ'}
          >
            {isMaskVisible ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            )}
          </button>

          {/* Clear Mask */}
          <button
            onClick={onClearMask}
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-red-300 text-[10px] font-medium transition-all flex items-center gap-1"
            title="Xóa vùng chọn mask"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Xóa</span>
          </button>
        </div>
      )}

      {isSegmenting && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 font-medium px-2">
          <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <span>Đang bóc tách...</span>
        </div>
      )}
    </div>
  );
};
