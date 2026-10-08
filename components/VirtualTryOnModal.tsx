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
            <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5 text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3c0 .7.3 1.4.7 1.9L2 14v2h20v-2l-7.7-7.1A3 3 0 0 0 12 2z" />
                <path d="M2 18h20" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Virtual Try-On 2.0 Studio
                </h2>
                <span className="bg-white/[0.06] text-zinc-300 border border-white/10 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full">
                  Neural Fitting
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Thử đồ từ ảnh Flat-lay / Sản phẩm lên Người Mẫu với mô phỏng nếp gấp vải & khóa 100% diện mạo khuôn mặt
              </p>
            </div>
          </div>

          <button
            type="button"
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

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 custom-scrollbar">
          {/* Left Column: Source Selection & Parameters */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* 1. Model Source Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>1. Người Mẫu (Model)</span>
                </label>
                {availablePersonas.length > 0 && (
                  <span className="text-[10px] text-zinc-400">
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
                            ? 'border-white ring-2 ring-white/30 scale-95 shadow-lg'
                            : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                        }`}
                        title={p.name}
                      >
                        {avatar ? (
                          <img src={avatar} className="w-full h-full object-cover" alt={p.name} />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs text-zinc-400">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
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
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-all border border-white/10"
                    title="Đổi người mẫu khác"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/15 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-1.5 text-zinc-300">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-white">Tải ảnh người mẫu lên</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Toàn thân hoặc nửa thân trên</span>
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
              <label className="text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3c0 .7.3 1.4.7 1.9L2 14v2h20v-2l-7.7-7.1A3 3 0 0 0 12 2z" />
                    <path d="M2 18h20" />
                  </svg>
                  <span>2. Trang Phục Cần Thử (Garment)</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Flat-lay / Product</span>
              </label>

              {/* Quick Presets */}
              <div className="grid grid-cols-3 gap-1.5">
                {VIRTUAL_TRYON_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 text-left transition-all group flex flex-col items-center text-center"
                    title={p.description}
                  >
                    <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 mb-1">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M12 2a3 3 0 0 0-3 3c0 .7.3 1.4.7 1.9L2 14v2h20v-2l-7.7-7.1A3 3 0 0 0 12 2z" />
                        <path d="M2 18h20" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-300 group-hover:text-white truncate w-full">
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
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-all border border-white/10"
                    title="Đổi trang phục"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/15 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-1 text-zinc-300">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-white">Tải ảnh sản phẩm trang phục</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Ảnh trải sàn, ma-nơ-canh hoặc sản phẩm</span>
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
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                        category === c.id
                          ? 'bg-white text-black font-semibold shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
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
              className="w-full py-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <span>Bắt Đầu Thử Trang Phục (Virtual Try-On)</span>
            </button>
          </div>

          {/* Right Column: Interactive Canvas & Comparison */}
          <div className="lg:col-span-7 glass-card p-5 rounded-[2rem] flex flex-col items-center justify-center relative min-h-[500px] border border-white/10 shadow-2xl">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <LoadingSpinner message={progressMsg} />
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 text-xs text-center max-w-sm flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Khóa 100% diện mạo khuôn mặt & vóc dáng người mẫu</span>
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
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'split' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Kéo So Sánh
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('result')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'result' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Sau Khi Thử
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('original')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'original' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Ảnh Gốc
                    </button>
                  </div>

                  <span className="text-[10px] text-zinc-300 font-medium bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                    <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>{result.modelUsed} ({Math.round(result.durationMs / 1000)}s)</span>
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
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] pointer-events-none flex items-center justify-center"
                        style={{ left: `${splitPos}%` }}
                      >
                        <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shadow-lg border border-black/20">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="8 7 3 12 8 17" />
                            <polyline points="16 7 21 12 16 17" />
                          </svg>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-semibold text-zinc-200 border border-white/10 pointer-events-none">
                        Mới Thử Đồ
                      </div>
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-semibold text-zinc-400 border border-white/10 pointer-events-none">
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
                    className="py-2.5 px-3 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-white/10"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>Lưu Thư Viện</span>
                  </button>

                  {onOpenInUpscale && (
                    <button
                      type="button"
                      onClick={() => onOpenInUpscale(result.resultImage)}
                      className="py-2.5 px-3 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-white/10"
                    >
                      <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                      <span>Upscale 5.5K</span>
                    </button>
                  )}

                  {onOpenInInpainting && (
                    <button
                      type="button"
                      onClick={() => onOpenInInpainting(result.resultImage)}
                      className="py-2.5 px-3 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-white/10"
                    >
                      <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19l7-7 3 3-7 7-3-3z" />
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        <path d="M2 2l7.586 7.586" />
                        <circle cx="11" cy="11" r="2" />
                      </svg>
                      <span>Cọ Sửa AI</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDownload && onDownload(result.resultImage, `Virtual_TryOn_${garmentName}`)}
                    className="py-2.5 px-3 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Tải Về</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-3 opacity-60 select-none py-16">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3c0 .7.3 1.4.7 1.9L2 14v2h20v-2l-7.7-7.1A3 3 0 0 0 12 2z" />
                    <path d="M2 18h20" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Phòng Thử Đồ AI Sẵn Sàng</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mt-1">
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
