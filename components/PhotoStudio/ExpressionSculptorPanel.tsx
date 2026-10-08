import React, { useState } from 'react';
import {
  GAZE_OPTIONS,
  EYE_OPENNESS_OPTIONS,
  IRIS_COLOR_OPTIONS,
  MOOD_OPTIONS,
  LIP_STYLE_OPTIONS,
  JAWLINE_OPTIONS,
  CHEEKBONE_OPTIONS,
  HAIR_FLOW_OPTIONS,
  SCULPT_PRESETS,
  ExpressionParams,
  runExpressionSculpt
} from '../../services/expressionSculptorService';
import { AVAILABLE_STUDIO_MODELS, getStudioModelConfig } from '../../services/modelConfigService';

interface ExpressionSculptorPanelProps {
  baseImageSrc: string | null;
  onApplySculptedFace: (resultImage: string) => void;
}

export const ExpressionSculptorPanel: React.FC<ExpressionSculptorPanelProps> = ({
  baseImageSrc,
  onApplySculptedFace
}) => {
  const currentConfig = getStudioModelConfig();
  const [selectedModel, setSelectedModel] = useState<string>(currentConfig.studioModel);
  const [activeTab, setActiveTab] = useState<'presets' | 'expression' | 'pose_age' | 'anatomy'>('presets');

  const [params, setParams] = useState<ExpressionParams>({
    smileIntensity: 15,
    gazeDirection: 'center_direct',
    eyeOpenness: 'default',
    irisColor: 'original',
    moodVibe: 'confident',
    lipStyle: 'natural',
    jawlineSculpt: 'original',
    cheekboneSculpt: 'original',
    hairFlow: 'original',
    ageShift: 0,
    headPoseYaw: 0,
    headPosePitch: 0,
    headPoseRoll: 0,
    skinRetouchLevel: 50,
    customSculptDirective: ''
  });

  const [isSculpting, setIsSculpting] = useState<boolean>(false);

  const applyPreset = (presetParams: Partial<ExpressionParams>) => {
    setParams(prev => ({
      ...prev,
      ...presetParams
    }));
  };

  const handleSculpt = async () => {
    if (!baseImageSrc) return;
    try {
      setIsSculpting(true);
      const res = await runExpressionSculpt(baseImageSrc, {
        ...params,
        customModel: selectedModel
      });
      onApplySculptedFace(res.resultImage);
    } catch (err: any) {
      console.error('Lỗi điêu khắc biểu cảm:', err);
      alert(`Không thể điêu khắc chân dung (${err?.message || 'Lỗi kết nối'}). Vui lòng thử lại.`);
    } finally {
      setIsSculpting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-3xl bg-slate-900/95 border border-white/10 backdrop-blur-xl text-slate-100 shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="8" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                Neural Expression & Face Sculptor
              </h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300 border border-white/10 font-mono font-bold">
                PRO 4.3
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              Điêu khắc 3D biểu cảm, xoay đầu, độ tuổi & ánh mắt bảo toàn vân da thật
            </p>
          </div>
        </div>
      </div>

      {/* Model Selection Row */}
      <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 font-medium">
          <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Mô hình AI:</span>
        </div>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-zinc-950 text-white text-[11px] font-medium py-1 px-2.5 rounded-xl border border-white/15 focus:outline-none focus:border-white/30 max-w-[200px] truncate"
        >
          {AVAILABLE_STUDIO_MODELS.map(m => (
            <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-2xl border border-white/10 text-[10px] font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'presets'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span>Presets</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expression')}
          className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'expression'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 005 0" />
          </svg>
          <span>Cười & Mắt</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pose_age')}
          className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'pose_age'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>3D & Tuổi</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('anatomy')}
          className={`py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'anatomy'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Hàm & Tóc</span>
        </button>
      </div>

      {/* TAB 1: 1-Click Sculpt Presets */}
      {activeTab === 'presets' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Phong Cách Mẫu Nhanh (1-Click Presets):
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {SCULPT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.params)}
                className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 flex items-center justify-between transition-all group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <circle cx="12" cy="8" r="4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white transition-colors">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Cười: {preset.params.smileIntensity ?? 0}% | Retouch: {preset.params.skinRetouchLevel ?? 50}%
                    </div>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                  Áp dụng →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Expression & Eyes */}
      {activeTab === 'expression' && (
        <div className="flex flex-col gap-3">
          {/* Smile Intensity Slider */}
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Biểu cảm nụ cười:</span>
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
              onChange={(e) => setParams(p => ({ ...p, smileIntensity: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Lạnh lùng (-50%)</span>
              <span>Tự nhiên (0%)</span>
              <span>Tỏa sáng (+100%)</span>
            </div>
          </div>

          {/* Lip Style */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Dáng môi (Lip Style):
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {LIP_STYLE_OPTIONS.map(lip => (
                <button
                  key={lip.id}
                  type="button"
                  onClick={() => setParams(p => ({ ...p, lipStyle: lip.id }))}
                  className={`p-2 rounded-xl text-left border text-[10px] font-medium transition-all ${
                    params.lipStyle === lip.id
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {lip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Eye Openness */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Độ mở mí mắt & Biểu cảm mắt:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {EYE_OPENNESS_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setParams(p => ({ ...p, eyeOpenness: opt.id }))}
                  className={`p-2 rounded-xl text-left border text-[10px] font-medium transition-all flex items-center gap-1.5 ${
                    params.eyeOpenness === opt.id
                      ? 'bg-purple-500/20 border-purple-400 text-white'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Eye Gaze Direction */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Hướng nhìn con ngươi (Eye Gaze):
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {GAZE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setParams(p => ({ ...p, gazeDirection: opt.id }))}
                  className={`p-2 rounded-xl text-left border text-[10px] font-medium transition-all flex items-center gap-1.5 ${
                    params.gazeDirection === opt.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Iris Color */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Màu tròng mắt (Iris Tint):
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {IRIS_COLOR_OPTIONS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setParams(p => ({ ...p, irisColor: c.id }))}
                  className={`p-1.5 rounded-xl border text-[10px] font-medium transition-all flex items-center gap-1.5 truncate ${
                    params.irisColor === c.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-white/30 flex-shrink-0" style={{ backgroundColor: c.colorCode }} />
                  <span className="truncate">{c.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 3D Head Pose & Chrono Age */}
      {activeTab === 'pose_age' && (
        <div className="flex flex-col gap-3">
          {/* Age Shift Chrono Slider */}
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Biến thiên tuổi tác (Chrono-Morph):</span>
              <span className="font-mono text-cyan-400 text-[11px] font-bold">
                {params.ageShift ? (params.ageShift > 0 ? `+${params.ageShift} tuổi` : `${params.ageShift} tuổi`) : 'Tuổi gốc (0)'}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="40"
              step="5"
              value={params.ageShift || 0}
              onChange={(e) => setParams(p => ({ ...p, ageShift: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Trẻ hóa (-30 tuổi)</span>
              <span>Gốc (0)</span>
              <span>Lão hóa (+40 tuổi)</span>
            </div>
          </div>

          {/* 3D Head Rotation: Yaw (Ngang) */}
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Xoay đầu ngang (Head Yaw 3D):</span>
              <span className="font-mono text-purple-400 text-[11px] font-bold">
                {params.headPoseYaw ? `${params.headPoseYaw}°` : '0°'}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={params.headPoseYaw || 0}
              onChange={(e) => setParams(p => ({ ...p, headPoseYaw: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Quay trái (-30°)</span>
              <span>Chính diện (0°)</span>
              <span>Quay phải (+30°)</span>
            </div>
          </div>

          {/* 3D Head Pitch (Ngửa / Cúi) */}
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Cúi / Ngửa cằm (Head Pitch):</span>
              <span className="font-mono text-indigo-400 text-[11px] font-bold">
                {params.headPosePitch ? `${params.headPosePitch}°` : '0°'}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="5"
              value={params.headPosePitch || 0}
              onChange={(e) => setParams(p => ({ ...p, headPosePitch: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Cúi xuống (-20°)</span>
              <span>Cân bằng (0°)</span>
              <span>Ngửa lên (+20°)</span>
            </div>
          </div>

          {/* Mood / Aura */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Thần thái & Khí chất (Aura):
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {MOOD_OPTIONS.slice(0, 6).map(mood => (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setParams(p => ({ ...p, moodVibe: mood.id }))}
                  className={`p-2 rounded-xl text-left border text-[10px] font-medium transition-all flex items-center gap-1.5 ${
                    params.moodVibe === mood.id
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  <span>{mood.icon}</span>
                  <span className="truncate">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Jawline, Cheekbones & Hair */}
      {activeTab === 'anatomy' && (
        <div className="flex flex-col gap-3">
          {/* Jawline Sculpt */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Khung xương cằm & Hàm (Jawline):
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {JAWLINE_OPTIONS.map(j => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setParams(p => ({ ...p, jawlineSculpt: j.id }))}
                  className={`p-2 rounded-xl text-left border text-[10px] font-medium transition-all ${
                    params.jawlineSculpt === j.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cheekbones */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Độ cao gò má (Cheekbone Contour):
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {CHEEKBONE_OPTIONS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setParams(p => ({ ...p, cheekboneSculpt: c.id }))}
                  className={`p-2 rounded-xl text-left border text-[10px] font-medium transition-all ${
                    params.cheekboneSculpt === c.id
                      ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Flow */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Chuyển động tóc (Hair Dynamics):
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {HAIR_FLOW_OPTIONS.map(h => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setParams(p => ({ ...p, hairFlow: h.id }))}
                  className={`p-2 rounded-xl text-left border text-[10px] font-medium transition-all ${
                    params.hairFlow === h.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Skin Retouch Slider */}
      <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-1.5 mt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Làm mịn da Beauty (Frequency Separation):</span>
          <span className="font-mono text-emerald-400 text-[11px] font-bold">
            {params.skinRetouchLevel}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={params.skinRetouchLevel}
          onChange={(e) => setParams(p => ({ ...p, skinRetouchLevel: Number(e.target.value) }))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Giữ nguyên vân da (0%)</span>
          <span>Studio 50%</span>
          <span>Bìa Tạp Chí (100%)</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleSculpt}
        disabled={isSculpting || !baseImageSrc}
        className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.99]"
      >
        {isSculpting ? (
          <>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
            <span>Đang điêu khắc vi biểu cảm & giải phẫu 3D...</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="8" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            </svg>
            <span>Thực Thi Điêu Khắc Chân Dung (Sculpt)</span>
          </>
        )}
      </button>

    </div>
  );
};
