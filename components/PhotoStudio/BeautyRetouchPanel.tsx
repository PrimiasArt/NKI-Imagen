import React, { useState } from 'react';
import {
  BeautyRetouchSettings,
  DEFAULT_BEAUTY_SETTINGS,
  BEAUTY_PRESETS,
  applyBeautyRetouch
} from '../../services/frequencySeparationService';

interface BeautyRetouchPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onApplyRetouchResult: (newCanvas: HTMLCanvasElement) => void;
  onPreviewRetouch?: (previewCanvas: HTMLCanvasElement | null) => void;
}

export const BeautyRetouchPanel: React.FC<BeautyRetouchPanelProps> = ({
  canvasRef,
  onApplyRetouchResult,
  onPreviewRetouch
}) => {
  const [settings, setSettings] = useState<BeautyRetouchSettings>(DEFAULT_BEAUTY_SETTINGS);
  const [activePresetId, setActivePresetId] = useState<string>('editorial_vogue');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleSliderChange = (field: keyof BeautyRetouchSettings, value: number) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    setActivePresetId('');

    if (canvasRef.current) {
      const res = applyBeautyRetouch(canvasRef.current, updated);
      onPreviewRetouch?.(res);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const p = BEAUTY_PRESETS.find(x => x.id === presetId);
    if (!p) return;
    setActivePresetId(presetId);
    setSettings(p.settings);

    if (canvasRef.current) {
      const res = applyBeautyRetouch(canvasRef.current, p.settings);
      onPreviewRetouch?.(res);
    }
  };

  const handleCommit = () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const finalCanvas = applyBeautyRetouch(canvasRef.current!, settings);
        onApplyRetouchResult(finalCanvas);
      } finally {
        setIsProcessing(false);
      }
    }, 20);
  };

  const handleReset = () => {
    setSettings(DEFAULT_BEAUTY_SETTINGS);
    setActivePresetId('');
    onPreviewRetouch?.(null);
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl text-zinc-100 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide flex items-center gap-2">
              <span>Tách Tần Số & Mịn Da Thật</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300 border border-white/15 font-mono font-medium">
                0 API • 60 FPS
              </span>
            </h3>
            <span className="text-[10px] text-zinc-400">
              Làm mịn da láng mượt nhưng bảo tồn 100% lỗ chân lông & vân da chuẩn Vogue
            </span>
          </div>
        </div>
      </div>

      {/* Preset Pills */}
      <div>
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">
          Presets Chân Dung Tạp Chí
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {BEAUTY_PRESETS.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p.id)}
                className={`px-3 py-2 rounded-xl text-[10px] transition-all flex flex-col gap-0.5 border text-left ${
                  isSelected
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-zinc-300 hover:text-white'
                }`}
              >
                <div className="font-medium truncate flex items-center justify-between w-full">
                  <span>{p.name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-zinc-600'}`} />
                </div>
                <div className={`text-[8px] truncate ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  {p.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Sliders */}
      <div className="space-y-3 bg-zinc-900/50 p-3.5 rounded-2xl border border-white/5">
        {/* 1. Skin Smooth */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Độ Mịn Da (Low Frequency)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.skinSmooth}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.skinSmooth}
            onChange={(e) => handleSliderChange('skinSmooth', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* 2. Texture Preserve */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Bảo Tồn Lỗ Chân Lông (High Frequency)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.texturePreserve}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={settings.texturePreserve}
            onChange={(e) => handleSliderChange('texturePreserve', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* 3. Blemish Reduction */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Khử Đốm Mụn & Vết Đỏ</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.blemishReduction}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.blemishReduction}
            onChange={(e) => handleSliderChange('blemishReduction', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* 4. Skin Warmth */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Sắc Da Ấm Áp (Skin Warmth)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.skinWarmth > 0 ? `+${settings.skinWarmth}` : settings.skinWarmth}</span>
          </div>
          <input
            type="range"
            min={-30}
            max={40}
            value={settings.skinWarmth}
            onChange={(e) => handleSliderChange('skinWarmth', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* 5. Eye Clarity */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Catchlight Mắt & Độ Sâu Con Ngươi</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.eyeClarity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.eyeClarity}
            onChange={(e) => handleSliderChange('eyeClarity', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* 6. Teeth Whitening */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Làm Trắng Răng & Tròng Mắt</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.teethWhitening}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.teethWhitening}
            onChange={(e) => handleSliderChange('teethWhitening', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* 7. 3D Dodge & Burn */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Khối Gò Má & Sống Mũi (Dodge & Burn)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.dodgeAndBurn3D}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.dodgeAndBurn3D}
            onChange={(e) => handleSliderChange('dodgeAndBurn3D', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* 8. Subsurface Glow */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Căng Bóng Glass Skin (Subsurface Glow)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.glowSubsurface}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.glowSubsurface}
            onChange={(e) => handleSliderChange('glowSubsurface', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleCommit}
          disabled={isProcessing}
          className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Áp Dụng Lên Canvas (0 API)</span>
        </button>

        <button
          onClick={handleReset}
          className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white text-xs font-medium transition-all border border-white/10"
          title="Đặt lại các thông số ban đầu"
        >
          Đặt lại
        </button>
      </div>
    </div>
  );
};
