import React, { useState } from 'react';
import {
  WARDROBE_COLLECTION,
  WardrobeOutfit,
  WardrobeCategory,
  runVirtualOutfitSwap
} from '../../services/virtualWardrobeService';

interface VirtualWardrobePanelProps {
  baseImageSrc: string | null;
  activeMaskDataUrl?: string | null;
  onApplyNewOutfit: (resultImage: string) => void;
}

export const VirtualWardrobePanel: React.FC<VirtualWardrobePanelProps> = ({
  baseImageSrc,
  activeMaskDataUrl,
  onApplyNewOutfit
}) => {
  const [selectedOutfit, setSelectedOutfit] = useState<WardrobeOutfit>(WARDROBE_COLLECTION[0]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [referenceImg, setReferenceImg] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<WardrobeCategory | 'all'>('all');

  const categories: { id: WardrobeCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'haute_couture', label: 'Dạ Hội' },
    { id: 'cyberpunk', label: 'Cyberpunk' },
    { id: 'traditional', label: 'Truyền Thống' },
    { id: 'streetwear', label: 'Streetwear' },
    { id: 'tactical', label: 'Chiến Thuật' }
  ];

  const filteredOutfits = activeCategory === 'all'
    ? WARDROBE_COLLECTION
    : WARDROBE_COLLECTION.filter((o) => o.category === activeCategory);

  const handleSwap = async () => {
    if (!baseImageSrc) return;
    const finalPrompt = customPrompt.trim() || selectedOutfit.promptDirective;

    try {
      setIsSwapping(true);
      const res = await runVirtualOutfitSwap(
        baseImageSrc,
        finalPrompt,
        activeMaskDataUrl || undefined,
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
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">👗</span>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              Virtual Wardrobe & Material Matrix
            </h3>
            <span className="text-[10px] text-slate-400">
              Thay đổi trang phục, vải vóc siêu thực giữ 100% vóc dáng & khuôn mặt
            </span>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-medium transition-all whitespace-nowrap ${
              activeCategory === c.id
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Outfit Cards */}
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {filteredOutfits.map((outfit) => (
          <button
            key={outfit.id}
            onClick={() => {
              setSelectedOutfit(outfit);
              setCustomPrompt(outfit.promptDirective);
            }}
            className={`p-2.5 rounded-2xl text-left border transition-all flex flex-col gap-1 ${
              selectedOutfit.id === outfit.id
                ? 'bg-rose-500/20 border-rose-400 text-white shadow-md shadow-rose-500/10'
                : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span>{outfit.icon}</span>
              <span className="truncate">{outfit.name.split('(')[0]}</span>
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
              {outfit.description}
            </p>
          </button>
        ))}
      </div>

      {/* Custom Prompt & Reference Upload */}
      <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-slate-300">
          Chỉ đạo chất liệu & đường may chi tiết:
        </label>
        <textarea
          rows={2}
          value={customPrompt || selectedOutfit.promptDirective}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Mô tả bộ trang phục, chất liệu vải..."
          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none leading-relaxed"
        />

        {/* Reference Image Dropzone */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-400">Ảnh mẫu trang phục tham chiếu:</span>
          {referenceImg ? (
            <div className="flex items-center gap-1.5">
              <img src={referenceImg} alt="Ref" className="w-6 h-6 rounded-md object-cover border border-white/20" />
              <button
                onClick={() => setReferenceImg(null)}
                className="text-[10px] text-red-400 hover:text-red-300"
              >
                ✕ Xóa
              </button>
            </div>
          ) : (
            <label className="text-[10px] px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer transition-all">
              + Tải ảnh mẫu
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
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-xs text-white font-bold shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        {isSwapping ? (
          <>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span>Đang may đo & thử trang phục AI...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>Thử Trang Phục (Virtual Try-On)</span>
          </>
        )}
      </button>

    </div>
  );
};
