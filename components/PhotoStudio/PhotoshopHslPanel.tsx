import React, { useState } from 'react';
import {
  HslColorBand,
  HslSettings,
  COLOR_BAND_META,
  HSL_PRESETS,
  DEFAULT_HSL_SETTINGS
} from '../../services/photoshopHslService';

interface PhotoshopHslPanelProps {
  settings: HslSettings;
  onChange: (newSettings: HslSettings) => void;
  onApplyToCanvas: () => void;
  onReset: () => void;
}

export const PhotoshopHslPanel: React.FC<PhotoshopHslPanelProps> = ({
  settings,
  onChange,
  onApplyToCanvas,
  onReset
}) => {
  const [activeBand, setActiveBand] = useState<HslColorBand>('oranges');

  const bands = Object.keys(COLOR_BAND_META) as HslColorBand[];
  const activeMeta = COLOR_BAND_META[activeBand];
  const activeAdjustment = settings[activeBand];

  const handleBandParamChange = (param: 'hue' | 'saturation' | 'luminance', val: number) => {
    onChange({
      ...settings,
      [activeBand]: {
        ...settings[activeBand],
        [param]: val
      }
    });
  };

  const handleApplyPreset = (preset: typeof HSL_PRESETS[0]) => {
    onChange({
      ...settings,
      ...preset.settings
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 0110 10c0 5.523-4.477 10-10 10M12 2v20" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">8-Channel Selective HSL</h3>
            <span className="text-[10px] text-zinc-400">Bộ trộn màu chọn lọc Camera Raw & Photoshop</span>
          </div>
        </div>

        <button
          onClick={onReset}
          className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[10px] font-medium text-zinc-300 hover:text-white transition-all"
          title="Đặt lại toàn bộ 8 dải màu"
        >
          Reset All
        </button>
      </div>

      {/* 8 Color Band Pills */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
        {bands.map((bandKey) => {
          const meta = COLOR_BAND_META[bandKey];
          const isSelected = activeBand === bandKey;
          const bandData = settings[bandKey];
          const isModified = bandData.hue !== 0 || bandData.saturation !== 0 || bandData.luminance !== 0;

          return (
            <button
              key={bandKey}
              onClick={() => setActiveBand(bandKey)}
              className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                isSelected
                  ? 'bg-white/15 border-white/40 shadow-sm scale-[1.02]'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: meta.hex }}
                />
                {isModified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <span className="text-[9.5px] font-bold text-zinc-300 capitalize truncate w-full text-center">
                {bandKey}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Color Band Control Card */}
      <div className="p-3.5 bg-black/40 rounded-2xl border border-white/10 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full shadow-md"
              style={{ backgroundColor: activeMeta.hex }}
            />
            <span className="text-xs font-black text-white">{activeMeta.label}</span>
          </div>
          <button
            onClick={() => {
              onChange({
                ...settings,
                [activeBand]: { hue: 0, saturation: 0, luminance: 0 }
              });
            }}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Đặt lại dải màu này"
          >
            Reset màu này
          </button>
        </div>

        {/* Hue Shift Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">Sắc Độ (Hue Shift)</span>
            <span className="font-mono text-xs font-bold text-amber-300">
              {activeAdjustment.hue > 0 ? `+${activeAdjustment.hue}` : activeAdjustment.hue}°
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={activeAdjustment.hue}
            onChange={(e) => handleBandParamChange('hue', Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Saturation Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">Độ Bão Hòa (Saturation)</span>
            <span className="font-mono text-xs font-bold text-amber-300">
              {activeAdjustment.saturation > 0 ? `+${activeAdjustment.saturation}` : activeAdjustment.saturation}%
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={activeAdjustment.saturation}
            onChange={(e) => handleBandParamChange('saturation', Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Luminance Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">Độ Sáng (Luminance)</span>
            <span className="font-mono text-xs font-bold text-amber-300">
              {activeAdjustment.luminance > 0 ? `+${activeAdjustment.luminance}` : activeAdjustment.luminance}%
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={activeAdjustment.luminance}
            onChange={(e) => handleBandParamChange('luminance', Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
          />
        </div>
      </div>

      {/* HSL Quick Color Presets */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Presets HSL Chuyên Nghiệp</span>
        <div className="grid grid-cols-2 gap-1.5">
          {HSL_PRESETS.slice(1).map((pr) => (
            <button
              key={pr.id}
              onClick={() => handleApplyPreset(pr)}
              className="text-left p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 transition-all group"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pr.badgeColor }} />
                <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white truncate">
                  {pr.name}
                </span>
              </div>
              <div className="text-[9px] text-zinc-500 truncate mt-0.5">{pr.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Apply Action Button */}
      <button
        onClick={onApplyToCanvas}
        className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 active:scale-[0.98] text-black text-xs font-black uppercase tracking-wider transition-all shadow-md"
      >
        Áp Dụng Màu Sắc HSL
      </button>
    </div>
  );
};
