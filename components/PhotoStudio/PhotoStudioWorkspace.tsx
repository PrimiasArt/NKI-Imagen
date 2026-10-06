import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GalleryItem, AntiAiCamouflageSettings } from '../../types';
import {
  ColorGradingAdjustments,
  DEFAULT_COLOR_ADJUSTMENTS,
  CINEMATIC_COLOR_PRESETS,
  CustomColorPreset,
  loadCustomColorPresets,
  saveCustomColorPresets,
  applyColorGradingToImageData,
  renderWithAdjustments,
  rotateCanvas90,
  flipCanvas,
  cropCanvas,
  extractBinaryMaskDataUrl,
  hasMaskStrokes,
  loadImageElement
} from '../../services/imageProcessingService';
import {
  runGenerativeFill,
  runMagicEraser,
  runMagicExpand,
  runBackgroundReplace
} from '../../services/aiStudioService';
import { getCachedImageModels, ImageModelOption } from '../../services/geminiService';
import { applyAntiAiCamouflage, loadAntiAiSettings } from '../../services/antiAiCamouflageService';
import { saveGalleryItemDB } from '../../services/indexedDbService';

export interface PhotoStudioWorkspaceProps {
  initialImageSrc?: string | null;
  onClose: () => void;
  onSaveToGallery?: (item: GalleryItem) => void;
  galleryItems?: GalleryItem[];
}

type StudioTool = 'select' | 'brush' | 'eraser' | 'crop' | 'color' | 'hand';
type RightSidebarTab = 'ai_magic' | 'color_grading' | 'transform';
type AiMagicAction = 'inpaint' | 'eraser' | 'expand' | 'bg_replace';

/**
 * Reusable Editable Number Box for sliders (Photoshop style)
 */
interface EditableNumberInputProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  colorClass?: string;
  widthClass?: string;
  onChange: (val: number) => void;
}

