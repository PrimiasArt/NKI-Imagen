import React, { useState, useRef, useEffect, useCallback } from 'react';
import { performLocalInpainting, InpaintingResult } from '../services/inpaintingService';
import { LoadingSpinner } from './LoadingSpinner';

interface InpaintingStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onSaveToGallery?: (image: string, desc: string, meta: any) => void;
  onDownload?: (image: string, desc?: string) => void;
  onOpenInUpscale?: (image: string) => void;
  t?: (key: string, fallback?: string) => string;
}

const INPAINTING_QUICK_PRESETS = [
  { icon: '🖐️', label: 'Sửa bàn tay 5 ngón', prompt: 'Sửa lại bàn tay hoàn hảo, đầy đủ 5 ngón tay tự nhiên, khớp ngón tay rõ ràng và móng tay thanh mảnh tự nhiên' },
  { icon: '👗', label: 'Đổi màu trang phục', prompt: 'Đổi trang phục sang chất liệu lụa satin cao cấp màu đỏ ruby quyến rũ, giữ nguyên nếp gấp vải' },
  { icon: '👓', label: 'Bỏ kính râm', prompt: 'Bỏ kính râm, phục hồi đôi mắt trong veo, ánh nhìn quyến rũ với con ngươi sắc nét tự nhiên' },
  { icon: '💎', label: 'Thêm trang sức', prompt: 'Thêm vòng cổ dây chuyền vàng trắng đính kim cương lấp lánh và khuyên tai ngọc trai sang trọng' },
  { icon: '💇‍♀️', label: 'Đổi kiểu tóc', prompt: 'Đổi sang mái tóc gợn sóng bồng bềnh, sợi tóc mềm mại tự nhiên bóng mượt' },
  { icon: '🪄', label: 'Xóa vật thể thừa', prompt: 'Xóa hoàn toàn vật thể thừa trong vùng chọn, lấp đầy nền xung quanh một cách mượt mà và liền mạch' },
];

