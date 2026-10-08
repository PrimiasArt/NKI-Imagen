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

  const renderWeatherIcon = (id: AtmosphereType) => {
    switch (id) {
      case 'cinematic_rain':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 13v5M8 13v5M12 15v5M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
          </svg>
        );
      case 'soft_snow':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3m15.364-6.364l-12.728 12.728m0-12.728l12.728 12.728" />
          </svg>
        );
      case 'volumetric_fog':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M3 12h18M6 16h12M8 20h8" />
          </svg>
        );
      case 'film_halation':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="7" strokeDasharray="2 3" />
            <circle cx="12" cy="12" r="10" strokeDasharray="1 4" />
          </svg>
        );
    }
  };

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
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Volumetric Atmosphere & Weather
            </h3>
            <span className="text-[10px] text-zinc-400">
              Mưa, tuyết, sương mù & quầng sáng Halation 35mm
            </span>
          </div>
        </div>
      </div>

      {/* Preset Grid */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-zinc-300">
          Hiệu ứng khí hậu & môi trường:
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ATMOSPHERE_PRESETS.map((p) => {
            const isSelected = selectedPreset.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPreset(p)}
                className={`p-2.5 rounded-2xl text-left border transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-white/[0.08] border-white/40 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                  <span className={isSelected ? 'text-white' : 'text-zinc-400'}>
                    {renderWeatherIcon(p.id)}
                  </span>
                  <span className="truncate">{p.name.split('(')[0]}</span>
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-1">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Intensity Slider */}
      <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-300">Mật độ & Cường độ:</span>
          <span className="font-mono text-white text-[11px] font-semibold">
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
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
        />
        <div className="flex justify-between text-[9px] text-zinc-500">
          <span>Dịu nhẹ (20%)</span>
          <span>Tiêu chuẩn (75%)</span>
          <span>Dày đặc (150%)</span>
        </div>
      </div>

      {/* Custom Directive Input */}
      <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-zinc-300">
          Ghi chú bổ sung (Tùy chọn):
        </label>
        <input
          type="text"
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="VD: Mưa rào đêm trên phố Tokyo, đèn neon nhòe nước..."
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleApplyProcedural}
          className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-200 font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11l-7 4-7-4m14 4l-7 4-7-4M12 3L5 7l7 4 7-4-7-4z" />
          </svg>
          <span>Tạo Layer Khí Quyển (Local Overlay)</span>
        </button>

        <button
          onClick={handleRunAiWeather}
          disabled={isProcessing || !baseImageSrc}
          className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.99]"
        >
          {isProcessing ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <span>Đang tính toán khí hậu 3D AI...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Tổng Hợp Khí Quyển Chiều Sâu AI</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
