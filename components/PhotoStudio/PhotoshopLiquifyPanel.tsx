import React from 'react';
import {
  LiquifyBrushSettings,
  LiquifyMode,
  DEFAULT_LIQUIFY_SETTINGS
} from '../../services/photoshopLiquifyService';

interface PhotoshopLiquifyPanelProps {
  settings: LiquifyBrushSettings;
  onChange: (newSettings: LiquifyBrushSettings) => void;
  onReconstructAll: () => void;
}

export const PhotoshopLiquifyPanel: React.FC<PhotoshopLiquifyPanelProps> = ({
  settings,
  onChange,
  onReconstructAll
}) => {
  const modes: { id: LiquifyMode; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'push',
      label: 'Nắn Đẩy (Forward Warp)',
      desc: 'Nắn cằm V-line, bóp eo, nắn thon gọn gương mặt và thân hình',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      )
    },
    {
      id: 'bloat',
      label: 'Phóng To (Bloat)',
      desc: 'Mở to mắt tự nhiên, căng mọng môi, tăng độ phồng bồng bềnh mái tóc',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m-3-3h6" />
        </svg>
      )
    },
    {
      id: 'pinch',
      label: 'Thu Nhỏ (Pinch)',
      desc: 'Thu gọn cánh mũi, thu nhỏ bọng mắt, làm nhỏ các chi tiết',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
        </svg>
      )
    },
    {
      id: 'reconstruct',
      label: 'Khôi Phục (Reconstruct)',
      desc: 'Quét cọ để phục hồi từng nét về ảnh gốc mà không cần hoàn tác',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Photoshop Liquify Tool</h3>
            <span className="text-[10px] text-zinc-400">Nắn bóp cằm, eo, mắt, mũi trực tiếp trên ảnh</span>
          </div>
        </div>

        <button
          onClick={onReconstructAll}
          className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[10px] font-medium text-zinc-300 hover:text-white transition-all"
          title="Khôi phục toàn bộ ảnh về gốc ban đầu"
        >
          Khôi Phục Gốc
        </button>
      </div>

      {/* Mode Selection Cards */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Chế Độ Nắn Bóp (Modes)</span>
        <div className="grid grid-cols-2 gap-2">
          {modes.map((m) => {
            const isSelected = settings.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onChange({ ...settings, mode: m.id })}
                className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  isSelected
                    ? 'bg-primary-500/20 text-white border-primary-500/50 shadow-md ring-1 ring-primary-500/30'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={isSelected ? 'text-primary-400' : 'text-zinc-400'}>{m.icon}</span>
                  <span className="text-xs font-bold truncate">{m.label}</span>
                </div>
                <span className="text-[9px] text-zinc-400 leading-tight">{m.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brush Parameters Sliders */}
      <div className="p-3.5 bg-black/40 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <span>Thông Số Cọ Liquify</span>
          <button
            onClick={() => onChange(DEFAULT_LIQUIFY_SETTINGS)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            Reset cọ
          </button>
        </div>

        {/* Size Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">Kích Thước Cọ (Size)</span>
            <span className="font-mono text-xs font-bold text-primary-300">{settings.size} px</span>
          </div>
          <input
            type="range"
            min="15"
            max="250"
            value={settings.size}
            onChange={(e) => onChange({ ...settings, size: Number(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
        </div>

        {/* Pressure / Rate Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">Lực Tác Động (Pressure)</span>
            <span className="font-mono text-xs font-bold text-amber-300">{settings.pressure}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            value={settings.pressure}
            onChange={(e) => onChange({ ...settings, pressure: Number(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Density / Softness Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">Độ Mềm Mép (Density)</span>
            <span className="font-mono text-xs font-bold text-emerald-300">{settings.density}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={settings.density}
            onChange={(e) => onChange({ ...settings, density: Number(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>

      {/* Guide Banner */}
      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] text-zinc-400 space-y-1">
        <div className="font-bold text-zinc-200">Mẹo Chuyên Gia Retouch:</div>
        <div>- <strong>Cằm V-line & Bóp eo</strong>: Chọn <em>Nắn Đẩy (Push)</em>, đặt cọ to hơn vùng cần nắn, kéo nhẹ nhàng theo đường cong tự nhiên.</div>
        <div>- <strong>Mắt to tròn & Môi căng</strong>: Chọn <em>Phóng To (Bloat)</em>, đặt tâm cọ vào giữa con ngươi hoặc giữa bờ môi, click nhẹ 1-2 lần.</div>
        <div>- <strong>Khôi phục vùng bị lố</strong>: Chọn <em>Khôi Phục (Reconstruct)</em> quét nhẹ qua vùng vừa nắn để đưa nét trở lại nguyên bản.</div>
      </div>
    </div>
  );
};
