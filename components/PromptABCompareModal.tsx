import React, { useState, useRef } from 'react';
import { ImagePromptJson } from '../types';
import { generateImageFromJson } from '../services/geminiService';

interface PromptABCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  basePrompt: ImagePromptJson;
  onApplyPrompt: (prompt: ImagePromptJson) => void;
}

export const PromptABCompareModal: React.FC<PromptABCompareModalProps> = ({
  isOpen,
  onClose,
  basePrompt,
  onApplyPrompt
}) => {
  const [promptA, setPromptA] = useState<ImagePromptJson>(() => ({ ...basePrompt }));
  const [promptB, setPromptB] = useState<ImagePromptJson>(() => ({
    ...basePrompt,
    lighting: 'Dramatic high-contrast neon cyan and magenta rim light, dark moody volumetric background',
    camera_angle: 'Cinematic low-angle hero perspective, 85mm prime lens f/1.4'
  }));

  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('B');
  const [imageA, setImageA] = useState<string | null>(null);
  const [imageB, setImageB] = useState<string | null>(null);
  const [isGeneratingA, setIsGeneratingA] = useState(false);
  const [isGeneratingB, setIsGeneratingB] = useState(false);

  // Split slider position (0 - 100%)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleGenerateA = async () => {
    try {
      setIsGeneratingA(true);
      const res = await generateImageFromJson(promptA, { numberOfImages: 1, aspectRatio: '1:1' });
      setImageA(res[0] || null);
    } catch (e: any) {
      alert('Lỗi tạo ảnh Slot A: ' + (e.message || e));
    } finally {
      setIsGeneratingA(false);
    }
  };

  const handleGenerateB = async () => {
    try {
      setIsGeneratingB(true);
      const res = await generateImageFromJson(promptB, { numberOfImages: 1, aspectRatio: '1:1' });
      setImageB(res[0] || null);
    } catch (e: any) {
      alert('Lỗi tạo ảnh Slot B: ' + (e.message || e));
    } finally {
      setIsGeneratingB(false);
    }
  };

  const handleGenerateBoth = async () => {
    handleGenerateA();
    handleGenerateB();
  };

  // Dragging interaction for split comparison
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPos(percent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl glass-card rounded-3xl border border-white/15 bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl">
              ⚖️
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>A/B Matrix Comparison</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Visual Split Testing
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Chạy thử nghiệm song song 2 biến thể prompt (ánh sáng, phong cách, ống kính) và so sánh trực quan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateBoth}
              disabled={isGeneratingA || isGeneratingB}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-primary-500 hover:from-indigo-400 hover:to-primary-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>{isGeneratingA || isGeneratingB ? '⏳' : '⚡'}</span>
              <span>Render Cả 2 Biến Thể (A & B)</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: A/B Prompt Editor Controls */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveSlot('A')}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeSlot === 'A'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <span>Slot A (Gốc)</span>
                {imageA && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
              <button
                type="button"
                onClick={() => setActiveSlot('B')}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeSlot === 'B'
                    ? 'bg-rose-500 text-white shadow-lg'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <span>Slot B (Biến Thể)</span>
                {imageB && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
            </div>

            {/* Quick Modifiers for Slot B */}
            {activeSlot === 'B' && (
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">
                  Áp dụng nhanh biến thể thử nghiệm:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Cyberpunk Neon', light: 'Vibrant cyberpunk neon, volumetric rain reflections, teal and magenta rim' },
                    { label: 'Golden Hour Film', light: 'Warm golden hour sunlight, Kodak Portra 400 film grain, soft lens flare' },
                    { label: 'Chiaroscuro Noir', light: 'Extreme dramatic chiaroscuro, Rembrandt lighting, deep shadowy contrast' },
                    { label: 'Studio Softbox', light: 'Clean high-end fashion studio softbox lighting, even diffused illumination' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptB({ ...promptB, lighting: preset.light })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Slot Parameter Inputs */}
            <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex-1">
              {activeSlot === 'A' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider">
                      Cấu hình Slot A
                    </span>
                    <button
                      type="button"
                      onClick={() => onApplyPrompt(promptA)}
                      className="text-[10px] text-blue-300 hover:underline font-bold"
                    >
                      Dùng Prompt A cho Studio →
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Subject</label>
                    <textarea
                      rows={2}
                      value={promptA.subject}
                      onChange={(e) => setPromptA({ ...promptA, subject: e.target.value })}
                      className="w-full glass-input rounded-xl p-2 text-xs text-white border border-white/10 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Lighting</label>
                    <textarea
                      rows={2}
                      value={promptA.lighting}
                      onChange={(e) => setPromptA({ ...promptA, lighting: e.target.value })}
                      className="w-full glass-input rounded-xl p-2 text-xs text-white border border-white/10 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Camera & Lens</label>
                    <input
                      type="text"
                      value={promptA.camera_angle}
                      onChange={(e) => setPromptA({ ...promptA, camera_angle: e.target.value })}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white border border-white/10"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateA}
                    disabled={isGeneratingA}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {isGeneratingA ? 'Đang tạo Slot A...' : 'Render Riêng Slot A'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                      Cấu hình Slot B (Biến Thể)
                    </span>
                    <button
                      type="button"
                      onClick={() => onApplyPrompt(promptB)}
                      className="text-[10px] text-rose-300 hover:underline font-bold"
                    >
                      Dùng Prompt B cho Studio →
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Subject</label>
                    <textarea
                      rows={2}
                      value={promptB.subject}
                      onChange={(e) => setPromptB({ ...promptB, subject: e.target.value })}
                      className="w-full glass-input rounded-xl p-2 text-xs text-white border border-white/10 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Lighting</label>
                    <textarea
                      rows={2}
                      value={promptB.lighting}
                      onChange={(e) => setPromptB({ ...promptB, lighting: e.target.value })}
                      className="w-full glass-input rounded-xl p-2 text-xs text-white border border-white/10 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Camera & Lens</label>
                    <input
                      type="text"
                      value={promptB.camera_angle}
                      onChange={(e) => setPromptB({ ...promptB, camera_angle: e.target.value })}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white border border-white/10"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateB}
                    disabled={isGeneratingB}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {isGeneratingB ? 'Đang tạo Slot B...' : 'Render Riêng Slot B'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Visual Interactive Split Comparison */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Thanh Trượt So Sánh (Split Slider)
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  A: {100 - sliderPos}% | B: {sliderPos}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-blue-400 font-bold">◄ Slot A</span>
                <span className="text-white/30">|</span>
                <span className="text-rose-400 font-bold">Slot B ►</span>
              </div>
            </div>

            {/* Interactive Split Canvas Viewport */}
            <div
              ref={containerRef}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={handleMouseMove}
              className="relative w-full aspect-square rounded-3xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl select-none cursor-ew-resize group"
            >
              {/* Image A (Bottom layer or Left side) */}
              {imageA ? (
                <img
                  src={imageA}
                  alt="Variant A"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 text-xs">
                  <span>Slot A chưa có ảnh</span>
                  <span className="text-[10px] text-white/20 mt-1">Bấm "Render Cả 2 Biến Thể"</span>
                </div>
              )}

              {/* Image B (Top clipped layer) */}
              {imageB && (
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                >
                  <img
                    src={imageB}
                    alt="Variant B"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Drag Divider Line */}
              {(imageA || imageB) && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-black font-black text-xs flex items-center justify-center shadow-2xl border-2 border-slate-900">
                    ↔
                  </div>
                </div>
              )}

              {/* Badge Labels */}
              <div className="absolute top-4 left-4 pointer-events-none">
                <span className="px-3 py-1 rounded-xl bg-blue-600/80 backdrop-blur-md text-white font-black text-[10px] uppercase shadow-lg border border-blue-400/40">
                  A: Gốc
                </span>
              </div>
              <div className="absolute top-4 right-4 pointer-events-none">
                <span className="px-3 py-1 rounded-xl bg-rose-600/80 backdrop-blur-md text-white font-black text-[10px] uppercase shadow-lg border border-rose-400/40">
                  B: Biến Thể
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-white/40">
                * Kéo chuột qua lại trên ảnh để so sánh chi tiết ánh sáng và góc chụp giữa 2 bản.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { onApplyPrompt(promptA); onClose(); }}
                  disabled={!imageA}
                  className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-black uppercase transition-all disabled:opacity-30"
                >
                  Chọn Bản A ✓
                </button>
                <button
                  type="button"
                  onClick={() => { onApplyPrompt(promptB); onClose(); }}
                  disabled={!imageB}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-black uppercase transition-all disabled:opacity-30"
                >
                  Chọn Bản B ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
