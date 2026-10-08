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
import { SmartSegmentToolbar } from './SmartSegmentToolbar';
import { LayerStackPanel } from './LayerStackPanel';
import { GoboProjectorPanel } from './GoboProjectorPanel';
import { VirtualWardrobePanel } from './VirtualWardrobePanel';
import { ExpressionSculptorPanel } from './ExpressionSculptorPanel';
import { AtmosphereWeatherPanel } from './AtmosphereWeatherPanel';
import { BeautyRetouchPanel } from './BeautyRetouchPanel';
import { OpticalBokehPanel } from './OpticalBokehPanel';
import { StudioLighting3DPanel } from './StudioLighting3DPanel';
import { PhotoshopCurvesPanel } from './PhotoshopCurvesPanel';
import { PhotoshopHslPanel } from './PhotoshopHslPanel';
import { PhotoshopLiquifyPanel } from './PhotoshopLiquifyPanel';
import { PhotoshopRetouchBrushesPanel } from './PhotoshopRetouchBrushesPanel';
import {
  StudioLayer,
  StudioBlendMode,
  createBaseLayer,
  createAiLayer,
  compositeLayersToCanvas,
  flattenLayers
} from '../../services/studioLayerService';
import {
  PhotoshopCurvesSettings,
  DEFAULT_CURVES_SETTINGS,
  computeHistogram,
  applyPhotoshopCurvesToImageData,
  ImageHistogram
} from '../../services/photoshopCurvesService';
import {
  HslSettings,
  DEFAULT_HSL_SETTINGS,
  applyPhotoshopHslToImageData
} from '../../services/photoshopHslService';
import {
  LiquifyBrushSettings,
  DEFAULT_LIQUIFY_SETTINGS,
  applyLiquifyStroke
} from '../../services/photoshopLiquifyService';
import {
  DodgeBurnSettings,
  DEFAULT_DODGE_BURN_SETTINGS,
  applyDodgeBurnStamp,
  CloneStampSettings,
  DEFAULT_CLONE_STAMP_SETTINGS,
  applyCloneStamp
} from '../../services/photoshopRetouchBrushService';

export interface PhotoStudioWorkspaceProps {
  initialImageSrc?: string | null;
  onClose: () => void;
  onSaveToGallery?: (item: GalleryItem) => void;
  galleryItems?: GalleryItem[];
}

type StudioTool =
  | 'select'
  | 'brush'
  | 'eraser'
  | 'crop'
  | 'color'
  | 'hand'
  | 'curves'
  | 'hsl'
  | 'liquify'
  | 'dodge_burn'
  | 'clone_stamp';
