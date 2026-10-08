import React, { useState } from 'react';
import {
  performCharacterTurnaround,
  TurnaroundResult,
  TURNAROUND_ANGLES,
  TurnaroundAngle,
  TurnaroundRenderMode
} from '../services/characterTurnaroundService';
import { fileToBase64 } from '../services/geminiService';
import { getCharacterPersonas } from '../services/consistencyService';
import { CharacterPersona } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface CharacterTurnaroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCharacterImage?: string | null;
  onSaveToGallery?: (image: string, desc: string, meta: any) => void;
  onDownload?: (image: string, name?: string) => void;
  onOpenInUpscale?: (image: string) => void;
  onOpenInInpainting?: (image: string) => void;
  t?: (key: string, fallback?: string) => string;
}

export const CharacterTurnaroundModal: React.FC<CharacterTurnaroundModalProps> = ({
  isOpen,
  onClose,
  initialCharacterImage,
  onSaveToGallery,
  onDownload,
  onOpenInUpscale,
  onOpenInInpainting,
  t = (_k, f) => f || ''
}) => {
  if (!isOpen) return null;

  // Character State
  const [characterImage, setCharacterImage] = useState<string | null>(initialCharacterImage || null);
  const [characterName, setCharacterName] = useState<string>('Nhân vật mẫu');

  // Parameters
  const [renderMode, setRenderMode] = useState<TurnaroundRenderMode>('composite_sheet');
  const [selectedAngleId, setSelectedAngleId] = useState<string>('front');
  const [backgroundStyle, setBackgroundStyle] = useState<'neutral_studio' | 'white_cyclorama' | 'original'>('neutral_studio');
  const [customGuidance, setCustomGuidance] = useState<string>('');
  const [modelEngine, setModelEngine] = useState<'gemini-3-pro-image' | 'gemini-3.1-flash-image'>('gemini-3-pro-image');

  // Execution States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [result, setResult] = useState<TurnaroundResult | null>(null);

  // Available Personas from Character Vault
  const availablePersonas = typeof window !== 'undefined' ? getCharacterPersonas() : [];

  const handleSelectPersona = (persona: CharacterPersona) => {
    const avatar = persona.avatarUrl || persona.images?.[0];
    if (avatar) {
      setCharacterImage(avatar);
      setCharacterName(persona.name);
      setResult(null);
    }
  };

  const handleExecuteTurnaround = async () => {
    if (!characterImage) return;

    setIsProcessing(true);
    setProgressMsg('Đang trích xuất ma trận nhận diện khuôn mặt & trang phục nhân vật...');

    const msgs = [
      'Phân tích tọa độ nhân trắc học & cấu trúc 3D nhân vật...',
      'Tính toán góc quay phối cảnh 360° & độ sâu trường ảnh...',
      'Đồng bộ hóa trang phục, màu sắc & nếp gấp vải qua các góc...',
      'Khóa 100% diện mạo khuôn mặt theo chuẩn Game / VFX...',
      'Hoàn tất tổng hợp bản vẽ Turnaround 360°!'
    ];

    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setProgressMsg(msgs[idx]);
    }, 2000);

    try {
      const res = await performCharacterTurnaround({
        characterImageBase64: characterImage,
        characterName,
        renderMode,
        targetAngleId: selectedAngleId,
        backgroundStyle,
        modelEngine,
        customGuidance
      });

      clearInterval(interval);
      setResult(res);
    } catch (err: any) {
      clearInterval(interval);
      alert(err?.message || 'Lỗi khi tạo bộ xoay nhân vật');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentAngleObj = TURNAROUND_ANGLES.find(a => a.id === selectedAngleId) || TURNAROUND_ANGLES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="glass-card bg-slate-950/95 border border-white/15 rounded-[2rem] w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-none bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-xl">🔄</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Character Sheet 360° Studio
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Turnaround Matrix
                </span>
              </div>
              <p className="text-xs text-white/50 hidden sm:block">
                Xuất bộ xoay 8 hướng chuẩn studio Game & VFX từ một nhân vật duy nhất với 100% đồng bộ nhân trắc học & trang phục
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
          {/* Left Column: Character Source & Controls */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* 1. Character Source Selection */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Nhân Vật Gốc (Character)</span>
                </label>
                {availablePersonas.length > 0 && (
                  <span className="text-[10px] text-primary-300">
                    {availablePersonas.length} nhân vật trong Kho
                  </span>
                )}
              </div>

              {/* Character Vault Personas */}
              {availablePersonas.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                  {availablePersonas.map((p) => {
                    const avatar = p.avatarUrl || p.images?.[0];
                    const isSelected = characterImage === avatar;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPersona(p)}
                        className={`flex-none w-12 h-12 rounded-xl overflow-hidden border-2 transition-all relative ${
                          isSelected
                            ? 'border-indigo-400 ring-2 ring-indigo-500/40 scale-95 shadow-lg'
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

              {/* Character Upload / Preview */}
              {characterImage ? (
                <div className="relative aspect-[3/4] max-h-48 rounded-xl overflow-hidden border border-white/15 mx-auto group">
                  <img src={characterImage} className="w-full h-full object-cover" alt="Character" />
                  <button
                    type="button"
                    onClick={() => { setCharacterImage(null); setResult(null); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-red-400 hover:bg-black/90 transition-all border border-white/10"
                    title="Đổi nhân vật khác"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/15 hover:border-indigo-400/50 bg-white/5 hover:bg-indigo-500/5 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <span className="text-xl mb-1">📸</span>
                  <span className="text-xs font-bold text-white">Tải ảnh nhân vật lên</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Ảnh rõ mặt và trang phục toàn thân/nửa thân</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const b64 = await fileToBase64(f);
                        setCharacterImage(`data:${f.type};base64,${b64}`);
                        setCharacterName(f.name.replace(/\.[^/.]+$/, ''));
                        setResult(null);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* 2. Render Mode Selector */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                Chế độ xuất bản vẽ (Render Mode)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRenderMode('composite_sheet')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    renderMode === 'composite_sheet'
                      ? 'bg-gradient-to-b from-indigo-600/30 to-purple-600/30 border-indigo-400 text-white ring-2 ring-indigo-500/30 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60'
                  }`}
                >
                  <span className="text-base mb-1">📐</span>
                  <span className="text-xs font-bold">Bản Vẽ 8 Hướng</span>
                  <span className="text-[9px] text-white/40 mt-0.5">1 ảnh toàn cảnh panorama 16:9 gồm 8 góc xoay thẳng hàng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRenderMode('single_angle')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    renderMode === 'single_angle'
                      ? 'bg-gradient-to-b from-indigo-600/30 to-purple-600/30 border-indigo-400 text-white ring-2 ring-indigo-500/30 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60'
                  }`}
                >
                  <span className="text-base mb-1">🎯</span>
                  <span className="text-xs font-bold">Góc Xoay Đơn</span>
                  <span className="text-[9px] text-white/40 mt-0.5">Xuất 1 góc xoay cụ thể với độ sắc nét tối đa</span>
                </button>
              </div>

              {/* 8-Direction Compass Selector (When single_angle is selected) */}
              {renderMode === 'single_angle' && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                    Chọn góc xoay camera
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TURNAROUND_ANGLES.map((ang) => (
                      <button
                        key={ang.id}
                        type="button"
                        onClick={() => setSelectedAngleId(ang.id)}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                          selectedAngleId === ang.id
                            ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/40 shadow-md font-bold'
                            : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60'
                        }`}
                        title={ang.description}
                      >
                        <span className="text-xs">{ang.icon}</span>
                        <span className="text-[9px] font-mono leading-none">{ang.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-indigo-300/80 italic mt-1">
                    {currentAngleObj.label}: {currentAngleObj.description}
                  </p>
                </div>
              )}
            </div>

            {/* 3. Studio Background Style */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                Phông nền Studio (Backdrop)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'neutral_studio', label: 'Xám Studio', desc: 'Xám trung tính' },
                  { id: 'white_cyclorama', label: 'Trắng Vô Cực', desc: 'Cyclorama' },
                  { id: 'original', label: 'Bối cảnh gốc', desc: 'Môi trường cũ' }
                ].map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setBackgroundStyle(bg.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      backgroundStyle === bg.id
                        ? 'bg-indigo-600/40 border-indigo-400 text-white font-bold ring-1 ring-indigo-400/30'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <span className="text-xs block">{bg.label}</span>
                    <span className="text-[9px] text-white/40 block mt-0.5">{bg.desc}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                  Chỉ đạo tạo hình bổ sung (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={customGuidance}
                  onChange={(e) => setCustomGuidance(e.target.value)}
                  placeholder="e.g. tư thế đứng nghiêm chuẩn VFX, trang phục đầy đủ vũ khí..."
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Execute Button */}
            <button
              type="button"
              onClick={handleExecuteTurnaround}
              disabled={isProcessing || !characterImage}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              <span>
                {renderMode === 'composite_sheet' ? 'Tạo Bảng Xoay 8 Hướng Toàn Cảnh' : `Xuất Góc Xoay ${currentAngleObj.shortLabel}`}
              </span>
            </button>
          </div>

          {/* Right Column: Interactive Turnaround Canvas */}
          <div className="lg:col-span-7 glass-card p-5 rounded-[2rem] flex flex-col items-center justify-center relative min-h-[500px] border border-white/10 shadow-2xl">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <LoadingSpinner message={progressMsg} />
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs text-center max-w-sm">
                  <span>🔒 Khóa 100% diện mạo khuôn mặt & trang phục từ mọi góc xoay</span>
                </div>
              </div>
            ) : result ? (
              <div className="w-full h-full flex flex-col space-y-4">
                {/* Result Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✨</span>
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      {result.renderMode === 'composite_sheet' ? 'Bản Vẽ Turnaround 8 Góc Hoàn Chỉnh' : `Góc Xoay ${currentAngleObj.label}`}
                    </span>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    ⚡ {result.modelUsed} ({Math.round(result.durationMs / 1000)}s)
                  </span>
                </div>

                {/* Display Canvas */}
                <div className="relative flex-1 min-h-[420px] rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl flex items-center justify-center p-2">
                  <img
                    src={result.resultImage}
                    className="max-h-[520px] w-auto max-w-full object-contain rounded-xl shadow-2xl mx-auto"
                    alt="Turnaround Result"
                  />
                </div>

                {/* Bottom Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSaveToGallery && result) {
                        onSaveToGallery(
                          result.resultImage,
                          `Character 360 Turnaround (${characterName})`,
                          {
                            model: result.modelUsed,
                            renderMode: result.renderMode,
                            angleId: result.angleId,
                            characterName
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
                    onClick={() => onDownload && onDownload(result.resultImage, `Turnaround_360_${characterName}`)}
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
                  <span className="text-3xl">🔄</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Studio 360° Sẵn Sàng</h4>
                  <p className="text-xs text-white/50 max-w-sm mt-1">
                    Chọn nhân vật ở cột bên trái và bấm tạo để xuất bản vẽ 8 hướng đồng bộ chuẩn Game & VFX.
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
