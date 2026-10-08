import React, { useState, useRef, useEffect } from 'react';
import { generateStereoscopicSBS, generateAnaglyph3D } from '../services/spatial3dService';

interface Spatial3DViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageSrc?: string;
  galleryImages?: string[];
}

export const Spatial3DViewerModal: React.FC<Spatial3DViewerModalProps> = ({
  isOpen,
  onClose,
  initialImageSrc,
  galleryImages = []
}) => {
  const [activeImage, setActiveImage] = useState<string>(initialImageSrc || '');
  const [viewMode, setViewMode] = useState<'parallax' | 'sbs' | 'anaglyph'>('parallax');
  const [disparity, setDisparity] = useState<number>(18);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sbsResult, setSbsResult] = useState<string | null>(null);
  const [anaglyphResult, setAnaglyphResult] = useState<string | null>(null);

  // Parallax tilt coordinates
  const [tilt, setTilt] = useState<{ rx: number; ry: number; shineX: number; shineY: number }>({
    rx: 0,
    ry: 0,
    shineX: 50,
    shineY: 50
  });

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialImageSrc) {
      setActiveImage(initialImageSrc);
      setSbsResult(null);
      setAnaglyphResult(null);
    }
  }, [initialImageSrc]);

  if (!isOpen) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || viewMode !== 'parallax') return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const maxRotation = 14; // degrees
    const ry = ((x - centerX) / centerX) * maxRotation;
    const rx = -((y - centerY) / centerY) * maxRotation;

    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;

    setTilt({ rx, ry, shineX, shineY });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, shineX: 50, shineY: 50 });
  };

  const handleGenerateSBS = async () => {
    if (!activeImage) return;
    try {
      setIsProcessing(true);
      const res = await generateStereoscopicSBS(activeImage, disparity);
      setSbsResult(res);
      setViewMode('sbs');
    } catch (err) {
      console.error('Lỗi tạo SBS 3D:', err);
      alert('Không thể tạo Spatial SBS 3D.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAnaglyph = async () => {
    if (!activeImage) return;
    try {
      setIsProcessing(true);
      const res = await generateAnaglyph3D(activeImage, disparity);
      setAnaglyphResult(res);
      setViewMode('anaglyph');
    } catch (err) {
      console.error('Lỗi tạo Anaglyph 3D:', err);
      alert('Không thể tạo Anaglyph 3D.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (dataUrl: string, name: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${name}-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900/90 border border-white/15 shadow-2xl shadow-cyan-500/10 overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5 text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="10" rx="3" />
                <circle cx="8" cy="12" r="2.5" />
                <circle cx="16" cy="12" r="2.5" />
                <path d="M10.5 12h3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Apple Vision Pro Spatial 3D Converter
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-zinc-300 border border-white/10">
                  Stereoscopic Depth
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Chuyển đổi hình ảnh 2D sang hiệu ứng chiều sâu 3D tương tác, SBS VR & Kính Đỏ-Lam
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            title="Đóng"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Visualizer Area (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* View Mode Tabs */}
            <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('parallax')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    viewMode === 'parallax'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span>3D Parallax Tilt</span>
                </button>
                <button
                  onClick={() => {
                    if (!sbsResult && activeImage) handleGenerateSBS();
                    else setViewMode('sbs');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    viewMode === 'sbs'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="9" height="14" rx="2" />
                    <rect x="13" y="5" width="9" height="14" rx="2" />
                  </svg>
                  <span>Stereo SBS 3D</span>
                </button>
                <button
                  onClick={() => {
                    if (!anaglyphResult && activeImage) handleGenerateAnaglyph();
                    else setViewMode('anaglyph');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    viewMode === 'anaglyph'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="12" r="5" />
                    <circle cx="16" cy="12" r="5" />
                  </svg>
                  <span>Anaglyph Red-Cyan</span>
                </button>
              </div>

              {/* Download Active View */}
              {(viewMode === 'sbs' && sbsResult) && (
                <button
                  onClick={() => handleDownload(sbsResult, 'spatial-sbs-3d')}
                  className="px-3 py-1 rounded-xl text-xs bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Tải SBS 3D</span>
                </button>
              )}
              {(viewMode === 'anaglyph' && anaglyphResult) && (
                <button
                  onClick={() => handleDownload(anaglyphResult, 'spatial-anaglyph-3d')}
                  className="px-3 py-1 rounded-xl text-xs bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Tải Anaglyph</span>
                </button>
              )}
            </div>

            {/* Display Viewport */}
            <div className="relative min-h-[380px] h-[480px] rounded-3xl bg-slate-950/80 border border-white/10 flex items-center justify-center p-4 overflow-hidden select-none">
              
              {isProcessing && (
                <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
                  <p className="text-sm font-semibold text-cyan-300">Đang tổng hợp ma trận phân kỳ 3D...</p>
                </div>
              )}

              {!activeImage ? (
                <div className="text-center p-6 text-zinc-500">
                  <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-400">Vui lòng chọn hình ảnh để bắt đầu chuyển đổi 3D</p>
                </div>
              ) : viewMode === 'parallax' ? (
                /* Parallax interactive card */
                <div
                  ref={cardRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    perspective: '1200px',
                    transformStyle: 'preserve-3d'
                  }}
                  className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                >
                  <div
                    style={{
                      transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(1.02, 1.02, 1.02)`,
                      transition: 'transform 0.08s ease-out'
                    }}
                    className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl border border-white/20"
                  >
                    <img
                      src={activeImage}
                      alt="Parallax 3D"
                      className="max-h-[440px] w-auto object-contain rounded-2xl"
                    />

                    {/* Interactive holographic glare overlay */}
                    <div
                      style={{
                        background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)`,
                        pointerEvents: 'none'
                      }}
                      className="absolute inset-0 rounded-2xl mix-blend-overlay"
                    />
                  </div>
                </div>
              ) : viewMode === 'sbs' ? (
                /* Stereoscopic SBS display */
                <div className="relative w-full h-full flex items-center justify-center overflow-auto p-2">
                  <img
                    src={sbsResult || activeImage}
                    alt="Side by Side 3D"
                    className="max-h-[440px] w-auto object-contain rounded-2xl shadow-xl border border-white/10"
                  />
                </div>
              ) : (
                /* Anaglyph 3D display */
                <div className="relative w-full h-full flex items-center justify-center overflow-auto p-2">
                  <img
                    src={anaglyphResult || activeImage}
                    alt="Anaglyph 3D"
                    className="max-h-[440px] w-auto object-contain rounded-2xl shadow-xl border border-white/10"
                  />
                </div>
              )}

              {/* Instructions badge */}
              <div className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/10 text-[11px] text-zinc-300 flex items-center gap-1.5 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                {viewMode === 'parallax' && 'Rê chuột qua ảnh để nghiêng và cảm nhận chiều sâu nổi'}
                {viewMode === 'sbs' && 'Xem với kính VR hoặc Apple Vision Pro (Left/Right)'}
                {viewMode === 'anaglyph' && 'Đeo kính 3D Đỏ-Lam cổ điển để thấy hiệu ứng nổi'}
              </div>
            </div>
          </div>

          {/* Controls & Configuration Sidebar (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            
            {/* Disparity depth slider */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Độ sâu phân kỳ (Disparity Depth)
                </label>
                <span className="text-xs font-mono text-zinc-200 font-bold">
                  {disparity}px
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="36"
                step="2"
                value={disparity}
                onChange={(e) => setDisparity(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>Dịu nhẹ (6px)</span>
                <span>Chuẩn (18px)</span>
                <span>Nổi sâu (36px)</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleGenerateSBS}
                disabled={isProcessing || !activeImage}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs border border-white/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="9" height="14" rx="2" />
                  <rect x="13" y="5" width="9" height="14" rx="2" />
                </svg>
                <span>Tạo Định Dạng Stereo SBS (Vision Pro)</span>
              </button>

              <button
                onClick={handleGenerateAnaglyph}
                disabled={isProcessing || !activeImage}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs border border-white/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="12" r="5" />
                  <circle cx="16" cy="12" r="5" />
                </svg>
                <span>Tạo 3D Đỏ - Lam (Anaglyph)</span>
              </button>
            </div>

            {/* Gallery Image Chooser */}
            {galleryImages.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Chọn hình từ thư viện ({galleryImages.length})
                </span>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                  {galleryImages.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveImage(src);
                        setSbsResult(null);
                        setAnaglyphResult(null);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                        activeImage === src
                          ? 'border-white ring-2 ring-white/30 scale-95'
                          : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={src} alt={`Gallery item ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Spec Box */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300 leading-relaxed flex flex-col gap-1.5">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Chuẩn Không Gian 3D (Spatial Specs)</span>
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                • <strong>SBS 3D</strong>: Xuất dạng 2 khung hình ngang 2X độ phân giải, tự động tương thích thiết bị VR/AR như Apple Vision Pro, Meta Quest.<br/>
                • <strong>Anaglyph</strong>: Sử dụng thuật toán chiếu lọc quang sai Cyan/Red cho kính 3D truyền thống mà không làm mất chi tiết gốc.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
