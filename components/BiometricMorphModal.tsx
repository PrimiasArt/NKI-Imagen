import React, { useState, useRef } from 'react';
import {
  performBiometricMorph,
  BiometricMorphResult,
  FACIAL_EMOTIONS,
  FacialEmotionType
} from '../services/biometricMorphService';
import { fileToBase64 } from '../services/geminiService';
import { getCharacterPersonas } from '../services/consistencyService';
import { CharacterPersona } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface BiometricMorphModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string | null;
  onSaveToGallery?: (image: string, desc: string, meta: any) => void;
  onDownload?: (image: string, name?: string) => void;
  onOpenInUpscale?: (image: string) => void;
  onOpenInInpainting?: (image: string) => void;
  t?: (key: string, fallback?: string) => string;
}

export const BiometricMorphModal: React.FC<BiometricMorphModalProps> = ({
  isOpen,
  onClose,
  initialImage,
  onSaveToGallery,
  onDownload,
  onOpenInUpscale,
  onOpenInInpainting,
  t = (_k, f) => f || ''
}) => {
  if (!isOpen) return null;

  // Working States
  const [baseImage, setBaseImage] = useState<string | null>(initialImage || null);
  const [subjectName, setSubjectName] = useState<string>('Nhân vật mẫu');

  // Parameters
  const [targetAge, setTargetAge] = useState<number>(24);
  const [selectedEmotion, setSelectedEmotion] = useState<FacialEmotionType>('radiant_joy');
  const [emotionIntensity, setEmotionIntensity] = useState<number>(85);
  const [customGuidance, setCustomGuidance] = useState<string>('');
  const [modelEngine, setModelEngine] = useState<'gemini-3-pro-image' | 'gemini-3.1-flash-image'>('gemini-3-pro-image');

  // Execution States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [result, setResult] = useState<BiometricMorphResult | null>(null);

  // Split Comparison Slider states
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'split' | 'result' | 'original'>('split');
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  // Available Personas from Character Vault
  const availablePersonas = typeof window !== 'undefined' ? getCharacterPersonas() : [];

  const handleSelectPersona = (persona: CharacterPersona) => {
    const avatar = persona.avatarUrl || persona.images?.[0];
    if (avatar) {
      setBaseImage(avatar);
      setSubjectName(persona.name);
      setResult(null);
    }
  };

  const handleExecuteMorph = async () => {
    if (!baseImage) return;

    setIsProcessing(true);
    setProgressMsg('Đang quét ma trận nhân trắc học & khóa 100% cấu trúc sọ mặt...');

    const msgs = [
      'Phân tích cấu trúc xương gò má, sống mũi & màu mắt...',
      `Tái định hình mật độ biểu mô theo độ tuổi mục tiêu (${targetAge} tuổi)...`,
      'Mô phỏng chuyển động cơ mặt & vi biểu cảm cảm xúc...',
      'Đồng bộ ánh sáng, màu da & khóa 100% diện mạo khuôn mặt...',
      'Hoàn tất chuyển đổi Biometric Morph!'
    ];

    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setProgressMsg(msgs[idx]);
    }, 1800);

    try {
      const res = await performBiometricMorph({
        baseImageBase64: baseImage,
        characterName: subjectName,
        targetAge,
        emotion: selectedEmotion,
        emotionIntensity,
        modelEngine,
        customGuidance
      });

      clearInterval(interval);
      setResult(res);
      setViewMode('split');
    } catch (err: any) {
      clearInterval(interval);
      alert(err?.message || 'Lỗi khi biến đổi độ tuổi/cảm xúc');
    } finally {
      setIsProcessing(false);
    }
  };

  // Split slider handlers
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

  const activeEmotionMeta = FACIAL_EMOTIONS.find(e => e.id === selectedEmotion) || FACIAL_EMOTIONS[0];

  const getAgeDescription = (age: number) => {
    if (age <= 22) return 'Thanh xuân rực rỡ, da mịn màng không nếp nhăn';
    if (age <= 34) return 'Trưởng thành quyến rũ, sắc sảo và tự tin';
    if (age <= 49) return 'Trung niên thanh lịch, nếp cười đuôi mắt tự nhiên';
    return 'Lão hóa quý phái, tóc điểm bạc, nếp nhăn trí tuệ';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="glass-card bg-slate-950/95 border border-white/15 rounded-[2rem] w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-none bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <span className="text-xl">⏳</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Biometric Morph Studio
                </h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Aging & Emotion Sliders
                </span>
              </div>
              <p className="text-xs text-white/50 hidden sm:block">
                Thanh trượt độ tuổi 18-70 & cảm xúc vi mô khuôn mặt với 100% khóa nhân trắc học nguyên bản
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
          {/* Left Column: Sliders & Controls */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* 1. Character Source Selection */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Chân Dung Gốc (Portrait)</span>
                </label>
                {availablePersonas.length > 0 && (
                  <span className="text-[10px] text-amber-300">
                    {availablePersonas.length} người mẫu trong Kho
                  </span>
                )}
              </div>

              {/* Character Vault Personas */}
              {availablePersonas.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                  {availablePersonas.map((p) => {
                    const avatar = p.avatarUrl || p.images?.[0];
                    const isSelected = baseImage === avatar;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPersona(p)}
                        className={`flex-none w-12 h-12 rounded-xl overflow-hidden border-2 transition-all relative ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-500/40 scale-95 shadow-lg'
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

              {/* Upload or Preview */}
              {baseImage ? (
                <div className="relative aspect-[3/4] max-h-48 rounded-xl overflow-hidden border border-white/15 mx-auto group">
                  <img src={baseImage} className="w-full h-full object-cover" alt="Subject" />
                  <button
                    type="button"
                    onClick={() => { setBaseImage(null); setResult(null); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-red-400 hover:bg-black/90 transition-all border border-white/10"
                    title="Đổi chân dung khác"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/15 hover:border-amber-400/50 bg-white/5 hover:bg-amber-500/5 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <span className="text-xl mb-1">📸</span>
                  <span className="text-xs font-bold text-white">Tải chân dung rõ mặt lên</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Hỗ trợ PNG, JPG mọi góc chụp</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const b64 = await fileToBase64(f);
                        setBaseImage(`data:${f.type};base64,${b64}`);
                        setSubjectName(f.name.replace(/\.[^/.]+$/, ''));
                        setResult(null);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* 2. Age Progression Slider */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎂</span>
                  <span>Độ Tuổi Mục Tiêu (Age)</span>
                </label>
                <span className="text-sm font-black font-mono text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-xl border border-amber-500/30">
                  {targetAge} tuổi
                </span>
              </div>

              <input
                type="range"
                min={18}
                max={70}
                value={targetAge}
                onChange={(e) => setTargetAge(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />

              <div className="flex justify-between text-[10px] font-mono text-white/40 px-0.5">
                <span>18 (Thanh xuân)</span>
                <span>30 (Trưởng thành)</span>
                <span>45 (Trung niên)</span>
                <span>70 (Lão niên)</span>
              </div>

              <p className="text-[11px] text-amber-200/80 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 mt-1">
                💡 {getAgeDescription(targetAge)}
              </p>
            </div>

            {/* 3. Emotion Selector & Intensity */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>🎭</span>
                <span>Cảm Xúc Khuôn Mặt (Emotion)</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {FACIAL_EMOTIONS.map((em) => {
                  const isSelected = selectedEmotion === em.id;
                  return (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => setSelectedEmotion(em.id)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'bg-rose-600/30 border-rose-400 text-white font-bold ring-2 ring-rose-500/30 shadow-md'
                          : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60'
                      }`}
                      title={em.description}
                    >
                      <span className="text-base">{em.icon}</span>
                      <span className="text-[10px] truncate max-w-full leading-tight">{em.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Intensity Slider */}
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    Cường Độ Biểu Cảm
                  </span>
                  <span className="font-mono font-bold text-rose-300">{emotionIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={emotionIntensity}
                  onChange={(e) => setEmotionIntensity(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                  Chỉ đạo tạo hình bổ sung (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={customGuidance}
                  onChange={(e) => setCustomGuidance(e.target.value)}
                  placeholder="e.g. ánh mắt lấp lánh con ngươi trong veo..."
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Execute Button */}
            <button
              type="button"
              onClick={handleExecuteMorph}
              disabled={isProcessing || !baseImage}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✨</span>
              <span>Biến Đổi Độ Tuổi & Cảm Xúc (Morph Reality)</span>
            </button>
          </div>

          {/* Right Column: Interactive Comparison Canvas */}
          <div className="lg:col-span-7 glass-card p-5 rounded-[2rem] flex flex-col items-center justify-center relative min-h-[500px] border border-white/10 shadow-2xl">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <LoadingSpinner message={progressMsg} />
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center max-w-sm">
                  <span>🔒 Khóa 100% tỷ lệ sọ mặt, màu mắt & hình dạng mũi/môi</span>
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
                        viewMode === 'split' ? 'bg-amber-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Kéo So Sánh
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('result')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        viewMode === 'result' ? 'bg-amber-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Sau Morph ({result.targetAge}T)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('original')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        viewMode === 'original' ? 'bg-amber-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Ảnh Gốc
                    </button>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ⚡ {result.modelUsed} ({Math.round(result.durationMs / 1000)}s)
                  </span>
                </div>

                {/* Display Canvas with Draggable Split Slider */}
                <div
                  ref={splitContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative flex-1 min-h-[420px] rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl select-none flex items-center justify-center cursor-ew-resize"
                >
                  {viewMode === 'result' ? (
                    <img src={result.resultImage} className="max-h-[500px] w-auto object-contain mx-auto rounded-xl" alt="Result" />
                  ) : viewMode === 'original' && baseImage ? (
                    <img src={baseImage} className="max-h-[500px] w-auto object-contain mx-auto rounded-xl" alt="Original" />
                  ) : (
                    <>
                      {/* Original Base Image */}
                      {baseImage && (
                        <img
                          src={baseImage}
                          className="absolute inset-0 w-full h-full object-contain mx-auto pointer-events-none"
                          alt="Original Portrait"
                        />
                      )}

                      {/* Result Clipped */}
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
                          alt="Morphed Portrait"
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
                      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-black text-amber-300 border border-amber-500/30 pointer-events-none">
                        {result.targetAge}T • {result.emotionLabel}
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
                          `Biometric Morph (${result.targetAge}T, ${result.emotionLabel})`,
                          {
                            model: result.modelUsed,
                            targetAge: result.targetAge,
                            emotion: selectedEmotion,
                            emotionIntensity: result.emotionIntensity,
                            subjectName
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
                    onClick={() => onDownload && onDownload(result.resultImage, `Morph_${result.targetAge}yo_${result.emotionLabel}`)}
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
                  <span className="text-3xl">⏳</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Studio Biến Đổi Sẵn Sàng</h4>
                  <p className="text-xs text-white/50 max-w-sm mt-1">
                    Chọn chân dung ở cột bên trái, tùy chỉnh thanh trượt độ tuổi và cảm xúc để bắt đầu tái tạo diện mạo.
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
