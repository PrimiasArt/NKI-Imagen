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

  const targets: { id: SemanticSegmentTarget; label: string; icon: string }[] = [
    { id: 'subject', label: 'Chủ thể', icon: '👤' },
    { id: 'face', label: 'Khuôn mặt', icon: '😊' },
    { id: 'hair', label: 'Mái tóc', icon: '💇' },
    { id: 'clothes', label: 'Trang phục', icon: '👔' },
    { id: 'background', label: 'Hậu cảnh', icon: '🌄' }
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
    <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/70 border border-white/10 backdrop-blur-xl shadow-lg">
      <div className="flex items-center gap-1 px-2 border-r border-white/10 text-[10px] font-bold text-cyan-300">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>SAM 2 Bóc Tách:</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSegment(t.id)}
            disabled={isSegmenting || !baseImageSrc}
            className={`px-2 py-1 rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTarget === t.id
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
            } disabled:opacity-40`}
            title={`Tự động khóa vùng ${t.label}`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {hasActiveMask && (
        <div className="flex items-center gap-1 pl-1.5 border-l border-white/10">
          <button
            onClick={onInvertMask}
            className="px-2 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[10px] transition-all"
            title="Đảo ngược vùng chọn mask"
          >
            🔄 Đảo
          </button>
          <button
            onClick={onToggleMaskVisibility}
            className={`px-2 py-1 rounded-xl text-[10px] transition-all border ${
              isMaskVisible
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-white/5 text-slate-500 border-white/5'
            }`}
            title="Ẩn/Hiện vùng mask đỏ"
          >
            {isMaskVisible ? '👁️' : '🙈'}
          </button>
          <button
            onClick={onClearMask}
            className="px-2 py-1 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[10px] transition-all"
            title="Xóa vùng chọn mask"
          >
            ✕ Xóa
          </button>
        </div>
      )}

      {isSegmenting && (
        <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-medium px-2">
          <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span>Đang bóc tách...</span>
        </div>
      )}
    </div>
  );
};