type RightSidebarTab =
  | 'ai_magic'
  | 'beauty_retouch'
  | 'optical_bokeh'
  | 'studio_lighting'
  | 'color_grading'
  | 'curves'
  | 'hsl'
  | 'liquify'
  | 'retouch_brushes'
  | 'layers'
  | 'gobo'
  | 'wardrobe'
  | 'expression'
  | 'atmosphere'
  | 'transform';
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

  // Multi-Layer Neural Composite State (v4.3 / v5.0)
  const [layers, setLayers] = useState<StudioLayer[]>(() =>
    initialImageSrc ? [createBaseLayer(initialImageSrc)] : []
  );
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-base');

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

  // Photoshop Pro Suite States (100% Zero-API)
  const [curvesSettings, setCurvesSettings] = useState<PhotoshopCurvesSettings>(DEFAULT_CURVES_SETTINGS);
  const [histogram, setHistogram] = useState<ImageHistogram | null>(null);

  const [hslSettings, setHslSettings] = useState<HslSettings>(DEFAULT_HSL_SETTINGS);

  const [liquifySettings, setLiquifySettings] = useState<LiquifyBrushSettings>(DEFAULT_LIQUIFY_SETTINGS);
  const [liquifyOriginalData, setLiquifyOriginalData] = useState<ImageData | null>(null);
  const liquifyLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [retouchBrushType, setRetouchBrushType] = useState<'dodge_burn' | 'clone_stamp'>('dodge_burn');
  const [dodgeBurnSettings, setDodgeBurnSettings] = useState<DodgeBurnSettings>(DEFAULT_DODGE_BURN_SETTINGS);
  const [cloneStampSettings, setCloneStampSettings] = useState<CloneStampSettings>(DEFAULT_CLONE_STAMP_SETTINGS);
  const [cloneSourceSnapshot, setCloneSourceSnapshot] = useState<ImageData | null>(null);
  const cloneStrokeStartRef = useRef<{ x: number; y: number } | null>(null);

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

  // Optical Bokeh Focus Point Picker State (v4.3)
  const [isPickingFocus, setIsPickingFocus] = useState<boolean>(false);
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.35 });

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

  // Real-time histogram calculator for Curves & Levels
  const refreshHistogram = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;
    try {
      const imgData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
      setHistogram(computeHistogram(imgData));
    } catch (e) {
      console.warn('Histogram compute error', e);
    }
  }, []);

  // Sync base layer when initialImageSrc changes
  useEffect(() => {
    if (initialImageSrc && layers.length === 0) {
      setLayers([createBaseLayer(initialImageSrc)]);
    }
  }, [initialImageSrc, layers.length]);

  // Apply Smart Segment Mask onto mask canvas (SAM 2)
  const handleApplyMaskDataUrl = useCallback((maskDataUrl: string) => {
    const maskImg = new Image();
    maskImg.crossOrigin = 'anonymous';
    maskImg.onload = () => {
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        const ctx = maskCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
          ctx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);

          // Convert white pixels to red 60% overlay
          const imgData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i] > 120 || d[i + 1] > 120 || d[i + 2] > 120) {
              d[i] = 239;     // R
              d[i + 1] = 68;  // G
              d[i + 2] = 68;  // B
              d[i + 3] = 160; // A
            } else {
              d[i + 3] = 0;   // Transparent
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }
      setHasMask(true);
      setIsMaskVisible(true);
      showToast('Đã tự động bóc tách vùng chọn (SAM 2)');
    };
    maskImg.src = maskDataUrl;
  }, []);

  // Invert active mask
  const handleInvertMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 20) {
        d[i + 3] = 0;
      } else {
        d[i] = 239;
        d[i + 1] = 68;
        d[i + 2] = 68;
        d[i + 3] = 160;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    setHasMask(true);
    showToast('Đã đảo ngược vùng chọn mask');
  }, []);

  // Layer Operations
  const handleAddLayer = useCallback(() => {
    if (!currentImageSrc) return;
    const newLayer = createAiLayer('', `Layer ${layers.length + 1}`, 'paint');
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    showToast('Đã thêm Layer mới');
  }, [currentImageSrc, layers.length]);

  const handleDeleteLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setActiveLayerId('layer-base');
    showToast('Đã xóa Layer');
  }, []);

  const handleDuplicateLayer = useCallback((id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    const dup: StudioLayer = {
      ...target,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      name: `${target.name} (Bản sao)`
    };
    setLayers((prev) => [...prev, dup]);
    setActiveLayerId(dup.id);
    showToast('Đã nhân bản Layer');
  }, [layers]);

  const handleFlattenLayers = useCallback(async () => {
    if (layers.length <= 1) return;
    try {
      const flattened = await flattenLayers(layers, imageSize.width, imageSize.height);
      setLayers([createBaseLayer(flattened)]);
      setActiveLayerId('layer-base');
      pushHistory(flattened);
      showToast('Đã gộp tất cả Layer thành một ảnh');
    } catch (e) {
      console.error('Lỗi flatten layers:', e);
    }
  }, [layers, imageSize, pushHistory]);

  const handleToggleLayerVisibility = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  const handleChangeLayerOpacity = useCallback((id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  }, []);

  const handleChangeLayerBlendMode = useCallback((id: string, blendMode: StudioBlendMode) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, blendMode } : l))
    );
  }, []);

  // Apply Gobo Layer
  const handleApplyGoboLayer = useCallback((goboDataUrl: string, name: string) => {
    const newLayer: StudioLayer = {
      id: `layer-gobo-${Date.now()}`,
      name,
      type: 'gobo',
      visible: true,
      opacity: 0.85,
      blendMode: 'screen',
      dataUrl: goboDataUrl
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    showToast('Đã tạo Layer Gobo Chiếu Sáng');
  }, []);

  // Apply Atmosphere Layer
  const handleApplyAtmosphereLayer = useCallback((dataUrl: string, name: string) => {
    const newLayer: StudioLayer = {
      id: `layer-atmo-${Date.now()}`,
      name,
      type: 'atmosphere',
      visible: true,
      opacity: 0.85,
      blendMode: 'screen',
      dataUrl
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    showToast('Đã tạo Layer Khí Quyển');
  }, []);

  // Breakthrough AI output integration helper
  const handleApplyStudioAiPatch = useCallback((resultImageSrc: string, actionName: string) => {
    pushHistory(resultImageSrc);
    const newLayer = createAiLayer(resultImageSrc, actionName, 'ai_patch');
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    clearMask();
    showToast(`${actionName} hoàn tất`);
  }, [pushHistory, clearMask]);

  // Zero-API Client-side Canvas output integration helper
  const handleApplyCanvasResult = useCallback((newCanvas: HTMLCanvasElement, actionName: string) => {
    const dataUrl = newCanvas.toDataURL('image/png');
    pushHistory(dataUrl);
    const newLayer = createAiLayer(dataUrl, actionName, 'ai_patch');
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    clearMask();
    showToast(`${actionName} hoàn tất (0 API)`);
  }, [pushHistory, clearMask]);

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
      setTimeout(refreshHistogram, 60);
    };
    img.src = currentImageSrc;
  }, [currentImageSrc]);

  // Real-time render main canvas with multi-layer composite and color grading adjustments
  const renderMainCanvas = useCallback(async () => {
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

    if (layers.length > 1) {
      await compositeLayersToCanvas(mainCanvas, layers);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mainCanvas.width;
      tempCanvas.height = mainCanvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(mainCanvas, 0, 0);
        renderWithAdjustments(tempCanvas, mainCanvas, adjustments);
      }
    } else {
      renderWithAdjustments(baseImg, mainCanvas, adjustments);
    }
  }, [adjustments, isComparingOriginal, originalImageSrc, layers]);

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

    // Pan mode: Middle click OR Hand tool OR Space held (unless Alt key is pressed for Clone Stamp sampling)
    if (e.button === 1 || activeTool === 'hand' || (e.altKey && activeTool !== 'clone_stamp')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button === 0) { // Left Click
      // 0. Focus picker click for Optical Bokeh
      if (isPickingFocus) {
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        if (coords.x >= 0 && coords.x <= imageSize.width && coords.y >= 0 && coords.y <= imageSize.height) {
          const normX = Math.max(0, Math.min(1, coords.x / imageSize.width));
          const normY = Math.max(0, Math.min(1, coords.y / imageSize.height));
          setFocalPoint({ x: normX, y: normY });
          setIsPickingFocus(false);
          showToast(`Đã chọn điểm nét tại (${Math.round(normX * 100)}%, ${Math.round(normY * 100)}%)`);
          return;
        }
      }

      // Clone Stamp Alt+Click source sampling
      if (activeTool === 'clone_stamp' && (e.altKey || !cloneStampSettings.sourcePoint)) {
        if (e.altKey) {
          const coords = clientToCanvasCoords(e.clientX, e.clientY);
          setCloneStampSettings(prev => ({ ...prev, sourcePoint: coords }));
          const mainCanvas = mainCanvasRef.current;
          if (mainCanvas) {
            const ctx = mainCanvas.getContext('2d');
            if (ctx) {
              setCloneSourceSnapshot(ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height));
            }
          }
          showToast(`Đã lấy mẫu nguồn Clone Stamp tại (${Math.round(coords.x)}, ${Math.round(coords.y)})`);
          return;
        }
      }

      if (activeTool === 'brush' || activeTool === 'eraser') {
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        // Only draw if inside or immediately along canvas boundaries
        if (coords.x >= 0 && coords.x <= imageSize.width && coords.y >= 0 && coords.y <= imageSize.height) {
          setIsDrawing(true);
          drawMaskStroke(coords.x, coords.y, true);
        }
      } else if (activeTool === 'liquify') {
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        if (coords.x >= 0 && coords.x <= imageSize.width && coords.y >= 0 && coords.y <= imageSize.height) {
          const mainCanvas = mainCanvasRef.current;
          if (mainCanvas) {
            const ctx = mainCanvas.getContext('2d');
            if (ctx && !liquifyOriginalData) {
              setLiquifyOriginalData(ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height));
            }
          }
          setIsDrawing(true);
          liquifyLastPointRef.current = coords;
        }
      } else if (activeTool === 'dodge_burn') {
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        if (coords.x >= 0 && coords.x <= imageSize.width && coords.y >= 0 && coords.y <= imageSize.height) {
          setIsDrawing(true);
          const mainCanvas = mainCanvasRef.current;
          if (mainCanvas) {
            const ctx = mainCanvas.getContext('2d');
            if (ctx) {
              applyDodgeBurnStamp(ctx, coords, dodgeBurnSettings);
            }
          }
        }
      } else if (activeTool === 'clone_stamp') {
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        if (coords.x >= 0 && coords.x <= imageSize.width && coords.y >= 0 && coords.y <= imageSize.height) {
          if (!cloneStampSettings.sourcePoint) {
            showToast('Giữ phím Alt và Click chuột để lấy điểm mẫu nguồn (Alt+Click)!');
            return;
          }
          setIsDrawing(true);
          cloneStrokeStartRef.current = coords;
          const mainCanvas = mainCanvasRef.current;
          if (mainCanvas && cloneSourceSnapshot) {
            const ctx = mainCanvas.getContext('2d');
            if (ctx) {
              applyCloneStamp(
                ctx,
                cloneSourceSnapshot,
                cloneStampSettings.sourcePoint,
                coords,
                coords,
                cloneStampSettings
              );
            }
          }
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

    if (isDrawing && activeTool === 'liquify' && liquifyLastPointRef.current && mainCanvasRef.current) {
      const ctx = mainCanvasRef.current.getContext('2d');
      if (ctx) {
        applyLiquifyStroke(
          ctx,
          liquifyLastPointRef.current,
          coords,
          liquifySettings,
          liquifyOriginalData
        );
        liquifyLastPointRef.current = coords;
      }
      return;
    }

    if (isDrawing && activeTool === 'dodge_burn' && mainCanvasRef.current) {
      const ctx = mainCanvasRef.current.getContext('2d');
      if (ctx) {
        applyDodgeBurnStamp(ctx, coords, dodgeBurnSettings);
      }
      return;
    }

    if (
      isDrawing &&
      activeTool === 'clone_stamp' &&
      mainCanvasRef.current &&
      cloneSourceSnapshot &&
      cloneStampSettings.sourcePoint &&
      cloneStrokeStartRef.current
    ) {
      const ctx = mainCanvasRef.current.getContext('2d');
      if (ctx) {
        applyCloneStamp(
          ctx,
          cloneSourceSnapshot,
          cloneStampSettings.sourcePoint,
          coords,
          cloneStrokeStartRef.current,
          cloneStampSettings
        );
      }
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
    if (isDrawing && (activeTool === 'liquify' || activeTool === 'dodge_burn' || activeTool === 'clone_stamp')) {
      const mainCanvas = mainCanvasRef.current;
      if (mainCanvas) {
        const newUrl = mainCanvas.toDataURL('image/png');
        pushHistory(newUrl);
        refreshHistogram();
      }
    }

    setIsPanning(false);
    setIsDrawing(false);
    setIsDraggingCrop(false);
    lastDrawPointRef.current = null;
    liquifyLastPointRef.current = null;
    cloneStrokeStartRef.current = null;
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
    showToast(`Đã lưu preset "${newPreset.name}" vào thư viện!`);
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

  // Photoshop Pro Suite Handlers (100% Zero-API)
  const handleApplyCurves = () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    applyPhotoshopCurvesToImageData(imgData, curvesSettings);
    ctx.putImageData(imgData, 0, 0);
    const newUrl = mainCanvas.toDataURL('image/png');
    pushHistory(newUrl);
    setCurvesSettings(DEFAULT_CURVES_SETTINGS);
    refreshHistogram();
    showToast('Đã áp dụng Curves & Levels vào ảnh');
  };

  const handleResetCurves = () => {
    setCurvesSettings(DEFAULT_CURVES_SETTINGS);
    showToast('Đã đặt lại Curves & Levels về mặc định');
  };

  const handleApplyHsl = () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    applyPhotoshopHslToImageData(imgData, hslSettings);
    ctx.putImageData(imgData, 0, 0);
    const newUrl = mainCanvas.toDataURL('image/png');
    pushHistory(newUrl);
    setHslSettings(DEFAULT_HSL_SETTINGS);
    showToast('Đã áp dụng bộ trộn 8 kênh HSL vào ảnh');
  };

  const handleResetHsl = () => {
    setHslSettings(DEFAULT_HSL_SETTINGS);
    showToast('Đã đặt lại thông số 8 kênh HSL');
  };

  const handleReconstructAllLiquify = () => {
    if (!liquifyOriginalData) return;
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(liquifyOriginalData, 0, 0);
    const newUrl = mainCanvas.toDataURL('image/png');
    pushHistory(newUrl);
    showToast('Đã khôi phục toàn bộ hình dáng gốc (Reconstruct All)');
  };

  const handleClearCloneSource = () => {
    setCloneStampSettings(prev => ({ ...prev, sourcePoint: null }));
    setCloneSourceSnapshot(null);
    showToast('Đã xóa điểm mẫu nguồn Clone Stamp');
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
      showToast('Đã lưu tác phẩm vào Gallery thành công!');
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
      } else if (e.key.toLowerCase() === 'm') {
        setActiveTab('curves');
        refreshHistogram();
      } else if (e.key.toLowerCase() === 'j') {
        setActiveTab('hsl');
      } else if (e.key.toLowerCase() === 'w') {
        setActiveTool('liquify');
        setActiveTab('liquify');
      } else if (e.key.toLowerCase() === 'o') {
        setActiveTool('dodge_burn');
        setActiveTab('retouch_brushes');
        setRetouchBrushType('dodge_burn');
      } else if (e.key.toLowerCase() === 's') {
        setActiveTool('clone_stamp');
        setActiveTab('retouch_brushes');
        setRetouchBrushType('clone_stamp');
      } else if (e.key === ' ') { // Space for quick pan
        setActiveTool('hand');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, clearMask, hasMask, activeTool, refreshHistogram]);

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
            <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" />
              </svg>
              <span>NKI Photo Studio</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/10 font-bold">
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              isComparingOriginal
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-white/5 text-zinc-300 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Nhấn giữ để xem ảnh gốc trước khi chỉnh sửa"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden md:inline">Giữ xem ảnh gốc</span>
          </button>

          {/* Quick Clear Mask Button in Header */}
          {hasMask && (
            <button
              onClick={() => {
                clearMask();
                showToast('Đã xóa vùng chọn (Deselect)');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-red-500/20 text-zinc-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 animate-in fade-in duration-150"
              title="Xóa bỏ nét cọ vùng chọn (Phím tắt: Esc hoặc Ctrl+D)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Hủy Mask (Esc)</span>
            </button>
          )}
        </div>

        {/* Right Action Buttons: Save to Gallery & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToGallery}
            className="px-3.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold rounded-xl transition-all border border-white/10 active:scale-95 flex items-center gap-1.5"
            title="Lưu vào kho ảnh Gallery"
          >
            <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
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
                className="w-full text-left px-3 py-2 text-xs rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-medium flex items-center justify-between mt-1 border border-white/10"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Tải Khử Dấu AI</span>
                </span>
                <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-300 font-mono">EXIF</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar Dock */}
        <aside className="w-16 flex-none bg-slate-900/80 border-r border-white/10 flex flex-col items-center py-3 gap-1.5 z-20 backdrop-blur-md overflow-y-auto custom-scrollbar">
          {/* Select Tool */}
          <button
            onClick={() => setActiveTool('select')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'select'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Công cụ Di chuyển / Chọn (Phím V)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
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
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Cọ Quét Vùng Chọn AI Inpaint (Phím B)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">B</span>
          </button>

          {/* Eraser Tool */}
          <button
            onClick={() => setActiveTool('eraser')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'eraser'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Tẩy nét quét cọ (Phím E)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">E</span>
          </button>

          {/* Liquify Warp Tool */}
          <button
            onClick={() => {
              setActiveTool('liquify');
              setActiveTab('liquify');
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'liquify'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Nắn thon gọn mặt, mũi, eo Liquify (Phím W)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">W</span>
          </button>

          {/* Dodge & Burn Retouch Tool */}
          <button
            onClick={() => {
              setActiveTool('dodge_burn');
              setActiveTab('retouch_brushes');
              setRetouchBrushType('dodge_burn');
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'dodge_burn'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Làm sáng & Tối cục bộ Dodge/Burn (Phím O)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="8" strokeWidth={1.8} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">O</span>
          </button>

          {/* Clone Stamp Tool */}
          <button
            onClick={() => {
              setActiveTool('clone_stamp');
              setActiveTab('retouch_brushes');
              setRetouchBrushType('clone_stamp');
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'clone_stamp'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Đóng dấu xóa khuyết điểm Clone Stamp (Phím S - Giữ Alt để lấy mẫu)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">S</span>
          </button>

          {/* Curves & Levels Tool */}
          <button
            onClick={() => {
              setActiveTab('curves');
              refreshHistogram();
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'curves'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Đồ thị Curves & Levels (Phím M)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M3 21V3m0 18c3-1 6-7 9-10s6-3 9-6" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">M</span>
          </button>

          {/* HSL Mixer Tool */}
          <button
            onClick={() => setActiveTab('hsl')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'hsl'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Bộ trộn 8 kênh HSL Selective Color (Phím J)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3a9 9 0 019 9M12 3v18" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">J</span>
          </button>

          {/* Color Grading Tool */}
          <button
            onClick={() => {
              setActiveTool('color');
              setActiveTab('color_grading');
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'color_grading'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Chỉnh màu quang học & Presets LUT (Phím G)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4 4 4 0 014-4c.48 0 .93.08 1.35.24A4 4 0 0113 9a4 4 0 014 4c0 .48-.08.93-.24 1.35A4 4 0 0121 17a4 4 0 01-4 4H7z" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">G</span>
          </button>

          {/* Crop Tool */}
          <button
            onClick={() => {
              setActiveTool('crop');
              setActiveTab('transform');
            }}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'crop'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Cắt khung hình (Phím C)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-[8px] font-bold mt-0.5">C</span>
          </button>

          {/* Hand Pan Tool */}
          <button
            onClick={() => setActiveTool('hand')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
              activeTool === 'hand'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title="Công cụ Bàn tay Pan di chuyển (Phím H hoặc Giữ Space)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
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
                    : 'bg-white/15 text-white border-white/30'
                }`}
                title={isMaskVisible ? "Tạm ẩn nét cọ để xem ảnh sạch" : "Hiện lại nét cọ"}
              >
                {isMaskVisible ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
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
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                NKI AI Photo Studio Pro 2026
              </h2>
              <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-md">
                Chỉnh màu nâng cao 60 FPS (0 API token) & Retouch AI thông minh (Generative Fill, Magic Eraser, Magic Expand)
              </p>
              
              <label className="cursor-pointer px-6 py-3.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2 mb-6">
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTool === 'brush' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="Cọ Quét Vùng Chọn (Phím B)"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Cọ (B)</span>
                </button>
                <button
                  onClick={() => setActiveTool('eraser')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTool === 'eraser' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                  title="Tẩy Nét Cọ (Phím E)"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
                  className="w-20 sm:w-24 accent-white cursor-pointer h-1.5 bg-white/20 rounded-lg"
                />
                <EditableNumberInput
                  value={brushSize}
                  min={4}
                  max={300}
                  step={2}
                  unit="px"
                  colorClass="text-zinc-200"
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
                  className="w-16 accent-white cursor-pointer h-1.5 bg-white/20 rounded-lg"
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
                    className={`px-2 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border transition-all ${
                      isMaskVisible 
                        ? 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10' 
                        : 'bg-white/15 text-white border-white/30'
                    }`}
                    title={isMaskVisible ? "Tạm ẩn nét cọ để xem ảnh sạch" : "Hiện lại nét cọ"}
                  >
                    {isMaskVisible ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    )}
                    <span>{isMaskVisible ? 'Ẩn' : 'Hiện'}</span>
                  </button>

                  <button
                    onClick={() => {
                      clearMask();
                      showToast('Đã xóa bỏ vùng chọn (Deselect)');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-red-500/20 text-zinc-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shadow-md"
                    title="Xóa bỏ nét cọ vùng chọn (Esc hoặc Ctrl+D)"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
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
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-white/15 px-3.5 py-1.5 rounded-2xl backdrop-blur-2xl flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 studio-overlay-interactive"
            >
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span>Vùng Chọn (Mask)</span>
              </div>
              <div className="w-px h-4 bg-white/15"></div>
              <button
                onClick={() => setIsMaskVisible(!isMaskVisible)}
                className={`px-2 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                  isMaskVisible ? 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10' : 'bg-white/15 text-white border-white/30'
                }`}
                title={isMaskVisible ? "Tạm ẩn nét cọ để xem ảnh sạch" : "Hiện lại nét cọ"}
              >
                {isMaskVisible ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
                <span>{isMaskVisible ? 'Ẩn' : 'Hiện'}</span>
              </button>
              <button
                onClick={() => {
                  clearMask();
                  showToast('Đã xóa bỏ vùng chọn (Deselect)');
                }}
                className="px-2.5 py-1 rounded-xl bg-white/[0.08] hover:bg-red-500/20 text-zinc-300 hover:text-red-300 border border-white/10 font-medium text-xs flex items-center gap-1 transition-all active:scale-95"
                title="Xóa bỏ hoàn toàn nét cọ (Esc hoặc Ctrl+D)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
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

          {/* Liquify Active HUD Capsule */}
          {activeTool === 'liquify' && (
            <div 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-sky-400/30 px-3.5 py-1.5 rounded-2xl backdrop-blur-2xl flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 studio-overlay-interactive"
            >
              <div className="flex items-center gap-1.5 text-xs text-sky-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                <span>Nắn Liquify ({liquifySettings.mode.toUpperCase()})</span>
              </div>
              <div className="w-px h-4 bg-white/15"></div>
              <span className="text-[11px] text-white/70 font-mono">Cỡ: {liquifySettings.size}px</span>
              <button
                onClick={handleReconstructAllLiquify}
                className="px-2 py-0.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold border border-white/20 transition-all active:scale-95"
                title="Khôi phục toàn bộ hình ảnh gốc trước khi nắn"
              >
                Khôi phục gốc
              </button>
            </div>
          )}

          {/* Dodge & Burn Active HUD Capsule */}
          {activeTool === 'dodge_burn' && (
            <div 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-amber-400/30 px-3.5 py-1.5 rounded-2xl backdrop-blur-2xl flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 studio-overlay-interactive"
            >
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>{dodgeBurnSettings.mode === 'dodge' ? 'Dodge (Sáng)' : 'Burn (Tối)'}</span>
              </div>
              <div className="w-px h-4 bg-white/15"></div>
              <span className="text-[11px] text-white/70 font-mono">Dải: {dodgeBurnSettings.range} | {dodgeBurnSettings.exposure}%</span>
            </div>
          )}

          {/* Clone Stamp Active HUD Capsule */}
          {activeTool === 'clone_stamp' && (
            <div 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-emerald-400/30 px-3.5 py-1.5 rounded-2xl backdrop-blur-2xl flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 studio-overlay-interactive"
            >
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Clone Stamp</span>
              </div>
              <div className="w-px h-4 bg-white/15"></div>
              <span className="text-[11px] text-white/80">
                {cloneStampSettings.sourcePoint ? '✓ Đã có điểm mẫu' : '⚠️ Giữ Alt + Click ảnh để lấy mẫu'}
              </span>
              {cloneStampSettings.sourcePoint && (
                <button
                  onClick={handleClearCloneSource}
                  className="px-2 py-0.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold border border-white/20 transition-all active:scale-95"
                >
                  Đổi mẫu
                </button>
              )}
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

            {/* Optical Bokeh Focus Target Crosshair */}
            {(activeTab === 'optical_bokeh' || isPickingFocus) && (
              <div
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-75 z-10"
                style={{
                  left: focalPoint.x * imageSize.width,
                  top: focalPoint.y * imageSize.height
                }}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-cyan-400 animate-ping opacity-30 absolute" />
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 flex items-center justify-center bg-cyan-400/10 backdrop-blur-[1px] shadow-[0_0_12px_rgba(34,211,238,0.6)]">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
                  </div>
                  <div className="absolute -top-3 w-0.5 h-2 bg-cyan-400 shadow-sm" />
                  <div className="absolute -bottom-3 w-0.5 h-2 bg-cyan-400 shadow-sm" />
                  <div className="absolute -left-3 h-0.5 w-2 bg-cyan-400 shadow-sm" />
                  <div className="absolute -right-3 h-0.5 w-2 bg-cyan-400 shadow-sm" />
                  <span className="absolute -top-6 left-4 text-[9px] font-mono font-black text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap border border-cyan-500/40 shadow-lg">
                    FOCUS: {(focalPoint.x * 100).toFixed(0)}%, {(focalPoint.y * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

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

            {/* Liquify Brush Circle Cursor */}
            {cursorPos && activeTool === 'liquify' &&
             cursorPos.x >= 0 && cursorPos.x <= imageSize.width && cursorPos.y >= 0 && cursorPos.y <= imageSize.height && (
              <div
                className="absolute rounded-full border border-sky-400 pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                style={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  width: liquifySettings.size,
                  height: liquifySettings.size,
                  backgroundColor: 'rgba(56,189,248,0.1)'
                }}
              />
            )}

            {/* Dodge & Burn Circle Cursor */}
            {cursorPos && activeTool === 'dodge_burn' &&
             cursorPos.x >= 0 && cursorPos.x <= imageSize.width && cursorPos.y >= 0 && cursorPos.y <= imageSize.height && (
              <div
                className="absolute rounded-full border border-amber-400 pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                style={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  width: dodgeBurnSettings.size,
                  height: dodgeBurnSettings.size,
                  backgroundColor: dodgeBurnSettings.mode === 'dodge' ? 'rgba(251,191,36,0.15)' : 'rgba(0,0,0,0.35)'
                }}
              />
            )}

            {/* Clone Stamp Circle Cursor */}
            {cursorPos && activeTool === 'clone_stamp' &&
             cursorPos.x >= 0 && cursorPos.x <= imageSize.width && cursorPos.y >= 0 && cursorPos.y <= imageSize.height && (
              <div
                className="absolute rounded-full border border-emerald-400 pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                style={{
                  left: cursorPos.x,
                  top: cursorPos.y,
                  width: cloneStampSettings.size,
                  height: cloneStampSettings.size,
                  backgroundColor: 'rgba(52,211,153,0.15)'
                }}
              />
            )}

            {/* Clone Stamp Source Anchor Crosshair */}
            {cloneStampSettings.sourcePoint && activeTool === 'clone_stamp' && (
              <div
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                  left: cloneStampSettings.sourcePoint.x,
                  top: cloneStampSettings.sourcePoint.y
                }}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full border border-emerald-400 animate-pulse bg-emerald-500/10 flex items-center justify-center shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="absolute -top-2 w-0.5 h-1.5 bg-emerald-400" />
                  <div className="absolute -bottom-2 w-0.5 h-1.5 bg-emerald-400" />
                  <div className="absolute -left-2 h-0.5 w-1.5 bg-emerald-400" />
                  <div className="absolute -right-2 h-0.5 w-1.5 bg-emerald-400" />
                  <span className="absolute -top-5 left-3 text-[9px] font-mono font-bold text-emerald-300 bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap border border-emerald-500/40 shadow-lg">
                    SOURCE (ALT)
                  </span>
                </div>
              </div>
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
          {/* Smart Segment SAM 2 Toolbar - Floating VisionOS Capsule */}
          {activeTool !== 'crop' && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
              <SmartSegmentToolbar
                baseImageSrc={currentImageSrc}
                onApplyMaskDataUrl={handleApplyMaskDataUrl}
                onClearMask={clearMask}
                onInvertMask={handleInvertMask}
                hasActiveMask={hasMask}
                isMaskVisible={isMaskVisible}
                onToggleMaskVisibility={() => setIsMaskVisible(!isMaskVisible)}
              />
            </div>
          )}
        </main>

        {/* Right Inspector & Controls Sidebar */}
        <aside className="w-80 md:w-96 flex-none bg-slate-900/90 border-l border-white/10 flex flex-col z-20 backdrop-blur-md">
          {/* Sidebar Tabs - VisionOS Acrylic Header (3 Balanced Rows: Minimalist Pro Styling) */}
          <div className="flex flex-col border-b border-white/10 p-2 bg-black/40 gap-1.5">
            {/* Row 1: Core Edit Suite (4 Equal Columns) */}
            {/* Row 1: Photoshop Pro Suite (Curves, HSL, Liquify, Retouch) */}
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => {
                  setActiveTab('curves');
                  refreshHistogram();
                }}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'curves'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Đồ thị Curves & Levels chuyên nghiệp (Phím M)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M3 21V3m0 18c3-1 6-7 9-10s6-3 9-6" />
                </svg>
                <span className="truncate">Curves</span>
              </button>
              <button
                onClick={() => setActiveTab('hsl')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'hsl'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Bộ trộn 8 kênh HSL Selective Color (Phím J)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3a9 9 0 019 9M12 3v18" />
                </svg>
                <span className="truncate">HSL 8-Kênh</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('liquify');
                  setActiveTool('liquify');
                }}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'liquify'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Nắn thon gọn mặt, mũi, eo Liquify (Phím W)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="truncate">Liquify</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('retouch_brushes');
                  setActiveTool(retouchBrushType);
                }}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'retouch_brushes'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Dodge, Burn & Đóng dấu Clone Stamp (Phím O / S)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="8" strokeWidth={1.8} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                </svg>
                <span className="truncate">Retouch</span>
              </button>
            </div>

            {/* Row 2: Core Edit Suite (4 Equal Columns) */}
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => {
                  setActiveTab('color_grading');
                  if (activeTool === 'brush' || activeTool === 'eraser') setActiveTool('select');
                }}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'color_grading'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Chỉnh màu quang học & LUTs (Phím G)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4 4 4 0 014-4c.8 0 1.5.3 2.1.8l6.3-6.3a2 2 0 112.8 2.8l-6.3 6.3c.5.6.8 1.3.8 2.1a4 4 0 01-4 4z" />
                </svg>
                <span className="truncate">Màu Sắc</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('ai_magic');
                  if (activeTool === 'select' || activeTool === 'color') setActiveTool('brush');
                }}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'ai_magic'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="AI Magic Inpaint & Prompt (Phím B)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="truncate">Magic AI</span>
              </button>
              <button
                onClick={() => setActiveTab('layers')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'layers'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Quản lý Layer & Blend Modes"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="truncate">Layers ({layers.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('transform')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'transform'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Cắt khung hình & Biến đổi hình học (Phím C)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span className="truncate">Biến Đổi</span>
              </button>
            </div>

            {/* Row 3: Breakthrough Zero-API Optical & Retouch Suite (4 Equal Columns) */}
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => setActiveTab('beauty_retouch')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'beauty_retouch'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Tách tần số & làm mịn da giữ 100% vân da thật (0 API)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="truncate">Mịn Da</span>
              </button>
              <button
                onClick={() => setActiveTab('optical_bokeh')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'optical_bokeh'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Xóa phông khẩu độ quang học f/1.2 - f/16 & Chọn điểm nét (0 API)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">Khẩu Độ</span>
              </button>
              <button
                onClick={() => setActiveTab('studio_lighting')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'studio_lighting'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Phòng đèn studio 3D ảo trực quan (0 API Preview)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="truncate">Đèn 3D</span>
              </button>
              <button
                onClick={() => setActiveTab('gobo')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'gobo'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Hắt bóng râm Gobo 3D & Spotlight quang học"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="truncate">Gobo 3D</span>
              </button>
            </div>

            {/* Row 4: Neural Character & Environment Suite (3 Equal Columns) */}
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTab('wardrobe')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'wardrobe'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Thay trang phục ảo Virtual Wardrobe"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="truncate">Wardrobe</span>
              </button>
              <button
                onClick={() => setActiveTab('expression')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'expression'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Điêu khắc vi biểu cảm, tuổi tác & hướng nhìn 3D"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="truncate">Sculptor</span>
              </button>
              <button
                onClick={() => setActiveTab('atmosphere')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 truncate border ${
                  activeTab === 'atmosphere'
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/10'
                }`}
                title="Hiệu ứng thời tiết và khí quyển thể tích (Mưa, Tuyết, Fog)"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span className="truncate">Khí Quyển</span>
              </button>
            </div>
          </div>

          {/* Sidebar Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {/* AI Error Alert */}
            {aiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-300">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
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
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-zinc-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    <strong className="text-zinc-200">0 API Token:</strong> Chỉnh màu, xoay lật, crop chạy trực tiếp trên máy. Chỉ tốn API khi gọi các công cụ AI dưới đây.
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
                        ? 'bg-white/[0.08] border-white/40 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span className="text-[8px] font-mono font-semibold bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">Inpaint</span>
                    </div>
                    <div className="text-xs font-semibold leading-tight">Generative Fill</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Vẽ thêm / Đổi đồ vật</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveAiAction('eraser');
                      setActiveTool('brush');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      activeAiAction === 'eraser'
                        ? 'bg-white/[0.08] border-white/40 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-[8px] font-mono font-semibold bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">Remove</span>
                    </div>
                    <div className="text-xs font-semibold leading-tight">Magic Eraser</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Xóa người & vật thể</div>
                  </button>

                  <button
                    onClick={() => setActiveAiAction('expand')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      activeAiAction === 'expand'
                        ? 'bg-white/[0.08] border-white/40 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span className="text-[8px] font-mono font-semibold bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">Outpaint</span>
                    </div>
                    <div className="text-xs font-semibold leading-tight">Magic Expand</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Mở rộng khung cảnh</div>
                  </button>

                  <button
                    onClick={() => setActiveAiAction('bg_replace')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      activeAiAction === 'bg_replace'
                        ? 'bg-white/[0.08] border-white/40 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-6 4 5 3-3.5L21 17H3z" />
                        <circle cx="7" cy="7" r="1.5" />
                      </svg>
                      <span className="text-[8px] font-mono font-semibold bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">Backdrop</span>
                    </div>
                    <div className="text-xs font-semibold leading-tight">Đổi Nền Mới</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Tách nền & ghép cảnh</div>
                  </button>
                </div>

                {/* Sub Action Specific UI */}
                {activeAiAction === 'inpaint' && (
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>Mô tả Generative Fill:</span>
                      </label>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        hasMask ? 'bg-white/10 text-white border border-white/20' : 'bg-white/5 text-zinc-400 border border-white/5'
                      }`}>
                        {hasMask ? '✓ Đã chọn vùng' : 'Chưa quét cọ'}
                      </span>
                    </div>

                    <textarea
                      value={inpaintPrompt}
                      onChange={(e) => setInpaintPrompt(e.target.value)}
                      placeholder="VD: Thêm kính râm phi công mạ vàng, thay đổi thành áo sơ mi lụa trắng, thêm hình xăm cá chép..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all custom-scrollbar"
                    />

                    <div className="flex items-center justify-between text-[11px] text-white/50">
                      <span>Dùng cọ đỏ quét lên vị trí muốn thay đổi</span>
                      {hasMask && (
                        <button 
                          onClick={() => {
                            clearMask();
                            showToast('Đã xóa nét cọ');
                          }} 
                          className="text-zinc-400 hover:text-red-300 font-medium hover:underline"
                        >
                          ✕ Hủy cọ (Esc)
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleExecuteGenerativeFill}
                      disabled={isAiLoading || !hasMask || !inpaintPrompt.trim()}
                      className="w-full py-2.5 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span>Tạo Với AI (Generative Fill)</span>
                    </button>
                  </div>
                )}

                {activeAiAction === 'eraser' && (
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Xóa Vật Thể (Content-Aware):</span>
                      </label>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        hasMask ? 'bg-white/10 text-white border border-white/20' : 'bg-white/5 text-zinc-400 border border-white/5'
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
                          className="text-zinc-400 hover:text-red-300 font-medium hover:underline"
                        >
                          ✕ Hủy cọ (Esc)
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleExecuteMagicEraser}
                      disabled={isAiLoading || !hasMask}
                      className="w-full py-2.5 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Xóa Vật Thể Ngay</span>
                    </button>
                  </div>
                )}

                {activeAiAction === 'expand' && (
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-xs font-semibold text-white block">
                      Tỉ lệ mở rộng khung cảnh mục tiêu:
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      {['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setExpandRatio(ratio)}
                          className={`py-2 rounded-xl text-xs font-semibold font-mono transition-all border ${
                            expandRatio === ratio
                              ? 'bg-white text-black border-white shadow-sm'
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
                        className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <button
                      onClick={handleExecuteMagicExpand}
                      disabled={isAiLoading}
                      className="w-full py-2.5 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span>Mở Rộng Khung Hình (Magic Expand)</span>
                    </button>
                  </div>
                )}

                {activeAiAction === 'bg_replace' && (
                  <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <label className="text-xs font-semibold text-white block">
                      Mô tả bối cảnh / phông nền mới:
                    </label>

                    <textarea
                      value={bgPrompt}
                      onChange={(e) => setBgPrompt(e.target.value)}
                      placeholder="VD: Đường phố Tokyo rực rỡ ánh đèn neon về đêm trong cơn mưa phùn..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all custom-scrollbar"
                    />

                    <button
                      onClick={handleExecuteBgReplace}
                      disabled={isAiLoading || !bgPrompt.trim()}
                      className="w-full py-2.5 bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-6 4 5 3-3.5L21 17H3z" />
                        <circle cx="7" cy="7" r="1.5" />
                      </svg>
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
                      <svg className="w-3.5 h-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Thư Viện Presets
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsSavingPresetModalOpen(true)}
                        className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black text-[11px] font-semibold rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                        title="Lưu các thông số màu hiện tại thành preset mới vào thư viện"
                      >
                        <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span>Lưu Preset</span>
                      </button>
                      {activePresetId && (
                        <button
                          onClick={resetColorAdjustments}
                          className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          Đặt lại
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Modal / Dialog for Saving New Preset */}
                  {isSavingPresetModalOpen && (
                    <div className="p-3 bg-zinc-900 border border-white/20 rounded-2xl space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Đặt tên cho Preset mới:</span>
                        <button
                          onClick={() => setIsSavingPresetModalOpen(false)}
                          className="text-zinc-400 hover:text-white text-xs font-bold"
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
                        className="w-full bg-black/60 border border-white/20 rounded-xl p-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/40"
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
                          className="px-3 py-1 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-lg transition-all shadow-sm active:scale-95"
                        >
                          Lưu Lại
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filter Tabs: Tất Cả | Của Tôi (N) | Điện Ảnh (8) */}
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1 text-[11px] font-medium">
                    <button
                      onClick={() => setPresetFilter('all')}
                      className={`flex-1 py-1 rounded-lg transition-all ${
                        presetFilter === 'all' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Tất Cả
                    </button>
                    <button
                      onClick={() => setPresetFilter('custom')}
                      className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                        presetFilter === 'custom' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>Của Tôi</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">{customPresets.length}</span>
                    </button>
                    <button
                      onClick={() => setPresetFilter('cinematic')}
                      className={`flex-1 py-1 rounded-lg transition-all ${
                        presetFilter === 'cinematic' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      LUT Mẫu ({CINEMATIC_COLOR_PRESETS.length})
                    </button>
                  </div>

                  {/* Custom Presets Grid */}
                  {(presetFilter === 'all' || presetFilter === 'custom') && customPresets.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 font-semibold">
                        <span>Preset Của Tôi:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportPresets}
                            className="hover:text-white transition-colors"
                            title="Xuất danh sách preset ra file JSON để sao lưu"
                          >
                            Xuất JSON
                          </button>
                          <span>•</span>
                          <label className="hover:text-white transition-colors cursor-pointer" title="Nhập preset từ file JSON">
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
                                  ? 'bg-white/[0.08] border-white/40 text-white shadow-sm'
                                  : 'bg-white/[0.03] border-white/5 text-zinc-300 hover:bg-white/[0.06]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
                                <button
                                  onClick={(e) => handleDeleteCustomPreset(preset.id, preset.name, e)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-zinc-400 transition-all text-[11px]"
                                  title="Xóa preset này"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              <div className="text-xs font-semibold leading-tight truncate">{preset.name}</div>
                              <div className="text-[9px] text-zinc-400 mt-0.5">Tùy chỉnh</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {presetFilter === 'custom' && customPresets.length === 0 && (
                    <div className="p-4 bg-white/5 border border-dashed border-white/15 rounded-2xl text-center space-y-2">
                      <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-zinc-300">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <p className="text-xs text-white/70 font-medium">Chưa có preset tự lưu nào</p>
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        Chỉnh các thanh trượt bên dưới theo ý thích rồi nhấn <strong className="text-white">"Lưu Preset"</strong> để tái sử dụng cho các bức ảnh khác!
                      </p>
                    </div>
                  )}

                  {/* Built-in Cinematic Presets (LUTs) */}
                  {(presetFilter === 'all' || presetFilter === 'cinematic') && (
                    <div className="space-y-1.5">
                      {presetFilter === 'all' && (
                        <div className="text-[11px] text-zinc-400 px-1 font-semibold flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                          <span>Presets Điện Ảnh Mẫu:</span>
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
                                  ? 'bg-white/[0.08] border-white/40 text-white shadow-sm'
                                  : 'bg-white/[0.03] border-white/5 text-zinc-300 hover:bg-white/[0.06]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: preset.badgeColor }}
                                />
                                <span className="text-[8px] font-mono text-zinc-400">{preset.category}</span>
                              </div>
                              <div className="text-xs font-semibold leading-tight truncate">{preset.name}</div>
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

            {/* TAB: PHOTOSHOP CURVES & LEVELS ENGINE (100% Zero-API) */}
            {activeTab === 'curves' && (
              <PhotoshopCurvesPanel
                settings={curvesSettings}
                histogram={histogram}
                onChange={setCurvesSettings}
                onApplyToCanvas={handleApplyCurves}
                onReset={handleResetCurves}
              />
            )}

            {/* TAB: 8-CHANNEL SELECTIVE HSL MIXER (100% Zero-API) */}
            {activeTab === 'hsl' && (
              <PhotoshopHslPanel
                settings={hslSettings}
                onChange={setHslSettings}
                onApplyToCanvas={handleApplyHsl}
                onReset={handleResetHsl}
              />
            )}

            {/* TAB: LIQUIFY & MESH WARP ENGINE (100% Zero-API) */}
            {activeTab === 'liquify' && (
              <PhotoshopLiquifyPanel
                settings={liquifySettings}
                onChange={setLiquifySettings}
                onReconstructAll={handleReconstructAllLiquify}
              />
            )}

            {/* TAB: RETOUCH BRUSHES (DODGE, BURN, CLONE STAMP) (100% Zero-API) */}
            {activeTab === 'retouch_brushes' && (
              <PhotoshopRetouchBrushesPanel
                brushType={retouchBrushType}
                onSelectBrushType={(t) => {
                  setRetouchBrushType(t);
                  setActiveTool(t);
                }}
                dodgeBurnSettings={dodgeBurnSettings}
                onChangeDodgeBurn={setDodgeBurnSettings}
                cloneStampSettings={cloneStampSettings}
                onChangeCloneStamp={setCloneStampSettings}
                onClearCloneSource={handleClearCloneSource}
              />
            )}

            {/* TAB: HIGH-END BEAUTY RETOUCH & FREQUENCY SEPARATION (0 API) */}
            {activeTab === 'beauty_retouch' && (
              <BeautyRetouchPanel
                canvasRef={mainCanvasRef}
                onApplyRetouchResult={(c) => handleApplyCanvasResult(c, 'Mịn Da Tách Tần Số')}
              />
            )}

            {/* TAB: OPTICAL DEPTH & APERTURE SIMULATOR (0 API) */}
            {activeTab === 'optical_bokeh' && (
              <OpticalBokehPanel
                canvasRef={mainCanvasRef}
                onApplyBokehResult={(c) => handleApplyCanvasResult(c, 'Khẩu Độ Xóa Phông')}
                isPickingFocus={isPickingFocus}
                onTogglePickFocus={setIsPickingFocus}
                focalPoint={focalPoint}
                onFocalPointChange={setFocalPoint}
              />
            )}

            {/* TAB: 3D VIRTUAL STUDIO GAFFER & RELIGHTING (0 API PREVIEW) */}
            {activeTab === 'studio_lighting' && (
              <StudioLighting3DPanel
                canvasRef={mainCanvasRef}
                onApplyLightingResult={(c) => handleApplyCanvasResult(c, 'Đèn Studio 3D')}
                baseImageSrc={currentImageSrc}
                onApplyAiImage={(img) => handleApplyStudioAiPatch(img, 'Chiếu Sáng AI Điện Ảnh')}
              />
            )}

            {/* TAB: MULTI-LAYER NEURAL COMPOSITE */}
            {activeTab === 'layers' && (
              <LayerStackPanel
                layers={layers}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onToggleVisibility={handleToggleLayerVisibility}
                onChangeOpacity={handleChangeLayerOpacity}
                onChangeBlendMode={handleChangeLayerBlendMode}
                onAddLayer={handleAddLayer}
                onDeleteLayer={handleDeleteLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onFlattenLayers={handleFlattenLayers}
              />
            )}

            {/* TAB: NEURAL GOBO & OPTICAL PROJECTOR */}
            {activeTab === 'gobo' && (
              <GoboProjectorPanel
                baseImageSrc={currentImageSrc}
                onApplyGoboLayer={handleApplyGoboLayer}
                onApplyAiRelitImage={(img) => handleApplyStudioAiPatch(img, 'Gobo Relight')}
              />
            )}

            {/* TAB: VIRTUAL WARDROBE & MATERIAL MATRIX */}
            {activeTab === 'wardrobe' && (
              <VirtualWardrobePanel
                baseImageSrc={currentImageSrc}
                activeMaskDataUrl={hasMask ? (() => {
                  const maskCanvas = maskCanvasRef.current;
                  return maskCanvas ? maskCanvas.toDataURL() : null;
                })() : null}
                onApplyNewOutfit={(img) => handleApplyStudioAiPatch(img, 'Virtual Wardrobe')}
              />
            )}

            {/* TAB: NEURAL EXPRESSION & GAZE SCULPTOR */}
            {activeTab === 'expression' && (
              <ExpressionSculptorPanel
                baseImageSrc={currentImageSrc}
                onApplySculptedFace={(img) => handleApplyStudioAiPatch(img, 'Expression Sculpt')}
              />
            )}

            {/* TAB: VOLUMETRIC ATMOSPHERE & WEATHER */}
            {activeTab === 'atmosphere' && (
              <AtmosphereWeatherPanel
                baseImageSrc={currentImageSrc}
                onApplyAtmosphereLayer={handleApplyAtmosphereLayer}
                onApplyAiAtmosphere={(img) => handleApplyStudioAiPatch(img, 'Atmosphere Weather')}
              />
            )}

            {/* TAB: TRANSFORM & ROTATE */}
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
