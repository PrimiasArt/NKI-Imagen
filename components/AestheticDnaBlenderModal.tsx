import React, { useState } from 'react';
import { blendAestheticDna, AestheticDnaSlots, AestheticDnaResult } from '../services/aestheticDnaService';
import { ImagePromptJson } from '../types';

interface AestheticDnaBlenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryImages?: string[];
  currentSubject?: string;
  onApplyDna: (mergedJson: ImagePromptJson) => void;
}

export const AestheticDnaBlenderModal: React.FC<AestheticDnaBlenderModalProps> = ({
  isOpen,
  onClose,
  galleryImages = [],
  currentSubject = 'A cinematic character in an atmospheric environment',
  onApplyDna
}) => {
  const [slots, setSlots] = useState<AestheticDnaSlots>({
    colorImageBase64: null,
    opticsImageBase64: null,
    textureImageBase64: null,
    styleImageBase64: null
  });

  const [activeSlotPicker, setActiveSlotPicker] = useState<keyof AestheticDnaSlots | null>(null);
  const [subjectText, setSubjectText] = useState<string>(currentSubject);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [result, setResult] = useState<AestheticDnaResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (slotKey: keyof AestheticDnaSlots, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSlots((prev) => ({ ...prev, [slotKey]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSelectFromGallery = (slotKey: keyof AestheticDnaSlots, src: string) => {
    setSlots((prev) => ({ ...prev, [slotKey]: src }));
    setActiveSlotPicker(null);
  };

  const handleClearSlot = (slotKey: keyof AestheticDnaSlots) => {
    setSlots((prev) => ({ ...prev, [slotKey]: null }));
  };

  const hasAnySlot = Boolean(
    slots.colorImageBase64 ||
    slots.opticsImageBase64 ||
    slots.textureImageBase64 ||
    slots.styleImageBase64
  );

  const handleSynthesize = async () => {
    if (!hasAnySlot) {
      alert('Vui lòng chọn ít nhất 1 ảnh nguồn vào các nhánh DNA.');
      return;
    }

    try {
      setIsSynthesizing(true);
      const dnaResult = await blendAestheticDna(slots, subjectText || currentSubject);
      setResult(dnaResult);
    } catch (err) {
      console.error('Lỗi lai tạo DNA thẩm mỹ:', err);
      alert('Không thể tổng hợp DNA. Vui lòng kiểm tra API Key hoặc ảnh tải lên.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleCopyFormula = () => {
    if (!result?.masterFormula) return;
    navigator.clipboard.writeText(result.masterFormula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const slotDefinitions: {
    key: keyof AestheticDnaSlots;
    title: string;
    icon: string;
    desc: string;
    color: string;
    border: string;
  }[] = [
    {
      key: 'colorImageBase64',
      title: '1. Color DNA (Màu Sắc)',
      icon: '🎨',
      desc: 'Nhiệt độ sáng, hòa sắc, độ bão hòa, shadow tint',
      color: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30'
    },
    {
      key: 'opticsImageBase64',
      title: '2. Optics DNA (Quang Học)',
      icon: '📷',
      desc: 'Tiêu cự lens, bokeh anamorphic, quang sai & DoF',
      color: 'from-blue-500/20 to-cyan-500/10',
      border: 'border-blue-500/30'
    },
    {
      key: 'textureImageBase64',
      title: '3. Texture DNA (Chất Liệu)',
      icon: '🔬',
      desc: 'Vi bề mặt, lỗ chân lông, thớ vải, phản xạ kim loại',
      color: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/30'
    },
    {
      key: 'styleImageBase64',
      title: '4. Art Style DNA (Trường Phái)',
      icon: '🏛️',
      desc: 'Trường phái mỹ thuật, nét cọ hoặc nhiếp ảnh điện ảnh',
      color: 'from-purple-500/20 to-pink-500/10',
      border: 'border-purple-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900/90 border border-white/15 shadow-2xl shadow-indigo-500/10 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/30 border border-purple-400/30 flex items-center justify-center text-purple-300 text-xl shadow-inner">
              🧬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Neural Aesthetic DNA Blender
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  Multimodal Genetic Cross-Breeding
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tách và lai tạo 4 mã gen thẩm mỹ (Màu sắc • Quang học • Chất liệu • Trường phái) thành một kiệt tác độc bản
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Subject prompt bar */}
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/10 flex flex-col md:flex-row items-center gap-3">
            <span className="text-xs font-semibold text-slate-300 shrink-0 flex items-center gap-1.5">
              <span>🎯</span> Chủ thể lai tạo:
            </span>
            <input
              type="text"
              value={subjectText}
              onChange={(e) => setSubjectText(e.target.value)}
              placeholder="VD: A majestic celestial dragon soaring through nebulae..."
              className="flex-1 w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* 4 DNA Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {slotDefinitions.map((slot) => {
              const currentImg = slots[slot.key];
              return (
                <div
                  key={slot.key}
                  className={`relative p-4 rounded-2xl bg-gradient-to-b ${slot.color} border ${slot.border} flex flex-col justify-between gap-3 min-h-[260px]`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <span>{slot.icon}</span>
                        <span>{slot.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {slot.desc}
                      </p>
                    </div>

                    {currentImg && (
                      <button
                        onClick={() => handleClearSlot(slot.key)}
                        className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 flex items-center justify-center text-xs transition-all"
                        title="Xóa slot"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Slot Image Preview / Dropzone */}
                  <div className="relative flex-1 min-h-[130px] rounded-xl border border-dashed border-white/20 bg-slate-950/40 overflow-hidden flex items-center justify-center">
                    {currentImg ? (
                      <img
                        src={currentImg}
                        alt={slot.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center p-2 text-slate-500">
                        <span className="text-2xl">{slot.icon}</span>
                        <span className="text-[10px]">Trống (Chưa có DNA)</span>
                      </div>
                    )}
                  </div>

                  {/* Slot Actions */}
                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-center text-[11px] font-medium text-slate-200 cursor-pointer transition-all">
                      📁 Tải ảnh
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(slot.key, file);
                        }}
                      />
                    </label>

                    {galleryImages.length > 0 && (
                      <button
                        onClick={() => setActiveSlotPicker(activeSlotPicker === slot.key ? null : slot.key)}
                        className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition-all"
                        title="Chọn từ thư viện"
                      >
                        🖼 Thư viện
                      </button>
                    )}
                  </div>

                  {/* Gallery Quick Dropdown Picker for this slot */}
                  {activeSlotPicker === slot.key && (
                    <div className="absolute inset-x-2 bottom-12 z-20 p-2.5 rounded-xl bg-slate-950/95 border border-white/20 shadow-2xl backdrop-blur-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-slate-400 font-semibold">Chọn từ thư viện</span>
                        <button
                          onClick={() => setActiveSlotPicker(null)}
                          className="text-[10px] text-slate-500 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto">
                        {galleryImages.map((src, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectFromGallery(slot.key, src)}
                            className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-purple-400 transition-all"
                          >
                            <img src={src} alt="Pick" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Synthesize Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing || !hasAnySlot}
              className="py-3 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-purple-500/25 border border-purple-400/40 flex items-center gap-2.5 transition-all disabled:opacity-50"
            >
              {isSynthesizing ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Đang trích xuất ma trận gen đa phương thức...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Lai Tạo & Tổng Hợp DNA Thẩm Mỹ</span>
                </>
              )}
            </button>
          </div>

          {/* Synthesis Results Card */}
          {result && (
            <div className="p-5 rounded-3xl bg-slate-950/70 border border-purple-500/30 flex flex-col gap-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm">
                    {result.dnaTitle}
                  </span>
                  <span className="text-xs text-slate-400">Genotype Hybrid Synthesis</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyFormula}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    {copied ? '✓ Đã sao chép' : '📋 Sao chép Prompt'}
                  </button>
                  <button
                    onClick={() => {
                      onApplyDna(result.mergedJson);
                      onClose();
                    }}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 border border-purple-400/30 transition-all flex items-center gap-1.5"
                  >
                    ✨ Áp dụng vào Studio
                  </button>
                </div>
              </div>

              {/* 4 Genetic Pillars Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="font-bold text-amber-300 block mb-1">🎨 Color DNA:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{result.colorPalette}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
                  <span className="font-bold text-blue-300 block mb-1">📷 Optics DNA:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{result.opticsFormula}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <span className="font-bold text-emerald-300 block mb-1">🔬 Texture DNA:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{result.textureSpecs}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                  <span className="font-bold text-purple-300 block mb-1">🏛️ Art Style DNA:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{result.artMovement}</p>
                </div>
              </div>

              {/* Master Unified Formula */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Công thức hợp nhất hoàn chỉnh (Master Synthesis Formula)
                </span>
                <p className="text-xs text-purple-200/90 font-mono leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5 select-all">
                  {result.masterFormula}
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