const EditableNumberInput: React.FC<EditableNumberInputProps> = ({
  value,
  min,
  max,
  step = 1,
  unit,
  colorClass = 'text-amber-300',
  widthClass = 'w-14',
  onChange
}) => {
  const [localVal, setLocalVal] = useState<string>(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalVal(text);

    if (text === '' || text === '-') {
      return;
    }

    const parsed = Number(text);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    if (localVal === '' || localVal === '-' || isNaN(Number(localVal))) {
      setLocalVal(String(value));
      onChange(value);
    } else {
      const clamped = Math.max(min, Math.min(max, Number(localVal)));
      setLocalVal(String(clamped));
      onChange(clamped);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(max, value + (step || 1));
      onChange(next);
      setLocalVal(String(next));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(min, value - (step || 1));
      onChange(next);
      setLocalVal(String(next));
    }
  };

  return (
    <div 
      className="relative flex items-center flex-none"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        inputMode="numeric"
        value={localVal}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${widthClass} bg-black/60 border border-white/20 rounded-lg py-1 px-1 text-center text-xs font-mono font-bold ${colorClass} focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all`}
      />
      {unit && (
        <span className="text-[10px] font-mono text-white/40 ml-1 select-none">
          {unit}
        </span>
      )}
    </div>
  );
};

/**
 * Reusable Adjustment Row with Slider and Direct Editable Number Input
 */
interface AdjustmentSliderRowProps {
  label: string;
  sublabel?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (val: number) => void;
  sliderBgClass?: string;
  accentClass?: string;
  colorClass?: string;
}

const AdjustmentSliderRow: React.FC<AdjustmentSliderRowProps> = ({
  label,
  sublabel,
  min,
  max,
  step = 1,
  value,
  unit,
  onChange,
  sliderBgClass = 'h-1.5 bg-white/20',
  accentClass = 'accent-amber-400',
  colorClass = 'text-amber-300'
}) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70 font-medium">{label}</span>
        {sublabel && <span className="text-[10px] text-white/40 font-mono">{sublabel}</span>}
      </div>
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`flex-1 ${sliderBgClass} ${accentClass} rounded-lg cursor-pointer`}
        />
        <EditableNumberInput
          value={value}
          min={min}
          max={max}
          step={step}
          unit={unit}
          colorClass={colorClass}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export const PhotoStudioWorkspace: React.FC<PhotoStudioWorkspaceProps> = ({
  initialImageSrc,
  onClose,
  onSaveToGallery,
  galleryItems = []
}) => {
  // Main Image State
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(initialImageSrc || null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(initialImageSrc || null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // History stack for Undo / Redo
  const [history, setHistory] = useState<string[]>(initialImageSrc ? [initialImageSrc] : []);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active Tool & Mode
  const [activeTool, setActiveTool] = useState<StudioTool>('brush');
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('ai_magic');
  const [activeAiAction, setActiveAiAction] = useState<AiMagicAction>('inpaint');

  // Brush Settings
  const [brushSize, setBrushSize] = useState<number>(36);
  const [brushHardness, setBrushHardness] = useState<number>(0.8);
  const [hasMask, setHasMask] = useState<boolean>(false);
  const [isMaskVisible, setIsMaskVisible] = useState<boolean>(true);

  // Color Grading Adjustments
  const [adjustments, setAdjustments] = useState<ColorGradingAdjustments>(DEFAULT_COLOR_ADJUSTMENTS);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Custom User Presets
  const [customPresets, setCustomPresets] = useState<CustomColorPreset[]>(() => loadCustomColorPresets());
  const [isSavingPresetModalOpen, setIsSavingPresetModalOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [presetFilter, setPresetFilter] = useState<'all' | 'custom' | 'cinematic'>('all');


  // Canvas Viewport Pan & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse & Drawing State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);

  // AI Inputs & State
  const [inpaintPrompt, setInpaintPrompt] = useState<string>('');
  const [expandRatio, setExpandRatio] = useState<string>('16:9');
  const [expandPrompt, setExpandPrompt] = useState<string>('');
  const [bgPrompt, setBgPrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite-image');
  const [availableModels, setAvailableModels] = useState<ImageModelOption[]>([]);

  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);

  // Comparison & Export State
  const [isComparingOriginal, setIsComparingOriginal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [antiAiActive, setAntiAiActive] = useState<boolean>(() => loadAntiAiSettings().enabled);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Crop Box State
  const [cropAspectRatio, setCropAspectRatio] = useState<'free' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('free');
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [cropDragMode, setCropDragMode] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw'>('move');
  const cropStartRef = useRef<{ mouseX: number; mouseY: number; box: { x: number; y: number; width: number; height: number } } | null>(null);

  // Canvas Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageElementRef = useRef<HTMLImageElement | null>(null);

  // Load models on mount
  useEffect(() => {
    setAvailableModels(getCachedImageModels());
  }, []);

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Push new state into Undo/Redo stack
  const pushHistory = useCallback((newSrc: string) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newSrc];
    });
    setHistoryIndex(prev => prev + 1);
    setCurrentImageSrc(newSrc);
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setCurrentImageSrc(history[nextIdx]);
      clearMask();
      showToast('Đã Hoàn tác (Undo)');
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCurrentImageSrc(history[nextIdx]);
      clearMask();
      showToast('Đã Làm lại (Redo)');
    }
  }, [historyIndex, history]);

  // Clear mask canvas
  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
    setHasMask(false);
    setIsMaskVisible(true);
  }, []);

  // Initialize/Load image onto canvas
  useEffect(() => {
    if (!currentImageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      baseImageElementRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

      // Init main canvas
      const mainCanvas = mainCanvasRef.current;
      if (mainCanvas) {
        mainCanvas.width = img.naturalWidth;
        mainCanvas.height = img.naturalHeight;
      }

      // Init mask canvas
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = img.naturalWidth;
        maskCanvas.height = img.naturalHeight;
      }

      // Fit to screen on initial load
      if (viewportRef.current) {
        const vpRect = viewportRef.current.getBoundingClientRect();
        const scaleX = (vpRect.width - 80) / img.naturalWidth;
        const scaleY = (vpRect.height - 80) / img.naturalHeight;
        const fitScale = Math.min(scaleX, scaleY, 1);
        setZoom(Math.max(0.1, Number(fitScale.toFixed(2))));
        setPan({
          x: Math.round((vpRect.width - img.naturalWidth * fitScale) / 2),
          y: Math.round((vpRect.height - img.naturalHeight * fitScale) / 2)
        });
      }

      // Init default crop box
      setCropBox({
        x: Math.round(img.naturalWidth * 0.1),
        y: Math.round(img.naturalHeight * 0.1),
        width: Math.round(img.naturalWidth * 0.8),
        height: Math.round(img.naturalHeight * 0.8)
      });

      renderMainCanvas();
    };
    img.src = currentImageSrc;
  }, [currentImageSrc]);

  // Real-time render main canvas with color grading adjustments
  const renderMainCanvas = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    const baseImg = baseImageElementRef.current;
    if (!mainCanvas || !baseImg) return;

    if (isComparingOriginal && originalImageSrc) {
      // Show raw original
      const ctx = mainCanvas.getContext('2d');
      if (ctx) {
        const rawImg = new Image();
        rawImg.onload = () => ctx.drawImage(rawImg, 0, 0, mainCanvas.width, mainCanvas.height);
        rawImg.src = originalImageSrc;
      }
      return;
    }

    renderWithAdjustments(baseImg, mainCanvas, adjustments);
  }, [adjustments, isComparingOriginal, originalImageSrc]);

  // Trigger render when adjustments change
  useEffect(() => {
    renderMainCanvas();
  }, [renderMainCanvas]);

  // Convert client viewport coordinates to canvas pixel coordinates
  const clientToCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!viewportRef.current) return { x: 0, y: 0 };
    const vpRect = viewportRef.current.getBoundingClientRect();
    const canvasX = (clientX - vpRect.left - pan.x) / zoom;
    const canvasY = (clientY - vpRect.top - pan.y) / zoom;
    return {
      x: Math.max(0, Math.min(imageSize.width, canvasX)),
      y: Math.max(0, Math.min(imageSize.height, canvasY))
    };
  }, [pan, zoom, imageSize]);

  // Drawing on Mask Canvas (60 FPS local execution)
  const drawMaskStroke = useCallback((x: number, y: number, isStarting: boolean) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.55)'; // Neon crimson mask
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
    }

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isStarting || !lastDrawPointRef.current) {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastDrawPointRef.current.x, lastDrawPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.restore();
    lastDrawPointRef.current = { x, y };
    setHasMask(true);
    setIsMaskVisible(true);
  }, [activeTool, brushSize]);

  // Mouse Down Event Handler
  const handleMouseDown = (e: React.MouseEvent) => {
    // 1. Guard against clicks on interactive controls, inputs, buttons, or overlay chrome
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, label, [role="button"], .studio-overlay-interactive')) {
      return;
    }

    if (!currentImageSrc) return;

    // Pan mode: Middle click OR Hand tool OR Space held
    if (e.button === 1 || activeTool === 'hand' || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button === 0) { // Left Click
      if (activeTool === 'brush' || activeTool === 'eraser') {
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        // Only draw if inside or immediately along canvas boundaries
        if (coords.x >= 0 && coords.x <= imageSize.width && coords.y >= 0 && coords.y <= imageSize.height) {
          setIsDrawing(true);
          drawMaskStroke(coords.x, coords.y, true);
        }
      } else if (activeTool === 'crop' && cropBox) {
        // Crop box dragging
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        const handleThreshold = 18 / zoom;
        const b = cropBox;

        let mode: 'move' | 'nw' | 'ne' | 'se' | 'sw' = 'move';
        if (Math.hypot(coords.x - b.x, coords.y - b.y) < handleThreshold) mode = 'nw';
        else if (Math.hypot(coords.x - (b.x + b.width), coords.y - b.y) < handleThreshold) mode = 'ne';
        else if (Math.hypot(coords.x - (b.x + b.width), coords.y - (b.y + b.height)) < handleThreshold) mode = 'se';
        else if (Math.hypot(coords.x - b.x, coords.y - (b.y + b.height)) < handleThreshold) mode = 'sw';
        
        setCropDragMode(mode);
        setIsDraggingCrop(true);
        cropStartRef.current = {
          mouseX: coords.x,
          mouseY: coords.y,
          box: { ...cropBox }
        };
      }
    }
  };

  // Mouse Move Event Handler
  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = clientToCanvasCoords(e.clientX, e.clientY);
    setCursorPos(coords);

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isDrawing && (activeTool === 'brush' || activeTool === 'eraser')) {
      drawMaskStroke(coords.x, coords.y, false);
      return;
    }

    if (isDraggingCrop && cropStartRef.current && cropBox) {
      const dx = coords.x - cropStartRef.current.mouseX;
      const dy = coords.y - cropStartRef.current.mouseY;
      const orig = cropStartRef.current.box;

      if (cropDragMode === 'move') {
        setCropBox({
          x: Math.max(0, Math.min(imageSize.width - orig.width, orig.x + dx)),
          y: Math.max(0, Math.min(imageSize.height - orig.height, orig.y + dy)),
          width: orig.width,
          height: orig.height
        });
      } else if (cropDragMode === 'se') {
        const newW = Math.max(20, orig.width + dx);
        const newH = Math.max(20, orig.height + dy);
        setCropBox({
          x: orig.x,
          y: orig.y,
          width: Math.min(imageSize.width - orig.x, newW),
          height: Math.min(imageSize.height - orig.y, newH)
        });
      }
    }
  };

  // Mouse Up Event Handler
  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDrawing(false);
    setIsDraggingCrop(false);
    lastDrawPointRef.current = null;
    cropStartRef.current = null;
  };

  // Wheel Zoom (pinning cursor location)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!viewportRef.current) return;

    const vpRect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - vpRect.left;
    const mouseY = e.clientY - vpRect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.1, Math.min(6.0, Number((zoom * zoomFactor).toFixed(2))));

    // Adjust pan to zoom into cursor point
    const newPanX = mouseX - ((mouseX - pan.x) / zoom) * newZoom;
    const newPanY = mouseY - ((mouseY - pan.y) / zoom) * newZoom;

    setZoom(newZoom);
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // Reset View to Fit
  const handleResetView = () => {
    if (!viewportRef.current || imageSize.width === 0) return;
    const vpRect = viewportRef.current.getBoundingClientRect();
    const scaleX = (vpRect.width - 80) / imageSize.width;
    const scaleY = (vpRect.height - 80) / imageSize.height;
    const fitScale = Math.min(scaleX, scaleY, 1);
    setZoom(Math.max(0.1, Number(fitScale.toFixed(2))));
    setPan({
      x: Math.round((vpRect.width - imageSize.width * fitScale) / 2),
      y: Math.round((vpRect.height - imageSize.height * fitScale) / 2)
    });
  };

  // Handle file input for new image
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (src) {
          setCurrentImageSrc(src);
          setOriginalImageSrc(src);
          setHistory([src]);
          setHistoryIndex(0);
          showToast('Đã tải ảnh vào Studio!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (src) {
          setCurrentImageSrc(src);
          setOriginalImageSrc(src);
          setHistory([src]);
          setHistoryIndex(0);
          showToast('Đã thả ảnh vào Studio!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 1-Click Preset LUT Selection
  const applyPresetLut = (preset: typeof CINEMATIC_COLOR_PRESETS[0]) => {
    setActivePresetId(preset.id);
    setAdjustments({
      ...DEFAULT_COLOR_ADJUSTMENTS,
      ...preset.adjustments
    });
    showToast(`Đã áp dụng Preset: ${preset.name}`);
  };

  // Custom User Presets Handlers
  const applyCustomPreset = (preset: CustomColorPreset) => {
    setActivePresetId(preset.id);
    setAdjustments({
      ...DEFAULT_COLOR_ADJUSTMENTS,
      ...preset.adjustments
    });
    showToast(`Đã áp dụng Preset: ${preset.name}`);
  };

  const handleSaveCurrentAsPreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập tên cho preset!');
      return;
    }
    const newPreset: CustomColorPreset = {
      id: `custom_preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: Date.now(),
      adjustments: { ...adjustments }
    };
    const updated = [newPreset, ...customPresets];
    setCustomPresets(updated);
    saveCustomColorPresets(updated);
    setActivePresetId(newPreset.id);
    setIsSavingPresetModalOpen(false);
    setNewPresetName('');
    showToast(`Đã lưu preset "${newPreset.name}" vào thư viện! 💾`);
  };

  const handleDeleteCustomPreset = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    saveCustomColorPresets(updated);
    if (activePresetId === id) setActivePresetId(null);
    showToast(`Đã xóa preset "${name}"`);
  };

  const handleExportPresets = () => {
    if (customPresets.length === 0) {
      showToast('Chưa có preset tự tạo nào để xuất.');
      return;
    }
    const jsonStr = JSON.stringify(customPresets, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NKI_Color_Presets_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất danh sách preset ra file JSON!');
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (Array.isArray(data)) {
            const merged = [...data, ...customPresets];
            const unique = Array.from(new Map(merged.map(p => [p.id, p])).values());
            setCustomPresets(unique);
            saveCustomColorPresets(unique);
            showToast(`Đã nhập thành công ${data.length} preset!`);
          } else {
            showToast('Định dạng JSON preset không hợp lệ.');
          }
        } catch (err) {
          showToast('Lỗi đọc file JSON preset');
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset Color Adjustments
  const resetColorAdjustments = () => {
    setAdjustments(DEFAULT_COLOR_ADJUSTMENTS);
    setActivePresetId(null);
    showToast('Đã đặt lại màu gốc');
  };

  // Geometric Transformations (100% Local, 0 API)
  const handleRotate = (clockwise: boolean) => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const rotated = rotateCanvas90(mainCanvas, clockwise);
    const newUrl = rotated.toDataURL('image/png');
    pushHistory(newUrl);
    clearMask();
    showToast(clockwise ? 'Đã xoay 90° cùng chiều kim đồng hồ' : 'Đã xoay 90° ngược chiều kim đồng hồ');
  };

  const handleFlip = (horizontal: boolean) => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const flipped = flipCanvas(mainCanvas, horizontal);
    const newUrl = flipped.toDataURL('image/png');
    pushHistory(newUrl);
    clearMask();
    showToast(horizontal ? 'Đã lật ngang' : 'Đã lật dọc');
  };

  const handleApplyCrop = () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas || !cropBox) return;
    const cropped = cropCanvas(mainCanvas, cropBox);
    const newUrl = cropped.toDataURL('image/png');
    pushHistory(newUrl);
    clearMask();
    setActiveTool('select');
    showToast('Đã cắt ảnh theo vùng chọn');
  };

  // Bake color adjustments into the base image (Zero API)
  const bakeAdjustments = () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const bakedUrl = mainCanvas.toDataURL('image/png');
    pushHistory(bakedUrl);
    setAdjustments(DEFAULT_COLOR_ADJUSTMENTS);
    setActivePresetId(null);
    showToast('Đã lưu cố định chỉnh màu vào ảnh');
  };

  // ==========================================
  // AI ACTION EXECUTIONS (Strictly On-Demand)
  // ==========================================

  // 1. Generative Fill
  const handleExecuteGenerativeFill = async () => {
    const maskCanvas = maskCanvasRef.current;
    const mainCanvas = mainCanvasRef.current;
    if (!maskCanvas || !mainCanvas || !currentImageSrc) return;

    if (!hasMaskStrokes(maskCanvas)) {
      setAiError('Vui lòng dùng Cọ Mask (phím B) để quét chọn vùng cần chỉnh sửa trước khi tạo.');
      return;
    }

    if (!inpaintPrompt.trim()) {
      setAiError('Vui lòng nhập mô tả nội dung bạn muốn vẽ vào vùng chọn.');
      return;
    }

    setAiError(null);
    setIsAiLoading(true);
    setAiLoadingMessage('Đang phân tích vùng chọn và tạo nội dung AI mới...');

    try {
      // Bake any current color adjustments before sending to inpaint
      const baseImageData = mainCanvas.toDataURL('image/png');
      const maskDataUrl = extractBinaryMaskDataUrl(maskCanvas);

      const res = await runGenerativeFill(baseImageData, maskDataUrl, inpaintPrompt.trim(), {
        model: selectedModel
      });

      pushHistory(res.resultImage);
      clearMask();
      showToast('Generative Fill hoàn thành xuất sắc!');
    } catch (err: any) {
      console.error('[AI Studio] Generative Fill error:', err);
      setAiError(err?.message || 'Lỗi xử lý Generative Fill. Vui lòng thử lại.');
    } finally {
      setIsAiLoading(false);
      setAiLoadingMessage('');
    }
  };

  // 2. Magic Eraser
  const handleExecuteMagicEraser = async () => {
    const maskCanvas = maskCanvasRef.current;
    const mainCanvas = mainCanvasRef.current;
    if (!maskCanvas || !mainCanvas || !currentImageSrc) return;

    if (!hasMaskStrokes(maskCanvas)) {
      setAiError('Vui lòng dùng Cọ Mask (phím B) để quét lên vật thể hoặc chi tiết cần xóa.');
      return;
    }

    setAiError(null);
    setIsAiLoading(true);
    setAiLoadingMessage('Đang xóa vật thể và phục hồi hoa văn nền tự nhiên...');

    try {
      const baseImageData = mainCanvas.toDataURL('image/png');
      const maskDataUrl = extractBinaryMaskDataUrl(maskCanvas);

      const res = await runMagicEraser(baseImageData, maskDataUrl, {
        model: selectedModel
      });

      pushHistory(res.resultImage);
      clearMask();
      showToast('Magic Eraser: Đã xóa vật thể thành công!');
    } catch (err: any) {
      console.error('[AI Studio] Magic Eraser error:', err);
      setAiError(err?.message || 'Lỗi xóa vật thể. Vui lòng thử lại.');
    } finally {
      setIsAiLoading(false);
      setAiLoadingMessage('');
    }
  };

  // 3. Magic Expand
  const handleExecuteMagicExpand = async () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas || !currentImageSrc) return;

    setAiError(null);
    setIsAiLoading(true);
    setAiLoadingMessage(`Đang mở rộng khung cảnh sang tỉ lệ ${expandRatio}...`);

    try {
      const baseImageData = mainCanvas.toDataURL('image/png');
      const res = await runMagicExpand(baseImageData, expandRatio, expandPrompt.trim() || undefined, {
        model: selectedModel
      });

      pushHistory(res.resultImage);
      clearMask();
      showToast(`Magic Expand: Đã mở rộng sang tỉ lệ ${expandRatio}!`);
    } catch (err: any) {
      console.error('[AI Studio] Magic Expand error:', err);
      setAiError(err?.message || 'Lỗi mở rộng khung cảnh. Vui lòng thử lại.');
    } finally {
      setIsAiLoading(false);
      setAiLoadingMessage('');
    }
  };

  // 4. Background Replace
  const handleExecuteBgReplace = async () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas || !currentImageSrc) return;

    if (!bgPrompt.trim()) {
      setAiError('Vui lòng nhập mô tả phông nền mới bạn muốn thay đổi.');
      return;
    }

    setAiError(null);
    setIsAiLoading(true);
    setAiLoadingMessage('Đang tách chủ thể và tạo bối cảnh mới...');

    try {
      const baseImageData = mainCanvas.toDataURL('image/png');
      const res = await runBackgroundReplace(baseImageData, bgPrompt.trim(), {
        model: selectedModel
      });

      pushHistory(res.resultImage);
      clearMask();
      showToast('Thay nền AI hoàn tất!');
    } catch (err: any) {
      console.error('[AI Studio] Background Replace error:', err);
      setAiError(err?.message || 'Lỗi thay nền. Vui lòng thử lại.');
    } finally {
      setIsAiLoading(false);
      setAiLoadingMessage('');
    }
  };

  // ==========================================
  // EXPORT & SAVE TO GALLERY
  // ==========================================

  // Save to Gallery
  const handleSaveToGallery = async () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;

    const dataUrl = mainCanvas.toDataURL('image/png');
    const newItem: GalleryItem = {
      id: `studio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      src: dataUrl,
      type: 'JSON_TO_IMG',
      createdAt: Date.now(),
      description: inpaintPrompt || bgPrompt || 'AI Studio Retouched Artwork',
      metadata: {
        model: selectedModel,
        aspectRatio: `${mainCanvas.width}:${mainCanvas.height}`,
        promptJson: {
          subject: inpaintPrompt || 'Photo Studio Composite',
          art_style: 'Studio Retouched',
          posing: 'N/A',
          lighting: 'Studio Master Lighting',
          color_palette: activePresetId || 'Custom Graded',
          composition: 'Refined Framing',
          camera_angle: 'Standard',
          texture: 'High-Res Studio Finish',
          skin_texture: 'Natural Pore Texture',
          font: 'N/A',
          mood: 'Polished',
          additional_details: 'Processed via NKI AI Photo Studio 2026'
        }
      }
    };

    try {
      await saveGalleryItemDB(newItem);
      if (onSaveToGallery) onSaveToGallery(newItem);
      showToast('Đã lưu tác phẩm vào Gallery thành công! 🖼️');
    } catch (e) {
      console.error('Failed to save studio item to gallery:', e);
      showToast('Lỗi lưu vào Gallery.');
    }
  };

  // Download Image with optional Anti-AI Camouflage
  const handleDownload = async (format: 'png' | 'jpg' | 'anti_ai') => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;

    setIsExporting(true);
    try {
      let finalDataUrl = mainCanvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);

      if (format === 'anti_ai' || (antiAiActive && format !== 'png')) {
        const settings = loadAntiAiSettings();
        const camoResult = await applyAntiAiCamouflage(finalDataUrl, settings);
        finalDataUrl = camoResult.camouflagedDataUrl;
      }

      const a = document.createElement('a');
      a.href = finalDataUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `NKI_Studio_${timestamp}.${format === 'png' ? 'png' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast(format === 'anti_ai' ? 'Đã tải ảnh Khử Dấu AI thành công!' : 'Đã tải ảnh về máy!');
    } catch (err: any) {
      console.error('Download failed:', err);
      showToast('Lỗi tải ảnh: ' + (err?.message || ''));
    } finally {
      setIsExporting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input / textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        // Photoshop Deselect Shortcut: Ctrl+D / Cmd+D
        e.preventDefault();
        clearMask();
        showToast('Đã bỏ chọn vùng cọ (Deselect)');
      } else if (e.key === 'Escape') {
        // Escape cancels mask and switches to select tool
        e.preventDefault();
        if (hasMask) {
          clearMask();
          showToast('Đã hủy vùng chọn cọ (Esc)');
        }
        setActiveTool('select');
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && hasMask && (activeTool === 'brush' || activeTool === 'select' || activeTool === 'eraser')) {
        // Delete/Backspace clears mask
        e.preventDefault();
        clearMask();
        showToast('Đã xóa vùng chọn');
      } else if (e.key.toLowerCase() === 'b') {
        setActiveTool('brush');
        setActiveTab('ai_magic');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser');
        setActiveTab('ai_magic');
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'c') {
        setActiveTool('crop');
        setActiveTab('transform');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('hand');
      } else if (e.key.toLowerCase() === 'g') {
        setActiveTool('select');
        setActiveTab('color_grading');
      } else if (e.key === ' ') { // Space for quick pan
        setActiveTool('hand');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, clearMask, hasMask, activeTool]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 select-none overflow-hidden text-white font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] bg-primary-500 text-black font-bold text-xs px-5 py-2.5 rounded-full shadow-[0_0_25px_rgba(var(--primary-500-rgb),0.5)] animate-in fade-in slide-in-from-top-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex-none h-14 bg-slate-900/90 border-b border-white/10 px-4 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
            title="Đóng Photo Studio"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Quay Lại</span>
          </button>

          <div className="w-px h-5 bg-white/10"></div>

          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <span>🎨</span> NKI Photo Studio
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">
                2026 AI Pro
              </span>
            </span>
            {imageSize.width > 0 && (
              <span className="text-[10px] font-mono text-white/40 hidden md:inline">
                ({imageSize.width} × {imageSize.height} px)
              </span>
            )}
          </div>
        </div>

        {/* Center Controls: Undo, Redo, Zoom, Original Comparison */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-white/70 hover:text-white disabled:opacity-30 disabled:hover:text-white/70 transition-all"
              title="Hoàn tác (Ctrl+Z)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-white/70 hover:text-white disabled:opacity-30 disabled:hover:text-white/70 transition-all"
              title="Làm lại (Ctrl+Y)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setZoom(z => Math.max(0.1, Number((z - 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg text-white/70 hover:text-white transition-all text-xs"
              title="Thu nhỏ"
            >
              -
            </button>
            <span className="text-[11px] font-mono px-2 text-white/80 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(5.0, Number((z + 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg text-white/70 hover:text-white transition-all text-xs"
              title="Phóng to"
            >
              +
            </button>
            <button
              onClick={handleResetView}
              className="px-2 py-1 rounded-lg text-[10px] font-bold text-white/60 hover:text-white uppercase transition-all"
              title="Vừa màn hình"
            >
              Fit
            </button>
          </div>

          {/* Compare Original Button */}
          <button
            onMouseDown={() => setIsComparingOriginal(true)}
            onMouseUp={() => setIsComparingOriginal(false)}
            onMouseLeave={() => setIsComparingOriginal(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isComparingOriginal
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Nhấn giữ để xem ảnh gốc trước khi chỉnh sửa"
          >
            <span>👁️</span>
            <span className="hidden md:inline">Giữ xem ảnh gốc</span>
          </button>

          {/* Quick Clear Mask Button in Header */}
          {hasMask && (
            <button
              onClick={() => {
                clearMask();
                showToast('Đã xóa vùng chọn (Deselect)');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-in fade-in duration-150"
              title="Xóa bỏ nét cọ vùng chọn (Phím tắt: Esc hoặc Ctrl+D)"
            >
              <span className="text-red-400 font-black">✕</span>
              <span>Hủy Mask (Esc)</span>
            </button>
          )}
        </div>

        {/* Right Action Buttons: Save to Gallery & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToGallery}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            title="Lưu vào kho ảnh Gallery"
          >
            <span>🖼️</span>
            <span className="hidden sm:inline">Lưu Gallery</span>
          </button>

          <div className="relative group">
            <button
              onClick={() => handleDownload(antiAiActive ? 'anti_ai' : 'png')}
              disabled={isExporting}
              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-400 text-black text-xs font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{antiAiActive ? 'Tải Khử Dấu AI' : 'Xuất Ảnh'}</span>
            </button>

            {/* Export Dropdown Menu on hover */}
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-slate-900 border border-white/15 rounded-2xl p-2 w-48 shadow-2xl z-50">
              <button
                onClick={() => handleDownload('png')}
                className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-white font-medium flex items-center justify-between"
              >
                <span>Tải định dạng PNG</span>
                <span className="text-[10px] text-white/40">Lossless</span>
              </button>
              <button
                onClick={() => handleDownload('jpg')}
                className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-white font-medium flex items-center justify-between"
              >
                <span>Tải định dạng JPG</span>
                <span className="text-[10px] text-white/40">Chuẩn</span>
              </button>
              <button
                onClick={() => handleDownload('anti_ai')}
                className="w-full text-left px-3 py-2 text-xs rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-between mt-1 border border-emerald-500/20"
              >
                <span>🛡️ Tải Khử Dấu AI</span>
                <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">EXIF</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar Dock */}
        <aside className="w-16 flex-none bg-slate-900/80 border-r border-white/10 flex flex-col items-center py-3 gap-2 z-20 backdrop-blur-md">
          {/* Select Tool */}
          <button
            onClick={() => setActiveTool('select')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'select'
                ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.5)] font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Công cụ Di chuyển / Chọn (Phím V)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">V</span>
          </button>

          {/* Brush Mask Tool */}
          <button
            onClick={() => {
              setActiveTool('brush');
              setActiveTab('ai_magic');
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'brush'
                ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.5)] font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Cọ Quét Vùng Chọn AI Inpaint (Phím B)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">B</span>
          </button>

          {/* Eraser Tool */}
          <button
            onClick={() => setActiveTool('eraser')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'eraser'
                ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.5)] font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Tẩy nét quét cọ (Phím E)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">E</span>
          </button>

          {/* Crop Tool */}
          <button
            onClick={() => {
              setActiveTool('crop');
              setActiveTab('transform');
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'crop'
                ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.5)] font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Cắt khung hình (Phím C)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">C</span>
          </button>

          {/* Color Grading Tool */}
          <button
            onClick={() => {
              setActiveTool('color');
              setActiveTab('color_grading');
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'color_grading'
                ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.5)] font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Chỉnh màu nâng cao & Presets LUT (Phím G)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4 4 4 0 014-4c.48 0 .93.08 1.35.24A4 4 0 0113 9a4 4 0 014 4c0 .48-.08.93-.24 1.35A4 4 0 0121 17a4 4 0 01-4 4H7z" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">G</span>
          </button>

          {/* Hand Pan Tool */}
          <button
            onClick={() => setActiveTool('hand')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'hand'
                ? 'bg-primary-500 text-black shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.5)] font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Công cụ Bàn tay Pan di chuyển (Phím H hoặc Giữ Space)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">H</span>
          </button>

          <div className="w-8 h-px bg-white/10 my-2"></div>

          {/* Quick Clear Mask & Toggle Visibility */}
          {hasMask && (
            <>
              <button
                onClick={() => {
                  clearMask();
                  showToast('Đã xóa vùng chọn (Deselect)');
                }}
                className="w-11 h-11 rounded-2xl bg-red-500/25 hover:bg-red-500/40 text-red-300 border border-red-500/40 flex flex-col items-center justify-center transition-all shadow-[0_0_12px_rgba(239,68,68,0.25)] active:scale-95 animate-pulse"
                title="Hủy / Xóa sạch nét cọ vùng chọn (Phím Esc hoặc Ctrl+D)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-[7px] font-bold uppercase mt-0.5">Hủy B</span>
              </button>

              <button
                onClick={() => setIsMaskVisible(!isMaskVisible)}
                className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all border ${
                  isMaskVisible 
                    ? 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
                title={isMaskVisible ? "Tạm ẩn nét cọ để xem ảnh sạch" : "Hiện lại nét cọ"}
              >
                <span className="text-xs">{isMaskVisible ? '👁️' : '🙈'}</span>
                <span className="text-[7px] font-bold uppercase mt-0.5">{isMaskVisible ? 'Ẩn' : 'Hiện'}</span>
              </button>
            </>
          )}
        </aside>

        {/* Center Interactive Viewport */}
        <main
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`flex-1 relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950 flex items-center justify-center cursor-default ${
            activeTool === 'hand' || isPanning ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          {/* Empty State: Upload / Select Image */}
          {!currentImageSrc && (
            <div className="z-30 max-w-xl w-full p-8 mx-4 bg-slate-900/90 border-2 border-dashed border-white/20 rounded-3xl backdrop-blur-xl flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-3xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(var(--primary-500-rgb),0.2)]">
                🎨
              </div>
              <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">
                NKI AI Photo Studio Pro 2026
              </h2>
              <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-md">
                Chỉnh màu nâng cao 60 FPS (0 API token) & Retouch AI thông minh (Generative Fill, Magic Eraser, Magic Expand)
              </p>
              
              <label className="cursor-pointer px-6 py-3.5 bg-primary-500 hover:bg-primary-400 text-black text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2 mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Tải Ảnh Từ Máy Tính</span>
                <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
              </label>

              {galleryItems.length > 0 && (
                <div className="w-full pt-6 border-t border-white/10">
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-3">
                    Hoặc chọn nhanh từ Gallery ({galleryItems.length} ảnh)
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                    {galleryItems.slice(0, 12).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentImageSrc(item.src);
                          setOriginalImageSrc(item.src);
                          setHistory([item.src]);
                          setHistoryIndex(0);
                        }}
                        className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-primary-400 hover:scale-105 transition-all shadow-md group relative"
                        title={item.description || "Chọn ảnh này"}
                      >
                        <img src={item.src} className="w-full h-full object-cover" alt="Gallery item" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Top Floating Tool Options Bar (When Brush is active) */}
          {(activeTool === 'brush' || activeTool === 'eraser') && (
            <div 
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-white/20 px-3.5 py-1.5 rounded-2xl backdrop-blur-3xl flex items-center gap-3 shadow-[0_15px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] studio-overlay-interactive"
            >
              {/* Tool Switcher B / E */}
              <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
                <button
                  onClick={() => setActiveTool('brush')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    activeTool === 'brush' ? 'bg-primary-500 text-black shadow-md' : 'text-white/60 hover:text-white'
                  }`}
                  title="Cọ Quét Vùng Chọn (Phím B)"
                >
                  <span>🖌️</span>
                  <span>Cọ (B)</span>
                </button>
                <button
                  onClick={() => setActiveTool('eraser')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    activeTool === 'eraser' ? 'bg-primary-500 text-black shadow-md' : 'text-white/60 hover:text-white'
                  }`}
                  title="Tẩy Nét Cọ (Phím E)"
                >
                  <span>🧹</span>
                  <span>Tẩy (E)</span>
                </button>
              </div>

              <div className="w-px h-5 bg-white/15"></div>

              {/* Brush Size */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white/70">Cỡ:</span>
                <input
                  type="range"
                  min="4"
                  max="250"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-20 sm:w-24 accent-primary-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                />
                <EditableNumberInput
                  value={brushSize}
                  min={4}
                  max={300}
                  step={2}
                  unit="px"
                  colorClass="text-primary-400"
                  widthClass="w-12"
                  onChange={(v) => setBrushSize(v)}
                />
              </div>

              <div className="w-px h-4 bg-white/10"></div>

              {/* Brush Hardness */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white/70">Mềm:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={brushHardness}
                  onChange={(e) => setBrushHardness(Number(e.target.value))}
                  className="w-16 accent-primary-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                />
                <EditableNumberInput
                  value={Math.round(brushHardness * 100)}
                  min={10}
                  max={100}
                  step={5}
                  unit="%"
                  colorClass="text-white/90"
                  widthClass="w-12"
                  onChange={(v) => setBrushHardness(v / 100)}
                />
              </div>

              <div className="w-px h-5 bg-white/15"></div>

              {/* Clear Mask Button */}
              {hasMask && (
                <>
                  <button
                    onClick={() => setIsMaskVisible(!isMaskVisible)}
                    className={`px-2 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                      isMaskVisible 
                        ? 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                    title={isMaskVisible ? "Tạm ẩn nét cọ để xem ảnh sạch" : "Hiện lại nét cọ"}
                  >
                    <span>{isMaskVisible ? '👁️' : '🙈'}</span>
                    <span>{isMaskVisible ? 'Ẩn' : 'Hiện'}</span>
                  </button>

                  <button
                    onClick={() => {
                      clearMask();
                      showToast('Đã xóa bỏ vùng chọn (Deselect)');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-red-500/30 hover:bg-red-500 text-red-200 hover:text-white border border-red-500/50 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-md"
                    title="Xóa bỏ nét cọ vùng chọn (Esc hoặc Ctrl+D)"
                  >
                    <span>✕</span>
                    <span>Hủy Vùng Chọn (Esc)</span>
                  </button>
                </>
              )}

              {/* Exit Brush Mode Button */}
              <button
                onClick={() => setActiveTool('select')}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 border border-white/15 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                title="Thoát chế độ vẽ cọ, chuyển về công cụ Chọn/Di chuyển (Phím V hoặc Esc)"
              >
                <span>Thoát Cọ (V)</span>
              </button>
            </div>
          )}

          {/* Floating Mask Indicator Capsule (when mask exists but user is not in brush/eraser) */}
          {hasMask && activeTool !== 'brush' && activeTool !== 'eraser' && (
            <div 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-red-500/40 px-3.5 py-1.5 rounded-2xl backdrop-blur-2xl flex items-center gap-2.5 shadow-[0_12px_40px_rgba(239,68,68,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] animate-in fade-in slide-in-from-top-3 duration-200 studio-overlay-interactive"
            >
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>Vùng Chọn (Mask) Đang Có</span>
              </div>
              <div className="w-px h-4 bg-white/15"></div>
              <button
                onClick={() => setIsMaskVisible(!isMaskVisible)}
                className={`px-2 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                  isMaskVisible ? 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
                title={isMaskVisible ? "Tạm ẩn nét cọ để xem ảnh sạch" : "Hiện lại nét cọ"}
              >
                <span>{isMaskVisible ? '👁️' : '🙈'}</span>
                <span>{isMaskVisible ? 'Ẩn' : 'Hiện'}</span>
              </button>
              <button
                onClick={() => {
                  clearMask();
                  showToast('Đã xóa bỏ vùng chọn (Deselect)');
                }}
                className="px-2.5 py-1 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 transition-all shadow-md active:scale-95"
                title="Xóa bỏ hoàn toàn nét cọ (Esc hoặc Ctrl+D)"
              >
                <span>✕</span>
                <span>Xóa Vùng Chọn (Esc)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTool('brush');
                  setActiveTab('ai_magic');
                }}
                className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-semibold border border-white/10 transition-all"
                title="Quay lại vẽ tiếp cọ (B)"
              >
                <span>Tiếp Tục Vẽ (B)</span>
              </button>
            </div>
          )}

          {/* Canvas Rendering Box (Transformed with Pan & Zoom) */}
          <div
            className="absolute top-0 left-0 origin-top-left pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: imageSize.width,
              height: imageSize.height
            }}
          >
            {/* Main Rendered Image Canvas */}
            <canvas
              ref={mainCanvasRef}
              className="absolute top-0 left-0 shadow-2xl rounded-sm"
              style={{ width: imageSize.width, height: imageSize.height }}
            />

            {/* Mask Overlay Canvas */}
            <canvas
              ref={maskCanvasRef}
              className={`absolute top-0 left-0 pointer-events-none transition-opacity duration-150 ${
                isMaskVisible ? 'opacity-90' : 'opacity-0'
              }`}
              style={{ width: imageSize.width, height: imageSize.height }}
            />

            {/* Crop Overlay when Crop tool is active */}
            {activeTool === 'crop' && cropBox && (
              <div
                className="absolute border-2 border-primary-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-auto cursor-move"
                style={{
                  left: cropBox.x,
                  top: cropBox.y,
                  width: cropBox.width,
                  height: cropBox.height
                }}
              >
                {/* 3x3 Grid Guidelines */}
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white/60"></div>
                  <div className="border-r border-b border-white/60"></div>
                  <div className="border-b border-white/60"></div>
                  <div className="border-r border-b border-white/60"></div>
                  <div className="border-r border-b border-white/60"></div>
                  <div className="border-b border-white/60"></div>
                  <div className="border-r border-white/60"></div>
                  <div className="border-r border-white/60"></div>
                  <div></div>
                </div>

                {/* Resize Handle SE */}
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary-400 border border-black rounded-full cursor-se-resize"></div>

                {/* Floating Apply Crop Button */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                  <button
                    onClick={handleApplyCrop}
                    className="px-3 py-1 bg-primary-500 text-black text-xs font-black rounded-lg shadow-xl uppercase tracking-wider"
                  >
                    ✓ Cắt Ảnh
                  </button>
                  <button
                    onClick={() => setActiveTool('select')}
                    className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-lg shadow-xl uppercase"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* Brush Circle Cursor indicator (only within image bounds) */}
            {cursorPos && (activeTool === 'brush' || activeTool === 'eraser') && 
             cursorPos.x >= 0 && cursorPos.x <= imageSize.width && cursorPos.y >= 0 && cursorPos.y <= imageSize.height && (
              <div
                className="absolute rounded-full border border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                style={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  width: brushSize,
                  height: brushSize,
                  backgroundColor: activeTool === 'eraser' ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.3)'
                }}
              />
            )}
          </div>

          {/* AI Execution Loading Modal */}
          {isAiLoading && (
            <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-400 rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">
                AI Copilot đang xử lý
              </h3>
              <p className="text-sm text-primary-300 font-mono text-center max-w-md animate-pulse">
                {aiLoadingMessage}
              </p>
              <span className="text-[10px] text-white/40 mt-4 uppercase tracking-widest">
                Đang sử dụng model {selectedModel}
              </span>
            </div>
          )}
        </main>

        {/* Right Inspector & Controls Sidebar */}
        <aside className="w-80 md:w-96 flex-none bg-slate-900/90 border-l border-white/10 flex flex-col z-20 backdrop-blur-md">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-white/10 p-1.5 bg-black/20 gap-1">
            <button
              onClick={() => {
                setActiveTab('ai_magic');
                if (activeTool === 'select' || activeTool === 'color') {
                  setActiveTool('brush');
                }
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ai_magic'
                  ? 'bg-primary-500 text-black shadow-lg font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>✨</span>
              <span>AI Magic</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('color_grading');
                if (activeTool === 'brush' || activeTool === 'eraser') {
                  setActiveTool('select');
                }
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'color_grading'
                  ? 'bg-amber-400 text-black shadow-lg font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>🎨</span>
              <span>Chỉnh Màu</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('transform');
                if (activeTool === 'brush' || activeTool === 'eraser') {
                  setActiveTool('select');
                }
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'transform'
                  ? 'bg-indigo-500 text-white shadow-lg font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>🔄</span>
              <span>Biến Đổi</span>
            </button>
          </div>

          {/* Sidebar Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {/* AI Error Alert */}
            {aiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-300">
                <span className="text-red-400 text-base">⚠️</span>
                <div className="flex-1">
                  <p className="font-bold">Không thể thực hiện:</p>
                  <p className="text-[11px] text-red-200/80 mt-0.5">{aiError}</p>
                </div>
                <button onClick={() => setAiError(null)} className="text-red-400 font-bold text-sm">×</button>
              </div>
            )}

            {/* TAB 1: AI MAGIC (Canva & Photoshop 2026 AI) */}
            {activeTab === 'ai_magic' && (
              <div className="space-y-4">
                {/* Zero API Badge Info */}
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <p className="text-[11px] text-white/60 leading-tight">
                    <strong className="text-primary-400">0 API Token:</strong> Chỉnh màu, xoay lật, crop chạy trực tiếp trên máy. Chỉ tốn API khi gọi các công cụ AI dưới đây.
                  </p>
                </div>

                {/* Sub-Actions: Generative Fill, Magic Eraser, Expand, Background */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setActiveAiAction('inpaint');
                      setActiveTool('brush');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      activeAiAction === 'inpaint'
                        ? 'bg-primary-500/15 border-primary-500 text-white shadow-[0_0_12px_rgba(var(--primary-500-rgb),0.2)]'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">✨</span>
                      <span className="text-[8px] font-mono font-bold bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded">Inpaint</span>
                    </div>
                    <div className="text-xs font-bold leading-tight">Generative Fill</div>
                    <div className="text-[10px] text-white/40 mt-0.5">Vẽ thêm / Đổi đồ vật</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveAiAction('eraser');
                      setActiveTool('brush');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      activeAiAction === 'eraser'
                        ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">🧹</span>
                      <span className="text-[8px] font-mono font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">Remove</span>
                    </div>
                    <div className="text-xs font-bold leading-tight">Magic Eraser</div>
                    <div className="text-[10px] text-white/40 mt-0.5">Xóa người & vật thể</div>
                  </button>

                  <button
                    onClick={() => setActiveAiAction('expand')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      activeAiAction === 'expand'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">📐</span>
                      <span className="text-[8px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">Outpaint</span>
                    </div>
                    <div className="text-xs font-bold leading-tight">Magic Expand</div>
                    <div className="text-[10px] text-white/40 mt-0.5">Mở rộng khung cảnh</div>
                  </button>

                  <button
                    onClick={() => setActiveAiAction('bg_replace')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      activeAiAction === 'bg_replace'
                        ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">🌅</span>
                      <span className="text-[8px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Backdrop</span>
                    </div>
                    <div className="text-xs font-bold leading-tight">Đổi Nền Mới</div>
                    <div className="text-[10px] text-white/40 mt-0.5">Tách nền & ghép cảnh</div>
                  </button>
                </div>

                {/* Sub Action Specific UI */}
                {activeAiAction === 'inpaint' && (
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>✨</span> Mô tả Generative Fill:
                      </label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        hasMask ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {hasMask ? '✓ Đã chọn vùng' : 'Chưa quét cọ'}
                      </span>
                    </div>

                    <textarea
                      value={inpaintPrompt}
                      onChange={(e) => setInpaintPrompt(e.target.value)}
                      placeholder="VD: Thêm kính râm phi công mạ vàng, thay đổi thành áo sơ mi lụa trắng, thêm hình xăm cá chép..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-500 transition-all custom-scrollbar"
                    />

                    <div className="flex items-center justify-between text-[11px] text-white/50">
                      <span>Dùng cọ đỏ quét lên vị trí muốn thay đổi</span>
                      {hasMask && (
                        <button 
                          onClick={() => {
                            clearMask();
                            showToast('Đã xóa nét cọ');
                          }} 
                          className="text-red-400 hover:text-red-300 font-bold hover:underline"
                        >
                          ✕ Hủy cọ (Esc)
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleExecuteGenerativeFill}
                      disabled={isAiLoading || !hasMask || !inpaintPrompt.trim()}
                      className="w-full py-3 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>✨</span>
                      <span>Tạo Với AI (Generative Fill)</span>
                    </button>
                  </div>
                )}

                {activeAiAction === 'eraser' && (
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🧹</span> Xóa Vật Thể (Content-Aware):
                      </label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        hasMask ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {hasMask ? '✓ Đã chọn vật thể' : 'Chưa quét cọ'}
                      </span>
                    </div>

                    <p className="text-xs text-white/60 leading-relaxed">
                      Dùng cọ quét phủ kín toàn bộ người lạ, vật thể thừa, dây điện hoặc watermark. AI sẽ tự động xóa sạch và tái tạo nền phía sau một cách liền mạch.
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-white/50">
                      <span>Quét phủ kín vật thể thừa</span>
                      {hasMask && (
                        <button 
                          onClick={() => {
                            clearMask();
                            showToast('Đã xóa nét cọ');
                          }} 
                          className="text-red-400 hover:text-red-300 font-bold hover:underline"
                        >
                          ✕ Hủy cọ (Esc)
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleExecuteMagicEraser}
                      disabled={isAiLoading || !hasMask}
                      className="w-full py-3 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>🧹</span>
                      <span>Xóa Vật Thể Ngay</span>
                    </button>
                  </div>
                )}

                {activeAiAction === 'expand' && (
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-xs font-bold text-white block">
                      Tỉ lệ mở rộng khung cảnh mục tiêu:
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      {['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setExpandRatio(ratio)}
                          className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                            expandRatio === ratio
                              ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-md'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-white/60 block mb-1">
                        Mô tả chi tiết bổ sung (tùy chọn):
                      </label>
                      <input
                        type="text"
                        value={expandPrompt}
                        onChange={(e) => setExpandPrompt(e.target.value)}
                        placeholder="VD: Cánh đồng hoa dã quỳ trải dài hai bên..."
                        className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      onClick={handleExecuteMagicExpand}
                      disabled={isAiLoading}
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>📐</span>
                      <span>Mở Rộng Khung Hình (Magic Expand)</span>
                    </button>
                  </div>
                )}

                {activeAiAction === 'bg_replace' && (
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-xs font-bold text-white block">
                      Mô tả bối cảnh / phông nền mới:
                    </label>

                    <textarea
                      value={bgPrompt}
                      onChange={(e) => setBgPrompt(e.target.value)}
                      placeholder="VD: Đường phố Tokyo rực rỡ ánh đèn neon về đêm trong cơn mưa phùn..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-all custom-scrollbar"
                    />

                    <button
                      onClick={handleExecuteBgReplace}
                      disabled={isAiLoading || !bgPrompt.trim()}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>🌅</span>
                      <span>Thay Nền Mới Bằng AI</span>
                    </button>
                  </div>
                )}

                {/* Model Selector */}
                <div className="pt-2 border-t border-white/10">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                    Engine AI
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                  >
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                        {m.label} ({m.description})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* TAB 2: ADVANCED COLOR GRADING (100% Local, Zero-API) */}
            {activeTab === 'color_grading' && (
              <div className="space-y-5">
                {/* Presets Management Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🎨</span>
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                        Thư Viện Presets
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsSavingPresetModalOpen(true)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1"
                        title="Lưu các thông số màu hiện tại thành preset mới vào thư viện"
                      >
                        <span>💾</span>
                        <span>Lưu Preset</span>
                      </button>
                      {activePresetId && (
                        <button
                          onClick={resetColorAdjustments}
                          className="text-[10px] text-white/50 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          Đặt lại
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Modal / Dialog for Saving New Preset */}
                  {isSavingPresetModalOpen && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300">Đặt tên cho Preset mới:</span>
                        <button
                          onClick={() => setIsSavingPresetModalOpen(false)}
                          className="text-white/50 hover:text-white text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCurrentAsPreset();
                          if (e.key === 'Escape') setIsSavingPresetModalOpen(false);
                        }}
                        placeholder="VD: Tone Da Hàn Quốc, Moody Teal, Hoàng Hôn..."
                        className="w-full bg-black/60 border border-white/20 rounded-xl p-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setIsSavingPresetModalOpen(false)}
                          className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white/70 text-xs font-semibold rounded-lg transition-all"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveCurrentAsPreset}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-all shadow-md active:scale-95"
                        >
                          Lưu Lại
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filter Tabs: Tất Cả | Của Tôi (N) | Điện Ảnh (8) */}
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1 text-[11px] font-bold">
                    <button
                      onClick={() => setPresetFilter('all')}
                      className={`flex-1 py-1 rounded-lg transition-all ${
                        presetFilter === 'all' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Tất Cả
                    </button>
                    <button
                      onClick={() => setPresetFilter('custom')}
                      className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                        presetFilter === 'custom' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <span>⭐ Của Tôi</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">{customPresets.length}</span>
                    </button>
                    <button
                      onClick={() => setPresetFilter('cinematic')}
                      className={`flex-1 py-1 rounded-lg transition-all ${
                        presetFilter === 'cinematic' ? 'bg-amber-400 text-black shadow-sm' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      🎬 LUT Mẫu ({CINEMATIC_COLOR_PRESETS.length})
                    </button>
                  </div>

                  {/* Custom Presets Grid */}
                  {(presetFilter === 'all' || presetFilter === 'custom') && customPresets.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-white/50 px-1 font-bold">
                        <span>⭐ Preset Của Tôi:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportPresets}
                            className="hover:text-amber-300 transition-colors"
                            title="Xuất danh sách preset ra file JSON để sao lưu"
                          >
                            Xuất JSON
                          </button>
                          <span>•</span>
                          <label className="hover:text-amber-300 transition-colors cursor-pointer" title="Nhập preset từ file JSON">
                            Nhập JSON
                            <input
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={handleImportPresets}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {customPresets.map((preset) => {
                          const isActive = activePresetId === preset.id;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => applyCustomPreset(preset)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer group relative ${
                                isActive
                                  ? 'bg-amber-400/20 border-amber-400 text-white shadow-md'
                                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                                <button
                                  onClick={(e) => handleDeleteCustomPreset(preset.id, preset.name, e)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity text-[11px]"
                                  title="Xóa preset này"
                                >
                                  🗑️
                                </button>
                              </div>
                              <div className="text-xs font-bold leading-tight truncate">{preset.name}</div>
                              <div className="text-[9px] text-white/40 mt-0.5">Tùy chỉnh</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {presetFilter === 'custom' && customPresets.length === 0 && (
                    <div className="p-4 bg-white/5 border border-dashed border-white/15 rounded-2xl text-center space-y-2">
                      <span className="text-2xl block">💡</span>
                      <p className="text-xs text-white/70 font-medium">Chưa có preset tự lưu nào</p>
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        Chỉnh các thanh trượt bên dưới theo ý thích rồi nhấn <strong className="text-amber-400">"Lưu Preset"</strong> để tái sử dụng cho các bức ảnh khác!
                      </p>
                    </div>
                  )}

                  {/* Built-in Cinematic Presets (LUTs) */}
                  {(presetFilter === 'all' || presetFilter === 'cinematic') && (
                    <div className="space-y-1.5">
                      {presetFilter === 'all' && (
                        <div className="text-[11px] text-white/50 px-1 font-bold">
                          🎬 Presets Điện Ảnh Mẫu:
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {CINEMATIC_COLOR_PRESETS.map((preset) => {
                          const isActive = activePresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => applyPresetLut(preset)}
                              className={`p-2.5 rounded-xl border text-left transition-all ${
                                isActive
                                  ? 'bg-amber-400/20 border-amber-400 text-white shadow-md'
                                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: preset.badgeColor }}
                                />
                                <span className="text-[8px] font-mono text-white/40">{preset.category}</span>
                              </div>
                              <div className="text-xs font-bold leading-tight truncate">{preset.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Light & Tone */}
                <div className="space-y-3.5 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-wider block">
                    Ánh Sáng (Light & Tone)
                  </span>

                  <AdjustmentSliderRow
                    label="Phơi sáng (Exposure)"
                    min={-100}
                    max={100}
                    value={adjustments.exposure}
                    onChange={(val) => setAdjustments({ ...adjustments, exposure: val })}
                  />

                  <AdjustmentSliderRow
                    label="Độ sáng (Brightness)"
                    min={-100}
                    max={100}
                    value={adjustments.brightness}
                    onChange={(val) => setAdjustments({ ...adjustments, brightness: val })}
                  />

                  <AdjustmentSliderRow
                    label="Độ tương phản (Contrast)"
                    min={-100}
                    max={100}
                    value={adjustments.contrast}
                    onChange={(val) => setAdjustments({ ...adjustments, contrast: val })}
                  />

                  <AdjustmentSliderRow
                    label="Vùng sáng (Highlights)"
                    min={-100}
                    max={100}
                    value={adjustments.highlights}
                    onChange={(val) => setAdjustments({ ...adjustments, highlights: val })}
                  />

                  <AdjustmentSliderRow
                    label="Vùng tối (Shadows)"
                    min={-100}
                    max={100}
                    value={adjustments.shadows}
                    onChange={(val) => setAdjustments({ ...adjustments, shadows: val })}
                  />
                </div>

                {/* Section: Color & Temperature */}
                <div className="space-y-3.5 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-wider block">
                    Màu Sắc (Color Balance)
                  </span>

                  <AdjustmentSliderRow
                    label="Nhiệt độ (Temperature)"
                    sublabel="Lạnh ↔ Ấm"
                    min={-100}
                    max={100}
                    value={adjustments.temperature}
                    sliderBgClass="h-1.5 bg-gradient-to-r from-blue-500 via-white/20 to-amber-500"
                    onChange={(val) => setAdjustments({ ...adjustments, temperature: val })}
                  />

                  <AdjustmentSliderRow
                    label="Sắc thái (Tint)"
                    sublabel="Lục ↔ Đỏ tía"
                    min={-100}
                    max={100}
                    value={adjustments.tint}
                    sliderBgClass="h-1.5 bg-gradient-to-r from-emerald-500 via-white/20 to-pink-500"
                    onChange={(val) => setAdjustments({ ...adjustments, tint: val })}
                  />

                  <AdjustmentSliderRow
                    label="Sắc độ thông minh (Vibrance)"
                    min={-100}
                    max={100}
                    value={adjustments.vibrance}
                    onChange={(val) => setAdjustments({ ...adjustments, vibrance: val })}
                  />

                  <AdjustmentSliderRow
                    label="Độ bão hòa (Saturation)"
                    min={-100}
                    max={100}
                    value={adjustments.saturation}
                    onChange={(val) => setAdjustments({ ...adjustments, saturation: val })}
                  />
                </div>

                {/* Section: Details & Film Effects */}
                <div className="space-y-3.5 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-wider block">
                    Chi Tiết & Hạt Phim (Texture & FX)
                  </span>

                  <AdjustmentSliderRow
                    label="Độ trong & nét (Clarity)"
                    min={-100}
                    max={100}
                    value={adjustments.clarity}
                    onChange={(val) => setAdjustments({ ...adjustments, clarity: val })}
                  />

                  <AdjustmentSliderRow
                    label="Độ sắc cạnh (Sharpness)"
                    min={0}
                    max={100}
                    value={adjustments.sharpness}
                    onChange={(val) => setAdjustments({ ...adjustments, sharpness: val })}
                  />

                  <AdjustmentSliderRow
                    label="Hạt phim cổ điển (Film Grain)"
                    min={0}
                    max={100}
                    value={adjustments.filmGrain}
                    onChange={(val) => setAdjustments({ ...adjustments, filmGrain: val })}
                  />

                  <AdjustmentSliderRow
                    label="Làm tối góc (Vignette)"
                    min={0}
                    max={100}
                    value={adjustments.vignette}
                    onChange={(val) => setAdjustments({ ...adjustments, vignette: val })}
                  />
                </div>

                {/* Bake Button */}
                <div className="flex gap-2">
                  <button
                    onClick={bakeAdjustments}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Lưu Cố Định Màu
                  </button>
                  <button
                    onClick={resetColorAdjustments}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: TRANSFORM & LAYERS */}
            {activeTab === 'transform' && (
              <div className="space-y-5">
                {/* Rotate & Flip (0 API calls) */}
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-wider block">
                    Xoay & Lật (Transform)
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRotate(false)}
                      className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span>Xoay -90°</span>
                    </button>

                    <button
                      onClick={() => handleRotate(true)}
                      className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                      </svg>
                      <span>Xoay +90°</span>
                    </button>

                    <button
                      onClick={() => handleFlip(true)}
                      className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <span>↔ Lật Ngang</span>
                    </button>

                    <button
                      onClick={() => handleFlip(false)}
                      className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <span>↕ Lật Dọc</span>
                    </button>
                  </div>
                </div>

                {/* Crop Aspect Presets */}
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-wider block">
                    Cắt Khung Hình (Crop Tool)
                  </span>

                  <button
                    onClick={() => setActiveTool('crop')}
                    className="w-full py-2.5 bg-primary-500 hover:bg-primary-400 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>C</span>
                    <span>Bật Vùng Chọn Cắt Ảnh</span>
                  </button>
                </div>

                {/* History Stack List */}
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-wider block">
                    Lịch Sử Thao Tác ({history.length} bước)
                  </span>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {history.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setHistoryIndex(idx);
                          setCurrentImageSrc(history[idx]);
                          clearMask();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                          idx === historyIndex
                            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 font-bold'
                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        <span>Bước #{idx + 1} {idx === 0 ? '(Gốc)' : ''}</span>
                        {idx === historyIndex && <span>Active</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
