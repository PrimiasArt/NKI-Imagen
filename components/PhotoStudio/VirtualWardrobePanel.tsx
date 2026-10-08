import React, { useState } from 'react';
import {
  WARDROBE_COLLECTION,
  WardrobeOutfit,
  WardrobeCategory,
  runVirtualOutfitSwap
} from '../../services/virtualWardrobeService';

interface VirtualWardrobePanelProps {
  baseImageSrc: string | null;
  onApplyNewOutfit: (resultImage: string) => void;
}

export const VirtualWardrobePanel: React.FC<VirtualWardrobePanelProps> = ({
  baseImageSrc,
  onApplyNewOutfit
}) => {
  const [activeCategory, setActiveCategory] = useState<WardrobeCategory | 'all'>('all');
  const [selectedOutfit, setSelectedOutfit] = useState<WardrobeOutfit>(WARDROBE_COLLECTION[0]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [referenceImg, setReferenceImg] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  const categories: { id: WardrobeCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'haute_couture', label: 'Cao cấp & Dạ hội' },
    { id: 'streetwear', label: 'Dạo phố (Streetwear)' },
    { id: 'traditional', label: 'Truyền thống' },
    { id: 'cyberpunk', label: 'Cyberpunk' },
    { id: 'tactical', label: 'Chiến thuật' }
  ];

  const filteredOutfits = activeCategory === 'all'
    ? WARDROBE_COLLECTION
    : WARDROBE_COLLECTION.filter((o) => o.category === activeCategory);

  const handleSwap = async () => {
    if (!baseImageSrc || isSwapping) return;
    try {
      setIsSwapping(true);
      const directive = customPrompt.trim() || selectedOutfit.promptDirective;
      const res = await runVirtualOutfitSwap(
        baseImageSrc,
        directive,
        undefined,
        referenceImg || undefined
      );
      onApplyNewOutfit(res.resultImage);
    } catch (err) {
      console.error('Lỗi thay đổi trang phục:', err);
      alert('Không thể thay trang phục. Vui lòng kiểm tra ảnh hoặc prompt.');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.5H8l-4 6 3 2.5v9h10v-9l3-2.5-4-6zM9 3.5v2a3 3 0 006 0v-2" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Virtual Wardrobe & Material Matrix
            </h3>
            <span className="text-[10px] text-zinc-400">
              Thay đổi trang phục, vải vóc siêu thực giữ 100% vóc dáng & khuôn mặt
            </span>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {categories.map((c) => {
          const isActive = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Outfit Cards */}
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {filteredOutfits.map((outfit) => {
          const isSelected = selectedOutfit.id === outfit.id;
          return (
            <button
              key={outfit.id}
              onClick={() => {
                setSelectedOutfit(outfit);
                setCustomPrompt(outfit.promptDirective);
              }}
              className={`p-2.5 rounded-2xl text-left border transition-all flex flex-col gap-1 ${
                isSelected
                  ? 'bg-white/[0.08] border-white/40 text-white shadow-sm'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                <span className={isSelected ? 'text-white' : 'text-zinc-400'}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.5H8l-4 6 3 2.5v9h10v-9l3-2.5-4-6zM9 3.5v2a3 3 0 006 0v-2" />
                  </svg>
                </span>
                <span className="truncate">{outfit.name.split('(')[0]}</span>
              </div>
              <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                {outfit.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Custom Prompt & Reference Upload */}
      <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col gap-2">
        <label className="text-[11px] font-medium text-zinc-300">
          Chỉ đạo chất liệu & đường may chi tiết:
        </label>
        <textarea
          rows={2}
          value={customPrompt || selectedOutfit.promptDirective}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Mô tả bộ trang phục, chất liệu vải..."
          className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 resize-none leading-relaxed"
        />

        {/* Reference Image Dropzone */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-zinc-400">Ảnh mẫu trang phục tham chiếu:</span>
          {referenceImg ? (
            <div className="flex items-center gap-1.5">
              <img src={referenceImg} alt="Ref" className="w-6 h-6 rounded-md object-cover border border-white/20" />
              <button
                onClick={() => setReferenceImg(null)}
                className="text-[10px] text-zinc-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Xóa</span>
              </button>
            </div>
          ) : (
            <label className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white cursor-pointer transition-all border border-white/10 flex items-center gap-1">
              <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Tải ảnh mẫu</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setReferenceImg(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleSwap}
        disabled={isSwapping || !baseImageSrc}
        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.99]"
      >
        {isSwapping ? (
          <>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
            <span>Đang may đo & thử trang phục AI...</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>Thử Trang Phục (Virtual Try-On)</span>
          </>
        )}
      </button>

    </div>
  );
};
