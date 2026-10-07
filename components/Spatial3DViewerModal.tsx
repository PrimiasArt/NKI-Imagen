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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/30 border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-xl shadow-inner">
              🥽
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Apple Vision Pro Spatial 3D Converter
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Stereoscopic Depth
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chuyển đổi hình ảnh 2D sang hiệu ứng chiều sâu 3D tương tác, SBS VR & Kính Đỏ-Lam
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Visualizer Area (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* View Mode Tabs */}
            <div className="flex items-center justify-between bg-slate-950/50 p-1.5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('parallax')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    viewMode === 'parallax'
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ✨ 3D Parallax Tilt
                </button>
                <button
                  onClick={() => {
                    if (!sbsResult && activeImage) handleGenerateSBS();
                    else setViewMode('sbs');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    viewMode === 'sbs'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  👓 Stereo SBS 3D
                </button>
                <button
                  onClick={() => {
                    if (!anaglyphResult && activeImage) handleGenerateAnaglyph();
                    else setViewMode('anaglyph');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    viewMode === 'anaglyph'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🔴🔵 Anaglyph (Red-Cyan)
                </button>
              </div>

              {/* Download Active View */}
              {(viewMode === 'sbs' && sbsResult) && (
                <button
                  onClick={() => handleDownload(sbsResult, 'spatial-sbs-3d')}
                  className="px-3 py-1 rounded-xl text-xs bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 flex items-center gap-1.5 transition-all"
                >
                  ⬇ Tải SBS 3D
                </button>
              )}
              {(viewMode === 'anaglyph' && anaglyphResult) && (
                <button
                  onClick={() => handleDownload(anaglyphResult, 'spatial-anaglyph-3d')}
                  className="px-3 py-1 rounded-xl text-xs bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/30 flex items-center gap-1.5 transition-all"
                >
                  ⬇ Tải Anaglyph
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
                <div className="text-center p-6 text-slate-500">
                  <div className="text-4xl mb-2">🖼</div>
                  <p className="text-sm">Vui lòng chọn hình ảnh để bắt đầu chuyển đổi 3D</p>
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
                    className="max-h-[440px] w-auto object-contain rounded-2xl shadow-xl border border-cyan-500/20"
                  />
                </div>
              ) : (
                /* Anaglyph 3D display */
                <div className="relative w-full h-full flex items-center justify-center overflow-auto p-2">
                  <img
                    src={anaglyphResult || activeImage}
                    alt="Anaglyph 3D"
                    className="max-h-[440px] w-auto object-contain rounded-2xl shadow-xl border border-purple-500/20"
                  />
                </div>
              )}

              {/* Instructions badge */}
              <div className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-[11px] text-slate-400 pointer-events-none">
                {viewMode === 'parallax' && '💡 Rê chuột qua ảnh để nghiêng và cảm nhận chiều sâu nổi'}
                {viewMode === 'sbs' && '👓 Xem với kính VR hoặc Apple Vision Pro (Left/Right)'}
                {viewMode === 'anaglyph' && '🔴🔵 Đeo kính 3D Đỏ-Lam cổ điển để thấy hiệu ứng nổi'}
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
                <span className="text-xs font-mono text-cyan-400 font-bold">
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
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
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
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 border border-cyan-400/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>👓</span>
                Tạo Định Dạng Stereo SBS (Vision Pro)
              </button>

              <button
                onClick={handleGenerateAnaglyph}
                disabled={isProcessing || !activeImage}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium text-xs shadow-lg shadow-purple-500/20 border border-purple-400/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>🔴🔵</span>
                Tạo 3D Đỏ - Lam (Anaglyph)
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
                          ? 'border-cyan-400 ring-2 ring-cyan-400/30 scale-95'
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
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200/90 leading-relaxed flex flex-col gap-1.5">
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <span>ℹ️</span> Chuẩn Không Gian 3D (Spatial Specs)
              </span>
              <p className="text-[11px] text-cyan-300/80">
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
