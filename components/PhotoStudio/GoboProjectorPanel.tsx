import React, { useState } from 'react';
import {
  GOBO_PRESETS,
  GoboPreset,
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
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">🔦</span>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Neural Gobo & Optical Projector
            </h3>
            <span className="text-[10px] text-slate-400">
              Chiếu sáng điểm 3D & đổ bóng hoa văn điện ảnh
            </span>
          </div>
        </div>
      </div>

      {/* Preset Grid */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-slate-300">
          Hoa văn bóng đổ (Gobo Patterns)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GOBO_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(p)}
              className={`p-2 rounded-xl text-left border transition-all flex flex-col gap-1 ${
                selectedPreset.id === p.id
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/10'
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

      {/* Point Light Configuration Sliders */}
      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>Tọa độ nguồn sáng ảo:</span>
          <span className="text-amber-400 font-mono text-[11px]">
            X: {lightConfig.x}% • Y: {lightConfig.y}%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Vị trí Ngang (X)</span>
            <input
              type="range"
              min="0"
              max="100"
              value={lightConfig.x}
              onChange={(e) => setLightConfig((prev) => ({ ...prev, x: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400">Vị trí Dọc (Y)</span>
            <input
              type="range"
              min="0"
              max="100"
              value={lightConfig.y}
              onChange={(e) => setLightConfig((prev) => ({ ...prev, y: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>

        {/* Temperature & Intensity */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Nhiệt độ màu:</span>
              <span className="font-mono text-amber-300">{lightConfig.temperatureK}K</span>
            </div>
            <input
              type="range"
              min="2200"
              max="8000"
              step="100"
              value={lightConfig.temperatureK}
              onChange={(e) => setLightConfig((prev) => ({ ...prev, temperatureK: Number(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Cường độ sáng:</span>
              <span className="font-mono text-amber-300">{Math.round(lightConfig.intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={lightConfig.intensity}
              onChange={(e) => setLightConfig((prev) => ({ ...prev, intensity: parseFloat(e.target.value) }))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleApplyProceduralLayer}
          className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-amber-200 font-semibold flex items-center justify-center gap-1.5 transition-all"
        >
          <span>🎨</span>
          <span>Tạo Layer Bóng Đổ (Local Overlay)</span>
        </button>

        <button
          onClick={handleRunAiRelight}
          disabled={isAiProcessing || !baseImageSrc}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-xs text-white font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
        >
          {isAiProcessing ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Đang tính toán tia sáng 3D AI...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Tái Tạo Chiếu Sáng Điện Ảnh AI</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
