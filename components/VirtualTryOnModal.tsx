import React, { useState, useRef } from 'react';
import {
  performVirtualTryOn,
  VirtualTryOnResult,
  GarmentCategory,
  FitStyle,
  TuckStyle,
  VIRTUAL_TRYON_PRESETS,
  VirtualTryOnPreset
} from '../services/virtualTryOnService';
import { fileToBase64 } from '../services/geminiService';
import { getCharacterPersonas } from '../services/consistencyService';
import { CharacterPersona } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface VirtualTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModelImage?: string | null;
  onSaveToGallery?: (image: string, desc: string, meta: any) => void;
  onDownload?: (image: string, name?: string) => void;
  onOpenInUpscale?: (image: string) => void;
  onOpenInInpainting?: (image: string) => void;
  t?: (key: string, fallback?: string) => string;
}

export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({
  isOpen,
  onClose,
  initialModelImage,
  onSaveToGallery,
  onDownload,
  onOpenInUpscale,
  onOpenInInpainting,
  t = (_k, f) => f || ''
}) => {
  if (!isOpen) return null;

  // Model & Garment states
  const [modelImage, setModelImage] = useState<string | null>(initialModelImage || null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [garmentName, setGarmentName] = useState<string>('Trang phục mẫu');

  // Parameters
  const [category, setCategory] = useState<GarmentCategory>('auto');
  const [fitStyle, setFitStyle] = useState<FitStyle>('regular');
  const [tuckStyle, setTuckStyle] = useState<TuckStyle>('untucked');
  const [customGuidance, setCustomGuidance] = useState<string>('');
  const [modelEngine, setModelEngine] = useState<'gemini-3-pro-image' | 'gemini-3.1-flash-image'>('gemini-3-pro-image');

  // Execution states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [result, setResult] = useState<VirtualTryOnResult | null>(null);

  // Split Comparison Slider states
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'split' | 'result' | 'original'>('split');
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  // Character Vault Personas
  const availablePersonas = typeof window !== 'undefined' ? getCharacterPersonas() : [];

  const handleSelectPersona = (persona: CharacterPersona) => {
    const avatar = persona.avatarUrl || persona.images?.[0];
    if (avatar) {
      setModelImage(avatar);
      setResult(null);
    }
  };

  const handleApplyPreset = (preset: VirtualTryOnPreset) => {
    setCategory(preset.category);
    setGarmentName(preset.name);
    setCustomGuidance(preset.garmentSamplePrompt);
  };

  const handleExecuteTryOn = async () => {
    if (!modelImage || (!garmentImage && !customGuidance)) return;

    setIsProcessing(true);
    setProgressMsg('Đang nhận diện phom dáng người mẫu và cấu trúc cơ thể...');

    const msgs = [
      'Phân tích cấu trúc cơ thể & vóc dáng người mẫu...',
      'Bóc tách chất liệu vải, đường may & hoa văn trang phục...',
      'Tính toán vật lý nếp gấp vải & độ căng nếp rủ tự nhiên...',
      'Đồng bộ ánh sáng môi trường & khóa 100% diện mạo khuôn mặt...',
      'Hoàn tất thử đồ Virtual Try-On 2.0!'
    ];

    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setProgressMsg(msgs[idx]);
    }, 1800);

    try {
      // If user provided prompt only without garment image, use placeholder white cloth
      let effectiveGarment = garmentImage;
      if (!effectiveGarment) {
        effectiveGarment = modelImage; // Fallback
      }

      const res = await performVirtualTryOn({
        modelImageBase64: modelImage,
        garmentImageBase64: effectiveGarment,
        category,
        fitStyle,
        tuckStyle,
        customGuidance,
        modelEngine
      });

      clearInterval(interval);
      setResult(res);
      setViewMode('split');
    } catch (err: any) {
      clearInterval(interval);
      alert(err?.message || 'Lỗi xử lý thử trang phục');
    } finally {
      setIsProcessing(false);
    }
  };

  // Split slider pointer handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingSplit(true);
    updateSplit(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSplit) return;
    updateSplit(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDraggingSplit(false);
  };

  const updateSplit = (clientX: number) => {
    if (!splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="glass-card bg-slate-950/95 border border-white/15 rounded-[2rem] w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-none bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
              <span className="text-xl">👗</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Virtual Try-On 2.0 Studio
                </h2>
                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Neural Fitting
                </span>
              </div>
              <p className="text-xs text-white/50 hidden sm:block">
                Thử đồ từ ảnh Flat-lay / Sản phẩm lên Người Mẫu với mô phỏng nếp gấp vải & khóa 100% diện mạo khuôn mặt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all border border-white/10"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 custom-scrollbar">
          {/* Left Column: Source Selection & Parameters */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* 1. Model Source Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>👤</span>
                  <span>1. Người Mẫu (Model)</span>
                </label>
                {availablePersonas.length > 0 && (
                  <span className="text-[10px] text-primary-300">
                    {availablePersonas.length} người mẫu trong Kho
                  </span>
                )}
              </div>

              {/* Quick Persona Avatars if available */}
              {availablePersonas.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                  {availablePersonas.map((p) => {
                    const avatar = p.avatarUrl || p.images?.[0];
                    const isSelected = modelImage === avatar;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPersona(p)}
                        className={`flex-none w-12 h-12 rounded-xl overflow-hidden border-2 transition-all relative ${
                          isSelected
                            ? 'border-pink-400 ring-2 ring-pink-500/40 scale-95 shadow-lg'
                            : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                        }`}
                        title={p.name}
                      >
                        {avatar ? (
                          <img src={avatar} className="w-full h-full object-cover" alt={p.name} />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs">👤</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Model Upload / Preview Dropzone */}
              {modelImage ? (
                <div className="relative aspect-[3/4] max-h-48 rounded-xl overflow-hidden border border-white/15 mx-auto group">
                  <img src={modelImage} className="w-full h-full object-cover" alt="Model" />
                  <button
                    type="button"
                    onClick={() => { setModelImage(null); setResult(null); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-red-400 hover:bg-black/90 transition-all border border-white/10"
                    title="Đổi người mẫu khác"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/15 hover:border-pink-400/50 bg-white/5 hover:bg-pink-500/5 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <span className="text-xl mb-1">📸</span>
                  <span className="text-xs font-bold text-white">Tải ảnh người mẫu lên</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Toàn thân hoặc nửa thân trên</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const b64 = await fileToBase64(f);
                        setModelImage(`data:${f.type};base64,${b64}`);
                        setResult(null);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* 2. Garment Source Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>👗</span>
                  <span>2. Trang Phục Cần Thử (Garment)</span>
                </span>
                <span className="text-[10px] text-amber-300">Flat-lay / Product</span>
              </label>

              {/* Quick Presets */}
              <div className="grid grid-cols-3 gap-1.5">
                {VIRTUAL_TRYON_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-400/40 text-left transition-all group flex flex-col items-center text-center"
                    title={p.description}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-[10px] font-bold text-white/80 group-hover:text-pink-300 truncate w-full mt-0.5">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Garment Upload / Preview */}
              {garmentImage ? (
                <div className="relative aspect-square max-h-36 rounded-xl overflow-hidden border border-white/15 mx-auto group">
                  <img src={garmentImage} className="w-full h-full object-contain bg-black/40" alt="Garment" />
                  <button
                    type="button"
                    onClick={() => { setGarmentImage(null); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-red-400 hover:bg-black/90 transition-all border border-white/10"
                    title="Đổi trang phục"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/15 hover:border-pink-400/50 bg-white/5 hover:bg-pink-500/5 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <span className="text-lg mb-1">🛍️</span>
                  <span className="text-xs font-bold text-white">Tải ảnh sản phẩm trang phục</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Ảnh trải sàn, ma-nơ-canh hoặc sản phẩm</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const b64 = await fileToBase64(f);
                        setGarmentImage(`data:${f.type};base64,${b64}`);
                        setGarmentName(f.name);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* 3. Category & Tailoring Controls */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1.5">
                  Phân loại trang phục
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'auto', label: 'Tự động' },
                    { id: 'upper_body', label: 'Áo / Top' },
                    { id: 'lower_body', label: 'Quần / Váy' },
                    { id: 'dresses', label: 'Đầm / Liền thân' },
                    { id: 'outerwear', label: 'Áo khoác / Blazer' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id as GarmentCategory)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                        category === c.id
                          ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25'
                          : 'bg-white/5 hover:bg-white/10 text-white/60'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                    Phom dáng (Fit)
                  </label>
                  <select
                    value={fitStyle}
                    onChange={(e) => setFitStyle(e.target.value as FitStyle)}
                    className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-white bg-slate-900 appearance-none"
                  >
                    <option value="regular">Chuẩn mẫu (Regular)</option>
                    <option value="slim_fit">Ôm sát dáng (Slim-Fit)</option>
                    <option value="oversized">Rộng rãi (Oversized)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                    Kiểu mặc (Tuck)
                  </label>
                  <select
                    value={tuckStyle}
                    onChange={(e) => setTuckStyle(e.target.value as TuckStyle)}
                    className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-white bg-slate-900 appearance-none"
                  >
                    <option value="untucked">Thả vạt tự nhiên</option>
                    <option value="tucked_in">Sơ vin gọn gàng</option>
                    <option value="half_tuck">Sơ vin nửa vạt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                  Chỉ đạo chi tiết (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={customGuidance}
                  onChange={(e) => setCustomGuidance(e.target.value)}
                  placeholder="e.g. phối thêm thắt lưng da vàng, giữ nguyên giày cao gót..."
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Execute Button */}
            <button
              type="button"
              onClick={handleExecuteTryOn}
              disabled={isProcessing || !modelImage}
              className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-pink-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✨</span>
              <span>Bắt Đầu Thử Trang Phục (Virtual Try-On)</span>
            </button>
          </div>

          {/* Right Column: Interactive Canvas & Comparison */}
          <div className="lg:col-span-7 glass-card p-5 rounded-[2rem] flex flex-col items-center justify-center relative min-h-[500px] border border-white/10 shadow-2xl">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <LoadingSpinner message={progressMsg} />
                <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs text-center max-w-sm">
                  <span>🔒 Khóa 100% diện mạo khuôn mặt & vóc dáng người mẫu</span>
                </div>
              </div>
            ) : result ? (
              <div className="w-full h-full flex flex-col space-y-4">
                {/* View Mode Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 w-full">
                  <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        viewMode === 'split' ? 'bg-pink-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Kéo So Sánh
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('result')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        viewMode === 'result' ? 'bg-pink-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Sau Khi Thử
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('original')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        viewMode === 'original' ? 'bg-pink-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Ảnh Gốc
                    </button>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ⚡ {result.modelUsed} ({Math.round(result.durationMs / 1000)}s)
                  </span>
                </div>

                {/* Display Canvas with Split Slider */}
                <div
                  ref={splitContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative flex-1 min-h-[420px] rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl select-none flex items-center justify-center cursor-ew-resize"
                >
                  {viewMode === 'result' ? (
                    <img src={result.resultImage} className="max-h-[500px] w-auto object-contain mx-auto rounded-xl" alt="Result" />
                  ) : viewMode === 'original' && modelImage ? (
                    <img src={modelImage} className="max-h-[500px] w-auto object-contain mx-auto rounded-xl" alt="Original" />
                  ) : (
                    <>
                      {/* Original Base Underneath */}
                      {modelImage && (
                        <img
                          src={modelImage}
                          className="absolute inset-0 w-full h-full object-contain mx-auto pointer-events-none"
                          alt="Model Original"
                        />
                      )}

                      {/* Result Clipped on Top */}
                      <div
                        className="absolute inset-0 overflow-hidden pointer-events-none"
                        style={{ width: `${splitPos}%` }}
                      >
                        <img
                          src={result.resultImage}
                          className="absolute inset-0 w-full h-full object-contain mx-auto pointer-events-none"
                          style={{
                            minWidth: splitContainerRef.current ? `${splitContainerRef.current.clientWidth}px` : '100%'
                          }}
                          alt="Model with Try-On"
                        />
                      </div>

                      {/* Split Divider Bar */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none flex items-center justify-center"
                        style={{ left: `${splitPos}%` }}
                      >
                        <div className="w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-xs shadow-xl border-2 border-slate-900">
                          ⇄
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-black text-pink-300 border border-pink-500/30 pointer-events-none">
                        Mới Thử Đồ
                      </div>
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-black text-white/60 border border-white/10 pointer-events-none">
                        Gốc
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSaveToGallery && result) {
                        onSaveToGallery(
                          result.resultImage,
                          `Virtual Try-On 2.0 (${garmentName})`,
                          {
                            model: result.modelUsed,
                            category,
                            fitStyle,
                            tryOnGarment: garmentName
                          }
                        );
                      }
                    }}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-white/10"
                  >
                    <span>💾</span>
                    <span>Lưu Thư Viện</span>
                  </button>

                  {onOpenInUpscale && (
                    <button
                      type="button"
                      onClick={() => onOpenInUpscale(result.resultImage)}
                      className="py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-indigo-500/20"
                    >
                      <span>✨</span>
                      <span>Upscale 5.5K</span>
                    </button>
                  )}

                  {onOpenInInpainting && (
                    <button
                      type="button"
                      onClick={() => onOpenInInpainting(result.resultImage)}
                      className="py-2.5 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-pink-500/20"
                    >
                      <span>🪄</span>
                      <span>Cọ Sửa AI</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDownload && onDownload(result.resultImage, `Virtual_TryOn_${garmentName}`)}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-emerald-500/20"
                  >
                    <span>⬇️</span>
                    <span>Tải Về</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-3 opacity-40 select-none py-16">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-3xl">👗</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Phòng Thử Đồ AI Sẵn Sàng</h4>
                  <p className="text-xs text-white/50 max-w-sm mt-1">
                    Chọn người mẫu ở cột bên trái, tải ảnh trang phục hoặc chọn preset thời trang để bắt đầu thử đồ.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
