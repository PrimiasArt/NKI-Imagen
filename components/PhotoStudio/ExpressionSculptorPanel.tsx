import React, { useState } from 'react';
import {
  GAZE_OPTIONS,
  MOOD_OPTIONS,
  ExpressionParams,
  runExpressionSculpt
} from '../../services/expressionSculptorService';

interface ExpressionSculptorPanelProps {
  baseImageSrc: string | null;
  onApplySculptedFace: (resultImage: string) => void;
}

export const ExpressionSculptorPanel: React.FC<ExpressionSculptorPanelProps> = ({
  baseImageSrc,
  onApplySculptedFace
}) => {
  const [params, setParams] = useState<ExpressionParams>({
    smileIntensity: 15,
    gazeDirection: 'center_direct',
    moodVibe: 'confident',
    skinRetouchLevel: 50
  });

  const [isSculpting, setIsSculpting] = useState<boolean>(false);

  const handleSculpt = async () => {
    if (!baseImageSrc) return;
    try {
      setIsSculpting(true);
      const res = await runExpressionSculpt(baseImageSrc, params);
      onApplySculptedFace(res.resultImage);
    } catch (err) {
      console.error('Lỗi điêu khắc biểu cảm:', err);
      alert('Không thể tinh chỉnh biểu cảm chân dung. Vui lòng thử lại.');
    } finally {
      setIsSculpting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">🎭</span>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Neural Expression & Gaze Sculptor
            </h3>
            <span className="text-[10px] text-slate-400">
              Điêu khắc biểu cảm, hướng ánh mắt & làm mịn da giữ nguyên vân hạt
            </span>
          </div>
        </div>
      </div>

      {/* Smile Intensity Slider */}
      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Biểu cảm miệng & Nụ cười:</span>
          <span className="font-mono text-purple-400 text-[11px] font-bold">
            {params.smileIntensity > 0 ? `+${params.smileIntensity}%` : `${params.smileIntensity}%`}
          </span>
        </div>
        <input
          type="range"
          min="-50"
          max="100"
          step="5"
          value={params.smileIntensity}
          onChange={(e) => setParams((p) => ({ ...p, smileIntensity: Number(e.target.value) }))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
        />
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Lạnh lùng / Trầm tư (-50%)</span>
          <span>Tự nhiên (0%)</span>
          <span>Rạng rỡ (+100%)</span>
        </div>
      </div>

      {/* Gaze Direction Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-slate-300">
          Hướng nhìn con ngươi (Eye Gaze):
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {GAZE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setParams((p) => ({ ...p, gazeDirection: opt.id }))}
              className={`p-2 rounded-xl text-left border transition-all flex items-center gap-1.5 ${
                params.gazeDirection === opt.id
                  ? 'bg-purple-500/20 border-purple-400 text-white shadow-md shadow-purple-500/10'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <span>{opt.icon}</span>
              <span className="text-[11px] font-medium truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mood / Aura Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-slate-300">
          Khí chất & Thần thái (Aura):
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.id}
              onClick={() => setParams((p) => ({ ...p, moodVibe: mood.id }))}
              className={`p-2 rounded-xl text-left border transition-all flex items-center gap-1.5 ${
                params.moodVibe === mood.id
                  ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-md shadow-indigo-500/10'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <span>{mood.icon}</span>
              <span className="text-[11px] font-medium truncate">{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Skin Frequency Separation Retouch Slider */}
      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Làm mịn da Beauty (Frequency Separation):</span>
          <span className="font-mono text-cyan-400 text-[11px] font-bold">
            {params.skinRetouchLevel}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={params.skinRetouchLevel}
          onChange={(e) => setParams((p) => ({ ...p, skinRetouchLevel: Number(e.target.value) }))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Giữ da gốc (0%)</span>
          <span>Cân bằng (50%)</span>
          <span>Da mịn High-End (100%)</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleSculpt}
        disabled={isSculpting || !baseImageSrc}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-xs text-white font-bold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        {isSculpting ? (
          <>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span>Đang điêu khắc vi biểu cảm AI...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>Điêu Khắc Biểu Cảm Chân Dung</span>
          </>
        )}
      </button>

    </div>
  );
};
