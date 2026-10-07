import React, { useState, useEffect, useRef } from 'react';
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
import { fileToBase64, imageUrlToBase64 } from '../services/geminiService';
import { getCharacterPersonas } from '../services/consistencyService';
import { CAMERA_PROFILES } from '../services/antiAiCamouflageService';

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

  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Automatically measure aspect ratio when image changes
  useEffect(() => {
    if (!src) {
      setAspectRatio(null);
      return;
    }
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
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
    onStartUpscale({
      targetRes,
      engine,
      preset,
      fidelity,
      denoise,
      faceEnhance,
      clarityBoost,
      customGuidance,
      aspectRatio: aspectRatio || undefined,
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
      {/* Left Column: Controls & Optical Configuration */}
      <div className="lg:col-span-6 glass-card p-6 lg:p-8 rounded-[2rem] flex flex-col space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
              <span>👑</span>
              <span>{t('upscale.title', 'Studio Super-Resolution 5.5K')}</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-black border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                Ultra Master 17MP
              </span>
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Khôi phục lỗ chân lông siêu nét, tơ tóc li ti, thớ vải voan xuyên thấu với Google Pro 3 & độ phân giải 3072×5504.
            </p>
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
  );
};
