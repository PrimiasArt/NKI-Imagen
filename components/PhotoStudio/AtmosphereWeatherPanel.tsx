import React, { useState } from 'react';
import {
  ATMOSPHERE_PRESETS,
  AtmospherePreset,
  AtmosphereType,
  renderProceduralAtmosphere,
  runGenerativeAtmosphere
} from '../../services/volumetricAtmosphereService';

interface AtmosphereWeatherPanelProps {
  baseImageSrc: string | null;
  onApplyAtmosphereLayer: (dataUrl: string, name: string) => void;
  onApplyAiAtmosphere: (resultImage: string) => void;
}

export const AtmosphereWeatherPanel: React.FC<AtmosphereWeatherPanelProps> = ({
  baseImageSrc,
  onApplyAtmosphereLayer,
  onApplyAiAtmosphere
}) => {
  const [selectedPreset, setSelectedPreset] = useState<AtmospherePreset>(ATMOSPHERE_PRESETS[0]);
  const [intensity, setIntensity] = useState<number>(0.75);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleApplyProcedural = () => {
    if (!baseImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const dataUrl = renderProceduralAtmosphere(selectedPreset.id, img.width, img.height, intensity);
      onApplyAtmosphereLayer(dataUrl, `Khí quyển: ${selectedPreset.name}`);
    };
    img.src = baseImageSrc;
  };

  const handleRunAiWeather = async () => {
    if (!baseImageSrc) return;
    try {
      setIsProcessing(true);
      const res = await runGenerativeAtmosphere(baseImageSrc, selectedPreset.id, intensity, customNotes);
      onApplyAiAtmosphere(res.resultImage);
    } catch (err) {
      console.error('Lỗi tổng hợp khí quyển AI:', err);
      alert('Không thể tạo hiệu ứng thời tiết AI. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">🌧️</span>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Volumetric Atmosphere & Weather Engine
            </h3>
            <span className="text-[10px] text-slate-400">
              Tạo hiệu ứng mưa, tuyết, sương mù & quầng sáng Halation 35mm
            </span>
          </div>
        </div>
      </div>

      {/* Preset Grid */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-slate-300">
          Hiệu ứng khí hậu & môi trường:
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ATMOSPHERE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(p)}
              className={`p-2 rounded-xl text-left border transition-all flex flex-col gap-1 ${
                selectedPreset.id === p.id
                  ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/10'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span>{p.icon}</span>
                <span className="truncate">{p.name.split('(')[0]}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity Slider */}
      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Mật độ & Cường độ hiệu ứng:</span>
          <span className="font-mono text-sky-400 text-[11px] font-bold">
            {Math.round(intensity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.2"
          max="1.5"
          step="0.05"
          value={intensity}
          onChange={(e) => setIntensity(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Dịu nhẹ (20%)</span>
          <span>Tiêu chuẩn (75%)</span>
          <span>Dày đặc (150%)</span>
        </div>
      </div>

      {/* Custom Directive Input */}
      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-slate-300">
          Ghi chú khí quyển bổ sung (Tùy chọn):
        </label>
        <input
          type="text"
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="VD: Mưa rào đêm trên phố Tokyo, đèn neon nhòe nước..."
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleApplyProcedural}
          className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-sky-200 font-semibold flex items-center justify-center gap-1.5 transition-all"
        >
          <span>🎨</span>
          <span>Tạo Layer Khí Quyển (Local Overlay)</span>
        </button>

        <button
          onClick={handleRunAiWeather}
          disabled={isProcessing || !baseImageSrc}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-xs text-white font-bold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Đang tính toán khí hậu 3D AI...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Tổng Hợp Khí Quyển Chiều Sâu AI</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