export const InpaintingStudioModal: React.FC<InpaintingStudioModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onSaveToGallery,
  onDownload,
  onOpenInUpscale,
  t = (_k, f) => f || ''
}) => {
  if (!isOpen || !imageSrc) return null;

  // Working state
  const [currentBaseImage, setCurrentBaseImage] = useState<string>(imageSrc);
  const [prompt, setPrompt] = useState<string>('');
  const [brushSize, setBrushSize] = useState<number>(36);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [featherRadius, setFeatherRadius] = useState<number>(6);
  const [selectedEngine, setSelectedEngine] = useState<'gemini-3-pro-image' | 'gemini-3.1-flash-image'>('gemini-3-pro-image');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [resultData, setResultData] = useState<InpaintingResult | null>(null);

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState<boolean>(false);

  // Split comparison slider
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50);

  // Canvas Refs
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [maskStrokeHistory, setMaskStrokeHistory] = useState<ImageData[]>([]);
  const [maskRedoHistory, setMaskRedoHistory] = useState<ImageData[]>([]);
  const [hasMaskContent, setHasMaskContent] = useState<boolean>(false);

  // Image natural dimensions
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 1024, height: 1024 });

  // Reset base image when imageSrc prop changes
  useEffect(() => {
    if (imageSrc) {
      setCurrentBaseImage(imageSrc);
      setResultData(null);
      setShowCompare(false);
      setMaskStrokeHistory([]);
      setMaskRedoHistory([]);
      setHasMaskContent(false);
    }
  }, [imageSrc]);

  // Load and render base image on canvas
  useEffect(() => {
    if (!currentBaseImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 1024;
      const h = img.naturalHeight || 1024;
      setNaturalDimensions({ width: w, height: h });

      // Init image canvas
      const imgCanvas = imageCanvasRef.current;
      if (imgCanvas) {
        imgCanvas.width = w;
        imgCanvas.height = h;
        const ctx = imgCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
        }
      }

      // Init mask canvas
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = w;
        maskCanvas.height = h;
        const ctx = maskCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
        }
      }
    };
    img.src = currentBaseImage;
  }, [currentBaseImage]);

  // Keyboard shortcuts (Space for Pan, Z for Undo, [ ] for brush size)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        setSpacePressed(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === '[') {
        setBrushSize(prev => Math.max(8, prev - 6));
      } else if (e.key === ']') {
        setBrushSize(prev => Math.min(140, prev + 6));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed, maskStrokeHistory, maskRedoHistory]);

  // Convert client coordinates to canvas pixel space
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return { x: 0, y: 0 };
    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // Save mask history snapshot before new stroke
  const saveMaskSnapshot = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setMaskStrokeHistory(prev => [...prev.slice(-15), snapshot]); // keep up to 16 snapshots
    setMaskRedoHistory([]);
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (spacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    saveMaskSnapshot();
    setIsDrawing(true);
    drawStroke(e);
  };

  const drawStroke = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawing) return;

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(236, 72, 153, 0.75)'; // vibrant neon magenta
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    setHasMaskContent(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  // Undo / Redo / Clear
  const handleUndo = () => {
    if (maskStrokeHistory.length === 0) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // Save current to redo
    const current = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setMaskRedoHistory(prev => [...prev, current]);

    // Restore previous
    const previous = maskStrokeHistory[maskStrokeHistory.length - 1];
    setMaskStrokeHistory(prev => prev.slice(0, -1));
    ctx.putImageData(previous, 0, 0);
  };

  const handleRedo = () => {
    if (maskRedoHistory.length === 0) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const next = maskRedoHistory[maskRedoHistory.length - 1];
    setMaskRedoHistory(prev => prev.slice(0, -1));

    // Save current to undo
    const current = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setMaskStrokeHistory(prev => [...prev, current]);
    ctx.putImageData(next, 0, 0);
  };

  const handleClearMask = () => {
    saveMaskSnapshot();
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    setHasMaskContent(false);
  };

  // Export current mask as pure black/white image for API
  const exportBinaryMaskBase64 = (): string => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return '';

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = maskCanvas.width;
    exportCanvas.height = maskCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return '';

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Read mask alpha channel: where alpha > 0, paint white
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      const srcData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const dstData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
      for (let i = 0; i < srcData.data.length; i += 4) {
        if (srcData.data[i + 3] > 10) {
          dstData.data[i] = 255;     // R
          dstData.data[i + 1] = 255; // G
          dstData.data[i + 2] = 255; // B
        }
      }
      ctx.putImageData(dstData, 0, 0);
    }
    return exportCanvas.toDataURL('image/png', 1.0);
  };

  // Execute Inpainting
  const handleExecuteInpaint = async () => {
    if (!prompt.trim()) {
      alert("Vui lòng nhập mô tả chi tiết cần sửa (ví dụ: 'Sửa bàn tay 5 ngón tự nhiên' hoặc 'Đổi màu áo sang đỏ').");
      return;
    }
    if (!hasMaskContent) {
      alert("Vui lòng dùng cọ tô lên vùng ảnh cần sửa trước khi bấm Chạy Inpainting.");
      return;
    }

    try {
      setIsProcessing(true);
      setProgressMsg("Đang chuẩn bị ma trận vùng chọn & mặt nạ vi mô...");

      const binaryMask = exportBinaryMaskBase64();
      if (!binaryMask) throw new Error("Không thể tạo mặt nạ vùng chọn.");

      setProgressMsg("Đang gửi yêu cầu tái tạo cục bộ tới Google Gemini Pro 3...");

      const result = await performLocalInpainting({
        originalImageBase64: currentBaseImage,
        maskImageBase64: binaryMask,
        prompt: prompt.trim(),
        featherRadius,
        model: selectedEngine,
        aspectRatio: naturalDimensions.width / naturalDimensions.height,
        strictComposite: true
      });

      setResultData(result);
      setShowCompare(true);
      setProgressMsg("Hoàn tất chỉnh sửa cục bộ!");
    } catch (err: any) {
      alert("Lỗi Inpainting: " + (err.message || String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Accept current result and continue editing or save
  const handleApplyAsBase = () => {
    if (resultData?.resultImage) {
      setCurrentBaseImage(resultData.resultImage);
      setResultData(null);
      setShowCompare(false);
      handleClearMask();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-7xl h-[92vh] max-h-[920px] glass-card rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-slate-950/95">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-xl shadow-lg shadow-pink-500/20">
              🪄
            </span>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Magic Brush & Local Inpainting Studio</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-widest font-mono">
                  Pixel-Perfect Fusion
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Tô cọ lên vùng lỗi (bàn tay, trang phục, kính, vật thể thừa) để AI tái tạo chuẩn xác với độ hòa viền mượt mà.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/10"
              title="Đóng modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left / Center Viewport: Interactive Canvas */}
          <div 
            ref={containerRef}
            className="lg:col-span-8 relative bg-black/60 overflow-hidden flex items-center justify-center border-r border-white/5 select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Canvas Stack */}
            <div 
              className="relative transition-transform duration-75"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                cursor: spacePressed ? 'grab' : (isEraser ? 'cell' : 'crosshair')
              }}
            >
              {/* Layer 1: Base Image Canvas */}
              <canvas
                ref={imageCanvasRef}
                className="max-h-[70vh] w-auto h-auto object-contain block rounded-lg shadow-2xl pointer-events-none"
              />

              {/* Layer 2: Interactive Mask Drawing Canvas */}
              <canvas
                ref={maskCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={drawStroke}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="absolute inset-0 w-full h-full object-contain block rounded-lg"
              />

              {/* Layer 3: Result Comparison Split Overlay (If Result exists) */}
              {showCompare && resultData?.resultImage && (
                <div 
                  className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg"
                  style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                >
                  <img
                    src={resultData.resultImage}
                    alt="Inpaint Result"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-pink-600/90 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow">
                    Sau khi sửa
                  </div>
                </div>
              )}
            </div>

            {/* Split Drag Bar if Comparing */}
            {showCompare && (
              <div 
                className="absolute inset-y-0 w-1 bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.8)] cursor-ew-resize z-20 flex items-center justify-center"
                style={{ left: `${splitPos}%` }}
                onPointerDown={(e) => {
                  const onMove = (ev: PointerEvent) => {
                    if (!containerRef.current) return;
                    const r = containerRef.current.getBoundingClientRect();
                    const p = Math.max(5, Math.min(95, ((ev.clientX - r.left) / r.width) * 100));
                    setSplitPos(p);
                  };
                  const onUp = () => {
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                  };
                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', onUp);
                }}
              >
                <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg text-[9px] font-bold">
                  ↔
                </div>
              </div>
            )}

            {/* Floating Canvas Toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl z-30">
              {/* Brush Mode */}
              <button
                type="button"
                onClick={() => setIsEraser(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  !isEraser ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>🖌️</span>
                <span>Tô Mask</span>
              </button>

              {/* Eraser Mode */}
              <button
                type="button"
                onClick={() => setIsEraser(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isEraser ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>🧹</span>
                <span>Tẩy Mask</span>
              </button>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Brush Size Slider */}
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] text-white/50 font-mono">Cỡ:</span>
                <input
                  type="range"
                  min="8"
                  max="120"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-24 accent-pink-500 cursor-pointer"
                />
                <span className="text-[10px] font-mono font-bold text-pink-400 w-6">{brushSize}px</span>
              </div>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Undo / Redo */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={maskStrokeHistory.length === 0}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 text-white flex items-center justify-center text-xs"
                title="Hoàn tác (Ctrl+Z)"
              >
                ↩
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={maskRedoHistory.length === 0}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-30 text-white flex items-center justify-center text-xs"
                title="Làm lại (Ctrl+Shift+Z)"
              >
                ↪
              </button>

              {/* Clear Mask */}
              <button
                type="button"
                onClick={handleClearMask}
                disabled={!hasMaskContent}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-30 transition-all"
                title="Xóa toàn bộ vùng chọn"
              >
                Xóa Mask
              </button>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* Zoom Controls */}
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 text-xs font-bold"
              >
                -
              </button>
              <span className="text-[10px] font-mono text-white/50 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.25))}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 text-xs font-bold"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); }}
                className="px-2 py-1 rounded-lg text-[10px] text-white/40 hover:text-white"
                title="Khôi phục góc nhìn gốc"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right Panel: Prompt Director & Actions */}
          <div className="lg:col-span-4 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-5 bg-slate-900/40">
            <div className="space-y-4">
              
              {/* Instruction Prompt Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400 flex items-center justify-between">
                  <span>Mô tả chi tiết cần sửa (Inpainting Prompt)</span>
                  <span className="text-white/40 font-normal lowercase">{naturalDimensions.width}×{naturalDimensions.height}px</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ví dụ: Sửa lại bàn tay tự nhiên 5 ngón thon dài, xóa vòng đeo tay, đổi màu áo sang đỏ ruby ánh kim..."
                  rows={3}
                  className="w-full glass-input rounded-2xl p-4 text-xs font-medium text-white placeholder:text-white/30 border border-white/10 focus:border-pink-500/50 outline-none resize-none transition-all shadow-inner leading-relaxed"
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">
                  Gợi ý lệnh sửa nhanh
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {INPAINTING_QUICK_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(p.prompt)}
                      className="text-left text-[11px] p-2 rounded-xl bg-white/5 hover:bg-pink-500/10 hover:border-pink-500/30 border border-white/5 text-white/80 hover:text-pink-300 transition-all flex items-center gap-2 group"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform">{p.icon}</span>
                      <span className="truncate font-semibold">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Engine & Advanced Settings */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/70">Động cơ AI:</span>
                  <select
                    value={selectedEngine}
                    onChange={(e) => setSelectedEngine(e.target.value as any)}
                    className="bg-black/50 border border-white/10 text-xs font-bold rounded-xl px-3 py-1.5 text-white outline-none cursor-pointer"
                  >
                    <option value="gemini-3-pro-image">Gemini 3 Pro (Studio Master)</option>
                    <option value="gemini-3.1-flash-image">Gemini 3.1 Flash (Tốc độ cao)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/70" title="Bán kính làm mượt biên để không lộ vết ghép">
                    Độ hòa viền (Feather):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="18"
                      value={featherRadius}
                      onChange={(e) => setFeatherRadius(Number(e.target.value))}
                      className="w-20 accent-pink-500"
                    />
                    <span className="text-xs font-mono font-bold text-pink-400 w-8 text-right">{featherRadius}px</span>
                  </div>
                </div>
              </div>

              {/* Before/After Toggle if result exists */}
              {resultData?.resultImage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <div>
                      <div className="text-xs font-black text-emerald-300">Đã tạo bản sửa thành công!</div>
                      <div className="text-[10px] text-emerald-400/70 font-mono">Đã ghép chuẩn xác 100% pixel vùng ngoài</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCompare(prev => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40"
                  >
                    {showCompare ? 'Ẩn so sánh' : 'Bật so sánh ↔'}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              {isProcessing ? (
                <div className="py-4 flex flex-col items-center justify-center space-y-2">
                  <LoadingSpinner message={progressMsg} />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleExecuteInpaint}
                    disabled={!prompt.trim() || !hasMaskContent}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-pink-600/30 disabled:opacity-40 disabled:pointer-events-none active:scale-98 flex items-center justify-center gap-2"
                  >
                    <span>🪄</span>
                    <span>Bắt Đầu Sửa Vùng Cục Bộ</span>
                  </button>

                  {resultData?.resultImage && (
                    <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in">
                      <button
                        type="button"
                        onClick={handleApplyAsBase}
                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/10 transition-all flex items-center justify-center gap-1.5"
                        title="Tiếp tục vẽ mask và sửa chi tiết khác trên ảnh vừa tạo"
                      >
                        <span>🔄</span>
                        <span>Sửa tiếp trên ảnh này</span>
                      </button>

                      {onOpenInUpscale && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenInUpscale(resultData.resultImage);
                            onClose();
                          }}
                          className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 transition-all flex items-center justify-center gap-1.5"
                          title="Chuyển sang Studio 5.5K để phóng to siêu nét"
                        >
                          <span>👑</span>
                          <span>Đưa sang Upscale 5.5K</span>
                        </button>
                      )}

                      {onSaveToGallery && (
                        <button
                          type="button"
                          onClick={() => {
                            onSaveToGallery(resultData.resultImage, `Inpaint: ${prompt}`, { inpaintModel: resultData.modelUsed });
                            alert("Đã lưu ảnh chỉnh sửa vào Thư viện!");
                          }}
                          className="py-2.5 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[11px] font-bold border border-indigo-500/40 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>💾</span>
                          <span>Lưu Thư Viện</span>
                        </button>
                      )}

                      {onDownload && (
                        <button
                          type="button"
                          onClick={() => onDownload(resultData.resultImage, `inpaint_${Date.now()}`)}
                          className="py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>📥</span>
                          <span>Tải Ảnh Về</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
