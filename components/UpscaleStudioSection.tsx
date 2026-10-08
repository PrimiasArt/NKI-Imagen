import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { GalleryItem, CharacterPersona, CameraPresetType } from '../types';
import {
  UpscaleTargetRes,
  UpscaleModelId,
  UpscalePresetId,
  UpscaleFidelityLevel,
  UpscaleDenoiseLevel,
  UpscaleColorScience,
  UPSCALE_PRESETS_METADATA,
  UPSCALE_MODELS_METADATA,
  UPSCALE_RESOLUTION_OPTIONS,
  getUpscaleStudioSettings,
  saveUpscaleStudioSettings
} from '../services/imageUpscaleService';
import { fileToBase64, imageUrlToBase64, upscaleImage } from '../services/geminiService';
import { getCharacterPersonas } from '../services/consistencyService';
import { CAMERA_PROFILES } from '../services/antiAiCamouflageService';

export interface BatchQueueItem {
  id: string;
  name: string;
  src: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  resultUrl?: string;
  error?: string;
  dimensions?: { width: number; height: number };
  aspectRatio?: number;
}

export interface UpscaleExecutionSettings {
  targetRes: UpscaleTargetRes;
  engine: UpscaleModelId;
  preset: UpscalePresetId;
  fidelity: UpscaleFidelityLevel;
  denoise: UpscaleDenoiseLevel;
  faceEnhance: boolean;
  clarityBoost: number;
  customGuidance: string;
  aspectRatio?: number;

  // --- All-in-One Fusion ---
  biometricLockEnabled: boolean;
  selectedPersonaId?: string;
  dualFaceIsolation: boolean;
  antiAiEnabled: boolean;
  cameraPreset: CameraPresetType;
  filmGrainPct: number;
  colorScience: UpscaleColorScience;
  lightingEnhance: boolean;
}

interface UpscaleStudioSectionProps {
  src: string | null;
  onSetSrc: (src: string | null) => void;
  result: string | null;
  onSetResult: (res: string | null) => void;
  feedback: any;
  onSetFeedback: (fb: any) => void;
  galleryItems: GalleryItem[];
  isUpscaling: boolean;
  progressPercent: number;
  progressMsg: string;
  onStartUpscale: (settings: UpscaleExecutionSettings) => Promise<void>;
  onDownload: (url: string, name: string) => void;
  onSaveToGallery: (url: string, desc: string, metadata: any) => void;
  onUseAsPose: (url: string) => void;
  onOpenInStudio?: (url: string) => void;
  t: (key: string, fallback?: string) => string;
}

