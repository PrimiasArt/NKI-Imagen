import React from 'react';
import {
  DodgeBurnSettings,
  DodgeBurnMode,
  DodgeBurnRange,
  CloneStampSettings,
  DEFAULT_DODGE_BURN_SETTINGS,
  DEFAULT_CLONE_STAMP_SETTINGS
} from '../../services/photoshopRetouchBrushService';

interface PhotoshopRetouchBrushesPanelProps {
  brushType: 'dodge_burn' | 'clone_stamp';
  onSelectBrushType: (t: 'dodge_burn' | 'clone_stamp') => void;
  dodgeBurnSettings: DodgeBurnSettings;
  onChangeDodgeBurn: (settings: DodgeBurnSettings) => void;
  cloneStampSettings: CloneStampSettings;
  onChangeCloneStamp: (settings: CloneStampSettings) => void;
  onClearCloneSource: () => void;
}

export const PhotoshopRetouchBrushesPanel: React.FC<PhotoshopRetouchBrushesPanelProps> = ({
  brushType,
  onSelectBrushType,
  dodgeBurnSettings,
  onChangeDodgeBurn,
  cloneStampSettings,
  onChangeCloneStamp,
  onClearCloneSource
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Photoshop Retouch Brushes</h3>
            <span className="text-[10px] text-zinc-400">Dodge & Burn & Đóng Dấu Clone Stamp</span>
          </div>
        </div>
      </div>

      {/* Tool Selector Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
        <button
          onClick={() => onSelectBrushType('dodge_burn')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            brushType === 'dodge_burn'
              ? 'bg-amber-400 text-black shadow-md font-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
          <span>Dodge & Burn</span>
        </button>

        <button
          onClick={() => onSelectBrushType('clone_stamp')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            brushType === 'clone_stamp'
              ? 'bg-primary-500 text-black shadow-md font-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="7" y="3" width="10" height="6" rx="1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v4l-4 4v3h14v-3l-4-4V9" />
          </svg>
          <span>Clone Stamp</span>
        </button>
      </div>

      {/* DODGE & BURN CONTROLS */}
      {brushType === 'dodge_burn' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeDodgeBurn({ ...dodgeBurnSettings, mode: 'dodge' })}
              className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                dodgeBurnSettings.mode === 'dodge'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-zinc-400'
              }`}
            >
              <span className="text-xs font-bold">Làm Sáng (Dodge)</span>
              <span className="text-[9px] text-zinc-400">Tăng bắt sáng khối gò má, sóng mũi, mắt</span>
            </button>

            <button
              onClick={() => onChangeDodgeBurn({ ...dodgeBurnSettings, mode: 'burn' })}
              className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                dodgeBurnSettings.mode === 'burn'
                  ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-zinc-400'
              }`}
            >
              <span className="text-xs font-bold">Làm Tối (Burn)</span>
              <span className="text-[9px] text-zinc-400">Tạo khối hốc mắt, viền hàm, chân tóc</span>
            </button>
          </div>

          {/* Range Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Vùng Ánh Sáng Tác Động (Range)</span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-2xl border border-white/10">
              {(['shadows', 'midtones', 'highlights'] as DodgeBurnRange[]).map((r) => {
                const isSelected = dodgeBurnSettings.range === r;
                const labels = { shadows: 'Shadows', midtones: 'Midtones', highlights: 'Highlights' };
                return (
                  <button
                    key={r}
                    onClick={() => onChangeDodgeBurn({ ...dodgeBurnSettings, range: r })}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
                      isSelected
                        ? 'bg-white text-black shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {labels[r]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exposure Slider */}
          <div className="p-3 bg-black/40 rounded-2xl border border-white/10 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Độ Phơi Sáng (Exposure)</span>
                <span className="font-mono text-xs font-bold text-amber-300">{dodgeBurnSettings.exposure}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={dodgeBurnSettings.exposure}
                onChange={(e) => onChangeDodgeBurn({ ...dodgeBurnSettings, exposure: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Kích Thước Cọ (Size)</span>
                <span className="font-mono text-xs font-bold text-white">{dodgeBurnSettings.size} px</span>
              </div>
              <input
                type="range"
                min="10"
                max="180"
                value={dodgeBurnSettings.size}
                onChange={(e) => onChangeDodgeBurn({ ...dodgeBurnSettings, size: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Độ Mềm Lông Cọ (Hardness)</span>
                <span className="font-mono text-xs font-bold text-emerald-300">{Math.round(dodgeBurnSettings.hardness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.9"
                step="0.05"
                value={dodgeBurnSettings.hardness}
                onChange={(e) => onChangeDodgeBurn({ ...dodgeBurnSettings, hardness: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* CLONE STAMP CONTROLS */}
      {brushType === 'clone_stamp' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Source Anchor Status Card */}
          <div className="p-3 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${cloneStampSettings.sourcePoint ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">
                  {cloneStampSettings.sourcePoint
                    ? `Đã neo mẫu tại [${cloneStampSettings.sourcePoint.x}, ${cloneStampSettings.sourcePoint.y}]`
                    : 'Chưa có điểm lấy mẫu (Sample Point)'}
                </span>
                <span className="text-[9.5px] text-zinc-400">
                  {cloneStampSettings.sourcePoint
                    ? 'Quét chuột lên vùng cần xóa để nhân bản mượt mà'
                    : 'Giữ phím Alt + Nhấp chuột trên ảnh để lấy điểm mẫu'}
                </span>
              </div>
            </div>

            {cloneStampSettings.sourcePoint && (
              <button
                onClick={onClearCloneSource}
                className="px-2 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-400 hover:text-white"
                title="Xóa điểm lấy mẫu để chọn điểm mới"
              >
                Hủy Neo
              </button>
            )}
          </div>

          {/* Healing Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Healing Texture Blend</span>
              <span className="text-[9.5px] text-zinc-400">Tự hòa trộn màu da đích nhưng lấy vân da nguồn</span>
            </div>
            <input
              type="checkbox"
              checked={cloneStampSettings.isHealingMode}
              onChange={(e) => onChangeCloneStamp({ ...cloneStampSettings, isHealingMode: e.target.checked })}
              className="w-4 h-4 rounded text-primary-500 focus:ring-primary-400 bg-black/40 border-white/20 accent-primary-500 cursor-pointer"
            />
          </div>

          {/* Size & Hardness Sliders */}
          <div className="p-3 bg-black/40 rounded-2xl border border-white/10 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Kích Thước Cọ (Size)</span>
                <span className="font-mono text-xs font-bold text-primary-300">{cloneStampSettings.size} px</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                value={cloneStampSettings.size}
                onChange={(e) => onChangeCloneStamp({ ...cloneStampSettings, size: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Độ Trong Suốt (Opacity)</span>
                <span className="font-mono text-xs font-bold text-white">{cloneStampSettings.opacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={cloneStampSettings.opacity}
                onChange={(e) => onChangeCloneStamp({ ...cloneStampSettings, opacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Độ Mềm Mép (Hardness)</span>
                <span className="font-mono text-xs font-bold text-emerald-300">{Math.round(cloneStampSettings.hardness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={cloneStampSettings.hardness}
                onChange={(e) => onChangeCloneStamp({ ...cloneStampSettings, hardness: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] text-zinc-400 space-y-1">
            <div>- <strong>Xóa nốt ruồi / mụn / tóc con</strong>: Giữ phím <em>Alt</em> và click vào vùng da sạch kế bên, sau đó quét đè lên nốt mụn để xóa biến mất hoàn hảo!</div>
          </div>
        </div>
      )}
    </div>
  );
};
