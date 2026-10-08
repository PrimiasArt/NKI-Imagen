import React, { useState } from 'react';
import {
  StudioLightingSetup,
  DEFAULT_STUDIO_LIGHTING,
  LIGHTING_PRESETS,
  LightModifier,
  kelvinToRgb,
  applyLocalStudioLighting,
  runAiStudioRelighting
} from '../../services/studioLighting3DService';

interface StudioLighting3DPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onApplyLightingResult: (newCanvas: HTMLCanvasElement) => void;
  onPreviewLighting?: (previewCanvas: HTMLCanvasElement | null) => void;
  baseImageSrc?: string | null;
  onApplyAiImage?: (resultImageSrc: string) => void;
}

export const StudioLighting3DPanel: React.FC<StudioLighting3DPanelProps> = ({
  canvasRef,
  onApplyLightingResult,
  onPreviewLighting,
  baseImageSrc,
  onApplyAiImage
}) => {
  const [setup, setSetup] = useState<StudioLightingSetup>(DEFAULT_STUDIO_LIGHTING);
  const [activeLightTab, setActiveLightTab] = useState<'key' | 'fill' | 'rim'>('key');
  const [activePresetId, setActivePresetId] = useState<string>('rembrandt_classic');
  const [isAiRendering, setIsAiRendering] = useState<boolean>(false);
  const [aiProgressMsg, setAiProgressMsg] = useState<string>('');

  const currentLight = activeLightTab === 'key'
    ? setup.keyLight
    : activeLightTab === 'fill'
      ? setup.fillLight
      : setup.rimLight;

  const updateCurrentLight = (field: string, value: any) => {
    setActivePresetId('');
    const lightKey = activeLightTab === 'key' ? 'keyLight' : activeLightTab === 'fill' ? 'fillLight' : 'rimLight';
    const updatedSetup: StudioLightingSetup = {
      ...setup,
      [lightKey]: {
        ...setup[lightKey],
        [field]: value
      }
    };
    setSetup(updatedSetup);

    if (canvasRef.current) {
      const res = applyLocalStudioLighting(canvasRef.current, updatedSetup);
      onPreviewLighting?.(res);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const p = LIGHTING_PRESETS.find(x => x.id === presetId);
    if (!p) return;
    setActivePresetId(presetId);
    setSetup(p.setup);

    if (canvasRef.current) {
      const res = applyLocalStudioLighting(canvasRef.current, p.setup);
      onPreviewLighting?.(res);
    }
  };

  const handleCommitLocal = () => {
    if (!canvasRef.current) return;
    const finalCanvas = applyLocalStudioLighting(canvasRef.current, setup);
    onApplyLightingResult(finalCanvas);
  };

  const handleAiNeuralRecast = async () => {
    if (!baseImageSrc || isAiRendering) return;
    try {
      setIsAiRendering(true);
      setAiProgressMsg('Đang gửi ma trận ánh sáng 3D tới Gemini Engine...');
      const res = await runAiStudioRelighting(baseImageSrc, setup);
      onApplyAiImage?.(res.resultImage);
    } catch (err: any) {
      console.error('Lỗi chiếu sáng AI:', err);
      alert(`Không thể render chiếu sáng AI (${err?.message || 'Lỗi mạng'}). Vui lòng thử lại.`);
    } finally {
      setIsAiRendering(false);
      setAiProgressMsg('');
    }
  };

  const handleReset = () => {
    setSetup(DEFAULT_STUDIO_LIGHTING);
    setActivePresetId('');
    onPreviewLighting?.(null);
  };

  const rgb = kelvinToRgb(currentLight.kelvin);
  const colorHex = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl text-zinc-100 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide flex items-center gap-2">
              <span>Đèn Studio 3D Trực Quan</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300 border border-white/15 font-mono font-medium">
                0 API Preview
              </span>
            </h3>
            <span className="text-[10px] text-zinc-400">
              Mô phỏng nguồn sáng 3 chiều, nhiệt độ màu Kelvin và modifier softbox điện ảnh
            </span>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div>
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">
          Sơ Đồ Đèn Phim Trường Mẫu
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {LIGHTING_PRESETS.map((p) => {
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

      {/* Light Source Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-900/60 p-1 rounded-2xl border border-white/5">
        {[
          { id: 'key', label: 'Key (Chính)', enabled: setup.keyLight.enabled },
          { id: 'fill', label: 'Fill (Bù)', enabled: setup.fillLight.enabled },
          { id: 'rim', label: 'Rim (Ven)', enabled: setup.rimLight.enabled }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveLightTab(tab.id as any)}
            className={`py-2 px-1 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1.5 border ${
              activeLightTab === tab.id
                ? 'bg-white text-black border-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${tab.enabled ? (activeLightTab === tab.id ? 'bg-black' : 'bg-emerald-400') : 'bg-zinc-600'}`} />
          </button>
        ))}
      </div>

      {/* Active Light Controller Box */}
      <div className="bg-zinc-900/50 p-3.5 rounded-2xl border border-white/5 space-y-3.5">
        {/* Toggle on/off */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="text-[11px] font-medium text-white">
            {currentLight.name}
          </span>
          <button
            onClick={() => updateCurrentLight('enabled', !currentLight.enabled)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all border ${
              currentLight.enabled
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-white/[0.03] text-zinc-500 border-white/5'
            }`}
          >
            {currentLight.enabled ? 'Đang Bật' : 'Đã Tắt'}
          </button>
        </div>

        {/* 3D Coordinates (X, Y, Z) */}
        <div>
          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Tọa Độ Không Gian 3D (X, Y, Z)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* X */}
            <div>
              <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                <span>Trái/Phải (X)</span>
                <span className="font-mono text-zinc-200">{currentLight.x > 0 ? `+${currentLight.x}` : currentLight.x}</span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={currentLight.x}
                onChange={(e) => updateCurrentLight('x', Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Y */}
            <div>
              <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                <span>Cao/Thấp (Y)</span>
                <span className="font-mono text-zinc-200">{currentLight.y > 0 ? `+${currentLight.y}` : currentLight.y}</span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={currentLight.y}
                onChange={(e) => updateCurrentLight('y', Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Z */}
            <div>
              <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                <span>Trước/Sau (Z)</span>
                <span className="font-mono text-zinc-200">{currentLight.z > 0 ? `+${currentLight.z}` : currentLight.z}</span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={currentLight.z}
                onChange={(e) => updateCurrentLight('z', Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        </div>

        {/* Kelvin Color Temperature */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: colorHex }} />
              <span>Nhiệt Độ Màu Kelvin</span>
            </span>
            <span className="font-mono text-zinc-200 font-semibold">{currentLight.kelvin}K</span>
          </div>
          <input
            type="range"
            min={2000}
            max={10000}
            step={100}
            value={currentLight.kelvin}
            onChange={(e) => updateCurrentLight('kelvin', Number(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
            style={{
              background: 'linear-gradient(to right, #ff7a00, #ffb347, #ffffff, #cce4ff, #4da6ff)'
            }}
          />
          <div className="flex justify-between text-[8px] text-zinc-500 pt-1 font-mono">
            <span>2000K</span>
            <span>3200K</span>
            <span>5600K</span>
            <span>10000K</span>
          </div>
        </div>

        {/* Intensity */}
        <div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-zinc-300 font-medium">Cường Độ Phát Sáng</span>
            <span className="font-mono text-zinc-200 font-semibold">{currentLight.intensity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={currentLight.intensity}
            onChange={(e) => updateCurrentLight('intensity', Number(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Modifier Type */}
        <div>
          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            Chao Đèn & Tản Sáng (Modifier)
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'octabox', label: 'Octabox' },
              { id: 'hard_reflector', label: 'Chóa Nhôm' },
              { id: 'snoot', label: 'Ống Snoot' },
              { id: 'ring_light', label: 'Ring Light' },
              { id: 'venetian_blinds', label: 'Rèm Cửa Sổ' }
            ].map((mod) => (
              <button
                key={mod.id}
                onClick={() => updateCurrentLight('modifier', mod.id as LightModifier)}
                className={`py-1.5 px-2 rounded-lg text-[9px] font-medium transition-all flex items-center justify-between border ${
                  currentLight.modifier === mod.id
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span className="truncate">{mod.label}</span>
                <span className={`w-1 h-1 rounded-full ${currentLight.modifier === mod.id ? 'bg-black' : 'bg-zinc-600'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        {/* Local Fast Apply */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCommitLocal}
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
            title="Đặt lại thông số đèn"
          >
            Đặt lại
          </button>
        </div>

        {/* Optional AI Neural Recast Button */}
        <button
          onClick={handleAiNeuralRecast}
          disabled={isAiRendering || !baseImageSrc}
          className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-medium text-[11px] transition-all active:scale-95 border border-white/15 flex items-center justify-center gap-2 disabled:opacity-50"
          title="Tái tính toán toàn bộ bóng đổ da và đổ bóng 3D qua Gemini Neural Engine (Tốn đúng 1 lượt API duy nhất)"
        >
          {isAiRendering ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>{aiProgressMsg || 'Đang kết xuất ánh sáng điện ảnh...'}</span>
            </div>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Render Chiếu Sáng AI Điện Ảnh (Tùy Chọn 1 Lượt API)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