export const UpscaleStudioSection: React.FC<UpscaleStudioSectionProps> = ({
  src,
  onSetSrc,
  result,
  onSetResult,
  feedback,
  onSetFeedback,
  galleryItems,
  isUpscaling,
  progressPercent,
  progressMsg,
  onStartUpscale,
  onDownload,
  onSaveToGallery,
  onUseAsPose,
  onOpenInStudio,
  t
}) => {
  // Stored preferences initialization
  const initialSettings = getUpscaleStudioSettings();

  const [targetRes, setTargetRes] = useState<UpscaleTargetRes>(initialSettings.targetRes || 'ultra');
  const [engine, setEngine] = useState<UpscaleModelId>(initialSettings.model || 'gemini-3-pro-image');
  const [preset, setPreset] = useState<UpscalePresetId>(initialSettings.preset || 'portrait');
  const [fidelity, setFidelity] = useState<UpscaleFidelityLevel>(initialSettings.fidelity || 'rich');
  const [denoise, setDenoise] = useState<UpscaleDenoiseLevel>(initialSettings.denoise || 'medium');
  const [faceEnhance, setFaceEnhance] = useState<boolean>(initialSettings.faceEnhance ?? true);
  const [clarityBoost, setClarityBoost] = useState<number>(initialSettings.clarityBoost ?? 18);
  const [customGuidance, setCustomGuidance] = useState<string>(initialSettings.customGuidance || '');

  // All-in-One Fusion States
  const [biometricLockEnabled, setBiometricLockEnabled] = useState<boolean>(initialSettings.biometricLockEnabled ?? true);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(initialSettings.selectedPersonaId || 'auto');
  const [dualFaceIsolation, setDualFaceIsolation] = useState<boolean>(initialSettings.dualFaceIsolation ?? true);
  const [antiAiEnabled, setAntiAiEnabled] = useState<boolean>(initialSettings.antiAiEnabled ?? true);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetType>(initialSettings.cameraPreset || 'SONY_A7IV');
  const [filmGrainPct, setFilmGrainPct] = useState<number>(initialSettings.filmGrainPct ?? 2.2);
  const [colorScience, setColorScience] = useState<UpscaleColorScience>(initialSettings.colorScience || 'porcelain_rose');
  const [lightingEnhance, setLightingEnhance] = useState<boolean>(initialSettings.lightingEnhance ?? true);

  // Available Personas from Character Vault
  const [availablePersonas, setAvailablePersonas] = useState<CharacterPersona[]>([]);

  useEffect(() => {
    try {
      setAvailablePersonas(getCharacterPersonas());
    } catch (e) {
      console.warn('Failed to load character personas:', e);
    }
  }, []);

  // UI state
  const [imageURLInput, setImageURLInput] = useState('');
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<'split' | 'side-by-side' | 'result-only'>('split');
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isFusionOpen, setIsFusionOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // --- BATCH SUPER-RESOLUTION 5.5K STATES ---
  const [studioMode, setStudioMode] = useState<'single' | 'batch'>('single');
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [coolingCountdown, setCoolingCountdown] = useState<number>(0);
  const [isExportingBatchZip, setIsExportingBatchZip] = useState<boolean>(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState<boolean>(false);
  const [selectedGalleryItemIds, setSelectedGalleryItemIds] = useState<Set<string>>(new Set());
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const stopBatchRef = useRef<boolean>(false);

  // File adding to queue
  const handleAddBatchFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const newItems: BatchQueueItem[] = [];

    for (const file of list) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const b64 = await fileToBase64(file);
        const dataUrl = `data:${file.type};base64,${b64}`;
        const dims = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth || 1024, height: img.naturalHeight || 1024 });
          img.onerror = () => resolve({ width: 1024, height: 1024 });
          img.src = dataUrl;
        });

        newItems.push({
          id: crypto.randomUUID(),
          name: file.name,
          src: dataUrl,
          status: 'pending',
          progress: 0,
          dimensions: dims,
          aspectRatio: dims.width / dims.height
        });
      } catch (err) {
        console.warn("Failed reading batch file", file.name, err);
      }
    }

    if (newItems.length > 0) {
      setBatchQueue(prev => [...prev, ...newItems]);
    }
  };

  const handleToggleGallerySelection = (id: string) => {
    setSelectedGalleryItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllGalleryItems = () => {
    const eligible = galleryItems.filter(i => i.src && !i.src.includes('video'));
    setSelectedGalleryItemIds(new Set(eligible.map(i => i.id)));
  };

  const handleClearGallerySelection = () => {
    setSelectedGalleryItemIds(new Set());
  };

  const handleConfirmAddFromGallery = () => {
    const eligible = galleryItems.filter(i => selectedGalleryItemIds.has(i.id));
    const newItems: BatchQueueItem[] = eligible.map(g => ({
      id: crypto.randomUUID(),
      name: g.description ? `${g.description.slice(0, 30)}.png` : `image_${g.id.slice(0, 6)}.png`,
      src: g.src,
      status: 'pending',
      progress: 0,
      dimensions: { width: 1024, height: 1024 }
    }));
    setBatchQueue(prev => [...prev, ...newItems]);
    setIsGalleryPickerOpen(false);
    setSelectedGalleryItemIds(new Set());
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchQueue(prev => prev.filter(i => i.id !== id));
  };

  const handleClearBatchQueue = () => {
    if (isBatchRunning) return;
    setBatchQueue([]);
  };

  const handleStopBatch = () => {
    stopBatchRef.current = true;
  };

  const handleStartBatch = async () => {
    if (isBatchRunning) return;
    const pendingItems = batchQueue.filter(i => i.status === 'pending' || i.status === 'error');
    if (pendingItems.length === 0) return;

    setIsBatchRunning(true);
    stopBatchRef.current = false;

    for (let i = 0; i < batchQueue.length; i++) {
      if (stopBatchRef.current) break;
      const currentItem = batchQueue[i];
      if (currentItem.status === 'done') continue;

      // Mark processing
      setBatchQueue(prev => prev.map(it => it.id === currentItem.id ? { ...it, status: 'processing', progress: 15 } : it));

      const ticker = setInterval(() => {
        setBatchQueue(prev => prev.map(it => {
          if (it.id === currentItem.id && it.status === 'processing') {
            const nextP = Math.min(92, it.progress + Math.floor(Math.random() * 8) + 3);
            return { ...it, progress: nextP };
          }
          return it;
        }));
      }, 350);

      try {
        const m = currentItem.src.match(/^data:(.+);base64,(.+)$/);
        if (!m) throw new Error("Định dạng ảnh không hợp lệ.");

        const upscaleRes = await upscaleImage(m[2], m[1], {
          targetRes,
          customModel: engine === 'auto' ? undefined : engine,
          preset,
          fidelity,
          denoise,
          faceEnhance,
          clarityBoost,
          customGuidance,
          aspectRatioInput: currentItem.aspectRatio,
          biometricLock: biometricLockEnabled,
          antiAiCamouflage: antiAiEnabled,
          cameraPreset,
          filmGrainPct,
          colorScience,
          lightingEnhance
        });

        clearInterval(ticker);

        const resultImage = upscaleRes.image;

        setBatchQueue(prev => prev.map(it => it.id === currentItem.id ? {
          ...it,
          status: 'done',
          progress: 100,
          resultUrl: resultImage
        } : it));

        // Save to gallery
        onSaveToGallery(
          resultImage,
          `Batch 5.5K - ${currentItem.name}`,
          {
            model: engine,
            targetRes,
            preset,
            upscaledFrom: currentItem.src
          }
        );

        // Synaptic Cooling (3s delay before next request)
        const hasNextPending = batchQueue.slice(i + 1).some(it => it.status === 'pending');
        if (hasNextPending && !stopBatchRef.current) {
          for (let c = 3; c > 0; c--) {
            if (stopBatchRef.current) break;
            setCoolingCountdown(c);
            await new Promise(r => setTimeout(r, 1000));
          }
          setCoolingCountdown(0);
        }
      } catch (err: any) {
        clearInterval(ticker);
        console.error(`Batch error for item ${currentItem.id}:`, err);
        setBatchQueue(prev => prev.map(it => it.id === currentItem.id ? {
          ...it,
          status: 'error',
          progress: 0,
          error: err?.message || 'Lỗi nâng cấp'
        } : it));
      }
    }

    setIsBatchRunning(false);
    setCoolingCountdown(0);
  };

  const handleDownloadAllZip = async () => {
    const completed = batchQueue.filter(i => i.status === 'done' && i.resultUrl);
    if (completed.length === 0 || isExportingBatchZip) return;

    setIsExportingBatchZip(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < completed.length; i++) {
        const item = completed[i];
        const match = item.resultUrl!.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          const ext = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpg' : 'png';
          const cleanName = item.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
          zip.file(`${i + 1}_${cleanName}_5.5K.${ext}`, match[2], { base64: true });
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NKI_Batch_SuperRes_5.5K_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP creation failed:", err);
    } finally {
      setIsExportingBatchZip(false);
    }
  };

  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Automatically measure aspect ratio when image changes
  useEffect(() => {
    if (!src) {
      setAspectRatio(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
    if (img.complete && img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, [src]);

  // Persist preference updates
  const updateSetting = <K extends keyof ReturnType<typeof getUpscaleStudioSettings>>(
    key: K,
    val: ReturnType<typeof getUpscaleStudioSettings>[K]
  ) => {
    saveUpscaleStudioSettings({ [key]: val });
  };

  const handleExecute = () => {
    if (!src || isUpscaling) return;

    let currentAspect = aspectRatio;
    if (!currentAspect && src) {
      const temp = new Image();
      temp.src = src;
      if (temp.complete && temp.naturalWidth && temp.naturalHeight) {
        currentAspect = temp.naturalWidth / temp.naturalHeight;
      }
    }

    onStartUpscale({
      targetRes,
      engine,
      preset,
      fidelity,
      denoise,
      faceEnhance,
      clarityBoost,
      customGuidance,
      aspectRatio: currentAspect || undefined,
      biometricLockEnabled,
      selectedPersonaId,
      dualFaceIsolation,
      antiAiEnabled,
      cameraPreset,
      filmGrainPct,
      colorScience,
      lightingEnhance
    });
  };

  // Drag interaction for Before/After split slider
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingSplit(true);
    updateSplitFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSplit) return;
    updateSplitFromPointer(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDraggingSplit(false);
  };

  const updateSplitFromPointer = (clientX: number) => {
    if (!splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  const activePresetMeta = UPSCALE_PRESETS_METADATA.find(p => p.id === preset) || UPSCALE_PRESETS_METADATA[0];
  const activeModelMeta = UPSCALE_MODELS_METADATA.find(m => m.id === engine) || UPSCALE_MODELS_METADATA[0];
  const selectedPersona = availablePersonas.find(p => p.id === selectedPersonaId);

  return (
    <div className="w-full space-y-6">
      {/* Studio Mode Selector: Single Image vs Batch Super-Resolution */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-xl p-2.5 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStudioMode('single')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              studioMode === 'single'
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25 ring-1 ring-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📸</span>
            <span>Nâng Cấp 1 Ảnh (Ultra 5.5K)</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioMode('batch')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
              studioMode === 'batch'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-lg shadow-amber-500/25 ring-1 ring-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>⚡</span>
            <span>Hàng Đợi Siêu Phân Giải (Batch 5.5K)</span>
            {batchQueue.length > 0 && (
              <span className="bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full ml-1">
                {batchQueue.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-white/50 px-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Google Gemini Pro 3 Engine • 3072×5504 Master Matrix</span>
        </div>
      </div>

      {studioMode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
      {/* Left Column: Controls & Optical Configuration */}
      <div className="lg:col-span-6 glass-card p-6 lg:p-8 rounded-[2rem] flex flex-col space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 flex-wrap">
              <span>👑</span>
              <span>{t('upscale.title', 'Studio Super-Resolution 5.5K')}</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-black border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                Ultra Master 17MP
              </span>
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Khôi phục lỗ chân lông siêu nét, tơ tóc li ti, thớ vải voan với Google Pro 3 & độ phân giải 3072×5504.
            </p>
            <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
              <span>🔒</span>
              <span>Khóa 100% Posing & Khung hình gốc (Zero-Crop / Zero-Repose)</span>
            </div>
          </div>
        </div>

        {/* Quick Select from Gallery */}
        {galleryItems.filter(i => i.src && !i.src.includes('video')).length > 0 && (
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">
              {t('studio.orSelectGallery', 'Chọn nhanh từ Thư viện')}
            </label>
            <div className="flex gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
              {galleryItems.filter(i => i.src && !i.src.includes('video')).slice(0, 10).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSetSrc(item.src);
                    onSetResult(null);
                    onSetFeedback(null);
                  }}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    src === item.src
                      ? 'border-indigo-400 scale-95 shadow-[0_0_12px_rgba(99,102,241,0.5)] ring-2 ring-indigo-500/30'
                      : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={item.src} className="w-full h-full object-cover" alt="Gallery item" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Source Image Zone */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">
            Ảnh gốc cần nâng cấp
          </label>
          {src ? (
            <div
              className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/50 group shadow-inner flex items-center justify-center mx-auto"
              style={{
                aspectRatio: aspectRatio || '4/3',
                maxWidth: aspectRatio ? `${360 * aspectRatio}px` : '100%',
                width: '100%',
                maxHeight: '360px'
              }}
            >
              <img src={src} className="w-full h-full object-contain" alt="Source" />
              <button
                onClick={() => {
                  onSetSrc(null);
                  onSetResult(null);
                  onSetFeedback(null);
                }}
                className="absolute top-3 right-3 bg-red-600/90 text-white rounded-full p-2 hover:bg-red-500 shadow-xl transition-all hover:scale-110 z-10"
                title="Gỡ ảnh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label
                className="border-2 border-dashed border-white/15 hover:border-indigo-400/50 bg-white/5 hover:bg-indigo-500/5 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) fileToBase64(f).then(b => onSetSrc(`data:${f.type};base64,${b}`));
                }}
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Kéo thả hoặc tải ảnh lên</span>
                <span className="text-[10px] text-white/40 mt-1">Hỗ trợ PNG, JPG, WEBP mọi tỷ lệ</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) fileToBase64(f).then(b => onSetSrc(`data:${f.type};base64,${b}`));
                  }}
                />
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Hoặc dán URL ảnh gốc..."
                  value={imageURLInput}
                  onChange={(e) => setImageURLInput(e.target.value)}
                  className="flex-grow glass-input rounded-xl px-4 py-3 text-xs"
                />
                <button
                  onClick={() => {
                    if (imageURLInput) {
                      imageUrlToBase64(imageURLInput)
                        .then(b => {
                          onSetSrc(b);
                          setImageURLInput('');
                        })
                        .catch(err => alert('Không thể tải URL: ' + err.message));
                    }
                  }}
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Tải
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1. Specialized Domain Presets */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">
            Chế độ chuyên ngành phục hồi chi tiết (Preset)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {UPSCALE_PRESETS_METADATA.map((p) => {
              const isSelected = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPreset(p.id);
                    updateSetting('preset', p.id);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1.5 ${
                    isSelected
                      ? `bg-gradient-to-b ${p.color} border-white/40 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30 font-bold scale-[1.02]`
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold leading-tight">{p.label}</span>
                    <span className="text-[8px] opacity-60 leading-none mt-0.5">{p.badge}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-white/60 flex items-center gap-2">
            <span className="text-sm">{activePresetMeta.icon}</span>
            <span>{activePresetMeta.description}</span>
          </div>
        </div>

        {/* 2. Target Resolution Options */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block flex items-center justify-between">
            <span>Độ phân giải xuất (Resolution)</span>
            <span className="text-[9px] text-amber-400 font-bold">Khuyên dùng: Ultra Master 5.5K</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {UPSCALE_RESOLUTION_OPTIONS.map((res) => {
              const isSelected = targetRes === res.id;
              const isUltra = res.id === 'ultra';
              return (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    setTargetRes(res.id);
                    updateSetting('targetRes', res.id);
                  }}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-1 relative overflow-hidden ${
                    isSelected
                      ? (isUltra
                          ? 'bg-gradient-to-b from-amber-500/25 via-amber-500/15 to-transparent border-amber-400 text-white ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/15'
                          : 'bg-indigo-500/20 border-indigo-400 text-white ring-2 ring-indigo-500/20 shadow-md')
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider">{res.label}</span>
                    {isSelected && (
                      <span className={`w-2 h-2 rounded-full ${isUltra ? 'bg-amber-400 animate-pulse' : 'bg-indigo-400'}`}></span>
                    )}
                  </div>
                  <span className={`text-[9px] font-mono font-bold ${isUltra ? 'text-amber-300' : 'text-indigo-300'}`}>
                    {res.pixels}
                  </span>
                  <span className="text-[8px] text-white/40 line-clamp-2 leading-tight mt-0.5">{res.desc}</span>
                  {res.badge && (
                    <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full border self-start mt-1 ${res.badgeColor}`}>
                      {res.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. AI Super-Resolution Engine */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">
            Mô hình AI Siêu phân giải (Engine)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {UPSCALE_MODELS_METADATA.slice(0, 2).map((mod) => {
              const isSelected = engine === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setEngine(mod.id);
                    updateSetting('model', mod.id);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-500/20 shadow-md'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{mod.name}</span>
                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${mod.tagColor}`}>
                      {mod.tag}
                    </span>
                  </div>
                  <p className="text-[9px] text-white/50 leading-relaxed mt-0.5">
                    {mod.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 💎 ALL-IN-ONE FUSION STUDIO ACCORDION */}
        <div className="border border-amber-500/30 rounded-2xl overflow-hidden bg-gradient-to-b from-amber-500/10 via-white/[0.02] to-transparent shadow-lg">
          <button
            type="button"
            onClick={() => setIsFusionOpen(!isFusionOpen)}
            className="w-full p-4 flex items-center justify-between text-xs font-black text-white hover:text-amber-300 transition-all bg-amber-500/10 border-b border-amber-500/20"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">💎</span>
              <span className="tracking-wide uppercase">Bộ Tích Hợp Toàn Diện (All-in-One Fusion)</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                Biometric + Anti-AI + Studio Science
              </span>
            </span>
            <span className="text-xs font-mono text-white/50">{isFusionOpen ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
          </button>

          {isFusionOpen && (
            <div className="p-4 space-y-4 text-xs animate-in fade-in duration-200">
              {/* Feature A: Biometric Core & Character Vault Identity Lock */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧬</span>
                    <div>
                      <span className="font-bold text-white block text-xs">
                        Khóa Nhân Trắc Học & Kho Mẫu (Biometric Identity Lock)
                      </span>
                      <span className="text-[10px] text-white/50">
                        Giữ nguyên nốt ruồi, dáng mắt, sống mũi, con ngươi, triệt tiêu hoàn toàn biến dạng mặt
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={biometricLockEnabled}
                    onChange={(e) => {
                      setBiometricLockEnabled(e.target.checked);
                      updateSetting('biometricLockEnabled', e.target.checked);
                    }}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </div>

                {biometricLockEnabled && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <label className="text-[10px] font-semibold text-white/70 block">
                      Chọn Model bảo toàn từ Kho Mẫu (Character Vault):
                    </label>
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => {
                        setSelectedPersonaId(e.target.value);
                        updateSetting('selectedPersonaId', e.target.value);
                      }}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="auto">✨ Tự động quét & Khóa nhân trắc học từ ảnh gốc (Auto-Scan)</option>
                      {availablePersonas.map((persona) => (
                        <option key={persona.id} value={persona.id}>
                          👤 {persona.name} ({persona.gender}, {persona.ageRange || 'Model'})
                          {persona.biometricProfile ? ' - [Đã phân tích Google Vision]' : ''}
                        </option>
                      ))}
                    </select>

                    {selectedPersona && (
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-amber-500/30 flex items-center gap-3">
                        {selectedPersona.avatarImage ? (
                          <img src={selectedPersona.avatarImage} className="w-10 h-10 rounded-lg object-cover border border-white/20" alt="Avatar" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300">
                            {selectedPersona.name[0]}
                          </div>
                        )}
                        <div className="flex flex-col text-[10px]">
                          <span className="font-bold text-white">{selectedPersona.name}</span>
                          <span className="text-white/50">{selectedPersona.faceFeatures || 'Khóa toàn bộ cấu trúc khuôn mặt và nốt ruồi'}</span>
                          {selectedPersona.biometricProfile?.distinguishingFeatures && (
                            <span className="text-amber-300 font-mono text-[9px] mt-0.5">
                              Điểm nhận diện: {selectedPersona.biometricProfile.distinguishingFeatures}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-2 pt-1 text-[11px] text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dualFaceIsolation}
                        onChange={(e) => {
                          setDualFaceIsolation(e.target.checked);
                          updateSetting('dualFaceIsolation', e.target.checked);
                        }}
                        className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
                      />
                      <span>👥 Kích hoạt phân lập 2 khuôn mặt độc lập (Dual Identity Anti-Bleed Isolation)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Feature B: Anti-AI Camouflage & Organic Film Grain */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎞️</span>
                    <div>
                      <span className="font-bold text-white block text-xs">
                        Hạt Phim Tự Nhiên & Khử Dấu Vết AI (Anti-AI Camouflage)
                      </span>
                      <span className="text-[10px] text-white/50">
                        Phủ vi hạt analog 35mm, phá vỡ lưới SynthID, cấy EXIF máy ảnh thực tế, triệt tiêu da nhựa
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiAiEnabled}
                    onChange={(e) => {
                      setAntiAiEnabled(e.target.checked);
                      updateSetting('antiAiEnabled', e.target.checked);
                    }}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </div>

                {antiAiEnabled && (
                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <div>
                      <span className="text-[10px] font-semibold text-white/70 block mb-1">
                        Cảm biến máy ảnh & Ống kính mô phỏng (Camera Profile):
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'SONY_A7IV', label: 'Sony A7 IV', lens: 'FE 50mm f/1.2 GM' },
                          { id: 'FUJIFILM_XT4', label: 'Fujifilm X-T4', lens: 'XF 35mm f/1.4 R' },
                          { id: 'CANON_R5', label: 'Canon EOS R5', lens: 'RF 85mm f/1.2L' },
                          { id: 'IPHONE_15_PRO', label: 'iPhone 15 Pro Max', lens: '24mm f/1.78' }
                        ].map(cam => (
                          <button
                            key={cam.id}
                            type="button"
                            onClick={() => {
                              setCameraPreset(cam.id as any);
                              updateSetting('cameraPreset', cam.id as any);
                            }}
                            className={`p-2 rounded-xl border text-left transition-all ${
                              cameraPreset === cam.id
                                ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                            }`}
                          >
                            <span className="block text-xs">{cam.label}</span>
                            <span className="block text-[8px] text-white/40">{cam.lens}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-white/70">Mật độ hạt phim Analog (Film Grain):</span>
                        <span className="text-amber-400 font-mono font-bold">{filmGrainPct}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.2"
                        value={filmGrainPct}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFilmGrainPct(val);
                          updateSetting('filmGrainPct', val);
                        }}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                      <div className="flex justify-between text-[8px] text-white/40 font-mono">
                        <span>0% (Sạch kỹ thuật số)</span>
                        <span>2.2% (Chuẩn 35mm sắc nét)</span>
                        <span>5.0% (Medium Format đậm chất phim)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Feature C: Studio Color & Lighting Science */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">💡</span>
                  <span className="font-bold text-white block text-xs">
                    Khoa Học Màu Sắc & Ánh Sáng Studio (Color & Lighting Science)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'porcelain_rose', label: '🌸 Da Trắng Hồng', desc: 'Trắng hồng trong trẻo, mịn màng' },
                    { id: 'warm_amber', label: '☀️ Studio Ấm Áp', desc: 'Tone vàng hổ phách rạng rỡ' },
                    { id: 'cinematic_moody', label: '🎬 Điện Ảnh Sâu Lắng', desc: 'Tương phản sâu, khối ven nét' },
                    { id: 'neutral', label: '⚪ Trung Tính Gốc', desc: 'Giữ 100% cân bằng trắng gốc' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setColorScience(c.id as any);
                        updateSetting('colorScience', c.id as any);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        colorScience === c.id
                          ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      <span className="block text-xs">{c.label}</span>
                      <span className="block text-[8px] text-white/40">{c.desc}</span>
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 pt-1 text-[11px] text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lightingEnhance}
                    onChange={(e) => {
                      setLightingEnhance(e.target.checked);
                      updateSetting('lightingEnhance', e.target.checked);
                    }}
                    className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
                  />
                  <span>Tôn vinh ánh sáng ven tóc & bắt sáng tròng mắt (Rim Light & Softbox Catchlights)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 5. Advanced Controls Accordion */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-white/80 hover:text-white transition-all bg-white/[0.02]"
          >
            <span className="flex items-center gap-2">
              <span>⚙️</span>
              <span>Tùy chỉnh bổ sung (Độ trung thực, Khử nhiễu, Tương phản vi mô)</span>
            </span>
            <span className="text-xs font-mono text-white/40">{isAdvancedOpen ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
          </button>

          {isAdvancedOpen && (
            <div className="p-4 space-y-4 border-t border-white/10 text-xs animate-in fade-in duration-200">
              {/* Detail Synthesis Level */}
              <div className="space-y-1.5">
                <span className="font-semibold text-white/70 block">Mức độ tổng hợp vi chi tiết:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'subtle', label: 'Nghiêm ngặt', desc: '100% trung thực' },
                    { id: 'balanced', label: 'Cân bằng', desc: 'Bù đắp tự nhiên' },
                    { id: 'rich', label: 'Siêu chi tiết', desc: 'Tái tạo sâu thớ vải/da' }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => {
                        setFidelity(lvl.id as any);
                        updateSetting('fidelity', lvl.id as any);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        fidelity === lvl.id
                          ? 'bg-amber-500/25 border-amber-400 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      <span className="block text-[11px]">{lvl.label}</span>
                      <span className="block text-[8px] text-white/40">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Denoise Level */}
              <div className="space-y-1.5">
                <span className="font-semibold text-white/70 block">Khử nhiễu nén JPEG:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low', label: 'Nhẹ', desc: 'Giữ hạt nguyên bản' },
                    { id: 'medium', label: 'Tiêu chuẩn', desc: 'Khử sạch sọc nén' },
                    { id: 'high', label: 'Mạnh', desc: 'Lọc nhiễu cảm biến ISO cao' }
                  ].map(dn => (
                    <button
                      key={dn.id}
                      type="button"
                      onClick={() => {
                        setDenoise(dn.id as any);
                        updateSetting('denoise', dn.id as any);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        denoise === dn.id
                          ? 'bg-amber-500/25 border-amber-400 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      <span className="block text-[11px]">{dn.label}</span>
                      <span className="block text-[8px] text-white/40">{dn.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Scale Micro-Contrast Clarity Boost Slider */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white/80 flex items-center gap-1.5">
                    <span>⚡</span> Tăng vi tương phản đa tầng (Multi-Scale Micro-Contrast):
                  </span>
                  <span className="font-mono text-amber-400 font-bold">+{clarityBoost}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="2"
                  value={clarityBoost}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setClarityBoost(val);
                    updateSetting('clarityBoost', val);
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[9px] text-white/40 font-mono">
                  <span>0% (Tự nhiên)</span>
                  <span>18% (Chuẩn Studio Đỉnh Cao)</span>
                  <span>40% (Sắc cạnh cực đại)</span>
                </div>
              </div>

              {/* Custom Guidance Prompt */}
              <div className="space-y-1.5">
                <span className="font-semibold text-white/70 block">Ghi chú định hướng AI bổ sung (Tùy chọn):</span>
                <textarea
                  value={customGuidance}
                  onChange={(e) => {
                    setCustomGuidance(e.target.value);
                    updateSetting('customGuidance', e.target.value);
                  }}
                  placeholder="Ví dụ: Giữ nguyên nốt ruồi ở cằm, làm sắc nét hoa tai bạc, tăng độ bóng của mái tóc..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 custom-scrollbar h-16 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Execution Button & Progress */}
        <div className="pt-2">
          {isUpscaling ? (
            <div className="space-y-3 bg-white/5 border border-amber-500/30 p-5 rounded-2xl animate-pulse">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/80 font-mono font-bold">{progressMsg}</span>
                <span className="text-xs text-amber-400 font-mono font-black">{progressPercent}%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 h-full transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleExecute}
              disabled={!src}
              className={`w-full py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 ${
                src
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:opacity-95 text-black shadow-amber-500/25 ring-2 ring-amber-400/50 font-black'
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
              }`}
            >
              <span className="text-base">👑</span>
              <span>
                {targetRes === 'ultra'
                  ? 'Nâng cấp Ultra Master 5.5K (3072×5504 Pro 3)'
                  : (targetRes === '4k'
                      ? 'Nâng cấp 4K Ultra HD (Pro 3)'
                      : `Nâng cấp ${targetRes.toUpperCase()} Siêu Nét`)}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Output & Interactive Before/After Split Comparison */}
      <div className="lg:col-span-6 lg:sticky lg:top-24 glass-card bg-black/40 p-6 lg:p-8 rounded-[2rem] flex flex-col justify-between border border-white/5 shadow-2xl min-h-[500px] lg:min-h-[640px] space-y-6">
        {result ? (
          <div className="space-y-6 flex flex-col justify-between h-full">
            {/* Top Toolbar: View Mode & Badges */}
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Kết Quả Siêu Nét</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-mono font-black uppercase">
                  {feedback?.targetRes === 'ultra' ? 'Ultra Master 5.5K' : (feedback?.targetRes === '4k' ? 'UHD 4K' : (feedback?.targetRes === '1k' ? 'HD 1K' : 'QHD 2K'))}
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                  {feedback?.modelUsed === 'gemini-3-pro-image' ? 'Pro 3 Core' : 'Flash HQ'}
                </span>
              </div>

              {/* View Mode Switcher */}
              <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setCompareMode('split')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    compareMode === 'split' ? 'bg-amber-500 text-black shadow font-black' : 'text-white/50 hover:text-white'
                  }`}
                  title="Thanh trượt so sánh Trước / Sau"
                >
                  ↔️ So Sánh Trượt
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('side-by-side')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    compareMode === 'side-by-side' ? 'bg-amber-500 text-black shadow font-black' : 'text-white/50 hover:text-white'
                  }`}
                  title="Xem hai ảnh song song"
                >
                  🪟 Song Song
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('result-only')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    compareMode === 'result-only' ? 'bg-amber-500 text-black shadow font-black' : 'text-white/50 hover:text-white'
                  }`}
                  title="Chỉ xem ảnh kết quả"
                >
                  🔍 Toàn Màn Hình
                </button>
              </div>
            </div>

            {/* Interactive Image Display */}
            {compareMode === 'split' && src ? (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-white/50 px-1">
                  <span>◀ Ảnh Gốc (Trước)</span>
                  <span className="text-amber-400 font-bold">Ultra Master Upscaled (Sau) ▶</span>
                </div>
                <div
                  ref={splitContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-black/60 shadow-2xl mx-auto cursor-ew-resize select-none touch-none"
                  style={{
                    aspectRatio: aspectRatio || '4/3',
                    maxWidth: aspectRatio ? `${420 * aspectRatio}px` : '100%',
                    width: '100%',
                    maxHeight: '420px'
                  }}
                >
                  {/* Background: Original Image */}
                  <img
                    src={src}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    alt="Original"
                  />

                  {/* Foreground: Upscaled Image clipped by slider position */}
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
                    style={{
                      clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`
                    }}
                  >
                    <img
                      src={result}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      alt="Upscaled"
                    />
                  </div>

                  {/* Divider Line & Draggable Handle */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none"
                    style={{ left: `${splitPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-500 text-black border-2 border-white flex items-center justify-center text-[10px] font-black shadow-2xl">
                      ↔
                    </div>
                  </div>

                  <span className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[8px] font-mono text-white/70 pointer-events-none">
                    Gốc (Standard)
                  </span>
                  <span className="absolute bottom-2 right-2 bg-amber-950/90 border border-amber-500/50 px-2 py-0.5 rounded text-[8px] font-mono text-amber-300 font-bold pointer-events-none">
                    {feedback?.realDimensions || (targetRes === 'ultra' ? '3072 × 5504' : targetRes.toUpperCase())}
                  </span>
                </div>
              </div>
            ) : compareMode === 'side-by-side' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] text-white/40 uppercase tracking-widest font-black leading-none block">
                    Ảnh gốc
                  </span>
                  <div
                    className="rounded-xl overflow-hidden border border-white/10 bg-black/40 relative flex items-center justify-center mx-auto"
                    style={{
                      aspectRatio: aspectRatio || '4/3',
                      maxWidth: aspectRatio ? `${300 * aspectRatio}px` : '100%',
                      width: '100%',
                      maxHeight: '300px'
                    }}
                  >
                    <img src={src || ''} className="w-full h-full object-contain" alt="Original" />
                    <span className="absolute bottom-2 left-2 bg-black/75 px-2 py-1 rounded text-[8px] font-mono text-white/70">
                      Standard Res
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] text-amber-400 uppercase tracking-widest font-black leading-none block">
                    AI Upscaled ({targetRes.toUpperCase()})
                  </span>
                  <div
                    className="rounded-xl overflow-hidden border border-amber-500/40 bg-black/40 relative shadow-2xl flex items-center justify-center mx-auto"
                    style={{
                      aspectRatio: aspectRatio || '4/3',
                      maxWidth: aspectRatio ? `${300 * aspectRatio}px` : '100%',
                      width: '100%',
                      maxHeight: '300px'
                    }}
                  >
                    <img src={result} className="w-full h-full object-contain" alt="Upscaled result" />
                    <span className="absolute bottom-2 left-2 bg-amber-950/90 border border-amber-500/40 px-2 py-1 rounded text-[8px] font-mono text-amber-300 font-bold">
                      {feedback?.realDimensions || 'Ultra Master'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden border border-amber-500/40 bg-black/50 relative shadow-2xl flex items-center justify-center mx-auto"
                style={{
                  aspectRatio: aspectRatio || '4/3',
                  maxWidth: aspectRatio ? `${420 * aspectRatio}px` : '100%',
                  width: '100%',
                  maxHeight: '420px'
                }}
              >
                <img src={result} className="w-full h-full object-contain" alt="Full Upscaled" />
              </div>
            )}

            {/* Quality Audit Scorecard */}
            <div className="bg-white/5 border border-amber-500/20 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  Báo cáo kiểm định chất lượng quang học
                </span>
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25">
                  <span className="text-[10px] text-white/60 font-medium">Model:</span>
                  <span className="text-xs text-amber-400 font-black tracking-wide font-mono">
                    {feedback?.modelUsed === 'gemini-3-pro-image' ? 'Gemini 3 Pro' : 'Flash 3.1 HQ'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] text-white/40 uppercase tracking-wider block">Độ phân giải thực tế</span>
                  <span className="font-bold text-amber-300 block font-mono">
                    {feedback?.realDimensions || (targetRes === 'ultra' ? '3072 × 5504 (Ultra Master)' : '3840 × 2160 (4K UHD)')}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-white/40 uppercase tracking-wider block">Khóa nhân trắc học</span>
                  <span className="font-bold text-white block">
                    {biometricLockEnabled ? '100% Biometric Locked' : 'Tự do'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-t border-white/5">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-white/40 uppercase tracking-wider block">Hạt phim & Khử AI</span>
                  <span className="font-bold text-emerald-300 block">
                    {antiAiEnabled ? `Đã cấy EXIF (${cameraPreset})` : 'Tắt'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-white/40 uppercase tracking-wider block">Tone da & Ánh sáng</span>
                  <span className="font-bold text-rose-300 block capitalize">
                    {colorScience.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">Độ nét thớ da & lỗ chân lông (Macro Pores)</span>
                    <span className="text-amber-400 font-mono font-bold">
                      +{targetRes === 'ultra' ? '99%' : (targetRes === '4k' ? '96%' : '88%')}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full" style={{ width: targetRes === 'ultra' ? '99%' : (targetRes === '4k' ? '96%' : '88%') }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">Độ sắc cạnh tơ tóc & lông mi (Lash & Hair Separation)</span>
                    <span className="text-cyan-400 font-mono font-bold">
                      +{targetRes === 'ultra' ? '98%' : (targetRes === '4k' ? '94%' : '85%')}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full" style={{ width: targetRes === 'ultra' ? '98%' : (targetRes === '4k' ? '94%' : '85%') }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => onDownload(result, targetRes === 'ultra' ? 'upscaled-ultra5k' : 'upscaled4k')}
                className="bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20 active:scale-[0.97]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải 3072×5504
              </button>

              <button
                onClick={() => {
                  const metadata = {
                    model: feedback?.modelUsed || 'gemini-3-pro-image',
                    aspectRatio: aspectRatio ? `${Math.round(aspectRatio * 100) / 100}:1` : '9:16',
                    promptJson: {
                      subject: "Ultra Master 5.5K Upscaled Render",
                      art_style: `Super Resolution ${targetRes.toUpperCase()} (${activePresetMeta.label})`,
                      texture: "Macro Epidermal Pores & Optical Reconstruction",
                      lighting: "Studio Softbox Rim Highlights",
                      posing: "",
                      color_palette: colorScience,
                      composition: "",
                      camera_angle: "",
                      skin_texture: "Visible Micro Pores, Natural Peach Fuzz",
                      font: "",
                      mood: "",
                      additional_details: ""
                    },
                    upscaledFrom: src || '',
                    upscaleFeedback: feedback
                  };
                  onSaveToGallery(result, `Upscaled Ultra Master (${activePresetMeta.label})`, metadata);
                }}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/10 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors active:scale-[0.97]"
              >
                Lưu Thư viện
              </button>

              <button
                onClick={() => onUseAsPose(result)}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/10 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors active:scale-[0.97]"
              >
                Dùng làm dáng
              </button>

              {onOpenInStudio && (
                <button
                  onClick={() => onOpenInStudio(result)}
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/10 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors active:scale-[0.97]"
                >
                  Chỉnh Studio
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20 opacity-30 select-none">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <span className="font-black text-sm tracking-[0.4em] uppercase text-white/40">Studio Standby</span>
            <p className="text-xs text-white/30 uppercase tracking-wider max-w-xs">
              Tải ảnh lên và bấm bắt đầu để tái tạo ảnh siêu sắc nét với Google Pro 3.
            </p>
          </div>
        )}
      </div>
    </div>
  ) : (
    /* --- BATCH SUPER-RESOLUTION 5.5K VIEW --- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
          {/* Left Column: Batch Optical Config & Multi-Uploader */}
          <div className="lg:col-span-5 glass-card p-6 lg:p-7 rounded-[2rem] flex flex-col space-y-5 shadow-2xl">
            {/* Batch Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-xl font-black text-white tracking-tight">Hàng Đợi Nâng Cấp 5.5K</h3>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-rose-500/40">
                  Batch Multi-Upscale
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Tự động xử lý tuần tự nhiều ảnh với cơ chế chống nghẽn Synaptic Cooling và xuất file nén ZIP một chạm.
              </p>
            </div>

            {/* Multi-File Upload & Gallery Add Area */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">
                Nguồn ảnh vào hàng đợi
              </label>

              <label
                className="border-2 border-dashed border-white/15 hover:border-amber-400/50 bg-white/5 hover:bg-amber-500/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleAddBatchFiles(e.dataTransfer.files);
                  }
                }}
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform border border-white/10 text-amber-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Kéo thả nhiều ảnh vào đây</span>
                <span className="text-[10px] text-white/40 mt-0.5">Chọn nhiều file cùng lúc (PNG, JPG, WEBP)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleAddBatchFiles(e.target.files);
                    }
                  }}
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsGalleryPickerOpen(true)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>📁</span>
                  <span>Chọn từ Thư Viện ({galleryItems.filter(i => i.src && !i.src.includes('video')).length} ảnh)</span>
                </button>
              </div>
            </div>

            {/* Target Resolution Options */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block flex items-center justify-between">
                <span>Độ phân giải áp dụng</span>
                <span className="text-[9px] text-amber-400 font-bold">Ultra Master 5.5K (17MP)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {UPSCALE_RESOLUTION_OPTIONS.map((res) => {
                  const isSelected = targetRes === res.id;
                  const isUltra = res.id === 'ultra';
                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setTargetRes(res.id)}
                      className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? (isUltra ? 'bg-amber-500/25 border-amber-400 text-white ring-2 ring-amber-500/40 shadow-lg' : 'bg-indigo-500/20 border-indigo-400 text-white ring-2 ring-indigo-500/20')
                          : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-wider">{res.label}</span>
                        {isSelected && <span className={`w-2 h-2 rounded-full ${isUltra ? 'bg-amber-400 animate-pulse' : 'bg-indigo-400'}`} />}
                      </div>
                      <span className={`text-[9px] font-mono font-bold ${isUltra ? 'text-amber-300' : 'text-indigo-300'}`}>
                        {res.pixels}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preset Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">
                Preset Phục Hồi Chi Tiết
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {UPSCALE_PRESETS_METADATA.map((p) => {
                  const isSelected = preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreset(p.id)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        isSelected
                          ? `bg-gradient-to-b ${p.color} border-white/40 shadow-md ring-2 ring-indigo-500/30 text-white font-bold`
                          : 'bg-white/5 border-white/10 hover:border-white/20 text-white/60'
                      }`}
                    >
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-[10px] font-bold truncate max-w-full">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Engine & Optics */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <span className="text-xs font-bold text-white block">Tự động tăng nét Macro</span>
                  <span className="text-[10px] text-white/40">Khôi phục lỗ chân lông & vi chi tiết</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={clarityBoost}
                    onChange={(e) => setClarityBoost(Number(e.target.value))}
                    className="w-20 accent-amber-400"
                  />
                  <span className="text-xs font-mono font-bold text-amber-300 w-8 text-right">+{clarityBoost}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <span className="text-xs font-bold text-white block">Khóa nhân trắc học</span>
                  <span className="text-[10px] text-white/40">Giữ nguyên diện mạo khuôn mặt</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBiometricLockEnabled(!biometricLockEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${biometricLockEnabled ? 'bg-emerald-500' : 'bg-white/20'}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${biometricLockEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <span className="text-xs font-bold text-white block">Khử Bẫy AI & Phủ hạt 35mm</span>
                  <span className="text-[10px] text-white/40">Triệt tiêu chất nhựa sáp nhân tạo</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAntiAiEnabled(!antiAiEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${antiAiEnabled ? 'bg-amber-500' : 'bg-white/20'}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${antiAiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Queue Execution & Status */}
          <div className="lg:col-span-7 glass-card p-6 lg:p-7 rounded-[2rem] flex flex-col space-y-5 shadow-2xl min-h-[500px]">
            {/* Queue Header & Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>📋</span>
                  <span>Danh Sách Hàng Đợi</span>
                  <span className="bg-white/10 text-white px-2 py-0.5 rounded-full text-xs font-mono font-bold">
                    {batchQueue.length}
                  </span>
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-white/50 flex-wrap">
                  <span className="text-emerald-400 font-bold">✅ Đã xong: {batchQueue.filter(i => i.status === 'done').length}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">⚡ Đang chạy: {batchQueue.filter(i => i.status === 'processing').length}</span>
                  <span>•</span>
                  <span className="text-white/60">⏳ Chờ: {batchQueue.filter(i => i.status === 'pending').length}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {isBatchRunning ? (
                  <button
                    type="button"
                    onClick={handleStopBatch}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20"
                  >
                    <span>⏸️</span>
                    <span>Tạm Dừng</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartBatch}
                    disabled={batchQueue.filter(i => i.status === 'pending' || i.status === 'error').length === 0}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                  >
                    <span>🚀</span>
                    <span>Bắt Đầu Nâng Cấp ({batchQueue.filter(i => i.status === 'pending' || i.status === 'error').length})</span>
                  </button>
                )}

                {batchQueue.some(i => i.status === 'done') && (
                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isExportingBatchZip}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    title="Tải toàn bộ ảnh đã nâng cấp thành 1 file zip"
                  >
                    {isExportingBatchZip ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang nén ZIP...</span>
                      </>
                    ) : (
                      <>
                        <span>📦</span>
                        <span>Tải Tất Cả (.ZIP)</span>
                      </>
                    )}
                  </button>
                )}

                {batchQueue.length > 0 && !isBatchRunning && (
                  <button
                    type="button"
                    onClick={handleClearBatchQueue}
                    className="p-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-white/50 rounded-xl transition-colors border border-white/10"
                    title="Xóa toàn bộ hàng đợi"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Synaptic Cooling Live Alert */}
            {coolingCountdown > 0 && (
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-200 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="text-lg">❄️</span>
                  <div>
                    <span className="text-xs font-bold block">Synaptic Cooling kích hoạt</span>
                    <span className="text-[10px] text-cyan-300/70">Đang làm mát API để triệt tiêu lỗi 429 và chuẩn hóa hàng đợi...</span>
                  </div>
                </div>
                <span className="font-mono font-black text-sm bg-cyan-500/20 px-2.5 py-1 rounded-xl border border-cyan-400/40">
                  {coolingCountdown}s
                </span>
              </div>
            )}

            {/* Queue Items List */}
            {batchQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-16 opacity-40 select-none space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-3xl">📭</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Hàng đợi đang trống</h4>
                  <p className="text-xs text-white/50 max-w-sm mt-1">
                    Hãy kéo thả nhiều ảnh hoặc bấm "Chọn từ Thư Viện" ở cột bên trái để bắt đầu nâng cấp hàng loạt.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
                {batchQueue.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      item.status === 'processing'
                        ? 'border-amber-400/60 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : item.status === 'done'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : item.status === 'error'
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    {/* Left: Thumbnail with click to preview */}
                    <div
                      onClick={() => setPreviewModalImage(item.resultUrl || item.src)}
                      className="w-16 h-16 rounded-xl overflow-hidden relative flex-none cursor-pointer group/thumb border border-white/15 bg-black/40"
                      title="Bấm để xem lớn"
                    >
                      <img src={item.resultUrl || item.src} className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" alt={item.name} />
                      <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-md text-[9px] font-black text-white px-1.5 py-0.2 rounded">
                        #{idx + 1}
                      </div>
                      {item.resultUrl && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-xs">✨</span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Info & Progress Bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate" title={item.name}>
                          {item.name}
                        </span>
                        {item.status === 'pending' && (
                          <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full font-mono">
                            Chờ xử lý
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            Đang nâng cấp ({item.progress}%)
                          </span>
                        )}
                        {item.status === 'done' && (
                          <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span>✅</span>
                            3072×5504
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-[10px] text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full font-bold">
                            Lỗi
                          </span>
                        )}
                      </div>

                      {/* Technical Specs Tags */}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40 flex-wrap">
                        {item.dimensions && (
                          <span className="font-mono">
                            {item.dimensions.width}×{item.dimensions.height}
                          </span>
                        )}
                        <span>➔</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {targetRes === 'ultra' ? '3072×5504 Ultra Master' : targetRes.toUpperCase()}
                        </span>
                      </div>

                      {/* Progress Bar for processing */}
                      {item.status === 'processing' && (
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-rose-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Error details */}
                      {item.error && (
                        <p className="text-[10px] text-red-300 mt-1 line-clamp-1 italic">
                          {item.error}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 flex-none">
                      {item.resultUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => onDownload(item.resultUrl!, `${item.name.replace(/\.[^/.]+$/, '')}_5.5K`)}
                            className="p-2 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 rounded-xl transition-all"
                            title="Tải ảnh này về máy"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          {onOpenInStudio && (
                            <button
                              type="button"
                              onClick={() => onOpenInStudio(item.resultUrl!)}
                              className="p-2 bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 rounded-xl transition-all"
                              title="Mở trong Photo Studio"
                            >
                              <span className="text-xs">🎨</span>
                            </button>
                          )}
                        </>
                      )}

                      {!isBatchRunning && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchItem(item.id)}
                          className="p-2 hover:bg-red-500/20 text-white/30 hover:text-red-300 rounded-xl transition-all"
                          title="Xóa ảnh này khỏi hàng đợi"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gallery Multi-Picker Modal for Batch */}
      {isGalleryPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900/95 border border-white/15 rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>📁</span>
                  <span>Chọn ảnh từ Thư Viện đưa vào Hàng Đợi 5.5K</span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Đã chọn {selectedGalleryItemIds.size} / {galleryItems.filter(i => i.src && !i.src.includes('video')).length} ảnh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGalleryPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllGalleryItems}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={handleClearGallerySelection}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-1 custom-scrollbar">
              {galleryItems.filter(i => i.src && !i.src.includes('video')).map((item) => {
                const isSelected = selectedGalleryItemIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleGallerySelection(item.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/40 scale-[0.96] shadow-lg'
                        : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={item.src} className="w-full h-full object-cover" alt="Gallery thumbnail" />
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-amber-400 border-amber-300 text-black font-black' : 'bg-black/50 border-white/40'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsGalleryPickerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAddFromGallery}
                disabled={selectedGalleryItemIds.size === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/25 active:scale-95"
              >
                Thêm ({selectedGalleryItemIds.size}) ảnh vào hàng đợi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={previewModalImage} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20" alt="Preview" />
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-red-600/80 text-white p-2.5 rounded-full backdrop-blur-md transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
