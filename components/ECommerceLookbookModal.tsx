import React, { useState } from 'react';
import {
  LookbookAngle,
  LookbookStylePreset,
  ProductCategory,
  ANGLE_CONFIGS,
  STYLE_PRESET_CONFIGS,
  CATEGORY_LABELS,
  synthesizeAnglePrompt,
  generateFull5AnglePack
} from '../services/ecommerceLookbookService';

interface ECommerceLookbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToGallery?: (image: string, desc: string, meta?: any) => void;
  onDownload?: (image: string, desc: string) => void;
  onOpenInUpscale?: (image: string) => void;
  onSendToWorkspace?: (prompt: string) => void;
  t?: (key: string) => string;
}

export const ECommerceLookbookModal: React.FC<ECommerceLookbookModalProps> = ({
  isOpen,
  onClose,
  onSendToWorkspace
}) => {
  const [productName, setProductName] = useState('Áo Khoác Bomber Da Thuần Chay');
  const [category, setCategory] = useState<ProductCategory>('fashion_apparel');
  const [stylePreset, setStylePreset] = useState<LookbookStylePreset>('amazon_pure_white');
  const [extraDetails, setExtraDetails] = useState('Khóa kéo kim loại bạc mạ chrome, đường may nổi tinh tế, lót lụa cam bên trong');

  const [activeAngle, setActiveAngle] = useState<LookbookAngle>('front_hero');
  const [copiedAngle, setCopiedAngle] = useState<string | null>(null);
  const [packCopiedToast, setPackCopiedToast] = useState(false);

  if (!isOpen) return null;

  const currentPack = generateFull5AnglePack(productName, category, stylePreset, extraDetails);

  const handleCopySingleAngle = (angle: LookbookAngle) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentPack[angle]);
      setCopiedAngle(angle);
      setTimeout(() => setCopiedAngle(null), 2000);
    }
  };

  const handleCopyAllPack = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      let combined = `# E-COMMERCE 5-ANGLE LOOKBOOK PACK: ${productName}\n`;
      combined += `Phong cách: ${STYLE_PRESET_CONFIGS[stylePreset].name}\n\n`;

      Object.entries(currentPack).forEach(([angle, prompt]) => {
        const cfg = ANGLE_CONFIGS[angle as LookbookAngle];
        combined += `--- GÓC: ${cfg.name} ---\n${prompt}\n\n`;
      });

      navigator.clipboard.writeText(combined);
      setPackCopiedToast(true);
      setTimeout(() => setPackCopiedToast(false), 2500);
    }
  };

  const handleSendPromptToWorkspace = (angle: LookbookAngle) => {
    if (onSendToWorkspace) {
      onSendToWorkspace(currentPack[angle]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Commercial E-Commerce & Lookbook Studio</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">v4.3 Pro</span>
              </div>
              <p className="text-[11px] text-zinc-400">Sinh đồng bộ 5 góc chụp thương mại cho Amazon, Shopify, Lookbook & High-Fashion</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllPack}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>{packCopiedToast ? '✓ Đã Copy Toàn Bộ 5 Góc' : '📋 Copy Trọn Bộ 5 Góc'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Product & Style Setup */}
          <div className="w-full md:w-5/12 border-r border-white/5 p-5 overflow-y-auto space-y-4 bg-zinc-950/40">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Tên Sản Phẩm / Model</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="VD: Son Kem Lì Đỏ Ruby, Đồng Hồ Thể Thao Chronograph..."
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/30 font-medium"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Ngành Hàng (Category)</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-white/30"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-zinc-900">{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Phong Cách Chụp & Ánh Sáng (Lighting Studio)</label>
              <div className="space-y-2">
                {Object.entries(STYLE_PRESET_CONFIGS).map(([k, v]) => {
                  const isSelected = stylePreset === k;
                  return (
                    <div
                      key={k}
                      onClick={() => setStylePreset(k as LookbookStylePreset)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1 ${
                        isSelected 
                          ? 'bg-white/[0.08] border-white/30 shadow-md' 
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200 text-[11px]">{v.name}</span>
                        {isSelected && <span className="text-[10px] text-zinc-300 font-mono">✓ Đang Chọn</span>}
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">{v.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Chi Tiết Chất Liệu & Điểm Nhấn (Tùy chọn)</label>
              <textarea
                rows={3}
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder="Mô tả chất liệu, màu sắc, tem nhãn, hoa văn..."
                className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-white/30 leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* Right Column: 5 Angles Grid */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-900/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Bộ 5 Góc Chụp Đồng Bộ (Synchronized 5-Angle Pack)</h3>
                <p className="text-[11px] text-zinc-400">Các góc được tinh chỉnh chuẩn catalog thương mại quốc tế</p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                <span>5 / 5 Góc Đã Sẵn Sàng</span>
              </div>
            </div>

            {/* Angle Cards List */}
            <div className="space-y-3.5">
              {(Object.keys(ANGLE_CONFIGS) as LookbookAngle[]).map((angleKey, idx) => {
                const angleCfg = ANGLE_CONFIGS[angleKey];
                const prompt = currentPack[angleKey];
                const isCopied = copiedAngle === angleKey;

                return (
                  <div
                    key={angleKey}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-zinc-200">{angleCfg.name}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">({angleCfg.shortDesc})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopySingleAngle(angleKey)}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-[10px] font-mono border border-white/10 transition-colors flex items-center gap-1"
                        >
                          <span>{isCopied ? '✓ Đã Chép' : '📋 Copy Prompt'}</span>
                        </button>
                        <button
                          onClick={() => handleSendPromptToWorkspace(angleKey)}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-semibold border border-white/20 transition-colors flex items-center gap-1 active:scale-95"
                        >
                          <span>⚡ Tạo Góc Này</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] font-mono text-zinc-300 bg-black/50 p-2.5 rounded-lg border border-white/5 leading-relaxed select-all">
                      {prompt}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
