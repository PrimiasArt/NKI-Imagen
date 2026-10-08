import React, { useState, useRef, useEffect } from 'react';
import { ImagePromptJson } from '../types';
import {
  StudioLight,
  DEFAULT_STUDIO_LIGHTS,
  RELIGHTING_PRESETS,
  generateRelightingFormula,
  applyRelightingToPrompt
} from '../services/relightingService';
import { generateImageFromJson } from '../services/geminiService';

interface VirtualGafferRelightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseImageSrc?: string | null;
  basePrompt: ImagePromptJson;
  onApplyRelitPrompt: (prompt: ImagePromptJson) => void;
}

export const VirtualGafferRelightingModal: React.FC<VirtualGafferRelightingModalProps> = ({
  isOpen,
  onClose,
  baseImageSrc,
  basePrompt,
  onApplyRelitPrompt
}) => {
  const [lights, setLights] = useState<StudioLight[]>(DEFAULT_STUDIO_LIGHTS);
  const [selectedLightId, setSelectedLightId] = useState<string>('key_light');
  const [relitImage, setRelitImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeLight = lights.find(l => l.id === selectedLightId) || lights[0];

  // Draw 3D Light Sphere Simulation
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.38;

    ctx.clearRect(0, 0, w, h);

    // Draw 3D Base Sphere
    const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#334155');
    grad.addColorStop(0.7, '#0f172a');
    grad.addColorStop(1, '#020617');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Orbital ring
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.15, r * 0.45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Lights on the 3D orbit
    lights.forEach((light) => {
      const rad = (light.azimuthDeg * Math.PI) / 180;
      const lx = cx + Math.cos(rad) * (r * 1.15);
      const ly = cy + Math.sin(rad) * (r * 0.45) - (light.elevationDeg / 90) * (r * 0.5);

      const isSelected = light.id === selectedLightId;

      // Light beam towards center
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = light.colorHex;
      ctx.globalAlpha = (light.intensityPct / 100) * 0.4;
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Light source pin
      ctx.beginPath();
      ctx.arc(lx, ly, isSelected ? 11 : 8, 0, Math.PI * 2);
      ctx.fillStyle = light.colorHex;
      ctx.shadowColor = light.colorHex;
      ctx.shadowBlur = isSelected ? 20 : 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(lx, ly, isSelected ? 12 : 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(light.type.toUpperCase(), lx + 14, ly + 3);
    });
  }, [isOpen, lights, selectedLightId]);

  const handleUpdateActiveLight = (patch: Partial<StudioLight>) => {
    setLights(prev => prev.map(l => (l.id === selectedLightId ? { ...l, ...patch } : l)));
  };

  const handleGenerateRelit = async () => {
    try {
      setIsGenerating(true);
      const updatedPrompt = applyRelightingToPrompt(basePrompt, lights);
      const results = await generateImageFromJson(updatedPrompt, {
        numberOfImages: 1,
        aspectRatio: '1:1'
      });
      setRelitImage(results[0] || null);
    } catch (e: any) {
      alert('Lỗi tạo ảnh relighting: ' + (e.message || e));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl glass-card rounded-3xl border border-white/15 bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5 text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Virtual 3D Gaffer & Generative Relighting</span>
                <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/10">
                  Hollywood 3D Studio
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Đánh đèn 3D tương tác đa hướng (Key, Fill, Rim) và tính toán lại ánh sáng quang học chân thực trên ảnh.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-white/10"
            title="Đóng"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 3D Sphere & Presets */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Presets Row */}
            <div>
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-2">
                Setup Đèn Hollywood Mẫu:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {RELIGHTING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setLights(preset.lights);
                      setSelectedLightId(preset.lights[0].id);
                    }}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition-all group"
                  >
                    <span className="text-xs font-semibold text-white block group-hover:text-zinc-200">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Sphere Viewport */}
            <div className="relative aspect-square rounded-3xl bg-black/60 border border-white/15 overflow-hidden flex items-center justify-center shadow-inner">
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="w-full h-full object-contain select-none"
              />
              <div className="absolute bottom-3 inset-x-3 flex justify-between items-center text-[10px] text-white/40">
                <span>Quỹ đạo 360°</span>
                <span>Elevation: {activeLight.elevationDeg}°</span>
              </div>
            </div>

            {/* Light Selector Tabs */}
            <div className="flex gap-2">
              {lights.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLightId(l.id)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                    selectedLightId === l.id
                      ? 'bg-white text-black border-white shadow-sm'
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.colorHex }} />
                  <span>{l.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Active Light Sliders */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                  Chỉnh {activeLight.name}
                </span>
                <input
                  type="color"
                  value={activeLight.colorHex}
                  onChange={(e) => handleUpdateActiveLight({ colorHex: e.target.value })}
                  className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0"
                  title="Đổi màu ánh sáng"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Góc Quay (Azimuth):</span>
                  <span className="font-mono text-white font-bold">{activeLight.azimuthDeg}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={activeLight.azimuthDeg}
                  onChange={(e) => handleUpdateActiveLight({ azimuthDeg: Number(e.target.value) })}
                  className="w-full accent-white cursor-pointer h-1.5 bg-white/20 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Độ Cao (Elevation):</span>
                  <span className="font-mono text-white font-bold">{activeLight.elevationDeg}°</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="85"
                  value={activeLight.elevationDeg}
                  onChange={(e) => handleUpdateActiveLight({ elevationDeg: Number(e.target.value) })}
                  className="w-full accent-white cursor-pointer h-1.5 bg-white/20 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Cường Độ (Intensity):</span>
                  <span className="font-mono text-white font-bold">{activeLight.intensityPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeLight.intensityPct}
                  onChange={(e) => handleUpdateActiveLight({ intensityPct: Number(e.target.value) })}
                  className="w-full accent-white cursor-pointer h-1.5 bg-white/20 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Formula & Relit Comparison View */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Formula Bar */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span>Công Thức Đánh Đèn Quang Học Thời Gian Thực:</span>
                </span>
                <p className="font-mono text-xs text-zinc-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                  {generateRelightingFormula(lights)}
                </p>
              </div>

              {/* Image Preview Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase text-zinc-400 block">Ảnh Gốc Hiện Tại</span>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                    {baseImageSrc ? (
                      <img src={baseImageSrc} alt="Base" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-zinc-500">Chưa có ảnh gốc</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase text-zinc-300 block">Biến Thể Đánh Đèn Mới</span>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/15 flex items-center justify-center relative">
                    {relitImage ? (
                      <img src={relitImage} alt="Relit variant" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4 text-zinc-400 text-xs">
                        {isGenerating ? (
                          <span className="animate-pulse">Đang tính toán photon & render...</span>
                        ) : (
                          <span>Bấm "Render Biến Thể Đánh Đèn"</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={handleGenerateRelit}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {isGenerating ? (
                  <svg className="w-3.5 h-3.5 animate-spin text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )}
                <span>{isGenerating ? 'Đang Tính Toán Đèn...' : 'Render Biến Thể Đánh Đèn 3D'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const updated = applyRelightingToPrompt(basePrompt, lights);
                  onApplyRelitPrompt(updated);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 text-xs font-semibold uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Áp Dụng Công Thức Vào Studio</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
