import React, { useState } from 'react';
import {
  GOBO_PRESETS,
  GoboPreset,
  GoboPatternId,
  PointLightConfig,
  generateProceduralGobo,
  runGenerativeGoboRelight
} from '../../services/goboProjectorService';

interface GoboProjectorPanelProps {
  baseImageSrc: string | null;
  onApplyGoboLayer: (goboDataUrl: string, name: string) => void;
  onApplyAiRelitImage: (imageSrc: string) => void;
}

export const GoboProjectorPanel: React.FC<GoboProjectorPanelProps> = ({
  baseImageSrc,
  onApplyGoboLayer,
  onApplyAiRelitImage
}) => {
  const [selectedPreset, setSelectedPreset] = useState<GoboPreset>(GOBO_PRESETS[0]);
  const [lightConfig, setLightConfig] = useState<PointLightConfig>({
    x: 35,
    y: 35,
    radius: 350,
    intensity: 0.9,
    temperatureK: 3200, // warm tungsten
    softness: 0.7
  });

  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);

  const renderGoboIcon = (id: GoboPatternId) => {
    switch (id) {
      case 'venetian_blinds':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path strokeLinecap="round" d="M3 8h18M3 12h18M3 16h18" />
          </svg>
        );
      case 'palm_fronds':
      case 'tree_branches':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 009-9H3a9 9 0 009 9zM12 3v9m0 0l-4-4m4 4l4-4" />
          </svg>
        );
      case 'window_frame':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path strokeLinecap="round" d="M12 3v18M3 12h18" />
          </svg>
        );
      case 'prism_rainbow':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L2 20h20L12 3zM12 11l6 4M12 13l6 4M12 15l6 4" />
          </svg>
        );
      case 'cyber_stripes':
      default:
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" d="M4 20L20 4M4 14L14 4M10 20L20 10" />
          </svg>
        );
    }
  };

  const handleApplyProceduralLayer = () => {
    if (!baseImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const dataUrl = generateProceduralGobo(selectedPreset.id, img.width, img.height, lightConfig);
      onApplyGoboLayer(dataUrl, `Gobo: ${selectedPreset.name}`);
    };
    img.src = baseImageSrc;
  };

  const handleRunAiRelight = async () => {
    if (!baseImageSrc) return;
    try {
      setIsAiProcessing(true);
      const res = await runGenerativeGoboRelight(baseImageSrc, selectedPreset, lightConfig);
      onApplyAiRelitImage(res.resultImage);
    } catch (err) {
      console.error('Lỗi chiếu sáng Gobo AI:', err);
      alert('Không thể thực hiện chiếu sáng Gobo AI. Vui lòng thử lại.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Neural Gobo & Optical Projector
            </h3>
            <span className="text-[10px] text-zinc-400">
              Chiếu sáng điểm 3D & đổ bóng hoa văn điện ảnh
            </span>
          </div>
        </div>
      </div>

      {/* Preset Grid */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-zinc-300">
          Hoa văn bóng đổ (Gobo Patterns)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GOBO_PRESETS.map((p) => {
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
                    {renderGoboIcon(p.id)}
                  </span>
                  <span className="truncate">{p.name.split('(')[0]}</span>
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-1">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Point Light Configuration Sliders */}
      <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
          <span>Tọa độ nguồn sáng:</span>
          <span className="text-white font-mono text-[11px]">
            X: {lightConfig.x}% • Y: {lightConfig.y}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-400">Vị trí Ngang (X)</span>
            <input
              type="range"
              min="0"
              max="100"
              value={lightConfig.x}
              onChange={(e) => setLightConfig((prev) => ({ ...prev, x: Number(e.target.value) }))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-400">Vị trí Dọc (Y)</span>
            <input
              type="range"
              min="0"
              max="100"
              value={lightConfig.y}
              onChange={(e) => setLightConfig((prev) => ({ ...prev, y: Number(e.target.value) }))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>

        {/* Temperature & Intensity */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Nhiệt độ màu:</span>
              <span className="font-mono text-zinc-200">{lightConfig.temperatureK}K</span>
            </div>
            <input
              type="range"
              min="2200"
              max="8000"
              step="100"
              value={lightConfig.temperatureK}
              onChange={(e) => setLightConfig((prev) => ({ ...prev, temperatureK: Number(e.target.value) }))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Cường độ sáng:</span>
              <span className="font-mono text-zinc-200">{Math.round(lightConfig.intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={lightConfig.intensity}
              onChange={(e) => setLightConfig((prev) => ({ ...prev, intensity: parseFloat(e.target.value) }))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleApplyProceduralLayer}
          className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-200 font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11l-7 4-7-4m14 4l-7 4-7-4M12 3L5 7l7 4 7-4-7-4z" />
          </svg>
          <span>Tạo Layer Bóng Đổ (Local Overlay)</span>
        </button>

        <button
          onClick={handleRunAiRelight}
          disabled={isAiProcessing || !baseImageSrc}
          className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.99]"
        >
          {isAiProcessing ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <span>Đang tính toán tia sáng 3D AI...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Tái Tạo Chiếu Sáng Điện Ảnh AI</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
