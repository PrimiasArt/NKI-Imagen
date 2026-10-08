import React, { useState } from 'react';
import {
  OpticalBokehSettings,
  DEFAULT_BOKEH_SETTINGS,
  BokehStyle,
  LENS_PRESETS,
  applyOpticalApertureBokeh
} from '../../services/opticalBokehService';

interface OpticalBokehPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onApplyBokehResult: (newCanvas: HTMLCanvasElement) => void;
  onPreviewBokeh?: (previewCanvas: HTMLCanvasElement | null) => void;
  isPickingFocus: boolean;
  onTogglePickFocus: (active: boolean) => void;
  focalPoint: { x: number; y: number };
  onFocalPointChange: (point: { x: number; y: number }) => void;
}

export const OpticalBokehPanel: React.FC<OpticalBokehPanelProps> = ({
  canvasRef,
  onApplyBokehResult,
  onPreviewBokeh,
  isPickingFocus,
  onTogglePickFocus,
  focalPoint,
  onFocalPointChange
}) => {
  const [settings, setSettings] = useState<OpticalBokehSettings>({
    ...DEFAULT_BOKEH_SETTINGS,
    focalPoint
  });
  const [activeLensId, setActiveLensId] = useState<string>('canon_85_l');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  React.useEffect(() => {
    setSettings(prev => ({ ...prev, focalPoint }));
    if (canvasRef.current) {
      const res = applyOpticalApertureBokeh(canvasRef.current, { ...settings, focalPoint });
      onPreviewBokeh?.(res);
    }
  }, [focalPoint]);

  const handleSliderChange = (field: keyof OpticalBokehSettings, value: any) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    setActiveLensId('');

    if (canvasRef.current) {
      const res = applyOpticalApertureBokeh(canvasRef.current, updated);
      onPreviewBokeh?.(res);
    }
  };

  const handleApplyLens = (lensId: string) => {
    const lens = LENS_PRESETS.find(x => x.id === lensId);
    if (!lens) return;
    setActiveLensId(lensId);
    const updated: OpticalBokehSettings = {
      ...settings,
      ...lens.settings
    };
    setSettings(updated);

    if (canvasRef.current) {
      const res = applyOpticalApertureBokeh(canvasRef.current, updated);
      onPreviewBokeh?.(res);
    }
  };

  const handleCommit = () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    setTimeout(() => {
      try {
        const finalCanvas = applyOpticalApertureBokeh(canvasRef.current!, settings);
        onApplyBokehResult(finalCanvas);
      } finally {
        setIsProcessing(false);
      }
    }, 20);
  };

  const handleReset = () => {
    setSettings(DEFAULT_BOKEH_SETTINGS);
    setActiveLensId('');
    onTogglePickFocus(false);
    onPreviewBokeh?.(null);
  };

  const apertureStops = [1.2, 1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 16.0];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl text-zinc-100 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide flex items-center gap-2">
              <span>Khẩu Độ & Xóa Phông Quang Học</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300 border border-white/15 font-mono font-medium">
                0 API • 60 FPS
              </span>
            </h3>
            <span className="text-[10px] text-zinc-400">
              Mô phỏng thấu kính Leica & Canon L với bokeh bong bóng và quang sai viền
            </span>
          </div>
        </div>
      </div>

      {/* Focus Picker Button */}
      <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
          </div>
          <div className="text-[11px]">
            <div className="font-medium text-white">Điểm Lấy Nét (Focus Plane)</div>
            <div className="text-[9px] font-mono text-zinc-400">
              X: {(settings.focalPoint.x * 100).toFixed(0)}% • Y: {(settings.focalPoint.y * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <button
          onClick={() => onTogglePickFocus(!isPickingFocus)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all flex items-center gap-1.5 border ${
            isPickingFocus
              ? 'bg-white text-black border-white shadow-sm font-semibold'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10'
          }`}
        >
          <span>{isPickingFocus ? 'Đang Chọn...' : 'Chọn Điểm Nét'}</span>
        </button>
      </div>

      {/* Lens Presets */}
      <div>
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">
          Thấu Kính Huyền Thoại
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {LENS_PRESETS.map((lens) => {
            const isSelected = activeLensId === lens.id;
            return (
              <button
                key={lens.id}
                onClick={() => handleApplyLens(lens.id)}
                className={`px-3 py-2 rounded-xl text-[10px] transition-all flex flex-col gap-0.5 border text-left ${
                  isSelected
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-zinc-300 hover:text-white'
                }`}
              >
                <div className="truncate flex items-center justify-between w-full">
                  <span className="font-medium truncate">{lens.name}</span>
                  <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${isSelected ? 'bg-black/10 text-black font-semibold' : 'bg-white/10 text-zinc-300'}`}>
                    {lens.lensLabel}
                  </span>
                </div>
                <div className={`text-[8px] truncate ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  {lens.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aperture F-Stop Selector */}
      <div className="bg-zinc-900/50 p-3.5 rounded-2xl border border-white/5 space-y-2.5">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-zinc-300 font-semibold tracking-wide">
            Khẩu Độ Ống Kính (Aperture F-Stop)
          </span>
          <span className="font-mono text-white font-bold text-xs bg-white/10 px-1.5 py-0.5 rounded border border-white/15">
            f/{settings.aperture.toFixed(1)}
          </span>
        </div>

        {/* F-Stop Buttons */}
        <div className="grid grid-cols-5 gap-1">
          {apertureStops.slice(0, 5).map((f) => (
            <button
              key={f}
              onClick={() => handleSliderChange('aperture', f)}
              className={`py-1 rounded-lg text-[9px] font-mono transition-all border ${
                Math.abs(settings.aperture - f) < 0.1
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              f/{f}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {apertureStops.slice(5).map((f) => (
            <button
              key={f}
              onClick={() => handleSliderChange('aperture', f)}
              className={`py-1 rounded-lg text-[9px] font-mono transition-all border ${
                Math.abs(settings.aperture - f) < 0.1
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              f/{f}
            </button>
          ))}
        </div>

        {/* Continuous Slider */}
        <input
          type="range"
          min={1.2}
          max={16.0}
          step={0.1}
          value={settings.aperture}
          onChange={(e) => handleSliderChange('aperture', Number(e.target.value))}
          className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white mt-1"
        />
      </div>

      {/* Bokeh Shape Selector */}
      <div>
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
          Hình Dáng Đốm Bokeh (Geometry)
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'creamy_gaussian', label: 'Leica Kem Mịn' },
            { id: 'anamorphic_oval', label: 'Cine Bầu Dục' },
            { id: 'hexagonal_blade', label: '6 Lá Lục Giác' },
            { id: 'swirly_petzval', label: 'Petzval Xoáy' }
          ].map((shape) => (
            <button
              key={shape.id}
              onClick={() => handleSliderChange('bokehStyle', shape.id as BokehStyle)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all flex items-center justify-between border ${
                settings.bokehStyle === shape.id
                  ? 'bg-white text-black border-white font-semibold shadow-sm'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <span>{shape.label}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${settings.bokehStyle === shape.id ? 'bg-black' : 'bg-zinc-600'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Optical Tuning Sliders */}
      <div className="space-y-3 bg-zinc-900/50 p-3.5 rounded-2xl border border-white/5">
        {/* Focal Zone Radius */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Bán Kính Vùng Rõ Nét (Sharp Zone)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.focalRadius}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={45}
            value={settings.focalRadius}
            onChange={(e) => handleSliderChange('focalRadius', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Highlight Specular Boost */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Đốm Sáng Bokeh (Specular Highlights)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.bokehHighlightBoost}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.bokehHighlightBoost}
            onChange={(e) => handleSliderChange('bokehHighlightBoost', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Chromatic Aberration */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Quang Sai Rìa Lens (Chromatic Shift)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.chromaticAberration}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            value={settings.chromaticAberration}
            onChange={(e) => handleSliderChange('chromaticAberration', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Lens Vignette */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Tối Góc Quang Học (Lens Vignette)</span>
            <span className="font-mono text-zinc-200 font-semibold">{settings.lensVignette}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            value={settings.lensVignette}
            onChange={(e) => handleSliderChange('lensVignette', Number(e.target.value))}
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
          <span>Áp Dụng Xóa Phông (0 API)</span>
        </button>

        <button
          onClick={handleReset}
          className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white text-xs font-medium transition-all border border-white/10"
          title="Đặt lại thông số ống kính"
        >
          Đặt lại
        </button>
      </div>
    </div>
  );
};
