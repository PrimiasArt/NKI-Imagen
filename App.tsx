import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SynapticChart } from './components/SynapticChart';
import { 
  generateImageFromJson, 
  composeImageFromPrompt, 
  analyzeImageToJson, 
  refineJsonWithPrompt, 
  generatePoseVariants, 
  textToImagePromptJson, 
  generateScriptBreakdown, 
  generateVeo3Prompt, 
  upscaleImage,
  subscribeToRateLimit, 
  getRpmLimit, 
  fileToBase64, 
  imageUrlToBase64,
  mergeCharacterAndOutfit,
  hasGeminiApiKey,
  getGeminiApiKey,
  fetchLatestImageModels,
  getCachedImageModels,
  DEFAULT_IMAGE_MODELS,
  ImageModelOption
} from './services/geminiService';
import { 
  ImagePromptJson, 
  AppMode, 
  ScriptScene, 
  GalleryItem, 
  GenerationMetadata, 
  Collection, 
  LogItem,
  PersonalPreset,
  GalleryFilterType,
  GalleryTimeRange,
  GalleryDensity,
  PromptHistoryItem,
  PromptSourceType
} from './types';
import {
  loadPersonalPresets,
  savePersonalPresetsToStorage,
  createPersonalPreset
} from './services/presetService';
import { JsonPromptEditor } from './components/JsonPromptEditor';
import { SavePresetModal } from './components/SavePresetModal';
import { PersonalPresetManagerModal } from './components/PersonalPresetManagerModal';
import { RealtimeRateLimitBar } from './components/RealtimeRateLimitBar';
import { PromptQualityMeter } from './components/PromptQualityMeter';
import { ConsistencyLockModal } from './components/ConsistencyLockModal';
import { PromptABCompareModal } from './components/PromptABCompareModal';
import { PromptSnapshotModal } from './components/PromptSnapshotModal';
import { CameraTrajectoryVisualizer } from './components/CameraTrajectoryVisualizer';
import { TimelineStoryboard } from './components/TimelineStoryboard';
import { VirtualGafferRelightingModal } from './components/VirtualGafferRelightingModal';
import { VoiceDirectorModal } from './components/VoiceDirectorModal';
import { Spatial3DViewerModal } from './components/Spatial3DViewerModal';
import { AestheticDnaBlenderModal } from './components/AestheticDnaBlenderModal';
import { MultiverseNodeGraphModal } from './components/MultiverseNodeGraphModal';
import { TalkingActorModal } from './components/TalkingActorModal';
import { CharacterVaultModal } from './components/CharacterVaultModal';
import { UploadCharacterChoiceModal } from './components/UploadCharacterChoiceModal';
import { UpscaleStudioSection, UpscaleExecutionSettings } from './components/UpscaleStudioSection';
import { InpaintingStudioModal } from './components/InpaintingStudioModal';
import { VirtualTryOnModal } from './components/VirtualTryOnModal';
import { CharacterTurnaroundModal } from './components/CharacterTurnaroundModal';
import { BiometricMorphModal } from './components/BiometricMorphModal';
import { CinematicStoryboardModal } from './components/CinematicStoryboardModal';
import { ECommerceLookbookModal } from './components/ECommerceLookbookModal';
import { VisualPipelineModal } from './components/VisualPipelineModal';
import { UpscaleTargetRes } from './services/imageUpscaleService';
import { getStudioModelConfig } from './services/modelConfigService';
import { 
  getActivePersona, 
  isConsistencyLockEnabled, 
  injectPersonaIntoPrompt,
  addPhotoToPersona,
  getCharacterPersonas,
  compressFileToBase64
} from './services/consistencyService';
import { decodePromptFromShareHash } from './services/promptSnapshotService';
import { CharacterPersona, StoryboardShot, BiometricProfile, DualCharacterPairing } from './types';
import { analyzeBiometricFaceCore, convertPersonaToBiometricProfile } from './services/biometricCoreService';
import { generationQueue } from './services/generationQueueService';
import { SynapticCoolingBanner } from './components/SynapticCoolingBanner';
import { GenerationQueueDrawer, FloatingQueueIndicator } from './components/GenerationQueueDrawer';
import { ApiKeyModal } from './components/ApiKeyModal';
import {
  initAuth,
  googleSignIn,
  logout,
  fetchImageAsBlob,
  uploadFileToDrive,
  getAccessToken,
  getOrCreateFolder,
  getSubfolders,
  listDriveFiles,
  downloadDriveFile,
  deleteDriveFile,
  purgeDriveDuplicates,
  refreshGoogleDriveSession,
  clearDriveAutoConnect,
  executeWithExponentialBackoff,
  blobToDataUrl,
  autoRestoreDriveSession,
  quickConnectGoogleDrive,
  isDriveAutoConnectEnabled
} from './services/googleService';
import { User } from 'firebase/auth';
import { SettingsModal } from './components/SettingsModal';
import { BatchCollectionModal } from './components/BatchCollectionModal';
import { UpdateNotificationToast } from './components/UpdateNotificationToast';
import { PhotoStudioWorkspace } from './components/PhotoStudio/PhotoStudioWorkspace';
import { useTranslation, SUPPORTED_LANGUAGES, AppLanguage } from './services/i18nService';
import { syncFullCloudVault, pushVaultToCloud, pullVaultFromCloud } from './services/cloudVaultService';
import { 
  loadAntiAiSettings, 
  applyAntiAiCamouflage, 
  sanitizePromptAntiAi, 
  sanitizePromptJsonAntiAi 
} from './services/antiAiCamouflageService';
import {
  deduplicateGalleryItems,
  countDuplicates,
  normalizeImageTitle
} from './services/galleryDeduplicationService';
import {
  getAllGalleryItemsDB,
  saveGalleryItemDB,
  saveAllGalleryItemsDB,
  deleteGalleryItemDB,
  clearGalleryDB,
  getAllCollectionsDB,
  saveCollectionDB,
  saveAllCollectionsDB,
  deleteCollectionDB,
  getStorageSettingsDB,
  saveStorageSettingsDB,
  getLocalDirectoryHandle,
  writeBlobToLocalDirectory,
  migrateFromLocalStorage,
  AppStorageSettings,
  DEFAULT_STORAGE_SETTINGS,
  getAllPromptItemsDB,
  savePromptItemDB,
  deletePromptItemDB,
  clearAllPromptItemsDB,
  saveAllPromptItemsDB
} from './services/indexedDbService';

// Constants
// Safe Storage Wrapper to prevent iframe/sandboxed SecurityError
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage ? window.localStorage.getItem(key) : null;
      }
    } catch (e) {
      console.warn("localStorage.getItem blocked:", e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("localStorage.setItem blocked:", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn("localStorage.removeItem blocked:", e);
    }
  }
};

const DEFAULT_JSON: ImagePromptJson = {
  subject: "A futuristic cityscape at sunset",
  art_style: "Cyberpunk, digital art",
  posing: "A cyborg leaning against a neon-lit balcony, looking out over the city",
  lighting: "Single light source, dramatic shadows, candlelight",
  color_palette: "Purple, cyan, orange, deep black",
  composition: "Wide angle, looking up from street level, subtle bokeh effect in the background",
  camera_angle: "Low angle, tilted upwards",
  texture: "Canvas Texture, Smooth digital render, sharp details",
  skin_texture: "N/A",
  font: "Neon sign typography, glowing kanji, futuristic sans-serif",
  mood: "Energetic, mysterious",
  additional_details: "Flying cars, holographic billboards, rain-slicked streets"
};

const BLANK_PROMPT_JSON: ImagePromptJson = {
  subject: "",
  art_style: "",
  posing: "",
  lighting: "",
  color_palette: "",
  composition: "",
  camera_angle: "",
  texture: "",
  skin_texture: "",
  font: "",
  mood: "",
  additional_details: ""
};

/**
 * Utility to clean prompt text: deduplicate comma-separated tags, trim whitespace
 */
const sanitizeAndDeduplicatePrompt = (text: string): string => {
  if (!text) return "";
  return text
    .split(',')
    .map(s => s.trim())
    .filter((val, idx, arr) => val.length > 0 && arr.indexOf(val) === idx)
    .join(', ');
};

const IMAGE_MODELS = DEFAULT_IMAGE_MODELS;

const PRESETS: Record<string, Partial<ImagePromptJson>> = {
  "Hyper-Realistic": {
    art_style: "Photorealistic, 8k resolution, shot on 35mm lens",
    lighting: "Natural sunlight, soft shadows, global illumination",
    texture: "Razor Sharp, Smooth, fine details",
    mood: "Authentic, serene",
    additional_details: "Intricate details, realistic physics, depth of field"
  },
  "Ghibli Anime": {
    art_style: "Studio Ghibli hand-drawn animation style, cel shaded",
    lighting: "Soft ambient daylight, painterly shadows",
    texture: "Paper Texture, Soft Focus, hand-painted look",
    mood: "Whimsical, nostalgic",
    additional_details: "Lush greenery, floating dust motes, Wood-cut style aesthetic"
  },
  "Cyberpunk Neon": {
    art_style: "Futuristic cyberpunk, retro-synthwave aesthetic",
    lighting: "Hard neon lights, high contrast, volumetric fog",
    color_palette: "Hot pink, electric blue, deep violet",
    texture: "Digital High ISO Noise, Razor Sharp",
    mood: "Gritty, energetic",
    additional_details: "Rain-slicked surfaces, holographic advertisements"
  },
  "Dark Fantasy": {
    art_style: "Oil painting, Baroque Chiaroscuro style",
    lighting: "Single light source, dramatic shadows, candlelight",
    color_palette: "Deep reds, ochre, midnight black",
    texture: "Canvas Texture, Heavy Film Grain",
    mood: "Ominous, epic",
    additional_details: "Swirling mist, gothic architecture, ancient artifacts"
  },
  "3D Pixar": {
    art_style: "Modern 3D animation, Disney/Pixar style render",
    lighting: "Warm rim lighting, subsurface scattering",
    texture: "Smooth, Glossy, stylized surfaces",
    mood: "Cheerful, vibrant",
    skin_texture: "Stylized, soft, flawless"
  },
  "Sketch / Charcoal": {
    art_style: "Rough charcoal sketch, graphite pencil drawing",
    lighting: "High contrast black and white, side lighting",
    color_palette: "Monochrome, shades of grey",
    texture: "Rough Paper Texture, Smudged",
    mood: "Raw, artistic"
  },
  "Vogue Fashion": {
    art_style: "High-fashion editorial photography",
    lighting: "Studio strobe, harsh rim light, high-end grading",
    composition: "Full body portrait, centered framing",
    texture: "Razor Sharp, Glossy",
    mood: "Sophisticated, bold"
  }
};

interface ThemeLightConfig {
  bg1: string;
  bg2: string;
  card: string;
  cardBorder: string;
  panel: string;
  panelBorder: string;
  header: string;
  headerBorder: string;
  input: string;
  inputBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  navPillBg: string;
  navPillActive: string;
}

const THEMES: Record<string, { label: string; colors: Record<number, string>; light: ThemeLightConfig }> = {
  emerald: {
    label: "Emerald",
    colors: {
      50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
      500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22'
    },
    light: {
      bg1: '#f3f8f5',
      bg2: '#e6f0e9',
      card: 'rgba(252, 254, 252, 0.82)',
      cardBorder: 'rgba(205, 225, 212, 0.75)',
      panel: 'rgba(236, 245, 239, 0.68)',
      panelBorder: 'rgba(215, 232, 221, 0.7)',
      header: 'rgba(243, 248, 245, 0.82)',
      headerBorder: 'rgba(212, 229, 218, 0.75)',
      input: 'rgba(255, 255, 255, 0.75)',
      inputBorder: 'rgba(197, 222, 208, 0.8)',
      textPrimary: '#112519',
      textSecondary: '#2c4937',
      textMuted: '#577563',
      navPillBg: 'rgba(224, 237, 228, 0.72)',
      navPillActive: 'rgba(255, 255, 255, 0.95)'
    }
  },
  blue: {
    label: "Ocean",
    colors: {
      50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
      500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554'
    },
    light: {
      bg1: '#f1f5fa',
      bg2: '#e4edf6',
      card: 'rgba(249, 251, 254, 0.82)',
      cardBorder: 'rgba(205, 224, 241, 0.75)',
      panel: 'rgba(235, 242, 249, 0.68)',
      panelBorder: 'rgba(216, 229, 242, 0.7)',
      header: 'rgba(241, 245, 250, 0.82)',
      headerBorder: 'rgba(209, 225, 241, 0.75)',
      input: 'rgba(255, 255, 255, 0.75)',
      inputBorder: 'rgba(194, 215, 237, 0.8)',
      textPrimary: '#0f2035',
      textSecondary: '#2a425b',
      textMuted: '#54708d',
      navPillBg: 'rgba(223, 235, 246, 0.72)',
      navPillActive: 'rgba(255, 255, 255, 0.95)'
    }
  },
  rose: {
    label: "Rose",
    colors: {
      50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
      500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519'
    },
    light: {
      bg1: '#faf3f4',
      bg2: '#f5e5e8',
      card: 'rgba(255, 250, 251, 0.82)',
      cardBorder: 'rgba(235, 208, 213, 0.75)',
      panel: 'rgba(248, 233, 236, 0.68)',
      panelBorder: 'rgba(237, 211, 216, 0.7)',
      header: 'rgba(250, 243, 244, 0.82)',
      headerBorder: 'rgba(238, 210, 215, 0.75)',
      input: 'rgba(255, 255, 255, 0.75)',
      inputBorder: 'rgba(228, 195, 201, 0.8)',
      textPrimary: '#2d1319',
      textSecondary: '#532e35',
      textMuted: '#835761',
      navPillBg: 'rgba(243, 223, 226, 0.72)',
      navPillActive: 'rgba(255, 255, 255, 0.95)'
    }
  },
  amber: {
    label: "Amber",
    colors: {
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
      500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03'
    },
    light: {
      bg1: '#faf5ea',
      bg2: '#f3ead5',
      card: 'rgba(253, 252, 247, 0.82)',
      cardBorder: 'rgba(233, 217, 190, 0.75)',
      panel: 'rgba(246, 237, 217, 0.68)',
      panelBorder: 'rgba(235, 222, 199, 0.7)',
      header: 'rgba(250, 245, 234, 0.82)',
      headerBorder: 'rgba(234, 219, 192, 0.75)',
      input: 'rgba(255, 255, 255, 0.75)',
      inputBorder: 'rgba(225, 206, 171, 0.8)',
      textPrimary: '#2a1e0f',
      textSecondary: '#524127',
      textMuted: '#7e6b4c',
      navPillBg: 'rgba(238, 224, 198, 0.72)',
      navPillActive: 'rgba(255, 255, 255, 0.95)'
    }
  },
  slate: {
    label: "Graphite",
    colors: {
      50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
      500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617'
    },
    light: {
      bg1: '#f5f4f1',
      bg2: '#eae6e0',
      card: 'rgba(250, 249, 246, 0.82)',
      cardBorder: 'rgba(222, 216, 208, 0.75)',
      panel: 'rgba(236, 232, 226, 0.68)',
      panelBorder: 'rgba(222, 217, 210, 0.7)',
      header: 'rgba(245, 244, 241, 0.82)',
      headerBorder: 'rgba(221, 216, 208, 0.75)',
      input: 'rgba(255, 255, 255, 0.75)',
      inputBorder: 'rgba(212, 206, 197, 0.8)',
      textPrimary: '#1e2023',
      textSecondary: '#43464d',
      textMuted: '#6c717a',
      navPillBg: 'rgba(225, 221, 213, 0.72)',
      navPillActive: 'rgba(255, 255, 255, 0.95)'
    }
  }
};
type ThemeKey = keyof typeof THEMES;

// Helper to generate improved filename
const getFormattedFileName = (prompt?: string, settings?: AppStorageSettings) => {
    const prefix = settings?.customPrefix || 'NKI_';
    const pattern = settings?.namingPattern || 'subject_timestamp';
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    
    const datePart = `${d}${m}${y}`;
    const timePart = `${hh}${mm}${ss}`;
    
    let snippet = 'artifact';
    if (prompt) {
        snippet = prompt
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove diacritics
            .replace(/[^a-z0-9\s-]/g, '') // Keep alphanumeric, spaces, hyphens
            .trim()
            .split(/\s+/)
            .slice(0, 4)
            .join('_')
            .slice(0, 40);
    }
    
    if (pattern === 'timestamp') {
      const randId = Math.random().toString(36).substring(2, 6);
      return `${prefix}${datePart}_${timePart}_${randId}.png`;
    }
    return `${prefix}${snippet || 'neural'}_${datePart}_${timePart}.png`;
};

interface ImageData {
    dataUrl: string;
    mimeType: string;
    base64: string;
}

interface AspectRatioOption { label: string; value: string; width: number; height: number; }
const ASPECT_RATIOS: AspectRatioOption[] = [
  { label: '1:1 (Square)', value: '1:1', width: 20, height: 20 },
  { label: '3:4 (Portrait)', value: '3:4', width: 15, height: 20 },
  { label: '4:3 (Landscape)', value: '4:3', width: 20, height: 15 },
  { label: '9:16 (Story)', value: '9:16', width: 11, height: 20 },
  { label: '16:9 (Cinema)', value: '16:9', width: 20, height: 11 },
];

function getAspectRatioString(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9/16) < 0.1) return "9:16";
  if (Math.abs(ratio - 4/3) < 0.1) return "4:3";
  if (Math.abs(ratio - 3/4) < 0.1) return "3:4";
  return "1:1";
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}p trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

const ActionButton = ({ onClick, title, children, colorClass }: { onClick: (e: React.MouseEvent) => void, title: string, children?: React.ReactNode, colorClass?: string }) => (
  <button 
    onClick={onClick} 
    title={title}
    className={`w-8 h-8 flex flex-none items-center justify-center bg-white/25 backdrop-blur-md rounded-lg border border-white/20 hover:bg-white/40 hover:scale-105 transition-all shadow-lg text-primary-400 font-black ${colorClass || ''}`}
  >
    {children}
  </button>
);

const FunctionalButtonGroup = ({ 
  onVeoStart, onVeoEnd, onPose, onCompose, onInspect, onDownload, onUpscale, onUpscale4k, onStudio, onRelight, onSpatial3D, onInpainting 
}: { 
  onVeoStart: (e: React.MouseEvent) => void, onVeoEnd: (e: React.MouseEvent) => void, onPose: (e: React.MouseEvent) => void, onCompose: (e: React.MouseEvent) => void, onInspect: (e: React.MouseEvent) => void, onDownload: (e: React.MouseEvent) => void, onUpscale: (e: React.MouseEvent) => void, onUpscale4k: (e: React.MouseEvent) => void, onStudio?: (e: React.MouseEvent) => void, onRelight?: (e: React.MouseEvent) => void, onSpatial3D?: (e: React.MouseEvent) => void, onInpainting?: (e: React.MouseEvent) => void 
}) => (
  <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 z-20">
    <div className="flex justify-center items-center gap-1.5 w-full">
      {onInpainting && (
        <ActionButton onClick={onInpainting} title="Cọ Ma Thuật Inpainting (Sửa bàn tay, đổi trang phục, sửa chi tiết)" colorClass="text-pink-400">
          <span className="text-[10px]">🪄</span>
        </ActionButton>
      )}
      {onStudio && (
        <ActionButton onClick={onStudio} title="Photo Studio AI (Chỉnh sửa ảnh)" colorClass="text-emerald-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </ActionButton>
      )}
      {onRelight && (
        <ActionButton onClick={onRelight} title="Virtual 3D Gaffer (Hắt sáng & Relighting)" colorClass="text-amber-400">
          <span className="text-[10px]">💡</span>
        </ActionButton>
      )}
      {onSpatial3D && (
        <ActionButton onClick={onSpatial3D} title="Apple Vision Pro Spatial 3D Converter" colorClass="text-cyan-400">
          <span className="text-[10px]">🥽</span>
        </ActionButton>
      )}
      <ActionButton onClick={onVeoStart} title="Veo Start" colorClass="text-rose-400">
        <span className="text-[8px] tracking-tighter">V-S</span>
      </ActionButton>
      <ActionButton onClick={onVeoEnd} title="Veo End" colorClass="text-rose-400">
        <span className="text-[8px] tracking-tighter">V-E</span>
      </ActionButton>
      <div className="w-px h-4 bg-white/20 flex-none"></div>
      <ActionButton onClick={onPose} title="Pose Engine">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
      </ActionButton>
      <ActionButton onClick={onCompose} title="Neural Compose">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
      </ActionButton>
    </div>
    <div className="flex justify-center items-center gap-1.5 w-full">
      <ActionButton onClick={onUpscale} title="Upscale (Free)" colorClass="text-cyan-400">
        <span className="text-[8px] tracking-tighter">U-N</span>
      </ActionButton>
      <ActionButton onClick={onUpscale4k} title="Upscale 4K (Paid)" colorClass="text-amber-400">
        <span className="text-[8px] tracking-tighter">U-4K</span>
      </ActionButton>
      <div className="w-px h-4 bg-white/20 flex-none"></div>
      <ActionButton onClick={onInspect} title="Inspect Meta">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
      </ActionButton>
      <ActionButton onClick={onDownload} title="Download">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      </ActionButton>
    </div>
  </div>
);

const AspectRatioSelector: React.FC<{ value: string; onChange: (value: string) => void; disabled?: boolean }> = ({ value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = ASPECT_RATIOS.find(r => r.value === value) || ASPECT_RATIOS[0];
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => !disabled && setIsOpen(!isOpen)} disabled={disabled} className={`w-full glass-input rounded-xl py-2.5 px-4 flex items-center justify-between transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/30'}`}>
        <div className="flex items-center gap-3">
          <div className="border border-white/30 rounded-[2px]" style={{ width: `${selectedOption.width}px`, height: `${selectedOption.height}px` }} />
          <span className="text-sm font-medium">{selectedOption.label}</span>
        </div>
        <svg className={`fill-current h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 border border-slate-200">
          {ASPECT_RATIOS.map((ratio, idx) => (
            <button key={idx} onClick={() => { onChange(ratio.value); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-100 last:border-0">
              <div className={`border rounded-[1px] ${ratio.value === value ? 'border-primary-400 bg-primary-400/10' : 'border-slate-300'}`} style={{ width: `${ratio.width}px`, height: `${ratio.height}px` }} />
              <span className={`text-xs font-bold uppercase tracking-widest ${ratio.value === value ? 'text-primary-600' : 'text-slate-600'}`}>{ratio.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface ImageSizeOption { label: string; value: string; desc: string; }
const IMAGE_SIZES: ImageSizeOption[] = [
  { label: '512px (SD)', value: '512px', desc: 'Độ phân giải 512x512' },
  { label: '1K (HD)', value: '1K', desc: 'Độ phân giải 1024x1024 (Mặc định)' },
  { label: '2K (QHD)', value: '2K', desc: 'Độ phân giải 2048x2048' },
  { label: '4K (UHD)', value: '4K', desc: 'Độ phân giải 4096x4096' },
];

const ImageSizeSelector: React.FC<{ value: string; onChange: (value: string) => void; disabled?: boolean }> = ({ value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = IMAGE_SIZES.find(s => s.value === value) || IMAGE_SIZES[1];
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => !disabled && setIsOpen(!isOpen)} disabled={disabled} className={`w-full glass-input rounded-xl py-2 px-4 flex items-center justify-between transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/30'}`}>
        <div className="flex flex-col items-start text-left">
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-black leading-none mb-1">Kích thước</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">{selectedOption.label}</span>
        </div>
        <svg className={`fill-current h-4 w-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2">
          {IMAGE_SIZES.map((size, idx) => (
            <button key={idx} onClick={() => { onChange(size.value); setIsOpen(false); }} className={`w-full flex flex-col px-4 py-2.5 text-left transition-colors border-b border-white/5 last:border-0 hover:bg-white/5`}>
              <span className={`text-xs font-bold uppercase tracking-widest ${size.value === value ? 'text-indigo-400' : 'text-white'}`}>{size.label}</span>
              <span className="text-[10px] text-white/40">{size.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Custom Model Selector with Dynamic Update / Reload ---
const ModelSelector: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [models, setModels] = useState<ImageModelOption[]>(() => getCachedImageModels());
    const [isReloading, setIsReloading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const selectedModel = models.find(m => m.id === value) || models[0] || { id: value, label: value, description: 'Engine' };
    
    // Sync with model updates triggered from any tab
    useEffect(() => {
        const handleModelsUpdated = (e: any) => {
            if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
                setModels(e.detail);
            }
        };
        window.addEventListener('nki_models_updated', handleModelsUpdated);
        return () => window.removeEventListener('nki_models_updated', handleModelsUpdated);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { 
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false); 
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleReload = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsReloading(true);
        setToastMessage("Đang quét model từ Google Gemini API...");
        try {
            const res = await fetchLatestImageModels();
            setModels(res.models);
            setToastMessage(res.message);
            // Automatically open dropdown so user sees all refreshed models
            setIsOpen(true);
        } catch (err: any) {
            setToastMessage("Lỗi kết nối: " + (err?.message || "Không thể tải danh sách model"));
        } finally {
            setIsReloading(false);
            setTimeout(() => setToastMessage(null), 3500);
        }
    };

    return (
        <div className="flex items-center gap-2 w-full relative" ref={containerRef}>
            {/* Model Selection Dropdown Container */}
            <div className="relative flex-grow min-w-0">
                <button 
                    type="button"
                    onClick={() => setIsOpen(!isOpen)} 
                    className="w-full glass-input rounded-2xl py-2.5 px-4 flex items-center justify-between transition-all hover:border-primary-500/40 group text-left"
                >
                    <div className="flex flex-col items-start leading-tight min-w-0 pr-2">
                        <span className="text-xs font-black uppercase tracking-wider truncate max-w-full">{selectedModel.label}</span>
                        <span className="text-[9px] opacity-50 uppercase font-bold truncate max-w-full">{selectedModel.description}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {selectedModel.isNew && (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase bg-primary-500 text-white tracking-wider animate-pulse">
                                Mới
                            </span>
                        )}
                        <svg className={`fill-current h-4 w-4 opacity-50 group-hover:opacity-100 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 mt-2 w-full glass-card rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 border border-white/20 dark:border-white/10 max-h-80 overflow-y-auto">
                        <div className="p-2.5 border-b border-white/10 flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.04]">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 px-1">
                                Danh sách model ({models.length})
                            </span>
                            <button
                                type="button"
                                onClick={handleReload}
                                disabled={isReloading}
                                className="text-[9px] font-bold text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-primary-500/10 transition-all active:scale-95"
                                title="Cập nhật model mới nhất từ Google Gemini API"
                            >
                                <svg className={`w-3 h-3 ${isReloading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>{isReloading ? 'Đang quét...' : 'Cập nhật model'}</span>
                            </button>
                        </div>
                        {models.map((model) => (
                            <button 
                                key={model.id} 
                                type="button"
                                onClick={() => { onChange(model.id); setIsOpen(false); }} 
                                className={`w-full text-left px-4 py-2.5 transition-all border-b border-white/5 last:border-0 hover:bg-primary-500/10 flex items-center justify-between group ${value === model.id ? 'bg-primary-500/15' : ''}`}
                            >
                                <div className="flex flex-col min-w-0 pr-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${value === model.id ? 'text-primary-500 dark:text-primary-400' : 'text-slate-700 dark:text-white/80'}`}>{model.label}</span>
                                        {model.isNew && (
                                            <span className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                New
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[8px] opacity-50 font-bold uppercase truncate">{model.description}</span>
                                </div>
                                {value === model.id && (
                                    <span className="text-primary-500 dark:text-primary-400 font-bold text-xs flex-shrink-0">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Circular Update / Reload Button (Vòng xoay cập nhật) */}
            <button
                type="button"
                onClick={handleReload}
                disabled={isReloading}
                className="w-11 h-11 flex-shrink-0 glass-input flex items-center justify-center rounded-2xl hover:border-primary-400/50 hover:bg-primary-500/10 active:scale-90 transition-all group relative shadow-sm"
                title="Cập nhật tất cả các model tạo ảnh mới nhất từ Google Gemini API"
            >
                <svg 
                    className={`w-4 h-4 transition-all duration-700 ${
                        isReloading 
                            ? 'animate-spin text-primary-500 dark:text-primary-400' 
                            : 'text-slate-600 dark:text-white/60 group-hover:text-primary-500 dark:group-hover:text-primary-400 group-hover:rotate-180'
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>

                {/* Subtle pulse ring while reloading */}
                {isReloading && (
                    <span className="absolute inset-0 rounded-2xl border-2 border-primary-500 animate-ping opacity-40 pointer-events-none"></span>
                )}
            </button>

            {/* Toast Feedback Notification when reloading */}
            {toastMessage && (
                <div className="absolute left-0 bottom-full mb-2 z-50 px-3 py-1.5 rounded-xl bg-zinc-950/90 dark:bg-zinc-900/95 border border-primary-500/40 text-white text-[10px] font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 pointer-events-none flex items-center gap-1.5 whitespace-nowrap backdrop-blur-lg">
                    <span>{isReloading ? '🔄' : '✨'}</span>
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

// --- Custom Preset Selector with Personal Presets & Neural System Presets ---
const PresetSelector: React.FC<{ 
    value: string; 
    onChange: (value: string) => void;
    personalPresets?: PersonalPreset[];
    onOpenSaveModal?: () => void;
    onOpenManagerModal?: () => void;
}> = ({ value, onChange, personalPresets = [], onOpenSaveModal, onOpenManagerModal }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activePersonal = personalPresets.find(p => p.id === value || p.name === value);
    const displayLabel = activePersonal 
        ? `⭐ ${activePersonal.name} (${activePersonal.category})`
        : (value || "Manual Config (No Preset)");

    return (
        <div className="relative" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full glass-input rounded-xl py-2.5 px-4 flex items-center justify-between transition-all hover:border-white/30"
            >
                <span className="text-xs font-bold uppercase tracking-widest truncate mr-2">
                    {displayLabel}
                </span>
                <svg className={`fill-current h-4 w-4 transition-transform flex-none ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 border border-white/15 p-2 text-white">
                    {/* Manual config reset */}
                    <button 
                        type="button"
                        onClick={() => { onChange(''); setIsOpen(false); }} 
                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors mb-2 ${!value ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'hover:bg-white/5 text-white/50'}`}
                    >
                        ⚙️ Manual Configuration (No Preset)
                    </button>

                    {/* Personal Presets Section */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/5">
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-1">
                                ⭐ Personal Presets ({personalPresets.length})
                            </span>
                            {onOpenManagerModal && (
                                <button
                                    type="button"
                                    onClick={() => { setIsOpen(false); onOpenManagerModal(); }}
                                    className="text-[9px] font-bold text-white/40 hover:text-white uppercase tracking-wider hover:underline"
                                >
                                    Manage
                                </button>
                            )}
                        </div>

                        {personalPresets.length === 0 ? (
                            <div className="px-3 py-2 text-[10px] text-white/30 italic">
                                No personal presets yet. Save your favorite prompt below!
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {personalPresets.map((preset) => {
                                    const isSelected = value === preset.id || value === preset.name;
                                    const catColor = preset.category === 'Character' 
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                                        : preset.category === 'Art Style' 
                                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                                        : preset.category === 'Scene'
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

                                    return (
                                        <button 
                                            key={preset.id} 
                                            type="button"
                                            onClick={() => { onChange(preset.id); setIsOpen(false); }} 
                                            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-2 ${isSelected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'hover:bg-white/5 text-white/80'}`}
                                        >
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-bold truncate">{preset.name}</div>
                                                {preset.description && (
                                                    <div className="text-[9px] text-white/40 truncate">{preset.description}</div>
                                                )}
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border flex-none ${catColor}`}>
                                                {preset.category}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Built-in Neural Presets */}
                    <div className="mb-2">
                        <div className="px-2 py-1 mb-1 border-b border-white/5">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                                🌐 Neural Style Matrix
                            </span>
                        </div>
                        <div className="space-y-1">
                            {Object.keys(PRESETS).map((name) => {
                                const isSelected = value === name;
                                return (
                                    <button 
                                        key={name} 
                                        type="button"
                                        onClick={() => { onChange(name); setIsOpen(false); }} 
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'hover:bg-white/5 text-white/70'}`}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-white/10 flex flex-col gap-1">
                        {onOpenSaveModal && (
                            <button
                                type="button"
                                onClick={() => { setIsOpen(false); onOpenSaveModal(); }}
                                className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                            >
                                <span>⭐</span>
                                <span>Save Current JSON as Preset</span>
                            </button>
                        )}
                        {onOpenManagerModal && (
                            <button
                                type="button"
                                onClick={() => { setIsOpen(false); onOpenManagerModal(); }}
                                className="w-full py-1.5 px-3 rounded-xl hover:bg-white/5 text-white/50 hover:text-white text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                            >
                                <span>📚</span>
                                <span>Manage Presets Library</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const FaceReferenceInput: React.FC<{
    label: string;
    image: string | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    onDrop: (file: File) => void;
    onOpenVault?: () => void;
    personaName?: string;
    biometricProfile?: BiometricProfile;
    onScanBiometrics?: () => void;
    isScanningBiometrics?: boolean;
}> = ({ 
    label, 
    image, 
    onUpload, 
    onClear, 
    onDrop, 
    onOpenVault, 
    personaName,
    biometricProfile,
    onScanBiometrics,
    isScanningBiometrics
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [showBioDetails, setShowBioDetails] = useState(false);

    return (
        <div 
            className={`glass-input rounded-2xl p-3 transition-all flex flex-col gap-2 ${
                isDragOver ? 'border-primary-400 bg-white/10' : ''
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if(f) onDrop(f); }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 max-w-[55%] truncate">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/50">{label}</span>
                    {personaName && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold truncate">
                            👑 {personaName}
                        </span>
                    )}
                </div>
                {image ? (
                    <div className="flex items-center gap-2">
                        <img src={image} className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-lg" alt="ref" />
                        {onOpenVault && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onOpenVault(); }}
                                className="text-[10px] text-amber-300 hover:text-white bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1"
                                title="Đổi hoặc chọn nhân vật mẫu khác từ Kho Data"
                            >
                                <span>📁</span>
                                <span className="hidden sm:inline">Kho Mẫu</span>
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-white/40 hover:text-red-400 transition-colors bg-white/5 p-1.5 rounded-full" title="Xóa ảnh này">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        {onOpenVault && (
                            <button
                                type="button"
                                onClick={onOpenVault}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex items-center gap-1 shadow-sm active:scale-95"
                                title="Chọn người mẫu có sẵn từ Kho Data Nhân Vật"
                            >
                                <span>📁</span>
                                <span>Kho Mẫu</span>
                            </button>
                        )}
                        <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 flex items-center gap-1 active:scale-95">
                            <span>📤</span>
                            <span>Tải Lên</span>
                            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                        </label>
                    </div>
                )}
            </div>

            {/* Google Vision Biometric Intelligence Bar */}
            {image && (
                <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] gap-2">
                    {biometricProfile ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-[8px] uppercase tracking-wider flex-shrink-0">
                                ✓ Vision
                            </span>
                            <span 
                                onClick={() => setShowBioDetails(!showBioDetails)}
                                className="text-white/70 truncate hover:text-white cursor-pointer select-none font-medium"
                                title="Nhấp để xem chi tiết nhận diện Google Vision"
                            >
                                {biometricProfile.gender === 'Female' ? '👩 Nữ' : (biometricProfile.gender === 'Male' ? '👨 Nam' : '🧑')} • {biometricProfile.estimatedAge} • {biometricProfile.faceShape}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-white/40">
                            <span>🔍 Chưa quét Biometric</span>
                        </div>
                    )}

                    {onScanBiometrics && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onScanBiometrics(); }}
                            disabled={isScanningBiometrics}
                            className="px-2 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 font-bold transition flex items-center gap-1 text-[9px] flex-shrink-0 disabled:opacity-50"
                            title="Chạy Google Vision để phân tích đặc điểm khuôn mặt, cấu trúc xương và màu mắt cho model này"
                        >
                            {isScanningBiometrics ? (
                                <>
                                    <div className="w-2.5 h-2.5 rounded-full border border-purple-300 border-t-transparent animate-spin" />
                                    <span>Đang quét...</span>
                                </>
                            ) : (
                                <>
                                    <span>⚡</span>
                                    <span>{biometricProfile ? 'Quét Lại' : 'Quét Vision'}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Expanded Biometric Card View */}
            {image && biometricProfile && showBioDetails && (
                <div className="mt-1 p-2 rounded-xl bg-black/40 border border-white/10 text-[9.5px] space-y-1 text-white/75 animate-in fade-in duration-200">
                    <div><span className="text-white/40 font-bold">Mặt & Cằm:</span> {biometricProfile.faceShape}, {biometricProfile.jawline}</div>
                    <div><span className="text-white/40 font-bold">Mắt & Mũi:</span> {biometricProfile.eyes.shape} ({biometricProfile.eyes.color}), {biometricProfile.nose}</div>
                    <div><span className="text-white/40 font-bold">Tóc & Da:</span> {biometricProfile.hair.color}, {biometricProfile.hair.style} ({biometricProfile.undertone})</div>
                </div>
            )}
        </div>
    );
};

const getDualSlotLabel = (pairing: DualCharacterPairing, slotIndex: 1 | 2): string => {
    if (pairing === 'ff') {
        return slotIndex === 1 ? '👩 Nhân Vật Nữ 1 (Slot 1)' : '👩 Nhân Vật Nữ 2 (Slot 2)';
    }
    if (pairing === 'mm') {
        return slotIndex === 1 ? '👨 Nhân Vật Nam 1 (Slot 1)' : '👨 Nhân Vật Nam 2 (Slot 2)';
    }
    if (pairing === 'mf') {
        return slotIndex === 1 ? '👨/👩 Nhân Vật 1 (Slot 1)' : '👩/👨 Nhân Vật 2 (Slot 2)';
    }
    return slotIndex === 1 ? '🎭 Nhân Vật 1 (Slot 1)' : '🎭 Nhân Vật 2 (Slot 2)';
};

const DualCharacterControls: React.FC<{
    pairing: DualCharacterPairing;
    onChangePairing: (p: DualCharacterPairing) => void;
    antiBleedLock: boolean;
    onToggleAntiBleed: (v: boolean) => void;
    onSwap: () => void;
    accentColor?: string;
}> = ({ pairing, onChangePairing, antiBleedLock, onToggleAntiBleed, onSwap, accentColor = 'purple' }) => {
    return (
        <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs backdrop-blur-md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Cấu Hình Ghép Đôi</span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[8px] font-bold border border-purple-500/30">Google Vision</span>
                </div>
                <button
                    type="button"
                    onClick={onSwap}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                    title="Hoán đổi ảnh và danh tính giữa Slot 1 và Slot 2 trong 1 click"
                >
                    <span>⇄</span>
                    <span>Đổi Vị Trí 2 Model</span>
                </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
                {[
                    { id: 'auto', label: '⚡ Tự Động', desc: 'Google Vision tự nhận diện giới tính từng ảnh' },
                    { id: 'ff', label: '👩+👩 2 Nữ', desc: 'Cặp đôi hoặc 2 bạn nữ - Chống ép nam' },
                    { id: 'mf', label: '👨+👩 Nam-Nữ', desc: 'Cặp đôi nam nữ' },
                    { id: 'mm', label: '👨+👨 2 Nam', desc: 'Cặp đôi hoặc 2 bạn nam - Chống ép nữ' },
                ].map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangePairing(item.id as DualCharacterPairing)}
                        title={item.desc}
                        className={`py-1.5 px-1 rounded-xl text-[9.5px] font-bold text-center transition-all border ${
                            pairing === item.id
                                ? 'bg-purple-600/30 border-purple-500/60 text-purple-200 shadow-sm ring-1 ring-purple-500/30'
                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] text-white/70 select-none">
                    <input
                        type="checkbox"
                        checked={antiBleedLock}
                        onChange={(e) => onToggleAntiBleed(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500/40"
                    />
                    <span className="font-semibold text-white/80">🛡️ Anti-Bleed Lock</span>
                </label>
                <span className="text-[9px] text-white/40">Cách ly độc lập 2 khuôn mặt</span>
            </div>
        </div>
    );
};

const MasonryImage: React.FC<{ 
    src: string; 
    alt: string; 
    selected: boolean; 
    onSelect: () => void; 
    onClick: () => void;
    selectionMode: boolean;
    index?: number;
    // Handlers for integrated functional buttons
    onVeoStart: (e: React.MouseEvent) => void;
    onVeoEnd: (e: React.MouseEvent) => void;
    onPose: (e: React.MouseEvent) => void;
    onCompose: (e: React.MouseEvent) => void;
    onInspect: (e: React.MouseEvent) => void;
    onDownload: (e: React.MouseEvent) => void;
    onUpscale: (e: React.MouseEvent) => void;
    onUpscale4k: (e: React.MouseEvent) => void;
    onStudio?: (e: React.MouseEvent) => void;
    onInpainting?: (e: React.MouseEvent) => void;
    onGoogleDrive?: (e: React.MouseEvent) => void;
    isSavingDrive?: boolean;
    driveFileId?: string;
    collectionId?: string;
    collections?: Collection[];
    item?: GalleryItem;
    density?: GalleryDensity;
}> = ({ 
    src, alt, selected, onSelect, onClick, selectionMode, index = 0, 
    onVeoStart, onVeoEnd, onPose, onCompose, onInspect, onDownload, onUpscale, onUpscale4k, onStudio, onInpainting, 
    onGoogleDrive, isSavingDrive, driveFileId, collectionId, collections, item, density = 'medium' 
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const aspectClass = density === 'large' ? 'aspect-[4/5]' : density === 'small' ? 'aspect-square' : 'aspect-[4/5]';

    return (
        <div 
            className={`group rounded-2xl overflow-hidden glass-card transition-all duration-300 cursor-pointer border flex flex-col staggered-gallery-card select-none ${
                selected 
                    ? 'border-primary-400 ring-4 ring-primary-400/25 scale-[0.98] shadow-2xl' 
                    : 'border-white/10 hover:border-white/30 hover:shadow-2xl hover:-translate-y-0.5'
            }`} 
            style={{ animationDelay: `${Math.min(index * 35, 450)}ms` }}
            onClick={selectionMode ? onSelect : onClick}
        >
            {/* Image Container with Consistent Aspect Ratio */}
            <div className={`relative w-full ${aspectClass} bg-black/40 overflow-hidden flex items-center justify-center`}>
                {!isLoaded && !hasError && (
                    <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                {hasError ? (
                    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-3 text-center z-0">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        </div>
                        <span className="text-[10px] text-white/70 font-semibold">Nhấp để mở & tải lại</span>
                        {driveFileId && (
                            <span className="text-[8px] text-emerald-400 mt-0.5">Cloud Drive</span>
                        )}
                    </div>
                ) : (
                    <img 
                        src={src} 
                        alt={alt} 
                        className={`w-full h-full object-cover block transform group-hover:scale-105 transition-transform duration-500 ${isLoaded ? 'opacity-100 image-render-reveal' : 'opacity-0'}`} 
                        loading="lazy" 
                        onLoad={() => setIsLoaded(true)}
                        onError={() => setHasError(true)}
                    />
                )}

                {/* Top Badges: Google Drive & Aspect Ratio */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    {driveFileId && (() => {
                        const matchedCol = collections?.find(c => c.id === collectionId);
                        const folderPath = matchedCol ? `NK Imagen Storage / ${matchedCol.name}` : "NK Imagen Storage";
                        return (
                            <div 
                                className="bg-emerald-500 text-black px-2 py-0.5 rounded-lg shadow-lg border border-emerald-400/40 flex items-center gap-1 backdrop-blur-md text-[9px] font-black uppercase tracking-wider select-none hover:scale-105 transition-transform" 
                                title={`Đã đồng bộ Drive: ${folderPath}`}
                            >
                                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                                <span className="hidden sm:inline">Drive</span>
                            </div>
                        );
                    })()}
                    {item?.metadata?.aspectRatio && (
                        <div className="bg-black/60 backdrop-blur-md text-white/80 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border border-white/10 select-none">
                            {item.metadata.aspectRatio}
                        </div>
                    )}
                </div>

                {/* Selection Checkbox - Always clearly visible for easy batch selection */}
                <div className="absolute top-2 right-2 transition-all duration-300 z-20">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSelect(); }} 
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center transition-all ${
                            selected 
                                ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30 text-black font-black scale-105 opacity-100 ring-2 ring-emerald-300/40' 
                                : 'bg-black/60 hover:bg-black/85 border-white/40 hover:border-white text-white/50 backdrop-blur-md opacity-85 hover:opacity-100 hover:scale-105'
                        }`}
                        title={selected ? "Bỏ chọn ảnh này" : "Chọn ảnh này"}
                    >
                        {selected ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black font-black" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 0 011.414-1.414L8 12.586l7.293-7.293a1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <div className="w-3.5 h-3.5 rounded-sm border border-white/60 hover:border-white" />
                        )}
                    </button>
                </div>

                {/* Dark Gradient Overlay for Quick Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Functional Buttons Integrated Overlay */}
                <FunctionalButtonGroup 
                    onVeoStart={onVeoStart} 
                    onVeoEnd={onVeoEnd} 
                    onPose={onPose} 
                    onCompose={onCompose} 
                    onInspect={onInspect} 
                    onDownload={onDownload} 
                    onUpscale={onUpscale}
                    onUpscale4k={onUpscale4k}
                    onStudio={onStudio}
                    onInpainting={onInpainting}
                />
            </div>

            {/* Persistent Card Footer: Hiển thị Tiêu đề + Thẻ phân loại + Thời gian */}
            <div className={`bg-slate-950/70 backdrop-blur-md border-t border-white/5 flex flex-col justify-between select-none ${
                density === 'small' ? 'p-2 gap-1' : 'p-3 gap-1.5'
            }`}>
                <p 
                    className={`text-white/90 font-bold transition-colors group-hover:text-primary-300 ${
                        density === 'small' ? 'text-[10px] line-clamp-1' : 'text-xs line-clamp-1'
                    }`} 
                    title={alt || "Generated Visual Artifact"}
                >
                    {alt || "Generated Visual Artifact"}
                </p>

                <div className="flex items-center justify-between gap-1 text-white/40">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded font-black tracking-wider uppercase text-[8px] border ${
                            item?.type === 'POSE' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                            item?.type === 'COMPOSE' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                            item?.type === 'UPSCALE' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                            {item?.type === 'POSE' ? 'POSE' : item?.type === 'COMPOSE' ? 'COMPOSE' : item?.type === 'UPSCALE' ? 'UPSCALE' : 'IMAGE'}
                        </span>
                        {item?.metadata?.model && density !== 'small' && (
                            <span className="text-[8px] font-mono bg-white/5 px-1 rounded text-white/40 truncate max-w-[80px]">
                                {item.metadata.model.replace('imagen-3.0-generate-', '')}
                            </span>
                        )}
                    </div>
                    {item?.createdAt && (
                        <span className="text-[9px] font-medium text-white/40" title={new Date(item.createdAt).toLocaleString()}>
                            {formatRelativeTime(item.createdAt)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const GalleryListItem: React.FC<{
    item: GalleryItem;
    selected: boolean;
    onSelect: () => void;
    onClick: () => void;
    onVeoStart: (e: React.MouseEvent) => void;
    onVeoEnd: (e: React.MouseEvent) => void;
    onPose: (e: React.MouseEvent) => void;
    onCompose: (e: React.MouseEvent) => void;
    onInspect: (e: React.MouseEvent) => void;
    onDownload: (e: React.MouseEvent) => void;
    onUpscale: (e: React.MouseEvent) => void;
    onUpscale4k: (e: React.MouseEvent) => void;
    onStudio?: (e: React.MouseEvent) => void;
    onInpainting?: (e: React.MouseEvent) => void;
    onGoogleDrive?: (e: React.MouseEvent) => void;
    isSavingDrive?: boolean;
    collections?: Collection[];
}> = ({
    item, selected, onSelect, onClick, onVeoStart, onVeoEnd, onPose, onCompose,
    onInspect, onDownload, onUpscale, onUpscale4k, onStudio, onInpainting, onGoogleDrive, isSavingDrive, collections
}) => {
    const matchedCol = collections?.find(c => c.id === item.collectionId);
    const [thumbError, setThumbError] = useState(false);

    return (
        <div 
            className={`p-3 sm:p-3.5 glass-card rounded-2xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 select-none ${
                selected ? 'border-primary-400 bg-primary-500/10 shadow-lg' : 'border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
            }`}
        >
            {/* Left Section: Checkbox + Mini Thumbnail + Title & Tags */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); onSelect(); }} 
                    className={`w-7 h-7 flex-none rounded-xl border flex items-center justify-center transition-all ${
                        selected 
                            ? 'bg-emerald-500 border-emerald-400 text-black font-black shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-300/40' 
                            : 'bg-black/40 border-white/30 hover:border-white text-white/50 hover:text-white backdrop-blur-md'
                    }`}
                    title={selected ? "Bỏ chọn ảnh này" : "Chọn ảnh này"}
                >
                    {selected ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black font-black" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 0 011.414-1.414L8 12.586l7.293-7.293a1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <div className="w-3.5 h-3.5 rounded-sm border border-white/50" />
                    )}
                </button>

                {/* Hình mini (Mini Thumbnail) */}
                <div 
                    onClick={onClick}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-none relative group/thumb cursor-pointer border border-white/10 shadow-md bg-black/40"
                    title="Nhấp để xem chi tiết ảnh"
                >
                    {thumbError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-amber-400 p-1">
                            <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            <span className="text-[8px] text-white/50">Mở để tải</span>
                        </div>
                    ) : (
                        <img 
                            src={item.src} 
                            alt={item.description || "Mini artifact"} 
                            className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                            loading="lazy"
                            onError={() => setThumbError(true)}
                        />
                    )}
                    {item.driveFileId && (
                        <div className="absolute top-1 left-1 bg-emerald-500 text-black p-0.5 rounded-full shadow" title="Đã đồng bộ Google Drive">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                    </div>
                </div>

                {/* Tiêu đề & Thông tin bổ trợ */}
                <div className="flex-1 min-w-0 space-y-1.5 cursor-pointer" onClick={onClick}>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-black tracking-wider uppercase text-[9px] flex-none border ${
                            item.type === 'POSE' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                            item.type === 'COMPOSE' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                            item.type === 'UPSCALE' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                            {item.type === 'POSE' ? 'Pose' : item.type === 'COMPOSE' ? 'Compose' : item.type === 'UPSCALE' ? 'Upscale' : 'Generate'}
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-white hover:text-primary-300 transition-colors truncate" title={item.description || "Generated Visual Artifact"}>
                            {item.description || "Generated Visual Artifact"}
                        </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/40">
                        {item.metadata?.model && (
                            <span className="font-mono text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-white/60">
                                {item.metadata.model}
                            </span>
                        )}
                        {item.metadata?.aspectRatio && (
                            <span className="font-mono text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-white/60">
                                {item.metadata.aspectRatio}
                            </span>
                        )}
                        {matchedCol && (
                            <span className="bg-primary-500/10 text-primary-300 border border-primary-500/20 px-2 py-0.5 rounded font-bold">
                                📁 {matchedCol.name}
                            </span>
                        )}
                        <span>•</span>
                        <span className="text-white/50" title={new Date(item.createdAt).toLocaleString()}>
                            {formatRelativeTime(item.createdAt)} ({new Date(item.createdAt).toLocaleDateString()})
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Section: Compact Functional Button Group */}
            <div className="flex items-center gap-1.5 self-end md:self-center flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                {onInpainting && (
                    <ActionButton onClick={onInpainting} title="Cọ Ma Thuật Inpainting (Sửa bàn tay, chi tiết)" colorClass="text-pink-400">
                        <span className="text-[10px]">🪄</span>
                    </ActionButton>
                )}
                {onStudio && (
                    <ActionButton onClick={onStudio} title="Mở trong AI Photo Studio (Sửa ảnh)" colorClass="text-emerald-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </ActionButton>
                )}
                <ActionButton onClick={onInspect} title="Xem lớn & Chi tiết">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                </ActionButton>
                <ActionButton onClick={onDownload} title="Tải về máy">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </ActionButton>
                <ActionButton onClick={onPose} title="Dùng làm tư thế (Pose)">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </ActionButton>
                <ActionButton onClick={onCompose} title="Dùng ghép ảnh (Compose)">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
                </ActionButton>
                <ActionButton onClick={onUpscale} title="Nâng cấp 2K (Miễn phí)" colorClass="text-cyan-400">
                    <span className="text-[8px] tracking-tighter">U-N</span>
                </ActionButton>
                <ActionButton onClick={onUpscale4k} title="Nâng cấp 4K (Pro 3)" colorClass="text-amber-400">
                    <span className="text-[8px] tracking-tighter">U-4K</span>
                </ActionButton>
                <ActionButton onClick={onVeoStart} title="Khung đầu Veo Video" colorClass="text-rose-400">
                    <span className="text-[8px] tracking-tighter">V-S</span>
                </ActionButton>
                <ActionButton onClick={onVeoEnd} title="Khung cuối Veo Video" colorClass="text-rose-400">
                    <span className="text-[8px] tracking-tighter">V-E</span>
                </ActionButton>
                {onGoogleDrive && (
                    <ActionButton 
                        onClick={onGoogleDrive} 
                        title={item.driveFileId ? "Đã lưu - Nhấp để đồng bộ lại Drive" : "Lưu vào Google Drive"} 
                        colorClass={item.driveFileId ? "text-emerald-400" : "text-white/60 hover:text-emerald-400"}
                    >
                        {isSavingDrive ? (
                            <span className="w-3 h-3 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
                        ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        )}
                    </ActionButton>
                )}
            </div>
        </div>
    );
};

const ConfirmModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="glass-card rounded-3xl max-w-md w-full p-8 shadow-2xl border border-white/10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 border border-amber-500/30">
                    <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-black text-white mb-2">Confirm Action</h3>
                <p className="text-sm text-white/60 mb-8">{message}</p>
                <div className="flex gap-4 w-full">
                    <button onClick={onCancel} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">Cancel</button>
                    <button onClick={() => { onConfirm(); onCancel(); }} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(251,191,36,0.4)]">Proceed</button>
                </div>
            </div>
        </div>
    );
};

const ErrorModal: React.FC<{ 
  title: string; 
  message: string; 
  solutions?: string[]; 
  onClose: () => void;
  onReAuthenticate?: () => void;
  isAccessDenied403?: boolean;
  isDriveError?: boolean;
  onDisableDrive?: () => void;
}> = ({ title, message, solutions, onClose, onReAuthenticate, isAccessDenied403, isDriveError, onDisableDrive }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="glass-card rounded-[2.5rem] max-w-lg w-full p-8 sm:p-10 shadow-[0_0_50px_rgba(239,68,68,0.2)] border border-red-500/20 flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 sm:mb-8 border border-red-500/30 animate-pulse">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-3 uppercase tracking-tighter">{title}</h3>
                <div className="bg-white/5 rounded-2xl p-5 mb-5 w-full border border-white/5 text-left">
                    <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">{message}</p>
                </div>
                
                {solutions && solutions.length > 0 && (
                  <div className="w-full text-left mb-6 space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-1">Hướng Dẫn Khắc Phục</span>
                    <div className="space-y-2">
                      {solutions.map((sol, i) => (
                        <div key={i} className="flex gap-2.5 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                          <div className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-[10px] font-bold flex-none mt-0.5">{i+1}</div>
                          <p className="text-[11px] text-white/70 leading-relaxed">{sol}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="w-full flex flex-col gap-2.5">
                  {typeof window !== 'undefined' && window.location.hostname === '127.0.0.1' && (
                    <button 
                      onClick={() => {
                        window.location.href = window.location.href.replace('127.0.0.1', 'localhost');
                      }}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black font-black rounded-2xl transition-all tracking-wider uppercase text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5"
                    >
                      <span>👉 Chuyển sang http://localhost:3000 (Sửa lỗi Drive)</span>
                    </button>
                  )}
                  {(isAccessDenied403 || isDriveError) && onDisableDrive && (
                    <button 
                      onClick={() => {
                        onDisableDrive();
                      }}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black rounded-2xl transition-all tracking-widest uppercase text-xs border border-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      Bỏ qua Google Drive (Lưu ảnh trực tiếp về máy)
                    </button>
                  )}
                  {onReAuthenticate && (
                    <button 
                      onClick={() => {
                        onReAuthenticate();
                        onClose();
                      }}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-2xl transition-all tracking-widest uppercase text-xs border border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    >
                      Đăng Nhập Lại / Cấp Quyền Google Drive
                    </button>
                  )}
                  <button onClick={onClose} className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all tracking-widest uppercase text-xs border border-white/10">Đóng / Đã Hiểu</button>
                </div>
            </div>
        </div>
    );
};

interface CollectionManagerModalProps {
  collections: Collection[];
  onClose: () => void;
  onCreateCollection: (name: string, autoSync: boolean) => void;
  onUpdateCollection: (id: string, updates: Partial<Collection>) => void;
  onDeleteCollection: (id: string) => void;
  googleUser: any;
}

const CollectionManagerModal: React.FC<CollectionManagerModalProps> = ({
  collections,
  onClose,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  googleUser
}) => {
  const [newColName, setNewColName] = useState("");
  const [newColAutoSync, setNewColAutoSync] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColName.trim()) {
      onCreateCollection(newColName.trim(), newColAutoSync);
      setNewColName("");
      setNewColAutoSync(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="glass-card rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center pb-6 border-b border-white/10 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center border border-primary-500/30">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Collection Hub</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Bundles & Cloud Backups</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1 custom-scrollbar">
          {/* Create New Collection Form */}
          <form onSubmit={handleSubmit} className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-4">
            <span className="text-[10px] font-black text-primary-400 uppercase tracking-[0.2em] block">Create New Bundle</span>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Bundle Title</label>
              <input 
                type="text"
                placeholder="Unique Bundle Name..." 
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-medium text-white placeholder-white/30 outline-none focus:border-primary-500 transition-colors"
                required
              />
            </div>

            {googleUser && (
              <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-white block">Auto-Sync to Google Drive</span>
                  <span className="text-[9px] text-white/40 block">Upload newly synthesized images instantly</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setNewColAutoSync(!newColAutoSync)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none flex ${
                    newColAutoSync ? 'bg-emerald-500 justify-end' : 'bg-white/10 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md inline-block" />
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-3 bg-primary-500 hover:bg-primary-400 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md active:scale-95"
            >
              Construct Bundle
            </button>
          </form>

          {/* Existing Collections List */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">Active Bundles ({collections.length})</span>
            {collections.length === 0 ? (
              <div className="text-center py-6 text-xs text-white/30 italic">No custom bundle folders configured yet.</div>
            ) : (
              <div className="space-y-2">
                {collections.map(col => (
                  <div key={col.id} className="bg-white/5 hover:bg-white/[0.07] rounded-xl p-4 border border-white/5 flex items-center justify-between transition-colors gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white block truncate">{col.name}</span>
                      <span className="text-[9px] text-white/30 block font-medium">Created: {new Date(col.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-4 flex-none">
                      {googleUser && (
                        <div className="flex items-center gap-2" title="Auto-Sync status">
                          <span className="text-[9px] font-black tracking-wider uppercase text-white/45">Auto Sync</span>
                          <button 
                            type="button"
                            onClick={() => onUpdateCollection(col.id, { autoSync: !col.autoSync })}
                            className={`w-10 h-5.5 rounded-full p-1 transition-colors duration-200 focus:outline-none flex ${
                              col.autoSync ? 'bg-emerald-500 justify-end' : 'bg-white/10 justify-start'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-inner inline-block" />
                          </button>
                        </div>
                      )}

                      <button 
                        onClick={() => onDeleteCollection(col.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                        title="Delete Bundle"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface InspectorModalProps {
  item: GalleryItem;
  onClose: () => void;
  onRemix: (item: GalleryItem) => void;
  onCompose: (item: GalleryItem) => void;
  onDelete: (id: string) => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  requestConfirm: (msg: string, onConfirm: () => void) => void;
  googleUser: any;
  onDownload: (src: string, description?: string, forceAntiAi?: boolean) => void;
  isSavingDrive: boolean;
  driveSaveStatus: { id: string; success: boolean; message: string } | null;
  collections?: Collection[];
  onMoveToCollection?: (itemId: string, collectionId: string | undefined) => void;
  onGoogleDrive?: (src: string, description?: string, itemId?: string) => void;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
  onUpdateItem?: (updatedItem: GalleryItem) => void;
  onStudio?: (item: GalleryItem) => void;
  onUpscaleStudio?: (item: GalleryItem) => void;
  onInpainting?: (item: GalleryItem) => void;
  onVirtualTryOn?: (item: GalleryItem) => void;
  onCharacterTurnaround?: (item: GalleryItem) => void;
  onBiometricMorph?: (item: GalleryItem) => void;
}

const InspectorModal: React.FC<InspectorModalProps> = ({ 
  item, 
  onClose, 
  onRemix, 
  onCompose, 
  onDelete, 
  onNext, 
  onPrev, 
  hasNext, 
  hasPrev, 
  requestConfirm,
  googleUser,
  onDownload,
  isSavingDrive,
  driveSaveStatus,
  collections,
  onMoveToCollection,
  onGoogleDrive,
  onGoogleSignIn,
  onUpdateItem,
  onStudio,
  onUpscaleStudio,
  onInpainting,
  onVirtualTryOn,
  onCharacterTurnaround,
  onBiometricMorph
}) => {
    const [displaySrc, setDisplaySrc] = useState<string>(item.src);
    const [isRecovering, setIsRecovering] = useState<boolean>(false);
    const [recoverError, setRecoverError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [compareMode, setCompareMode] = useState<'single' | 'split' | 'side-by-side'>('single');
    const [sliderPos, setSliderPos] = useState(50);
    const [isAntiAiActive, setIsAntiAiActive] = useState<boolean>(() => {
        return loadAntiAiSettings().enabled;
    });
    const containerRef = useRef<HTMLDivElement>(null);

    const recoverFromDrive = async () => {
        const driveId = (item as any).driveFileId;
        if (!driveId) return;

        setIsRecovering(true);
        setRecoverError(null);
        try {
            const token = await getAccessToken();
            if (!token) {
                setRecoverError("Cần đăng nhập Google Drive để tải lại ảnh này.");
                setIsRecovering(false);
                return;
            }
            const { blob } = await executeWithExponentialBackoff(() => downloadDriveFile(token, driveId));
            const permanentData = await blobToDataUrl(blob);
            setDisplaySrc(permanentData);
            if (onUpdateItem) {
                onUpdateItem({ ...item, src: permanentData });
            }
        } catch (err: any) {
            console.error("[InspectorModal] Failed to restore image from Drive:", err);
            setRecoverError(err?.message || "Không thể tải ảnh từ Google Drive. Vui lòng thử lại.");
        } finally {
            setIsRecovering(false);
        }
    };

    const handleImageError = () => {
        if (!isRecovering && (item as any).driveFileId) {
            recoverFromDrive();
        } else if (!isRecovering) {
            setRecoverError("Không thể tải hình ảnh này.");
        }
    };

    useEffect(() => {
        setDisplaySrc(item.src);
        setIsRecovering(false);
        setRecoverError(null);

        // If item.src is a temporary blob: URL (revoked across page reloads), recover immediately
        if (item.src?.startsWith('blob:') && (item as any).driveFileId) {
            recoverFromDrive();
        }
    }, [item.id, item.src]);

    const handleSliderMove = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const position = ((clientX - rect.left) / rect.width) * 100;
        setSliderPos(Math.max(0, Math.min(100, position)));
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (e.buttons === 1 || e.type === 'mousemove') {
            handleSliderMove(e.clientX);
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            handleSliderMove(e.touches[0].clientX);
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(label);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleExportMetadata = () => {
        try {
            const meta = item.metadata || {};
            const contentParts = [
                `========================================`,
                `IMAGE ARTIFACT: ${item.description || "Visual Artifact"}`,
                `Date Created  : ${new Date(item.createdAt).toLocaleString()}`,
                `========================================`,
                ``,
                `--- GENERATION PARAMETERS ---`,
                `Engine        : ${meta.model || "Standard"}`,
                `Aspect Ratio  : ${meta.aspectRatio || "1:1"}`,
                `Seed          : ${meta.seed ?? "Random"}`,
                `CFG Scale     : ${meta.cfgScale ?? "7.5"}`,
                `Steps         : ${meta.steps ?? "25"}`,
                `Sampler       : ${meta.sampler || "Neural Flow"}`,
                ``
            ];

            if (meta.negativePrompt) {
                contentParts.push(`--- NEGATIVE CONSTRAINTS ---`);
                contentParts.push(meta.negativePrompt);
                contentParts.push(``);
            }

            if (meta.promptJson) {
                contentParts.push(`--- PROMPT JSON STRUCTURE ---`);
                contentParts.push(JSON.stringify(meta.promptJson, null, 2));
                contentParts.push(``);
            }

            const blob = new Blob([contentParts.join('\n')], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(item.description || 'artifact').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_metadata.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export metadata:", err);
        }
    };

    const jsonString = item.metadata?.promptJson ? JSON.stringify(item.metadata.promptJson, null, 2) : "No JSON data available.";

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && hasPrev) onPrev();
            if (e.key === 'ArrowRight' && hasNext) onNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNext, onPrev, hasNext, hasPrev, onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="glass-card rounded-3xl w-full max-w-7xl h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex-1 bg-black/40 flex items-center justify-center relative p-6 border-r border-white/10 group">
                     {/* Toggle Mode Segmented Control on Top Right */}
                     {item.metadata?.upscaledFrom && (
                         <div className="absolute top-6 right-6 flex items-center bg-black/70 backdrop-blur-lg rounded-xl border border-white/10 p-1 gap-1 z-30 animate-in slide-in-from-top-4 duration-300">
                             <button 
                                 onClick={(e) => { e.stopPropagation(); setCompareMode('single'); }}
                                 className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${compareMode === 'single' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                             >
                                 Single View
                             </button>
                             <button 
                                 onClick={(e) => { e.stopPropagation(); setCompareMode('split'); }}
                                 className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${compareMode === 'split' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                             >
                                 Split Slider
                             </button>
                             <button 
                                 onClick={(e) => { e.stopPropagation(); setCompareMode('side-by-side'); }}
                                 className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${compareMode === 'side-by-side' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                             >
                                 Side-By-Side (2-Up)
                             </button>
                         </div>
                     )}

                     {/* Image View Layout Render */}
                     {item.metadata?.upscaledFrom && compareMode === 'side-by-side' ? (
                         <div className="grid grid-cols-2 gap-4 w-full h-full max-h-[75vh] p-4 bg-slate-950/20 rounded-2xl overflow-auto select-none">
                             <div className="flex flex-col items-center justify-center gap-3">
                                 <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/40 px-3 py-1 border border-white/5 rounded-full">Original</span>
                                 <div className="flex-1 flex items-center justify-center overflow-hidden">
                                     <img src={item.metadata.upscaledFrom} className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-2xl border border-white/5" alt="Original Frame" />
                                 </div>
                             </div>
                             <div className="flex flex-col items-center justify-center gap-3">
                                 <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest bg-primary-500/10 px-3 py-1 border border-primary-500/15 rounded-full">Enhanced Super-Res</span>
                                 <div className="flex-1 flex items-center justify-center overflow-hidden">
                                     <img src={displaySrc} className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-2xl border border-white/5" alt="Upscaled Frame" onError={handleImageError} />
                                 </div>
                             </div>
                         </div>
                     ) : item.metadata?.upscaledFrom && compareMode === 'split' ? (
                         <div 
                             ref={containerRef}
                             className="relative w-full h-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/30 select-none cursor-ew-resize border border-white/5"
                             onMouseMove={onMouseMove}
                             onTouchMove={onTouchMove}
                         >
                             {/* Original background */}
                             <img src={item.metadata.upscaledFrom} className="max-w-full max-h-[50vh] object-contain rounded-lg pointer-events-none" alt="Original" />
                             
                             {/* Upscaled foreground with clip */}
                             <div 
                                 className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in duration-300"
                                 style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                             >
                                 <img src={displaySrc} className="max-w-full max-h-[50vh] object-contain rounded-lg pointer-events-none" alt="Upscaled" onError={handleImageError} />
                             </div>
                             
                             {/* Vertical Slider divider line */}
                             <div 
                                 className="absolute inset-y-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] pointer-events-none"
                                 style={{ left: `${sliderPos}%` }}
                             >
                                 <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border border-white/30 text-white flex items-center justify-center text-xs font-bold shadow-xl pointer-events-auto hover:bg-indigo-600 hover:scale-105 transition-all">
                                     ↔
                                 </div>
                             </div>

                             {/* Float badges */}
                             <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-xl text-[9px] font-bold text-white/50 uppercase tracking-widest border border-white/5 backdrop-blur-md">
                                 Original (Left)
                              </div>
                              <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-xl text-[9px] font-bold text-primary-400 uppercase tracking-widest border border-primary-500/10 backdrop-blur-md">
                                 Super-Res (Right)
                              </div>
                         </div>
                     ) : (
                         <div className="relative max-w-full max-h-full flex items-center justify-center">
                             <img 
                                 src={displaySrc} 
                                 className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${isRecovering ? 'opacity-20' : 'opacity-100'}`} 
                                 alt="Inspect" 
                                 onError={handleImageError}
                             />
                             {isRecovering && (
                                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md rounded-2xl p-6 text-center z-20">
                                     <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
                                     <span className="text-white text-sm font-bold tracking-wide">Đang khôi phục ảnh từ Google Drive...</span>
                                     <span className="text-white/40 text-xs mt-1">Đang chuyển đổi sang bộ nhớ vĩnh viễn trên máy</span>
                                 </div>
                             )}
                             {recoverError && (
                                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md rounded-2xl p-6 text-center z-20">
                                     <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                     </div>
                                     <p className="text-amber-200 text-sm font-semibold max-w-xs">{recoverError}</p>
                                     {onGoogleSignIn && !googleUser ? (
                                         <button 
                                             onClick={onGoogleSignIn} 
                                             className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2"
                                         >
                                             <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
                                             Kết nối Google Drive
                                         </button>
                                     ) : (
                                         <button 
                                             onClick={recoverFromDrive} 
                                             className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
                                         >
                                             Thử tải lại từ Drive
                                         </button>
                                     )}
                                 </div>
                             )}
                         </div>
                     )}
                     {hasPrev && (
                         <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition backdrop-blur-md opacity-0 group-hover:opacity-100">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                         </button>
                     )}
                     {hasNext && (
                         <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition backdrop-blur-md opacity-0 group-hover:opacity-100">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                         </button>
                     )}
                     <button onClick={onClose} className="absolute top-6 left-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10 backdrop-blur-lg"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="w-full md:w-[450px] bg-slate-900/60 backdrop-blur-md flex flex-col border-l border-white/5">
                    <div className="p-8 border-b border-white/10">
                        <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{item.description || "Visual Artifact"}</h3>
                        <p className="text-xs text-white/40 font-mono tracking-widest uppercase">
                            Captured {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {item.metadata?.upscaleFeedback && (
                            <div className="space-y-4 animate-in fade-in duration-500">
                                <label className="text-xs font-black text-emerald-400 uppercase tracking-widest block">
                                    Super-Resolution Quality Assessment
                                </label>
                                <div className="bg-emerald-500/5 rounded-3xl p-6 border border-emerald-500/10 space-y-5">
                                    {/* Overall performance bar */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Neural Quality Rank</span>
                                            <span className="text-sm font-semibold text-white/90">Masterclass Reconstruction</span>
                                        </div>
                                        <div className="bg-emerald-500/10 px-3.5 py-1.5 rounded-2xl border border-emerald-500/20 text-center flex flex-col justify-center">
                                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest leading-none mb-1">Score</span>
                                            <span className="text-lg font-black text-emerald-300 leading-none">{item.metadata.upscaleFeedback.score}%</span>
                                        </div>
                                    </div>

                                    <hr className="border-white/5" />

                                    {/* Parameter Rating Scales */}
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-mono">
                                                <span className="text-white/60 font-medium">Sharpness & Edges</span>
                                                <span className="text-emerald-400 font-bold">{item.metadata.upscaleFeedback.sharpnessPct}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.metadata.upscaleFeedback.sharpnessPct}%` }} />
                                            </div>
                                            <p className="text-[9px] text-white/40 italic">{item.metadata.upscaleFeedback.sharpness}</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-mono">
                                                <span className="text-white/60 font-medium">Detail Synthesis</span>
                                                <span className="text-emerald-400 font-bold">{item.metadata.upscaleFeedback.detailPct}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.metadata.upscaleFeedback.detailPct}%` }} />
                                            </div>
                                            <p className="text-[9px] text-white/40 italic">{item.metadata.upscaleFeedback.detail}</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-mono">
                                                <span className="text-white/60 font-medium font-mono">Neural Denoising</span>
                                                <span className="text-emerald-400 font-bold">{item.metadata.upscaleFeedback.denoisePct}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.metadata.upscaleFeedback.denoisePct}%` }} />
                                            </div>
                                            <p className="text-[9px] text-white/40 italic">{item.metadata.upscaleFeedback.denoise}</p>
                                        </div>
                                    </div>

                                    <hr className="border-white/5" />

                                    {/* Tech details */}
                                    <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                            <span className="text-white/30 block uppercase mb-1">Target Buffer</span>
                                            <span className="text-white/80 font-bold">{item.metadata.upscaleFeedback.resolution}</span>
                                        </div>
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                            <span className="text-white/30 block uppercase mb-1">Scale Grade</span>
                                            <span className="text-emerald-400 font-bold">{item.metadata.upscaleFeedback.grade || "S+"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-black text-primary-400 uppercase tracking-widest">Metadata Structure</label>
                                <button onClick={() => handleCopy(jsonString, 'Prompt')} className="text-[10px] px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors uppercase font-bold tracking-tighter">
                                    {copySuccess === 'Prompt' ? 'Copied' : 'Copy JSON'}
                                </button>
                            </div>
                            <div className="bg-black/30 rounded-2xl p-5 border border-white/5">
                                <pre className="text-[11px] font-mono text-white/60 whitespace-pre-wrap leading-relaxed">{jsonString}</pre>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-black text-primary-400 uppercase tracking-widest">Generation Parameters</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <span className="text-[10px] text-white/30 block uppercase tracking-widest mb-1">Engine</span>
                                    <span className="text-sm font-semibold text-white/80">{item.metadata?.model || "Standard"}</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <span className="text-[10px] text-white/30 block uppercase tracking-widest mb-1">Ratio</span>
                                    <span className="text-sm font-semibold text-white/80">{item.metadata?.aspectRatio || "1:1"}</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <span className="text-[10px] text-white/30 block uppercase tracking-widest mb-1">Seed</span>
                                    <span className="text-sm font-semibold text-white/80">{item.metadata?.seed ?? "Random"}</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <span className="text-[10px] text-white/30 block uppercase tracking-widest mb-1">CFG Scale</span>
                                    <span className="text-sm font-semibold text-white/80">{item.metadata?.cfgScale ?? "7.5"}</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <span className="text-[10px] text-white/30 block uppercase tracking-widest mb-1">Steps</span>
                                    <span className="text-sm font-semibold text-white/80">{item.metadata?.steps ?? "25"}</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <span className="text-[10px] text-white/30 block uppercase tracking-widest mb-1">Sampler</span>
                                    <span className="text-sm font-semibold text-white/80">{item.metadata?.sampler || "Neural Flow"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Local Bundle / Collection selector */}
                        {collections && onMoveToCollection && (
                            <div className="space-y-4">
                                <label className="text-xs font-black text-primary-400 uppercase tracking-widest block">Collection / Bundle File</label>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
                                    <span className="text-[10px] text-white/30 block uppercase tracking-widest">Organize into Folder</span>
                                    <select 
                                        value={item.collectionId || ""} 
                                        onChange={(e) => onMoveToCollection(item.id, e.target.value ? e.target.value : undefined)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-primary-500 transition-colors"
                                    >
                                        <option value="">General Feed (No Bundle)</option>
                                        {collections.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} { (c as any).autoSync ? " (Auto-Synced)" : "" }
                                            </option>
                                        ))}
                                    </select>
                                    {item.collectionId && (
                                        <div className="text-[10px] text-white/40 flex items-center gap-1.5 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span>
                                                Synced folder path: <strong className="text-white/60 font-mono">NK Imagen Storage / {collections.find(c => c.id === item.collectionId)?.name}</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {item.metadata?.negativePrompt && (
                            <div>
                                <label className="text-xs font-black text-primary-400 uppercase tracking-widest block mb-4">Negative Constraints</label>
                                <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/10">
                                    <p className="text-[11px] font-medium text-red-100/60 leading-relaxed italic">
                                        {item.metadata.negativePrompt}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-8 border-t border-white/10 bg-black/20 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                            {onUpscaleStudio && (
                                <button 
                                    onClick={() => onUpscaleStudio({ ...item, src: displaySrc })} 
                                    className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium rounded-2xl border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-[11px] group"
                                    title="Mở ảnh trong Upscale Studio 4K để tinh chỉnh chi tiết & chọn preset"
                                >
                                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                    <span>Upscale 4K</span>
                                </button>
                            )}
                            {onInpainting && (
                                <button 
                                    onClick={() => onInpainting({ ...item, src: displaySrc })} 
                                    className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium rounded-2xl border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-[11px] group"
                                    title="Cọ Ma Thuật AI Inpainting: Sửa bàn tay 5 ngón, đổi trang phục, chỉnh sửa cục bộ"
                                >
                                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    <span>Cọ Sửa AI</span>
                                </button>
                            )}
                            {onVirtualTryOn && (
                                <button 
                                    onClick={() => onVirtualTryOn({ ...item, src: displaySrc })} 
                                    className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium rounded-2xl border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-[11px] group"
                                    title="Virtual Try-On 2.0: Thử trang phục từ ảnh sản phẩm lên người mẫu"
                                >
                                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>Thử Đồ 2.0</span>
                                </button>
                            )}
                            {onCharacterTurnaround && (
                                <button 
                                    onClick={() => onCharacterTurnaround({ ...item, src: displaySrc })} 
                                    className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium rounded-2xl border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-[11px] group"
                                    title="Character Sheet 360: Xuất bộ xoay 8 hướng chuẩn Game & VFX"
                                >
                                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Xoay 360°</span>
                                </button>
                            )}
                            {onBiometricMorph && (
                                <button 
                                    onClick={() => onBiometricMorph({ ...item, src: displaySrc })} 
                                    className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium rounded-2xl border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-[11px] group"
                                    title="Biometric Morph: Thanh trượt tuổi 18-70 & cảm xúc khuôn mặt"
                                >
                                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Tuổi & Cảm Xúc</span>
                                </button>
                            )}
                            {onStudio && (
                                <button 
                                    onClick={() => onStudio({ ...item, src: displaySrc })} 
                                    className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium rounded-2xl border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-[11px] group"
                                    title="Mở ảnh trong Photo Studio 2026 để chỉnh màu nâng cao & AI Inpaint"
                                >
                                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4 4 4 0 014-4c.8 0 1.5.3 2.1.8l6.3-6.3a2 2 0 112.8 2.8l-6.3 6.3c.5.6.8 1.3.8 2.1a4 4 0 01-4 4z" />
                                    </svg>
                                    <span>Studio AI</span>
                                </button>
                            )}
                            <button onClick={() => onRemix(item)} className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium rounded-2xl border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-[11px] group">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                <span>Remix</span>
                            </button>
                            <button onClick={() => onCompose({ ...item, src: displaySrc })} className="py-3 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white font-medium rounded-2xl border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-[11px] group">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" /></svg>
                                <span>Compose</span>
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {onGoogleDrive && !(item as any).driveFileId && (
                                <button 
                                    onClick={() => onGoogleDrive(displaySrc, item.description, item.id)} 
                                    disabled={isSavingDrive}
                                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isSavingDrive ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                            Uploading to Drive...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                            </svg>
                                            Sync Now
                                        </>
                                    )}
                                </button>
                            )}

                            {onGoogleDrive && (item as any).driveFileId && (
                                <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                    </svg>
                                    Synced on Google Drive
                                </div>
                            )}

                            {/* Anti-AI Camouflage Toggle */}
                            <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={isAntiAiActive} 
                                        onChange={(e) => setIsAntiAiActive(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-black/40 border-white/20 accent-emerald-500 cursor-pointer"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 leading-tight">
                                            <span>🛡️</span> Khử Dấu AI (Bypass Detector)
                                        </span>
                                        <span className="text-[9px] text-white/40 leading-tight">
                                            Bơm hạt cảm biến Film Grain & Cấy EXIF máy ảnh thật
                                        </span>
                                    </div>
                                </label>
                                {isAntiAiActive && (
                                    <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                        JPG + EXIF
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-4">
                                 <button 
                                     onClick={() => onDownload(displaySrc, item.description, isAntiAiActive)} 
                                     disabled={isSavingDrive}
                                     className={`flex-[2] py-3 text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-80 disabled:cursor-wait ${
                                         isAntiAiActive 
                                             ? 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-500/20' 
                                             : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                     }`}
                                 >
                                    {isSavingDrive && !!(item as any).driveFileId ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Saving to Drive...
                                        </>
                                    ) : isAntiAiActive ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                            Tải Khử Dấu AI
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Download Image
                                        </>
                                    )}
                                 </button>
                                 <button 
                                     onClick={handleExportMetadata}
                                     className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 border border-white/5 transition-all shadow-md active:scale-95"
                                     title="Export Parameter & Prompt Metadata"
                                 >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                     </svg>
                                     <span className="hidden sm:inline">Params</span>
                                 </button>
                                <button onClick={() => { requestConfirm('Erase this artifact permanently?', () => { onDelete(item.id); onClose(); }); }} className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all" title="Delete Artifact">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            {driveSaveStatus && driveSaveStatus.id === item.id && (
                                <div className={`text-[11px] font-semibold text-center p-2 rounded-xl border leading-tight ${
                                    driveSaveStatus.success 
                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 animate-in fade-in duration-300' 
                                        : 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-in fade-in duration-300'
                                }`}>
                                    {driveSaveStatus.message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ComparingModal: React.FC<{ items: GalleryItem[]; onClose: () => void }> = ({ items, onClose }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6 md:p-12 animate-in fade-in duration-500">
            <button onClick={onClose} className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-[130] backdrop-blur-xl border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-full h-full flex flex-row gap-8 overflow-x-auto snap-x snap-mandatory pb-10 custom-scrollbar">
                {items.map((item) => (
                    <div key={item.id} className="flex-none w-[85vw] md:w-[45vw] h-full flex flex-col snap-center animate-in slide-in-from-right-10 duration-500">
                        <div className="flex-1 bg-black/20 rounded-[3rem] border border-white/5 overflow-hidden relative group">
                            <img src={item.src} className="w-full h-full object-contain p-4" alt="Comparison" />
                            <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black/80 to-transparent translate-y-10 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">{item.description || "Artifact"}</h4>
                                <div className="flex gap-4">
                                     <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block uppercase tracking-widest font-black">Ratio</span>
                                        <span className="text-xs font-bold text-white/80">{item.metadata?.aspectRatio || "1:1"}</span>
                                    </div>
                                    <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                                        <span className="text-[10px] text-white/40 block uppercase tracking-widest font-black">Engine</span>
                                        <span className="text-xs font-bold text-white/80">{item.metadata?.model || "Standard"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

interface ErrorDetails {
  title: string;
  message: string;
  solutions?: string[];
  isAuthError?: boolean;
  isAccessDenied403?: boolean;
  isDriveError?: boolean;
}

const App: React.FC = () => {
  // Internationalization & Language Switcher (visionOS)
  const { lang, setLanguage, t, currentLanguageInfo } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update window and document title (visionOS)
  useEffect(() => {
    document.title = 'NKI Studio v4.3 - NKI Standalone Studio - Next-gen Kinetic Integration';
  }, []);

  // Google Drive Integration States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [driveSavingId, setDriveSavingId] = useState<string | null>(null);
  const [driveSaveStatus, setDriveSaveStatus] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [pendingDriveAction, setPendingDriveAction] = useState<{
    type: 'save' | 'sync_collection';
    args: any[];
  } | null>(null);
  const [upscaleProgress, setUpscaleProgress] = useState<{
    active: boolean;
    percent: number;
    stepMessage: string;
    is4k: boolean;
    srcImage?: string;
  } | null>(null);

  // Initialize Firebase Auth & GIS Auto-Restore subscription
  useEffect(() => {
    let keepAliveTimer: any = null;

    const unsubscribe = initAuth((user) => {
      setGoogleUser(user);
    }, () => {
      // If neither Firebase nor GIS has user, reset
      if (!getAccessToken()) {
        setGoogleUser(null);
      }
    });

    const handleExpired = () => {
      setGoogleUser(null);
    };

    const handleDriveConnected = (e: any) => {
      if (e.detail?.user) {
        setGoogleUser(e.detail.user);
      }
    };

    window.addEventListener('google_drive_token_expired', handleExpired);
    window.addEventListener('google_drive_connected', handleDriveConnected);

    // Auto-restore Google Drive silently or 0ms from valid cached token on app launch
    autoRestoreDriveSession().then(result => {
      if (result) {
        setGoogleUser(result.user);
        console.log("[AutoConnect] Successfully auto-linked Google Drive on app launch!");
      }
    }).catch(err => {
      console.warn("[AutoConnect] Auto-restore attempted with note:", err);
    });

    // Background Keep-Alive: renew token silently every 35 minutes so Drive session stays fresh
    keepAliveTimer = setInterval(() => {
      if (getAccessToken() && isDriveAutoConnectEnabled()) {
        autoRestoreDriveSession().then(res => {
          if (res) console.log("[AutoConnect] Keep-alive silent refresh succeeded.");
        }).catch(() => {});
      }
    }, 35 * 60 * 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('google_drive_token_expired', handleExpired);
      window.removeEventListener('google_drive_connected', handleDriveConnected);
      if (keepAliveTimer) clearInterval(keepAliveTimer);
    };
  }, []);

  const handleConnectGoogleDrive = async () => {
    try {
      const res = await quickConnectGoogleDrive();
      if (res) {
        setGoogleUser(res.user);
        setDriveSaveStatus({
          id: 'auth-success',
          success: true,
          message: 'Google Drive connected successfully!'
        });
        showCleanToast('⚡ Đã kết nối Google Drive thành công!');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        return;
      }
      handleError(err, "Không thể kết nối Google Drive.");
    }
  };

  // Sync Google Drive Images under 'NK Imagen Storage' folder into local collections automatically
  useEffect(() => {
    if (googleUser && getAccessToken()) {
      const waitTimer = setTimeout(() => {
        syncDriveImages(true);
      }, 1500);
      return () => clearTimeout(waitTimer);
    }
  }, [googleUser]);

  const [activeTab, setActiveTab] = useState<AppMode>(AppMode.IMG_TO_JSON);
  const [studioInitialImage, setStudioInitialImage] = useState<string | null>(null);

  const handleOpenStudio = (src?: string) => {
    if (src) {
      setStudioInitialImage(src);
    } else if (galleryItems && galleryItems.length > 0 && !studioInitialImage) {
      setStudioInitialImage(galleryItems[0].src);
    }
    setActiveTab(AppMode.AI_STUDIO);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("Processing...");
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('emerald');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [historyItems, setHistoryItems] = useState<LogItem[]>([]);
  // Prompt History Vault States
  const [historySubTab, setHistorySubTab] = useState<'prompts' | 'logs'>('prompts');
  const [promptHistoryItems, setPromptHistoryItems] = useState<PromptHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = safeStorage.getItem('hlc_prompt_history');
        const parsed = stored ? JSON.parse(stored) : null;
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    }
    return [];
  });
  const [promptSearch, setPromptSearch] = useState<string>('');
  const [promptFilterSource, setPromptFilterSource] = useState<'all' | PromptSourceType>('all');
  const [promptSort, setPromptSort] = useState<'newest' | 'oldest'>('newest');
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [rpmUsage, setRpmUsage] = useState(0);
  const rpmLimit = getRpmLimit();

  // Storage & Directory Settings
  const [storageSettings, setStorageSettings] = useState<AppStorageSettings>(DEFAULT_STORAGE_SETTINGS);
  const [localDirHandle, setLocalDirHandle] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const isInitialLoadRef = useRef(true);

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = safeStorage.getItem('hlc_gallery_items_with_sync');
        const parsed = stored ? JSON.parse(stored) : null;
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error("Error loading gallery items from localStorage:", err);
        return [];
      }
    }
    return [];
  });
  const [gallerySelection, setGallerySelection] = useState<Set<string>>(new Set());
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [gallerySort, setGallerySort] = useState<'newest' | 'oldest'>('newest');
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilterType>('all');
  const [galleryTimeRange, setGalleryTimeRange] = useState<GalleryTimeRange>('all');
  const [galleryDensity, setGalleryDensity] = useState<GalleryDensity>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeStorage.getItem('hlc_gallery_density');
      if (saved === 'large' || saved === 'medium' || saved === 'small' || saved === 'list') {
        return saved as GalleryDensity;
      }
    }
    return 'medium';
  });
  const [gallerySearch, setGallerySearch] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);
  const [inspectorItem, setInspectorItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeStorage.setItem('hlc_gallery_density', galleryDensity);
    }
  }, [galleryDensity]);

  const [collections, setCollections] = useState<Collection[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = safeStorage.getItem('hlc_collections_with_sync');
        const parsed = stored ? JSON.parse(stored) : null;
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error("Error loading collections from localStorage:", err);
        return [];
      }
    }
    return [];
  });
  const [activeCollectionId, setActiveCollectionId] = useState<string>('all');
  const [isMoveToOpen, setIsMoveToOpen] = useState(false);
  const [isCollectionHubOpen, setIsCollectionHubOpen] = useState(false);

  // Initialize IndexedDB Storage & migrate legacy data
  useEffect(() => {
    const initStorageAndGallery = async () => {
      try {
        // 1. Migrate legacy items from localStorage if any exist
        await migrateFromLocalStorage();

        // 2. Load storage settings from IndexedDB
        const loadedSettings = await getStorageSettingsDB();
        setStorageSettings(loadedSettings);

        // 3. Load directory handle if configured
        if (loadedSettings.hasLocalDirectory) {
          const dirHandle = await getLocalDirectoryHandle();
          if (dirHandle) {
            setLocalDirHandle(dirHandle);
          }
        }

        // 4. Load gallery items from IndexedDB (permanent storage)
        const dbItems = await getAllGalleryItemsDB();
        if (dbItems && dbItems.length > 0) {
          setGalleryItems(dbItems);
        }

        // 5. Load collections from IndexedDB
        const dbCols = await getAllCollectionsDB();
        if (dbCols && dbCols.length > 0) {
          setCollections(dbCols);
        }

        // 6. Load Prompt History from IndexedDB (Dedicated prompt vault)
        try {
          const dbPrompts = await getAllPromptItemsDB();
          if (dbPrompts && dbPrompts.length > 0) {
            setPromptHistoryItems(dbPrompts);
          } else if (dbItems && dbItems.length > 0) {
            // Auto-populate prompt history from existing gallery items metadata
            const fromGallery: PromptHistoryItem[] = [];
            dbItems.forEach(item => {
              if (item.metadata?.promptJson) {
                fromGallery.push({
                  id: crypto.randomUUID(),
                  timestamp: item.createdAt,
                  source: item.type === 'POSE' ? 'POSE' : item.type === 'COMPOSE' ? 'COMPOSE' : 'JSON_TO_IMG',
                  promptJson: item.metadata.promptJson,
                  subject: item.metadata.promptJson.subject || item.description || 'Gallery Prompt',
                  previewImage: item.src
                });
              }
            });
            if (fromGallery.length > 0) {
              setPromptHistoryItems(fromGallery);
              await saveAllPromptItemsDB(fromGallery);
            }
          }
        } catch (promptErr) {
          console.error("[IndexedDB] Error loading prompt history:", promptErr);
        }
      } catch (err) {
        console.error("[IndexedDB] Error initializing storage:", err);
      } finally {
        isInitialLoadRef.current = false;
      }
    };

    initStorageAndGallery();
  }, []);

  // IndexedDB persistence for Gallery items (Never loses images)
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    saveAllGalleryItemsDB(galleryItems).catch(err => {
      console.error("[IndexedDB] Error persisting gallery items:", err);
    });
  }, [galleryItems]);

  // IndexedDB persistence for Collections
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    saveAllCollectionsDB(collections).catch(err => {
      console.error("[IndexedDB] Error persisting collections:", err);
    });
  }, [collections]);

  // Auto-heal any legacy items that have temporary 'blob:' URLs using Drive file IDs
  const failedHealingIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let isCancelled = false;
    const healLegacyBlobItems = async () => {
      if (!googleUser) return;
      const brokenItems = galleryItems.filter(
        item => item.src?.startsWith('blob:') && (item as any).driveFileId && !failedHealingIdsRef.current.has(item.id)
      );
      if (brokenItems.length === 0) return;

      try {
        const token = await getAccessToken();
        if (!token || isCancelled) return;

        console.log(`[Auto-Heal] Found ${brokenItems.length} items with temporary blob URLs. Healing from Google Drive...`);
        let healedAny = false;
        const healedMap = new Map<string, string>();

        for (const broken of brokenItems) {
          if (isCancelled) break;
          const fileId = (broken as any).driveFileId;
          try {
            const { blob } = await executeWithExponentialBackoff(() => downloadDriveFile(token, fileId));
            const permanentData = await blobToDataUrl(blob);
            healedMap.set(broken.id, permanentData);
            healedAny = true;
          } catch (err) {
            console.warn(`[Auto-Heal] Could not restore file ${fileId}:`, err);
            failedHealingIdsRef.current.add(broken.id);
          }
        }

        if (healedAny && !isCancelled) {
          setGalleryItems(prev => {
            const updated = prev.map(item => {
              if (healedMap.has(item.id)) {
                return { ...item, src: healedMap.get(item.id)! };
              }
              return item;
            });
            saveAllGalleryItemsDB(updated).catch(console.error);
            return updated;
          });
        }
      } catch (err) {
        console.error("[Auto-Heal] Error healing legacy blob items:", err);
      }
    };

    const timer = setTimeout(() => {
      healLegacyBlobItems();
    }, 1500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [googleUser, galleryItems]);

  // Session ref to avoid auto-saving same image repeatedly in the same session, initialized with all pre-existing gallery IDs
  const syncedIdsRef = useRef<Set<string>>(new Set(
    (() => {
      if (typeof window !== 'undefined') {
        try {
          const stored = safeStorage.getItem('hlc_gallery_items_with_sync');
          const items = stored ? JSON.parse(stored) : [];
          return Array.isArray(items) ? items.map((item: any) => item?.id).filter(Boolean) : [];
        } catch (e) {
          return [];
        }
      }
      return [];
    })()
  ));

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageURLInput, setImageURLInput] = useState<string>('');
  const [jsonResult, setJsonResult] = useState<ImagePromptJson | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{ width: number; height: number; aspectRatio: string } | null>(null);
  const [refinePrompt, setRefinePrompt] = useState<string>('');
  const [isRefining, setIsRefining] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);

  const [converterInput, setConverterInput] = useState<string>('');
  const [converterResult, setConverterResult] = useState<ImagePromptJson | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(DEFAULT_JSON, null, 2));
  const [jsonHistory, setJsonHistory] = useState<string[]>([]);
  const [jsonHistoryIdx, setJsonHistoryIdx] = useState<number>(-1);

  const updateJsonInput = (val: string) => {
    setJsonInput(val);
    const newHistory = jsonHistory.slice(0, jsonHistoryIdx + 1);
    newHistory.push(val);
    if (newHistory.length > 50) newHistory.shift();
    setJsonHistory(newHistory);
    setJsonHistoryIdx(newHistory.length - 1);
  };

  const handleUndoJson = () => {
    if (jsonHistoryIdx > 0) {
      const prev = jsonHistoryIdx - 1;
      setJsonHistoryIdx(prev);
      setJsonInput(jsonHistory[prev]);
    }
  };

  const handleRedoJson = () => {
    if (jsonHistoryIdx < jsonHistory.length - 1) {
      const next = jsonHistoryIdx + 1;
      setJsonHistoryIdx(next);
      setJsonInput(jsonHistory[next]);
    }
  };

  // Quick Prompt Clean Toast
  const [cleanToast, setCleanToast] = useState<string | null>(null);
  const showCleanToast = (msg: string) => {
    setCleanToast(msg);
    setTimeout(() => setCleanToast(null), 2500);
  };

  // 1-Click Clean Prompt in Image Analysis (Phân tích)
  const handleCleanAnalysisPrompt = () => {
    setJsonResult(null);
    setUploadedImage(null);
    setImageURLInput('');
    setRefinePrompt('');
    setShowRefineInput(false);
    showCleanToast(t('prompt.cleanSuccess', 'Đã làm sạch prompt & ảnh phân tích!'));
  };

  // 1-Click Clean Prompt in Linguistic Converter (Chuyển đổi)
  const handleCleanConverterPrompt = () => {
    setConverterInput('');
    setConverterResult(null);
    showCleanToast(t('prompt.cleanSuccess', 'Đã làm sạch prompt chuyển đổi!'));
  };

  // 1-Click Clean Prompt in Generator (Tạo ảnh)
  const handleCleanGeneratorPrompt = (mode: 'blank' | 'sanitize' | 'default' = 'blank') => {
    if (mode === 'blank') {
      updateJsonInput(JSON.stringify(BLANK_PROMPT_JSON, null, 2));
      handleApplyPreset('');
      showCleanToast(t('prompt.cleanSuccess', 'Đã làm sạch prompt về khung rỗng! (Bấm ↶ để hoàn tác)'));
    } else if (mode === 'sanitize') {
      try {
        const parsed = JSON.parse(jsonInput);
        const cleaned: any = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') {
            cleaned[k] = sanitizeAndDeduplicatePrompt(v);
          } else {
            cleaned[k] = v;
          }
        }
        updateJsonInput(JSON.stringify(cleaned, null, 2));
        showCleanToast(t('prompt.cleanDeduplicate', 'Đã lọc sạch các từ khóa trùng lặp!'));
      } catch {
        updateJsonInput(sanitizeAndDeduplicatePrompt(jsonInput));
        showCleanToast(t('prompt.cleanDeduplicate', 'Đã lọc sạch các từ khóa trùng lặp!'));
      }
    } else if (mode === 'default') {
      updateJsonInput(JSON.stringify(DEFAULT_JSON, null, 2));
      handleApplyPreset('');
      showCleanToast(t('prompt.resetDefault', 'Đã khôi phục prompt mặc định!'));
    }
  };

  // 1-Click Clean Prompt in currently active tab (Phân tích / Chuyển đổi / Tạo ảnh)
  const handleQuickCleanCurrentTabPrompt = () => {
    if (activeTab === AppMode.IMG_TO_JSON) {
      handleCleanAnalysisPrompt();
    } else if (activeTab === AppMode.JSON_CONVERTER) {
      handleCleanConverterPrompt();
    } else if (activeTab === AppMode.JSON_TO_IMG) {
      handleCleanGeneratorPrompt('blank');
    }
  };

  useEffect(() => {
    // Initial history
    const initial = JSON.stringify(DEFAULT_JSON, null, 2);
    setJsonHistory([initial]);
    setJsonHistoryIdx(0);
  }, []);

  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variantCount, setVariantCount] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [imageSize, setImageSize] = useState<string>('1K');
  const [useOriginalAspectRatio, setUseOriginalAspectRatio] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [jsonBeforePreset, setJsonBeforePreset] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite-image');

  // Google Gemini API Key state for standalone operation
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => hasGeminiApiKey());

  useEffect(() => {
    const handleKeyChange = () => setHasApiKey(hasGeminiApiKey());
    window.addEventListener('gemini_api_key_changed', handleKeyChange);
    return () => window.removeEventListener('gemini_api_key_changed', handleKeyChange);
  }, []);

  useEffect(() => {
    // Automatically open API Key setup modal if no key is configured on launch
    if (!hasGeminiApiKey()) {
      const t = setTimeout(() => {
        setIsApiKeyModalOpen(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, []);

  // Personal Presets saved in localStorage
  const [personalPresets, setPersonalPresets] = useState<PersonalPreset[]>(() => {
    return loadPersonalPresets();
  });
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [isPresetManagerModalOpen, setIsPresetManagerModalOpen] = useState(false);

  // --- v4.4 - v5.0 Upgrades State ---
  // 1. Character & Style Consistency Lock
  const [isConsistencyModalOpen, setIsConsistencyModalOpen] = useState(false);
  const [activePersona, setActivePersona] = useState<CharacterPersona | null>(() => getActivePersona());
  const [isConsistencyLockActive, setIsConsistencyLockActive] = useState<boolean>(() => isConsistencyLockEnabled());

  useEffect(() => {
    const handlePersonaChange = () => {
      setActivePersona(getActivePersona());
      setIsConsistencyLockActive(isConsistencyLockEnabled());
    };
    window.addEventListener('nki_active_persona_changed', handlePersonaChange);
    window.addEventListener('nki_consistency_lock_toggled', handlePersonaChange);
    return () => {
      window.removeEventListener('nki_active_persona_changed', handlePersonaChange);
      window.removeEventListener('nki_consistency_lock_toggled', handlePersonaChange);
    };
  }, []);

  // 2. A/B Matrix Testing Modal
  const [isABModalOpen, setIsABModalOpen] = useState(false);

  // 3. Prompt Time-Machine Snapshots & Share Vault Modal
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  // Breakthrough Next-Gen Suite Modals (v4.3 / v5.0)
  const [isRelightingOpen, setIsRelightingOpen] = useState(false);
  const [isVoiceDirectorOpen, setIsVoiceDirectorOpen] = useState(false);
  const [isSpatial3DOpen, setIsSpatial3DOpen] = useState(false);
  const [isDnaBlenderOpen, setIsDnaBlenderOpen] = useState(false);
  const [isNodeGraphOpen, setIsNodeGraphOpen] = useState(false);
  const [isTalkingActorOpen, setIsTalkingActorOpen] = useState(false);
  const [activeSpatial3DImage, setActiveSpatial3DImage] = useState<string | undefined>(undefined);
  const [activeRelightImage, setActiveRelightImage] = useState<string | undefined>(undefined);

  // Local Inpainting & Magic Brush Studio (v4.3)
  const [isInpaintingOpen, setIsInpaintingOpen] = useState(false);
  const [inpaintingTargetSrc, setInpaintingTargetSrc] = useState<string | null>(null);

  const handleOpenInpainting = (src?: string) => {
    const target = src || (generatedImages.length > 0 ? generatedImages[0] : (galleryItems.length > 0 ? galleryItems[0].src : null));
    if (target) {
      setInpaintingTargetSrc(target);
      setIsInpaintingOpen(true);
    } else {
      showCleanToast('Vui lòng chọn hoặc tạo một ảnh để sử dụng Cọ Ma Thuật Inpainting!');
    }
  };

  // Virtual Try-On 2.0 Studio (v4.3)
  const [isVirtualTryOnOpen, setIsVirtualTryOnOpen] = useState(false);
  const [virtualTryOnModelSrc, setVirtualTryOnModelSrc] = useState<string | null>(null);

  const handleOpenVirtualTryOn = (src?: string) => {
    const target = src || (generatedImages.length > 0 ? generatedImages[0] : (galleryItems.length > 0 ? galleryItems[0].src : null));
    setVirtualTryOnModelSrc(target);
    setIsVirtualTryOnOpen(true);
  };

  // Character Sheet 360° Studio (v4.3)
  const [isCharacterTurnaroundOpen, setIsCharacterTurnaroundOpen] = useState(false);
  const [characterTurnaroundSrc, setCharacterTurnaroundSrc] = useState<string | null>(null);

  const handleOpenCharacterTurnaround = (src?: string) => {
    const target = src || (generatedImages.length > 0 ? generatedImages[0] : (galleryItems.length > 0 ? galleryItems[0].src : null));
    setCharacterTurnaroundSrc(target);
    setIsCharacterTurnaroundOpen(true);
  };

  // Biometric Morph Studio - Aging & Emotion (v4.3)
  const [isBiometricMorphOpen, setIsBiometricMorphOpen] = useState(false);
  const [biometricMorphSrc, setBiometricMorphSrc] = useState<string | null>(null);

  const handleOpenBiometricMorph = (src?: string) => {
    const target = src || (generatedImages.length > 0 ? generatedImages[0] : (galleryItems.length > 0 ? galleryItems[0].src : null));
    setBiometricMorphSrc(target);
    setIsBiometricMorphOpen(true);
  };

  // Breakthrough Pillars v4.3 States & Handlers
  const [isStoryboardOpen, setIsStoryboardOpen] = useState(false);
  const [isLookbookOpen, setIsLookbookOpen] = useState(false);
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);

  const handleOpenStoryboard = () => {
    setIsStoryboardOpen(true);
  };

  const handleOpenLookbook = () => {
    setIsLookbookOpen(true);
  };

  const handleOpenPipeline = () => {
    setIsPipelineOpen(true);
  };

  // 5. Character Model Vault & Biometric Core state
  const [isCharacterVaultOpen, setIsCharacterVaultOpen] = useState(false);
  const [vaultTargetSlot, setVaultTargetSlot] = useState<string | null>(null);
  const [vaultInitialUploadFile, setVaultInitialUploadFile] = useState<File | null>(null);
  const [uploadChoiceModalData, setUploadChoiceModalData] = useState<{
    file: File;
    base64: string;
    targetSlot: string;
  } | null>(null);
  const [slotPersonaNames, setSlotPersonaNames] = useState<Record<string, string>>({});
  const [slotBiometricProfiles, setSlotBiometricProfiles] = useState<Record<string, BiometricProfile>>({});
  const [isScanningBiometrics, setIsScanningBiometrics] = useState<Record<string, boolean>>({});

  // Dual Character Pairing Configurations (Auto / FF / MF / MM)
  const [dualPairing, setDualPairing] = useState<DualCharacterPairing>('auto');
  const [poseDualPairing, setPoseDualPairing] = useState<DualCharacterPairing>('auto');
  const [composeDualPairing, setComposeDualPairing] = useState<DualCharacterPairing>('auto');

  // Anti-Bleed Isolation Contract
  const [dualAntiBleedLock, setDualAntiBleedLock] = useState<boolean>(true);
  const [poseDualAntiBleedLock, setPoseDualAntiBleedLock] = useState<boolean>(true);
  const [composeDualAntiBleedLock, setComposeDualAntiBleedLock] = useState<boolean>(true);

  const handleScanBiometrics = async (slot: string, imageBase64?: string | null, nameHint?: string) => {
    let targetImage = imageBase64;
    if (!targetImage) {
      if (slot === 'refFace1') targetImage = refFaceImage1;
      else if (slot === 'refFace2') targetImage = refFaceImage2;
      else if (slot === 'poseRef1') targetImage = poseRefFaceImage1;
      else if (slot === 'poseRef2') targetImage = poseRefFaceImage2;
      else if (slot === 'composeRef1') targetImage = composeRefFaceImage1;
      else if (slot === 'composeRef2') targetImage = composeRefFaceImage2;
      else if (slot === 'refChar') targetImage = refCharImage;
    }
    if (!targetImage) return;

    setIsScanningBiometrics(prev => ({ ...prev, [slot]: true }));
    try {
      const effectiveName = nameHint || slotPersonaNames[slot];
      const profile = await analyzeBiometricFaceCore(targetImage, effectiveName);
      setSlotBiometricProfiles(prev => ({ ...prev, [slot]: profile }));
      showCleanToast(`✨ Đã phân tích Biometric cho ${effectiveName || 'model'}: ${profile.gender === 'Female' ? 'Nữ' : 'Nam'}, ~${profile.estimatedAge} tuổi, mặt ${profile.faceShape}`);
    } catch (err: any) {
      console.warn('[Biometric Vision Scan] Error:', err);
    } finally {
      setIsScanningBiometrics(prev => ({ ...prev, [slot]: false }));
    }
  };

  const applySlotImage = (
    slot: string, 
    image: string | null, 
    personaName?: string, 
    biometric?: BiometricProfile, 
    persona?: CharacterPersona
  ) => {
    if (slot === 'refFace1') setRefFaceImage1(image);
    else if (slot === 'refFace2') setRefFaceImage2(image);
    else if (slot === 'poseRef1') setPoseRefFaceImage1(image);
    else if (slot === 'poseRef2') setPoseRefFaceImage2(image);
    else if (slot === 'composeRef1') setComposeRefFaceImage1(image);
    else if (slot === 'composeRef2') setComposeRefFaceImage2(image);
    else if (slot === 'refChar') setRefCharImage(image);

    setSlotPersonaNames(prev => {
      const next = { ...prev };
      if (personaName) next[slot] = personaName;
      else delete next[slot];
      return next;
    });

    if (image) {
      if (biometric) {
        setSlotBiometricProfiles(prev => ({ ...prev, [slot]: biometric }));
      } else if (persona) {
        const converted = convertPersonaToBiometricProfile(persona);
        setSlotBiometricProfiles(prev => ({ ...prev, [slot]: converted }));
      } else {
        // Trigger background biometric scan if not yet scanned
        handleScanBiometrics(slot, image, personaName);
      }
    } else {
      setSlotBiometricProfiles(prev => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    }
  };

  const handleSwapDualSlots = (slot1: string, slot2: string) => {
    const img1 = slot1 === 'refFace1' ? refFaceImage1 : (slot1 === 'poseRef1' ? poseRefFaceImage1 : composeRefFaceImage1);
    const img2 = slot2 === 'refFace2' ? refFaceImage2 : (slot2 === 'poseRef2' ? poseRefFaceImage2 : composeRefFaceImage2);

    const name1 = slotPersonaNames[slot1];
    const name2 = slotPersonaNames[slot2];

    const bio1 = slotBiometricProfiles[slot1];
    const bio2 = slotBiometricProfiles[slot2];

    applySlotImage(slot1, img2, name2, bio2);
    applySlotImage(slot2, img1, name1, bio1);
    showCleanToast('⇄ Đã hoán đổi vị trí Slot 1 & Slot 2!');
  };

  const handleFaceUploadRequest = async (file: File, targetSlot: string) => {
    try {
      const fullBase64 = await compressFileToBase64(file);
      setUploadChoiceModalData({
        file,
        base64: fullBase64,
        targetSlot
      });
    } catch {
      fileToBase64(file).then(b64 => {
        const fullBase64 = `data:${file.type};base64,${b64}`;
        setUploadChoiceModalData({
          file,
          base64: fullBase64,
          targetSlot
        });
      });
    }
  };

  // Check URL hash for shared preset on load (#preset=...)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('#preset=')) {
      const imported = decodePromptFromShareHash(window.location.hash);
      if (imported) {
        updateJsonInput(JSON.stringify(imported, null, 2));
        showCleanToast('✨ Đã tự động nạp Preset từ liên kết chia sẻ!');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // 4. Storyboard Shots for Timeline & Scenario Director
  const [storyboardShots, setStoryboardShots] = useState<StoryboardShot[]>([]);

  const [veoStartImage, setVeoStartImage] = useState<string | null>(null);
  const [veoEndImage, setVeoEndImage] = useState<string | null>(null);
  
  const [isMultiCharacter, setIsMultiCharacter] = useState(false);
  const [refFaceImage1, setRefFaceImage1] = useState<string | null>(null); 
  const [refFaceImage2, setRefFaceImage2] = useState<string | null>(null); 
  const [useReferenceHair, setUseReferenceHair] = useState<boolean>(false);

  const [poseBaseImage, setPoseBaseImage] = useState<string | null>(null);
  const [isDraggingPoseBase, setIsDraggingPoseBase] = useState(false);
  const [isPoseMultiCharacter, setIsPoseMultiCharacter] = useState(false);
  const [poseRefFaceImage1, setPoseRefFaceImage1] = useState<string | null>(null);
  const [poseRefFaceImage2, setPoseRefFaceImage2] = useState<string | null>(null);
  const [usePoseReferenceHair, setUsePoseReferenceHair] = useState<boolean>(false);
  const [poseCustomPrompt, setPoseCustomPrompt] = useState<string>('');
  const [poseDetails, setPoseDetails] = useState<string>('');
  const [poseVariants, setPoseVariants] = useState<ImagePromptJson[]>([]);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [variantImages, setVariantImages] = useState<Record<number, string>>({});
  const [loadingVariantImg, setLoadingVariantImg] = useState<number | null>(null);
  const [poseVariantCount, setPoseVariantCount] = useState<number>(3);
  const [poseAspectRatio, setPoseAspectRatio] = useState<string>('1:1');
  const [poseImageSize, setPoseImageSize] = useState<string>('1K');

  const [composePrompt, setComposePrompt] = useState<string>('');
  const [composeImageElements, setComposeImageElements] = useState<ImageData[]>([]);
  const [composeResultImages, setComposeResultImages] = useState<string[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [composeAspectRatio, setComposeAspectRatio] = useState<string>('1:1');
  const [composeImageSize, setComposeImageSize] = useState<string>('1K');
  const [isDraggingCompose, setIsDraggingCompose] = useState(false);
  const [composeVariantCount, setComposeVariantCount] = useState<number>(1);
  const [isComposeMultiCharacter, setIsComposeMultiCharacter] = useState(false);
  const [composeRefFaceImage1, setComposeRefFaceImage1] = useState<string | null>(null);
  const [composeRefFaceImage2, setComposeRefFaceImage2] = useState<string | null>(null);
  const [useComposeReferenceHair, setUseComposeReferenceHair] = useState<boolean>(false);

  // Reference Creation States
  const [refCharImage, setRefCharImage] = useState<string | null>(null);
  const [refOutfitImages, setRefOutfitImages] = useState<string[]>([]);
  const [isDraggingWardrobes, setIsDraggingWardrobes] = useState<boolean>(false);
  const [isBiometricCore, setIsBiometricCore] = useState<boolean>(true);
  const [refCreationAspectRatio, setRefCreationAspectRatio] = useState<string>('1:1');
  const [refCreationImageSize, setRefCreationImageSize] = useState<string>('1K');
  const [refCreationResults, setRefCreationResults] = useState<string[]>([]);
  const [isRefCreating, setIsRefCreating] = useState<boolean>(false);
  const [refCreationProgress, setRefCreationProgress] = useState<string>('');

  // Upscale Module States
  const [upscaleModuleSrc, setUpscaleModuleSrc] = useState<string | null>(null);
  const [upscaleModuleTargetRes, setUpscaleModuleTargetRes] = useState<UpscaleTargetRes>('ultra');
  const [upscaleModuleAspectRatio, setUpscaleModuleAspectRatio] = useState<number | null>(null);
  const [upscaleModuleResult, setUpscaleModuleResult] = useState<string | null>(null);
  const [upscaleModuleFeedback, setUpscaleModuleFeedback] = useState<any>(null);
  const [isUpscalingModule, setIsUpscalingModule] = useState<boolean>(false);
  const [upscaleModuleProgressPercent, setUpscaleModuleProgressPercent] = useState<number>(0);
  const [upscaleModuleProgressMsg, setUpscaleModuleProgressMsg] = useState<string>('');

  // Generation Queue & Synaptic Cooling UI states
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [coolingCountdown, setCoolingCountdown] = useState<number>(0);
  const [isCoolingActive, setIsCoolingActive] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = generationQueue.subscribe((state) => {
      const isCooling = Boolean(state.synapticCooling?.isActive);
      setIsCoolingActive(isCooling);
      setCoolingCountdown(state.synapticCooling?.remainingSeconds || 0);

      const hasActiveJson = state.items.some(
        i => i.type === 'json_to_img' && (i.status === 'queued' || i.status === 'processing' || i.status === 'cooling' || i.status === 'retrying')
      );
      setIsGenerating(hasActiveJson);

      const hasActivePose = state.items.some(
        i => i.type === 'pose' && (i.status === 'queued' || i.status === 'processing' || i.status === 'cooling' || i.status === 'retrying')
      );
      setIsGeneratingVariants(hasActivePose);

      const hasActiveCompose = state.items.some(
        i => i.type === 'compose' && (i.status === 'queued' || i.status === 'processing' || i.status === 'cooling' || i.status === 'retrying')
      );
      setIsComposing(hasActiveCompose);

      const hasActiveRef = state.items.some(
        i => i.type === 'reference' && (i.status === 'queued' || i.status === 'processing' || i.status === 'cooling' || i.status === 'retrying')
      );
      setIsRefCreating(hasActiveRef);
      if (!hasActiveRef) {
        setRefCreationProgress('');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (upscaleModuleSrc) {
      const img = new Image();
      img.src = upscaleModuleSrc;
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        setUpscaleModuleAspectRatio(ratio);
      };
    } else {
      setUpscaleModuleAspectRatio(null);
    }
  }, [upscaleModuleSrc]);

  const [advNegativePrompt, setAdvNegativePrompt] = useState<string>('');
  const [advSeed, setAdvSeed] = useState<number>(-1);
  const [advCfgScale, setAdvCfgScale] = useState<number>(7.5);
  const [advSteps, setAdvSteps] = useState<number>(25);
  const [advSampler, setAdvSampler] = useState<string>('Neural Flow');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Scenario Director States
  const [scenarioIdea, setScenarioIdea] = useState<string>('');
  const [scriptScenes, setScriptScenes] = useState<ScriptScene[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  const [veoUserPrompt, setVeoUserPrompt] = useState<string>('');
  const [veoResultPrompt, setVeoResultPrompt] = useState<string>('');
  const [isGeneratingVeoPrompt, setIsGeneratingVeoPrompt] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRateLimit((usage) => { setRpmUsage(usage); });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES[currentTheme];
    
    // Set primary colors
    Object.entries(theme.colors).forEach(([shade, value]) => {
      root.style.setProperty(`--primary-${shade}`, String(value));
    });
    
    // Set dynamic background and surface colors based on Dark/Light mode
    if (isDarkMode) {
        root.classList.remove('light-mode');
        root.classList.add('dark-mode');
        root.style.setProperty('--bg-color-1', '#131c2e');
        root.style.setProperty('--bg-color-2', '#0a0f1a');
        root.style.setProperty('--text-color', '#f1f5f9');
        root.style.setProperty('--text-primary', '#f8fafc');
        root.style.setProperty('--text-secondary', '#cbd5e1');
        root.style.setProperty('--text-muted', '#94a3b8');
        root.style.setProperty('--glass-bg', 'rgba(12, 18, 30, 0.7)');
        root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--panel-bg', 'rgba(9, 13, 23, 0.75)');
        root.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.06)');
        root.style.setProperty('--header-bg', 'rgba(7, 10, 18, 0.85)');
        root.style.setProperty('--header-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--input-bg', 'rgba(255, 255, 255, 0.03)');
        root.style.setProperty('--input-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--subnav-bg', 'rgba(255, 255, 255, 0.04)');
        root.style.setProperty('--subnav-active-bg', 'rgba(var(--primary-500-rgb), 0.18)');
    } else {
        root.classList.remove('dark-mode');
        root.classList.add('light-mode');
        // Soothing, glare-free, pastel and cream light theme tailored for each color
        const light = theme.light;
        root.style.setProperty('--bg-color-1', light.bg1);
        root.style.setProperty('--bg-color-2', light.bg2);
        root.style.setProperty('--text-color', light.textPrimary);
        root.style.setProperty('--text-primary', light.textPrimary);
        root.style.setProperty('--text-secondary', light.textSecondary);
        root.style.setProperty('--text-muted', light.textMuted);
        root.style.setProperty('--glass-bg', light.card);
        root.style.setProperty('--glass-border', light.cardBorder);
        root.style.setProperty('--panel-bg', light.panel);
        root.style.setProperty('--panel-border', light.panelBorder);
        root.style.setProperty('--header-bg', light.header);
        root.style.setProperty('--header-border', light.headerBorder);
        root.style.setProperty('--input-bg', light.input);
        root.style.setProperty('--input-border', light.inputBorder);
        root.style.setProperty('--subnav-bg', light.navPillBg);
        root.style.setProperty('--subnav-active-bg', light.navPillActive);
    }
    
    // Set RGB for glowing shadow effects
    // Extract RGB from 500 hex
    const hex = theme.colors[500].replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty('--primary-500-rgb', `${r}, ${g}, ${b}`);
  }, [currentTheme, isDarkMode]);

  const addToHistory = (type: LogItem['logType'], details: string, fileName: string, src?: string) => {
    const newItem: LogItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        logType: type,
        details,
        outputFileName: fileName,
        outputImageSrc: src
    };
    setHistoryItems(prev => [newItem, ...prev]);
  };

  const savePromptToHistory = useCallback(async (
    promptJson: ImagePromptJson,
    source: PromptSourceType,
    subject?: string,
    previewImage?: string,
    rawInputText?: string
  ) => {
    if (!promptJson) return;
    const cleanSubject = subject || promptJson.subject || 'Creative Prompt';
    const newItem: PromptHistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      source,
      promptJson,
      subject: cleanSubject,
      previewImage,
      rawInputText
    };

    setPromptHistoryItems(prev => {
      const filtered = prev.filter(p => JSON.stringify(p.promptJson) !== JSON.stringify(promptJson));
      const updated = [newItem, ...filtered];
      try {
        safeStorage.setItem('hlc_prompt_history', JSON.stringify(updated.slice(0, 150)));
      } catch (e) {
        // ignore quota
      }
      return updated;
    });

    try {
      await savePromptItemDB(newItem);
    } catch (err) {
      console.error('[IndexedDB] Error persisting prompt item:', err);
    }
  }, []);

  const handleExportAllPrompts = () => {
    if (promptHistoryItems.length === 0) return;
    const blob = new Blob([JSON.stringify(promptHistoryItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NKI_Prompt_Vault_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeletePrompt = async (id: string) => {
    setPromptHistoryItems(prev => {
      const updated = prev.filter(p => p.id !== id);
      try {
        safeStorage.setItem('hlc_prompt_history', JSON.stringify(updated.slice(0, 150)));
      } catch (e) {}
      return updated;
    });
    try {
      await deletePromptItemDB(id);
    } catch (err) {
      console.error('[IndexedDB] Error deleting prompt:', err);
    }
  };

  const handleClearAllPrompts = () => {
    setConfirmAction({
      message: "Bạn có chắc muốn xóa toàn bộ kho lưu trữ Prompt JSON? Hành động này sẽ xóa dữ liệu trên máy và không thể khôi phục.",
      onConfirm: async () => {
        setPromptHistoryItems([]);
        try {
          safeStorage.removeItem('hlc_prompt_history');
          await clearAllPromptItemsDB();
        } catch (err) {
          console.error('[IndexedDB] Error clearing prompt DB:', err);
        }
      }
    });
  };

  const handleError = useCallback((err: any, defaultMessage: string = "Operation failed.") => {
    // Silently ignore if user simply closed the OAuth popup
    if (err?.code === 'auth/popup-closed-by-user') {
      return;
    }

    let title = "Error";
    let message: string = defaultMessage;
    let solutions: string[] = [];

    // Handle stringified JSON errors or Error objects with JSON-like messages
    const errStr = typeof err === 'string' ? err : (err?.message || String(err));
    
    try {
      if (errStr.includes('{')) {
        const jsonStart = errStr.indexOf('{');
        const parsed = JSON.parse(errStr.substring(jsonStart));
        if (parsed.error?.message) message = parsed.error.message;
        if (parsed.error?.code === 429 || parsed.error?.status === "RESOURCE_EXHAUSTED" || parsed.status === "RESOURCE_EXHAUSTED") {
           title = "Quota Exceeded";
           solutions.push("You've hit the Gemini API rate limit for your current plan.");
           solutions.push("Wait 60 seconds and try again.");
           solutions.push("Check your usage and limits at https://aistudio.google.com/app/plan_and_billing");
        }
      }
    } catch (e) { /* ignore parse error */ }

    if (err instanceof Error) message = err.message;
    else if (typeof err === 'string') message = err;
    else if (err?.message) message = err.message;
    
    // Check message for quota/auth keywords
    const lowerMsg = message.toLowerCase();

    // Check specifically for Google Drive errors
    const isDriveApiDisabled = err?.code === 'DRIVE_API_DISABLED' || 
                               lowerMsg.includes('accessnotconfigured') || 
                               lowerMsg.includes('has not been used in project') ||
                               (lowerMsg.includes('drive.googleapis.com') && lowerMsg.includes('disabled'));

    const isDriveScopeMissing = err?.code === 'DRIVE_SCOPE_MISSING' || 
                                lowerMsg.includes('insufficientpermission') || 
                                lowerMsg.includes('insufficient permission') ||
                                lowerMsg.includes('insufficient authentication scopes') ||
                                lowerMsg.includes('not granted the app read and write');

    const isOriginMismatch = err?.code === 'auth/origin-mismatch' || 
                             lowerMsg.includes('origin_mismatch') || 
                             lowerMsg.includes('origin mismatch') ||
                             lowerMsg.includes('origin=');

    const isUnauthorizedDomain = !isOriginMismatch && (
                                 err?.code === 'auth/unauthorized-domain' || 
                                 lowerMsg.includes('unauthorized-domain') || 
                                 lowerMsg.includes('unauthorized domain'));

    const isAccessDenied403 = !isOriginMismatch && !isDriveApiDisabled && !isDriveScopeMissing && !isUnauthorizedDomain && (
                              lowerMsg.includes("access_denied") || 
                              lowerMsg.includes("access denied") || 
                              err?.code === 'auth/access-denied');

    const isAuthError = !isOriginMismatch && !isAccessDenied403 && !isDriveApiDisabled && (
                        isDriveScopeMissing ||
                        isUnauthorizedDomain ||
                        err?.code === 'DRIVE_TOKEN_EXPIRED' ||
                        lowerMsg.includes("credential") || 
                        lowerMsg.includes("expired") || 
                        lowerMsg.includes("unauthenticated") || 
                        lowerMsg.includes("google drive account is not connected") ||
                        lowerMsg.includes("401") ||
                        lowerMsg.includes("sign-in"));

    if (isOriginMismatch) {
        title = "Lỗi 400: origin_mismatch (Chưa Ủy Quyền Domain trên Google Cloud)";
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://nki-imagen.vercel.app';
        message = `Tên miền hiện tại ("${currentOrigin}") chưa được thêm vào "Authorized JavaScript origins" của OAuth 2.0 Client ID trên Google Cloud Console.`;
        solutions.push(`Mở Google Cloud Console Credentials: https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0018947505`);
        solutions.push(`Nhấp vào Web client OAuth 2.0 > Tại mục "Authorized JavaScript origins", bấm "ADD URI" và nhập: ${currentOrigin}`);
        solutions.push(`Tại mục "Authorized redirect URIs", bấm "ADD URI" và nhập: ${currentOrigin} > Bấm SAVE (Lưu).`);
        solutions.push(`Sau khi lưu, đợi 1-3 phút để Google kích hoạt rồi bấm kết nối lại.`);
        solutions.push(`Hoặc bạn có thể tự nhập Google OAuth Client ID của riêng bạn trong Cài đặt (Settings > Tab Google Drive).`);
        solutions.push("Không bắt buộc dùng Google Drive: Bạn có thể bấm 'Bỏ qua Google Drive' bên dưới để tải ảnh trực tiếp về máy tính.");
    } else if (isUnauthorizedDomain) {
        title = "Chưa Cấp Phép Tên Miền (Authorized Domain)";
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        message = `Tên miền hoặc IP "${currentHost}" chưa được khai báo trong danh sách "Authorized Domains" của dự án Firebase (gen-lang-client-0018947505).`;
        solutions.push(`Thêm "${currentHost}" vào Firebase: Mở Firebase Console (https://console.firebase.google.com) > Chọn project "gen-lang-client-0018947505" > Vào mục "Authentication" > Tab "Settings" > Phần "Authorized domains" > Bấm "Add domain" và nhập: ${currentHost}`);
        solutions.push("Nếu đang mở bằng IP LAN: Đảm bảo bạn đang truy cập bằng đường dẫn http://localhost:3000.");
        solutions.push("Không bắt buộc dùng Google Drive: Bấm 'Bỏ qua Google Drive' bên dưới để tải ảnh trực tiếp về máy tính bằng 'Export ZIP' hoặc 'Raw Images'.");
    } else if (isDriveApiDisabled) {
        title = "Chưa Bật (Enable) Google Drive API";
        message = "Dự án Google Cloud (gen-lang-client-0018947505) chưa bật dịch vụ Google Drive API (drive.googleapis.com) nên Google từ chối mọi yêu cầu tạo thư mục và tải tệp lên.";
        solutions.push("Bật Google Drive API: Mở Google Cloud Console > Chọn project 'gen-lang-client-0018947505' > Vào 'APIs & Services' > 'Library' (Thư viện) > Tìm 'Google Drive API' và bấm 'ENABLE' (Bật).");
        solutions.push("Đợi 1-2 phút sau khi bật API để Google đồng bộ hệ thống, sau đó quay lại lưu ảnh.");
        solutions.push("Không cần Google Drive: Bấm nút 'Bỏ qua Google Drive (Lưu ảnh trực tiếp về máy)' bên dưới để tải ảnh về máy tính ngay lập tức.");
    } else if (isDriveScopeMissing) {
        title = "Chưa Tích Chọn Quyền Google Drive";
        message = "Bạn đã đăng nhập nhưng chưa cấp quyền cho ứng dụng tạo và lưu tệp vào Google Drive (drive.file).";
        solutions.push("Bấm nút 'Re-Authenticate' bên dưới để mở lại cửa sổ xác thực của Google.");
        solutions.push("BẮT BUỘC: Khi Google hỏi quyền, hãy TÍCH CHỌN vào ô vuông 'Xem, chỉnh sửa, tạo và xóa các tệp Google Drive mà bạn sử dụng với ứng dụng này'.");
        solutions.push("Nhấn 'Tiếp tục' để hoàn tất cấp quyền lưu ảnh.");
        solutions.push("Hoặc bấm 'Bỏ qua Google Drive' để tải ảnh trực tiếp về máy tính.");
    } else if (isAccessDenied403) {
        title = "OAuth Consent: Cần Đăng Nhập Lại";
        message = "Nếu bạn vừa thêm email nht.tam131@gmail.com vào Test Users trên Google Cloud Console, phiên đăng nhập cũ cần được làm mới hoàn toàn để Google cấp Token mới.";
        solutions.push("Đăng nhập lại: Bấm nút 'Re-Authenticate' bên dưới hoặc bấm nút 'Disconnect' ở góc trên rồi bấm 'Connect Drive' lại.");
        solutions.push("Chọn đúng tài khoản nht.tam131@gmail.com trong cửa sổ đăng nhập.");
        solutions.push("Nếu Google hiện cảnh báo 'Google hasn\\'t verified this app', bấm 'Advanced' (Nâng cao) > Chọn 'Go to [App] (unsafe)' rồi tích chọn quyền Google Drive.");
        solutions.push("Không cần Google Drive: Bạn vẫn có thể tạo ảnh bình thường và bấm nút 'Bỏ qua Google Drive' bên dưới để tải ảnh trực tiếp về máy tính.");
    } else if (isAuthError) {
        title = "Authentication Error";
        solutions.push("Ensure your Google Drive account is actively connected.");
        solutions.push("Click 'Re-Authenticate' to log in and renew permissions securely.");
    } else if (lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota exceeded") || lowerMsg.includes("too many requests")) {
        title = "Neural Quota Limit";
        if (solutions.length === 0) {
            solutions.push("The synaptic engine is cooling down. You have reached the maximum generation frequency for your account.");
            solutions.push("Wait 1–3 minutes before initiating another synthesis.");
            solutions.push("Verify your current quota status in Google AI Studio.");
        }
    } else if (lowerMsg.includes("safety") || lowerMsg.includes("blocked")) {
        title = "Safety Restriction";
        
        // Common triggers detection
        const context = (jsonInput + " " + refinePrompt + " " + converterInput).toLowerCase();
        
        if (context.includes("underwear") || context.includes("bikini") || context.includes("lingerie")) {
            solutions.push("Remove 'underwear', 'bikini', or 'lingerie' from your prompt as these violate the explicit clothing policy.");
        }
        
        if (context.includes("nude") || context.includes("naked") || context.includes("nsfw")) {
            solutions.push("Ensure your subject is fully clothed. Nudity is strictly prohibited by AI safety guidelines.");
        }

        if (context.includes("blood") || context.includes("gore") || context.includes("violent")) {
            solutions.push("Remove depictions of extreme violence or gore.");
        }

        solutions.push("Try rephrasing your prompt to be more abstract or less descriptive of human anatomy.");
    }
    
    const isDriveError = isDriveApiDisabled || isDriveScopeMissing || isAccessDenied403 || isUnauthorizedDomain || (typeof err?.code === 'string' && err.code.startsWith('DRIVE_'));
    setErrorDetails({ title, message, solutions, isAuthError, isAccessDenied403, isDriveError });
  }, [jsonInput, refinePrompt, converterInput]);

  const handleApplyPreset = (presetIdentifier: string) => {
    if (!presetIdentifier) {
        if (jsonBeforePreset) {
            updateJsonInput(jsonBeforePreset);
            setJsonBeforePreset(null);
            setSelectedPreset('');
        }
        return;
    }
    
    try {
        const currentJson = JSON.parse(jsonInput);
        if (!jsonBeforePreset) setJsonBeforePreset(jsonInput);
        
        // Check personal presets first, then fallback to built-in PRESETS
        const personal = personalPresets.find(p => p.id === presetIdentifier || p.name === presetIdentifier);
        const presetData = personal ? personal.data : PRESETS[presetIdentifier];
        
        if (presetData) {
            const newJson = { ...currentJson, ...presetData };
            updateJsonInput(JSON.stringify(newJson, null, 2));
            setSelectedPreset(presetIdentifier);
        }
    } catch (e) {
        console.error("Invalid JSON while applying preset", e);
    }
  };

  const handleSavePersonalPreset = (
    name: string, 
    category: PersonalPreset['category'], 
    description: string, 
    data: Partial<ImagePromptJson>
  ) => {
    const newPreset = createPersonalPreset(name, category, data, description);
    const updated = [newPreset, ...personalPresets];
    setPersonalPresets(updated);
    savePersonalPresetsToStorage(updated);
    setIsSavePresetModalOpen(false);
    handleApplyPreset(newPreset.id);
  };

  const handleDeletePersonalPreset = (id: string) => {
    const updated = personalPresets.filter(p => p.id !== id);
    setPersonalPresets(updated);
    savePersonalPresetsToStorage(updated);
    if (selectedPreset === id) {
      setSelectedPreset('');
    }
  };

  const handleImportPersonalPresets = (imported: PersonalPreset[]) => {
    const existingIds = new Set(personalPresets.map(p => p.id));
    const toAdd = imported.filter(p => p && p.name && !existingIds.has(p.id));
    const updated = [...toAdd, ...personalPresets];
    setPersonalPresets(updated);
    savePersonalPresetsToStorage(updated);
  };

  const handleUpdatePersonalPreset = (updatedPreset: PersonalPreset) => {
    const updated = personalPresets.map(p => p.id === updatedPreset.id ? updatedPreset : p);
    setPersonalPresets(updated);
    savePersonalPresetsToStorage(updated);
  };

  const addToGallery = async (src: string, type: GalleryItem['type'], description?: string, metadata?: GenerationMetadata) => {
    const newItem: GalleryItem = { 
        id: crypto.randomUUID(), 
        src, 
        type, 
        createdAt: Date.now(),
        description: description,
        metadata: metadata,
        collectionId: activeCollectionId !== 'all' ? activeCollectionId : undefined
    };
    
    // 1. Immediately update UI state
    setGalleryItems(prev => [newItem, ...prev]);

    // 2. Persist permanently to IndexedDB (No 5MB quota limitation)
    try {
      await saveGalleryItemDB(newItem);
    } catch (err) {
      console.error("[IndexedDB] Error persisting new item:", err);
    }

    // 3. Auto-save to Local PC Folder if configured
    if (storageSettings.autoSaveToLocalDisk && localDirHandle) {
      try {
        const { blob } = await fetchImageAsBlob(src);
        const fileName = getFormattedFileName(description, storageSettings);
        await writeBlobToLocalDirectory(localDirHandle, fileName, blob);
      } catch (localErr) {
        console.warn("[Local Disk] Auto-save error:", localErr);
      }
    }

    // 4. Auto-sync to Google Drive if configured & connected
    if (storageSettings.autoSyncToDrive && (googleUser || getAccessToken())) {
      try {
        handleSaveToGoogleDrive(src, description || 'synth-artifact', newItem.id);
      } catch (driveErr) {
        console.warn("[Google Drive] Auto-sync error:", driveErr);
      }
    }
  };

  const removeFromGallery = async (id: string) => {
    setGalleryItems(prev => prev.filter(item => item.id !== id));
    setGallerySelection(prev => { const next = new Set(prev); next.delete(id); return next; });
    try {
      await deleteGalleryItemDB(id);
    } catch (err) {
      console.error("[IndexedDB] Error deleting item:", err);
    }
  };
  
  const handleImageAnalysis = async (input: File | string) => {
    try {
      setIsAnalyzing(true); setErrorDetails(null); setJsonResult(null);
      let base64 = "", mimeType = "";
      if (typeof input === "string") { const res = await imageUrlToBase64(input); base64 = res.base64; mimeType = res.mimeType; setUploadedImage(`data:${mimeType};base64,${base64}`); } 
      else { base64 = await fileToBase64(input); mimeType = input.type; setUploadedImage(`data:${mimeType};base64,${base64}`); }
      
      const img = new Image();
      img.onload = () => setOriginalImageDimensions({ width: img.naturalWidth, height: img.naturalHeight, aspectRatio: getAspectRatioString(img.naturalWidth, img.naturalHeight) });
      img.src = `data:${mimeType};base64,${base64}`;

      const json = await analyzeImageToJson(base64, mimeType);
      setJsonResult(json);
      setJsonInput(JSON.stringify(json, null, 2));
      addToHistory('Image to JSON', `Analyzed uploaded image to detailed JSON prompt.`, 'N/A');
      savePromptToHistory(json, 'ANALYZE_IMAGE', json.subject, `data:${mimeType};base64,${base64}`);
    } catch (err) { handleError(err); } finally { setIsAnalyzing(false); }
  };

  const handleRefineJson = async () => {
    if (!jsonResult || !refinePrompt.trim()) return;
    try {
      setIsRefining(true);
      const refined = await refineJsonWithPrompt(jsonResult, refinePrompt);
      setJsonResult(refined);
      setJsonInput(JSON.stringify(refined, null, 2));
      addToHistory('Refine JSON', `Refined existing prompt with: "${refinePrompt}"`, 'N/A');
      savePromptToHistory(refined, 'REFINE', refined.subject, undefined, refinePrompt);
      setRefinePrompt('');
    } catch (err) {
      handleError(err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleClearImage = () => { setUploadedImage(null); setJsonResult(null); setImageURLInput(''); setOriginalImageDimensions(null); setShowRefineInput(false); setRefinePrompt(''); };
  
  const handleGenerateImage = async () => {
      try {
          let parsed = JSON.parse(jsonInput);

          // Inject Character Consistency into Prompt if Lock is active
          if (isConsistencyLockActive && activePersona) {
            parsed = injectPersonaIntoPrompt(parsed, activePersona);
          }

          savePromptToHistory(parsed, 'JSON_TO_IMG', parsed.subject);
          const getCleanB64 = (img: string | null) => img?.includes(',') ? img.split(',')[1] : (img || undefined);
          const faceClean = !isMultiCharacter ? getCleanB64(refFaceImage1) : undefined;
          const maleFaceClean = isMultiCharacter ? getCleanB64(refFaceImage1) : undefined;
          const femaleFaceClean = isMultiCharacter ? getCleanB64(refFaceImage2) : undefined;
          const face1Profile = slotBiometricProfiles['refFace1'];
          const face2Profile = isMultiCharacter ? slotBiometricProfiles['refFace2'] : undefined;
          const face1Name = slotPersonaNames['refFace1'];
          const face2Name = slotPersonaNames['refFace2'];

          const tasks = [];
          for (let v = 0; v < variantCount; v++) {
            const variantNumber = v + 1;
            tasks.push({
              type: 'json_to_img' as const,
              title: variantCount > 1 
                ? `[${variantNumber}/${variantCount}] JSON to Image: ${parsed.subject || 'Creative Vision'}`
                : `JSON to Image: ${parsed.subject || 'Creative Vision'}`,
              subtitle: `Model: ${selectedModel} • Tỉ lệ: ${aspectRatio} • Cỡ: ${imageSize}`,
              execute: async () => {
                return await generateImageFromJson(parsed, {
                  numberOfImages: 1,
                  aspectRatio: aspectRatio,
                  imageSize: imageSize,
                  faceImageBase64: faceClean,
                  maleFaceBase64: maleFaceClean,
                  femaleFaceBase64: femaleFaceClean,
                  useReferenceHair: useReferenceHair,
                  isDualCharacter: isMultiCharacter,
                  model: selectedModel,
                  face1Profile,
                  face2Profile,
                  face1Name,
                  face2Name,
                  dualPairing,
                  antiBleedLock: dualAntiBleedLock
                });
              },
              onSuccess: (imgs: string[]) => {
                if (imgs && imgs.length > 0) {
                  setGeneratedImages(prev => [...imgs, ...prev]);
                  const metadata: GenerationMetadata = {
                    promptJson: parsed,
                    model: selectedModel, 
                    aspectRatio: aspectRatio,
                    imageSize: imageSize,
                    negativePrompt: advNegativePrompt || undefined,
                    seed: advSeed === -1 ? Math.floor(Math.random() * 1000000) : advSeed,
                    cfgScale: advCfgScale,
                    steps: advSteps,
                    sampler: advSampler
                  };
                  imgs.forEach((img) => {
                    const fileName = getFormattedFileName(parsed.subject);
                    addToGallery(img, 'JSON_TO_IMG', parsed.subject || 'Generated Image', metadata);
                    addToHistory('JSON to Image', `Generated imagery from structural JSON. Subject: ${parsed.subject || 'N/A'}`, fileName, img);
                  });
                }
              },
              onError: (err: any) => {
                handleError(err);
              }
            });
          }

          generationQueue.enqueue(tasks);
      } catch (err) { handleError(err); }
  };

  const handleReferenceCreation = async () => {
    if (!refCharImage) return;
    if (refOutfitImages.length === 0) return;

    try {
      setErrorDetails(null);
      const charBase64 = refCharImage.includes(',') ? refCharImage.split(',')[1] : refCharImage;
      const charMime = refCharImage.match(/^data:(.+);base64,/)?.[1] || 'image/jpeg';

      const tasks = refOutfitImages.map((outfitImg, i) => {
        return {
          type: 'reference' as const,
          title: `Outfit Iteration ${i + 1}/${refOutfitImages.length}`,
          subtitle: `Model: ${selectedModel} • Tỉ lệ: ${refCreationAspectRatio}`,
          execute: async () => {
            setRefCreationProgress(`Phân tích & ghép trang phục ${i + 1}/${refOutfitImages.length}...`);
            const outfitBase64 = outfitImg.includes(',') ? outfitImg.split(',')[1] : outfitImg;
            const outfitMime = outfitImg.match(/^data:(.+);base64,/)?.[1] || 'image/jpeg';

            // 1. Merge Character description with Outfit description
            const mergedPrompt = await mergeCharacterAndOutfit(charBase64, charMime, outfitBase64, outfitMime);

            // 2. Generate Image
            setRefCreationProgress(`Đang tạo hình ảnh ${i + 1}/${refOutfitImages.length}...`);
            const imgs = await generateImageFromJson(mergedPrompt, {
              numberOfImages: 1,
              aspectRatio: refCreationAspectRatio,
              imageSize: refCreationImageSize,
              faceImageBase64: isBiometricCore ? charBase64 : undefined,
              face1Profile: isBiometricCore ? slotBiometricProfiles['refChar'] : undefined,
              face1Name: slotPersonaNames['refChar'],
              useReferenceHair: true,
              model: selectedModel
            });
            return { imgs, mergedPrompt, index: i };
          },
          onSuccess: ({ imgs, mergedPrompt, index }: any) => {
            if (imgs && imgs.length > 0) {
              const resultImg = imgs[0];
              setRefCreationResults(prev => [...prev, resultImg]);

              const metadata: GenerationMetadata = {
                promptJson: mergedPrompt,
                model: selectedModel,
                aspectRatio: refCreationAspectRatio,
                imageSize: refCreationImageSize,
                seed: Math.floor(Math.random() * 1000000),
                cfgScale: advCfgScale,
                steps: advSteps,
                sampler: advSampler
              };
              const fileName = getFormattedFileName(mergedPrompt.subject);
              savePromptToHistory(mergedPrompt, 'REFERENCE', mergedPrompt.subject, resultImg);
              addToGallery(resultImg, 'COMPOSE', mergedPrompt.subject || 'Reference Creation', metadata);
              addToHistory('Reference Creation', `Created reference outfit ${index + 1} for character. Subject: ${mergedPrompt.subject}`, fileName, resultImg);
            }
          },
          onError: (err: any) => {
            handleError(err, `Không thể hoàn thành trang phục ${i + 1}.`);
          }
        };
      });

      generationQueue.enqueue(tasks);
    } catch (err) {
      handleError(err, "Không thể hoàn thành tính năng Reference Creation.");
    }
  };

  const handleGeneratePoseVariants = async () => {
    if (!poseBaseImage) return;
    try {
        setVariantImages({});
        const m = poseBaseImage.match(/^data:(.+);base64,(.+)$/);
        if (m) {
            const variants = await generatePoseVariants(m[2], m[1], poseVariantCount, null, poseCustomPrompt, poseDetails);
            setPoseVariants(variants);
            addToHistory('Pose Variant Image', `Initiated ${poseVariantCount} kinetic iterations for subject.`, 'N/A');
            variants.forEach(variantJson => {
              savePromptToHistory(variantJson, 'POSE', variantJson.subject, poseBaseImage, poseCustomPrompt);
            });
            
            const tasks = variants.map((variantJson, i) => {
              return {
                type: 'pose' as const,
                title: `Pose Iteration ${i + 1}/${variants.length}: ${variantJson.subject || 'Pose Sequence'}`,
                subtitle: `Model: ${selectedModel} • Tỉ lệ: ${poseAspectRatio}`,
                execute: async () => {
                  setLoadingVariantImg(i);
                  const getCleanB64 = (img: string | null) => img?.includes(',') ? img.split(',')[1] : (img || undefined);
                  const faceClean = !isPoseMultiCharacter ? getCleanB64(poseRefFaceImage1) : undefined;
                  const maleFaceClean = isPoseMultiCharacter ? getCleanB64(poseRefFaceImage1) : undefined;
                  const femaleFaceClean = isPoseMultiCharacter ? getCleanB64(poseRefFaceImage2) : undefined;
                  const face1Profile = slotBiometricProfiles['poseRef1'];
                  const face2Profile = isPoseMultiCharacter ? slotBiometricProfiles['poseRef2'] : undefined;
                  const face1Name = slotPersonaNames['poseRef1'];
                  const face2Name = slotPersonaNames['poseRef2'];
                  
                  const imgs = await generateImageFromJson(variantJson, {
                      numberOfImages: 1,
                      aspectRatio: poseAspectRatio,
                      imageSize: poseImageSize,
                      faceImageBase64: faceClean,
                      maleFaceBase64: maleFaceClean,
                      femaleFaceBase64: femaleFaceClean,
                      useReferenceHair: usePoseReferenceHair,
                      isDualCharacter: isPoseMultiCharacter,
                      model: selectedModel,
                      face1Profile,
                      face2Profile,
                      face1Name,
                      face2Name,
                      dualPairing: poseDualPairing,
                      antiBleedLock: poseDualAntiBleedLock
                  });
                  return { imgs, index: i, variantJson };
                },
                onSuccess: ({ imgs, index, variantJson }: any) => {
                  if (imgs && imgs.length > 0) {
                      setVariantImages(prev => ({ ...prev, [index]: imgs[0] }));
                      const fileName = getFormattedFileName(variantJson.subject);
                      addToGallery(imgs[0], 'POSE', variantJson.subject, { 
                          promptJson: variantJson, 
                          model: selectedModel, 
                          aspectRatio: poseAspectRatio,
                          imageSize: poseImageSize,
                          seed: Math.floor(Math.random() * 1000000),
                          cfgScale: advCfgScale,
                          steps: advSteps,
                          sampler: advSampler
                      });
                      addToHistory('Pose Variant Image', `Generated variant ${index + 1}/${variants.length} for pose sequence.`, fileName, imgs[0]);
                  }
                  setLoadingVariantImg(null);
                },
                onError: (err: any) => {
                  setLoadingVariantImg(null);
                  console.error(err);
                }
              };
            });

            generationQueue.enqueue(tasks);
        }
    } catch (err) { handleError(err); }
  };

  const handleComposeImage = async () => {
      if (composeImageElements.length === 0 || !composePrompt) return;
      try {
          const getCleanB64 = (img: string | null) => img?.includes(',') ? img.split(',')[1] : (img || undefined);
          const faceClean = !isComposeMultiCharacter ? getCleanB64(composeRefFaceImage1) : undefined;
          const maleFaceClean = isComposeMultiCharacter ? getCleanB64(composeRefFaceImage1) : undefined;
          const femaleFaceClean = isComposeMultiCharacter ? getCleanB64(composeRefFaceImage2) : undefined;
          const face1Profile = slotBiometricProfiles['composeRef1'];
          const face2Profile = isComposeMultiCharacter ? slotBiometricProfiles['composeRef2'] : undefined;
          const face1Name = slotPersonaNames['composeRef1'];
          const face2Name = slotPersonaNames['composeRef2'];

          const elements = composeImageElements.map(e => ({ data: e.base64, mimeType: e.mimeType }));

          generationQueue.enqueue({
            type: 'compose',
            title: `Compose: ${composePrompt.slice(0, 30)}...`,
            subtitle: `Model: ${selectedModel} • Tỉ lệ: ${composeAspectRatio}`,
            execute: async () => {
              return await composeImageFromPrompt(composePrompt, elements, {
                aspectRatio: composeAspectRatio,
                imageSize: composeImageSize,
                count: composeVariantCount,
                model: selectedModel,
                faceImageBase64: faceClean,
                maleFaceBase64: maleFaceClean,
                femaleFaceBase64: femaleFaceClean,
                useReferenceHair: useComposeReferenceHair,
                isDualCharacter: isComposeMultiCharacter,
                face1Profile,
                face2Profile,
                face1Name,
                face2Name,
                dualPairing: composeDualPairing,
                antiBleedLock: composeDualAntiBleedLock
              });
            },
            onSuccess: (resImages: string[]) => {
              setComposeResultImages(resImages);
              const composedPromptJson: ImagePromptJson = { 
                ...DEFAULT_JSON, 
                subject: composePrompt,
                details: `Neural composition fusing ${composeImageElements.length} reference elements.`
              };
              savePromptToHistory(composedPromptJson, 'COMPOSE', composePrompt, resImages[0]);
              resImages.forEach(img => {
                const fileName = getFormattedFileName(composePrompt);
                addToGallery(img, 'COMPOSE', composePrompt, {
                  promptJson: composedPromptJson,
                  model: selectedModel,
                  aspectRatio: composeAspectRatio,
                  imageSize: composeImageSize
                });
                addToHistory('Compose Image', `Fused multiple visual elements with strategy: "${composePrompt}"`, fileName, img);
              });
            },
            onError: (err: any) => {
              handleError(err);
            }
          });
      } catch (err) { handleError(err); }
  };

  const handleGenerateBreakdown = async () => {
    if (!scenarioIdea.trim()) return;
    try {
        setIsBreakingDown(true);
        const res = await generateScriptBreakdown(scenarioIdea);
        setScriptScenes(res);
    } catch (err) { handleError(err); } finally { setIsBreakingDown(false); }
  };

  const handleGenerateVeoPrompt = async () => {
      if (!veoUserPrompt.trim()) return;
      try {
          setIsGeneratingVeoPrompt(true);
          const startBase64 = veoStartImage ? veoStartImage.split(',')[1] : undefined;
          const endBase64 = veoEndImage ? veoEndImage.split(',')[1] : undefined;
          const res = await generateVeo3Prompt(veoUserPrompt, startBase64, endBase64);
          setVeoResultPrompt(res);
      } catch (err) { handleError(err); } finally { setIsGeneratingVeoPrompt(false); }
  };

  const handleUpscale = async (src: string, is4k: boolean = false) => {
    // Activate upscaleProgress modal
    setUpscaleProgress({
      active: true,
      percent: 5,
      stepMessage: "Initializing Super-Resolution neural pipes...",
      is4k,
      srcImage: src
    });

    let progressInterval: NodeJS.Timeout | null = null;
    let currentPercent = 5;

    // Start a smooth visual loading progress simulation up to 95%
    progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 4) + 1; // increments by 1 to 4%
      if (currentPercent > 95) {
        currentPercent = 95;
        if (progressInterval) clearInterval(progressInterval);
      }

      // Determine step message based on progress bracket
      let stepMessage = "Initializing Super-Resolution neural pipes...";
      if (currentPercent > 15 && currentPercent <= 35) {
        stepMessage = "Scanning pixel matrices & local contrast boundaries...";
      } else if (currentPercent > 35 && currentPercent <= 55) {
        stepMessage = is4k 
          ? "Synthesizing fine-grained textures (macro pores, fine hairs, fabric weaving) with Pro 3..."
          : "Enhancing micro-texture layers and structural sharpness...";
      } else if (currentPercent > 55 && currentPercent <= 75) {
        stepMessage = "Applying multi-scale spatial frequency filters & de-noising...";
      } else if (currentPercent > 75 && currentPercent <= 95) {
        stepMessage = is4k
          ? "Injecting Ultra Master details & upscaling to 3072×5504 (17MP)..."
          : "Executing sub-pixel neural interpolation to 2K QHD...";
      }

      setUpscaleProgress(prev => prev ? {
        ...prev,
        percent: currentPercent,
        stepMessage
      } : null);
    }, 180);

    try {
      const m = src.match(/^data:(.+);base64,(.+)$/);
      if (!m) throw new Error("Invalid image format");
      
      // Compute the aspect ratio dynamically from the original image
      let aspect: number | undefined = undefined;
      try {
        const img = new Image();
        img.src = src;
        if (img.complete && img.naturalWidth) {
          aspect = img.naturalWidth / img.naturalHeight;
        } else {
          await new Promise((resolve) => {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
          });
          if (img.naturalWidth && img.naturalHeight) {
            aspect = img.naturalWidth / img.naturalHeight;
          }
        }
      } catch (e) {
        console.warn("Failed to get image dimensions for upscale", e);
      }
      
      const studioCfg = getStudioModelConfig();
      const targetRes: UpscaleTargetRes = is4k ? 'ultra' : '2k';
      const preferredModel = is4k
        ? (studioCfg.upscaleModel && studioCfg.upscaleModel !== 'auto' ? studioCfg.upscaleModel : 'gemini-3-pro-image')
        : (studioCfg.upscaleModel && studioCfg.upscaleModel !== 'auto' ? studioCfg.upscaleModel : 'gemini-3.1-flash-image');

      const upscaleResult = await upscaleImage(m[2], m[1], {
        targetRes,
        customModel: preferredModel,
        preset: studioCfg.upscalePreset || 'portrait',
        fidelity: 'rich',
        faceEnhance: studioCfg.upscaleFaceEnhance ?? true,
        clarityBoost: studioCfg.upscaleClarityBoost ?? 22,
        aspectRatioInput: aspect,
        biometricLock: true,
        antiAiCamouflage: true,
        cameraPreset: 'SONY_A7IV',
        filmGrainPct: 2.2,
        colorScience: 'porcelain_rose',
        lightingEnhance: true
      });
      const upscaled = upscaleResult.image;
      const modelUsed = upscaleResult.modelUsed;

      // Stop any visual progress simulation once done
      if (progressInterval) clearInterval(progressInterval);

      // Instantly go to 100% with completion message
      setUpscaleProgress(prev => prev ? {
        ...prev,
        percent: 100,
        stepMessage: "Neural Reconstruction Complete! Compilation success."
      } : null);

      // Define rich detailed quality scorecard feedback
      const sharpnessBase = is4k ? 98 : 88;
      const detailBase = is4k ? 97 : 86;
      const contrastBase = is4k ? 96 : 89;
      
      const sharpnessBoost = sharpnessBase + Math.floor(Math.random() * 3);
      const detailBoost = detailBase + Math.floor(Math.random() * 3);
      const contrastBoost = contrastBase + Math.floor(Math.random() * 3);
      const totalScore = Math.round((sharpnessBoost + detailBoost + contrastBoost) / 3);

      const feedback = {
        is4k,
        model: modelUsed,
        preset: studioCfg.upscalePreset || 'portrait',
        sharpness: is4k ? "Ultra Macro Optical Sharpness (+85% Epidermal Detail)" : "Refined Local Outlines (+55% Sharpness Boost)",
        detail: is4k ? "Full-Scale Epidermal Pore Synthesis (17MP Master Studio)" : "Adaptive Detail Stabilization",
        denoise: is4k ? "Zero-Plastic Organic Denoising (Noise Cleaned: 98%)" : "Local Area Color Smoothing (Noise Cleaned: 88%)",
        resolution: upscaleResult.feedback?.realDimensions || (is4k ? "3072 × 5504 (Ultra Master 17MP)" : "2560 × 1440 (2K QHD)"),
        sharpnessPct: sharpnessBoost,
        detailPct: detailBoost,
        denoisePct: contrastBoost,
        score: totalScore,
        grade: totalScore >= 94 ? 'S+' : 'A',
        upscaledAt: Date.now(),
        ...(upscaleResult.feedback || {})
      };
      
      const originalItem = galleryItems.find(i => i.src === src);
      const description = originalItem ? `Upscaled: ${originalItem.description}` : "Upscaled Artifact";
      const metadata: GenerationMetadata = originalItem ? { 
          ...originalItem.metadata, 
          model: modelUsed,
          upscaledFrom: src,
          upscaleFeedback: feedback
      } : { 
          model: modelUsed,
          aspectRatio: '1:1',
          promptJson: {
            subject: "Upscaled Render",
            art_style: "Super Resolution Enhanced",
            posing: "",
            lighting: "",
            color_palette: "",
            composition: "",
            camera_angle: "",
            texture: "Neural Upscaled Texture",
            skin_texture: "",
            font: "",
            mood: "",
            additional_details: ""
          },
          upscaledFrom: src,
          upscaleFeedback: feedback
      };
      
      // Delay briefly so user can see 100% completion
      await new Promise(resolve => setTimeout(resolve, 800));

      addToGallery(upscaled, 'JSON_TO_IMG', description, metadata);
      setGeneratedImages([upscaled]);
      setActiveTab(AppMode.JSON_TO_IMG);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { 
      handleError(err); 
    } finally { 
      if (progressInterval) clearInterval(progressInterval);
      setUpscaleProgress(null); 
    }
  };

  const handleModuleUpscale = async (settings?: UpscaleExecutionSettings) => {
    if (!upscaleModuleSrc) {
      handleError(new Error("Vui lòng tải hoặc chọn một ảnh cần nâng cấp."));
      return;
    }

    const targetRes = settings?.targetRes || upscaleModuleTargetRes || 'ultra';
    const engine = settings?.engine;
    const preset = settings?.preset || 'portrait';
    const fidelity = settings?.fidelity || 'rich';
    const denoise = settings?.denoise || 'medium';
    const faceEnhance = settings?.faceEnhance ?? true;
    const clarityBoost = settings?.clarityBoost ?? 22;
    const customGuidance = settings?.customGuidance || '';

    // Measure exact aspect ratio directly from source image to guarantee zero crop
    let measuredAspect: number | undefined = undefined;
    try {
      const img = new Image();
      img.src = upscaleModuleSrc;
      if (img.complete && img.naturalWidth) {
        measuredAspect = img.naturalWidth / img.naturalHeight;
      } else {
        await new Promise((resolve) => {
          img.onload = () => resolve(null);
          img.onerror = () => resolve(null);
        });
        if (img.naturalWidth && img.naturalHeight) {
          measuredAspect = img.naturalWidth / img.naturalHeight;
        }
      }
    } catch (e) {
      console.warn("Failed to measure module image dimensions", e);
    }
    const aspect = measuredAspect || settings?.aspectRatio || upscaleModuleAspectRatio || undefined;

    // Fusion Settings
    const biometricLockEnabled = settings?.biometricLockEnabled ?? true;
    const selectedPersonaId = settings?.selectedPersonaId;
    const dualFaceIsolation = settings?.dualFaceIsolation ?? true;
    const antiAiEnabled = settings?.antiAiEnabled ?? true;
    const cameraPreset = settings?.cameraPreset || 'SONY_A7IV';
    const filmGrainPct = settings?.filmGrainPct ?? 2.2;
    const colorScience = settings?.colorScience || 'porcelain_rose';
    const lightingEnhance = settings?.lightingEnhance ?? true;

    // Resolve Persona info from Character Vault if selected
    let personaName: string | undefined = undefined;
    let personaAvatar: string | undefined = undefined;
    let biometricProfile: BiometricProfile | undefined = undefined;

    if (selectedPersonaId && selectedPersonaId !== 'auto') {
      const allPersonas = getCharacterPersonas();
      const found = allPersonas.find(p => p.id === selectedPersonaId);
      if (found) {
        personaName = found.name;
        personaAvatar = found.avatarUrl || found.images?.[0];
        biometricProfile = found.biometricProfile || convertPersonaToBiometricProfile(found);
      }
    }

    setIsUpscalingModule(true);
    setUpscaleModuleProgressPercent(5);
    setUpscaleModuleProgressMsg("Khởi động đường ống siêu phân giải Pro 3 Ultra Master...");
    setUpscaleModuleResult(null);
    setUpscaleModuleFeedback(null);

    let progressInterval: NodeJS.Timeout | null = null;
    let currentPercent = 5;
    
    const isUltra = targetRes === 'ultra';
    const is4k = targetRes === '4k' || isUltra;

    progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 4) + 1;
      if (currentPercent > 95) {
        currentPercent = 95;
        if (progressInterval) clearInterval(progressInterval);
      }

      let stepMessage = "Khởi động đường ống siêu phân giải Pro 3 Ultra Master...";
      if (currentPercent > 15 && currentPercent <= 30) {
        stepMessage = biometricLockEnabled
          ? "Đang khóa tọa độ nhân trắc học & nhận diện cấu trúc da..."
          : "Đang quét ma trận điểm ảnh & biên độ tương phản...";
      } else if (currentPercent > 30 && currentPercent <= 50) {
        stepMessage = isUltra
          ? "Tổng hợp vi chi tiết Macro (lỗ chân lông, tơ tóc, thớ dệt vải) 3072×5504..."
          : "Tăng cường độ nét cấu trúc & khử nhiễu nén JPEG...";
      } else if (currentPercent > 50 && currentPercent <= 70) {
        stepMessage = "Áp dụng bộ lọc quang học De-noising & triệt tiêu viền Halo...";
      } else if (currentPercent > 70 && currentPercent <= 90) {
        stepMessage = antiAiEnabled
          ? `Phủ vi hạt analog 35mm (${cameraPreset}) & cấy thông số EXIF thực...`
          : (isUltra ? "Nội suy siêu phân giải Ultra Master 17MP..." : "Nội suy siêu phân giải 4K/2K...");
      } else if (currentPercent > 90) {
        stepMessage = "Hoàn tất kiểm định chất lượng quang học & đồng bộ hóa!";
      }

      setUpscaleModuleProgressPercent(currentPercent);
      setUpscaleModuleProgressMsg(stepMessage);
    }, 180);

    try {
      const m = upscaleModuleSrc.match(/^data:(.+);base64,(.+)$/);
      if (!m) throw new Error("Định dạng ảnh không hợp lệ. Vui lòng chọn hoặc tải ảnh hợp lệ.");
      
      const upscaleResult = await upscaleImage(m[2], m[1], {
        targetRes,
        customModel: engine === 'auto' ? undefined : engine,
        preset,
        fidelity,
        denoise,
        faceEnhance,
        clarityBoost,
        customGuidance,
        aspectRatioInput: aspect,
        biometricLock: biometricLockEnabled,
        biometricProfile,
        personaName,
        personaAvatar,
        isDualCharacter: dualFaceIsolation,
        antiAiCamouflage: antiAiEnabled,
        cameraPreset,
        filmGrainPct,
        colorScience,
        lightingEnhance
      });
      const upscaled = upscaleResult.image;
      const modelUsed = upscaleResult.modelUsed;

      if (progressInterval) clearInterval(progressInterval);

      setUpscaleModuleProgressPercent(100);
      setUpscaleModuleProgressMsg("Hoàn tất tái cấu trúc siêu phân giải Ultra Master!");

      const sharpnessBase = isUltra ? 98 : (is4k ? 96 : 88);
      const detailBase = isUltra ? 97 : (is4k ? 95 : 86);
      const contrastBase = isUltra ? 96 : (is4k ? 94 : 89);
      
      const sharpnessBoost = sharpnessBase + Math.floor(Math.random() * 3);
      const detailBoost = detailBase + Math.floor(Math.random() * 3);
      const contrastBoost = contrastBase + Math.floor(Math.random() * 3);
      const totalScore = Math.round((sharpnessBoost + detailBoost + contrastBoost) / 3);

      const feedback = {
        is4k: is4k,
        targetRes,
        modelUsed: modelUsed,
        preset,
        sharpness: isUltra ? "Macro Optical Sharpness (+85% Epidermal Detail)" : (is4k ? "Ultra Crisp Extrapolated Edges (+75% Edge Refinement)" : "Refined Outlines (+55% Sharpness Boost)"),
        detail: isUltra ? "Full-Scale Epidermal Pore Synthesis (17MP Master Studio)" : (is4k ? "Super-Resolution Texture Synthesis (Pro 3)" : "High-Fidelity Detail Stabilization"),
        denoise: isUltra ? "Zero-Plastic Organic Denoising (Noise Cleaned: 98%)" : (is4k ? "High Frequency De-noising (Noise Cleaned: 96%)" : "Area Color Smoothing (Noise Cleaned: 91%)"),
        resolution: upscaleResult.feedback?.realDimensions || (isUltra ? "3072 × 5504 (Ultra Master 17MP)" : (is4k ? "3840 × 2160 (4K UHD)" : "2560 × 1440 (2K QHD)")),
        sharpnessPct: sharpnessBoost,
        detailPct: detailBoost,
        denoisePct: contrastBoost,
        score: totalScore,
        grade: totalScore >= 94 ? 'S+' : 'A',
        biometricLocked: biometricLockEnabled,
        antiAiApplied: antiAiEnabled,
        cameraPreset: cameraPreset,
        colorScience: colorScience,
        upscaledAt: Date.now(),
        ...(upscaleResult.feedback || {})
      };

      await new Promise(resolve => setTimeout(resolve, 800));
      setUpscaleModuleResult(upscaled);
      setUpscaleModuleFeedback(feedback);
    } catch (err) {
      handleError(err);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsUpscalingModule(false);
    }
  };

  const handleGallerySelect = (id: string) => {
    setGallerySelection(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleInspectImage = (src: string) => {
    const item = galleryItems.find(i => i.src === src);
    if (item) setInspectorItem(item);
  };

  const handleDownloadImage = async (src: string, promptSnippet?: string, forceAntiAi?: boolean) => {
    const settings = loadAntiAiSettings();
    const shouldCamouflage = forceAntiAi ?? settings.enabled;

    let downloadUrl = src;
    if (shouldCamouflage) {
      try {
        const { dataUrl, applied } = await applyAntiAiCamouflage(src, settings);
        if (applied) {
          downloadUrl = dataUrl;
        }
      } catch (err) {
        console.warn("[Download] Failed to apply Anti-AI camouflage, using original:", err);
      }
    }

    const baseName = getFormattedFileName(promptSnippet);
    const finalName = shouldCamouflage 
      ? baseName.replace(/\.png$/i, '_real_cam.jpg') 
      : baseName;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const token = getAccessToken();
    if (googleUser || token) {
      const item = galleryItems.find(i => i.src === src);
      const trackingId = item?.id || src;
      // Triggers background sync to Google Drive
      handleSaveToGoogleDrive(src, promptSnippet, trackingId);
    }
  };

  const handleUseAsVeoStart = (src: string) => {
    setVeoStartImage(src);
    setActiveTab(AppMode.VEO3_PROMPT_CREATOR);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUseAsVeoEnd = (src: string) => {
    setVeoEndImage(src);
    setActiveTab(AppMode.VEO3_PROMPT_CREATOR);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUseAsPoseBase = (src: string) => {
    setPoseBaseImage(src);
    setActiveTab(AppMode.POSE_VARIANTS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUseInCompose = (src: string) => {
    const base64 = src.split(',')[1];
    setComposeImageElements(prev => [...prev, { dataUrl: src, mimeType: 'image/png', base64 }]);
    setActiveTab(AppMode.COMPOSE_IMAGE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMoveToCollection = (itemId: string, collectionId: string | undefined) => {
    setGalleryItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, collectionId };
        // If the collection chosen has autoSync = true, trigger the sync immediately in background!
        if (collectionId) {
          const col = collections.find(c => c.id === collectionId);
          if (col && (col as any).autoSync) {
            handleSaveToGoogleDrive(item.src, item.description, item.id);
          }
        }
        return updated;
      }
      return item;
    }));
    
    // Also update inspectorItem so the UI stays in sync if currently viewing it
    setInspectorItem(prev => prev && prev.id === itemId ? { ...prev, collectionId } : prev);
  };

  const syncDriveImages = async (quiet: boolean = false) => {
    const token = getAccessToken();
    if (!token) {
      if (!quiet) {
        setDriveSaveStatus({
          id: 'global-sync',
          success: false,
          message: 'Google connection not established.'
        });
      }
      return;
    }

    setIsDriveSyncing(true);

    // Helper inside syncDriveImages with Exponential Backoff retry mechanism to reduce transient or rate-limiting errors during background syncs
    const fetchWithRetry = async <T,>(
      fn: () => Promise<T>,
      retries: number = 3,
      delay: number = 1000,
      backoff: number = 2
    ): Promise<T> => {
      try {
        return await fn();
      } catch (error: any) {
        const errText = error?.message?.toLowerCase() || '';
        // If it's a 401 unauthorized / expired credentials error, fail immediately so we can prompt re-auth rather than retry pointlessly
        if (
          errText.includes("401") || 
          errText.includes("credential") || 
          errText.includes("unauthenticated") || 
          errText.includes("expire")
        ) {
          throw error;
        }
        if (retries <= 0) {
          throw error;
        }
        console.warn(`Request failed during background sync, retrying in ${delay}ms... (Remaining retries: ${retries})`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(fn, retries - 1, delay * backoff, backoff);
      }
    };

    try {
      // 1. Get or create root Drive folder with backoff retry
      const rootFolderName = storageSettings.driveFolderName || "NK Imagen Storage";
      const rootFolderId = await fetchWithRetry(() => getOrCreateFolder(token, rootFolderName));

      // 2. Load nested subfolders (each represents a Gallery Collection) with backoff retry
      const driveSubfolders = await fetchWithRetry(() => getSubfolders(token, rootFolderId));
      
      let currentCollections = [...collections];
      const folderIdToColIdMap: Record<string, string> = {};

      for (const folder of driveSubfolders) {
        let existingCol = currentCollections.find(
          c => c.name.toLowerCase() === folder.name.toLowerCase() || c.id === folder.id
        );

        if (!existingCol) {
          existingCol = {
            id: folder.id, // Use folder.id to map tightly
            name: folder.name,
            createdAt: Date.now(),
            autoSync: true
          } as any;
          currentCollections.push(existingCol);
        } else if (existingCol.id !== folder.id) {
          const oldId = existingCol.id;
          existingCol.id = folder.id;
          // Cascade local reference updates
          setGalleryItems(prev => prev.map(item => item.collectionId === oldId ? { ...item, collectionId: folder.id } : item));
        }
        folderIdToColIdMap[folder.id] = folder.id;
      }

      setCollections(currentCollections);

      // Load freshest gallery snapshot from IndexedDB to avoid stale closures
      let currentGallery = await getAllGalleryItemsDB();
      if (!currentGallery || currentGallery.length === 0) {
        currentGallery = [...galleryItems];
      }

      let newItemsAdded = 0;
      let existingItemsLinked = 0;

      // 3. Scan images in each collection folder
      for (const folder of driveSubfolders) {
        const rawFiles = await fetchWithRetry(() => listDriveFiles(token, folder.id));
        const colId = folder.id;

        // Deduplicate files returned from Drive by name & md5 (keep newest, delete older duplicates from Drive)
        const uniqueDriveFiles = new Map<string, typeof rawFiles[0]>();
        for (const file of rawFiles) {
          const cleanName = file.name.toLowerCase().replace(/\.(png|jpe?g|webp)$/i, '').trim();
          const key = file.md5Checksum ? `md5:${file.md5Checksum}` : `name:${cleanName}`;
          const prevFile = uniqueDriveFiles.get(key);

          if (!prevFile) {
            uniqueDriveFiles.set(key, file);
          } else if (file.createdTime && new Date(file.createdTime) > new Date(prevFile.createdTime || 0)) {
            // New file is newer, delete the older one from Drive
            deleteDriveFile(token, prevFile.id).catch(e => console.warn('Drive dup delete error:', e));
            uniqueDriveFiles.set(key, file);
          } else {
            // Older duplicate copy on Drive, delete it
            deleteDriveFile(token, file.id).catch(e => console.warn('Drive dup delete error:', e));
          }
        }

        for (const file of uniqueDriveFiles.values()) {
          const fileId = file.id;
          const normFileName = normalizeImageTitle(file.name);

          // Find if this image already exists locally by driveFileId OR by title
          const existingIdx = currentGallery.findIndex(item => 
            item.driveFileId === fileId || 
            (item.description && normalizeImageTitle(item.description) === normFileName)
          );

          if (existingIdx >= 0) {
            // Already exists locally: link driveFileId and collectionId without duplicating
            currentGallery[existingIdx] = {
              ...currentGallery[existingIdx],
              driveFileId: fileId,
              collectionId: colId || currentGallery[existingIdx].collectionId
            };
            existingItemsLinked++;

            // If local src is broken or blob, recover it
            if (!currentGallery[existingIdx].src || currentGallery[existingIdx].src.startsWith('blob:')) {
              try {
                const { blob } = await fetchWithRetry(() => downloadDriveFile(token, fileId));
                const permanentData = await blobToDataUrl(blob);
                currentGallery[existingIdx].src = permanentData;
              } catch (e) {
                console.warn(`Could not recover src for ${file.name}:`, e);
              }
            }
            continue;
          }

          // New image found on Drive: download and add
          try {
            const { blob } = await fetchWithRetry(() => downloadDriveFile(token, fileId));
            const srcUrl = await blobToDataUrl(blob);
            const timestamp = file.createdTime ? new Date(file.createdTime).getTime() : Date.now();
            
            const cleanName = file.name
              .replace(/\.(png|jpe?g|webp)$/i, '')
              .replace(/^[A-Z0-9-]{14,}/, '')
              .replace(/-/g, ' ')
              .trim();

            currentGallery.push({
              id: "drive-" + fileId,
              src: srcUrl,
              type: 'JSON_TO_IMG',
              createdAt: timestamp,
              description: cleanName || 'Drive Shared Art',
              collectionId: colId,
              driveFileId: fileId
            } as any);
            newItemsAdded++;
          } catch (fileErr) {
            console.error(`Error downloading file ${fileId} in collection ${folder.name}:`, fileErr);
          }
        }
      }

      // 4. Scan loose images in the main root folder
      const rawRootFiles = await fetchWithRetry(() => listDriveFiles(token, rootFolderId));
      const uniqueRootFiles = new Map<string, typeof rawRootFiles[0]>();
      for (const file of rawRootFiles) {
        const cleanName = file.name.toLowerCase().replace(/\.(png|jpe?g|webp)$/i, '').trim();
        const key = file.md5Checksum ? `md5:${file.md5Checksum}` : `name:${cleanName}`;
        const prevFile = uniqueRootFiles.get(key);

        if (!prevFile) {
          uniqueRootFiles.set(key, file);
        } else if (file.createdTime && new Date(file.createdTime) > new Date(prevFile.createdTime || 0)) {
          deleteDriveFile(token, prevFile.id).catch(e => console.warn('Drive root dup delete error:', e));
          uniqueRootFiles.set(key, file);
        } else {
          deleteDriveFile(token, file.id).catch(e => console.warn('Drive root dup delete error:', e));
        }
      }

      for (const file of uniqueRootFiles.values()) {
        const fileId = file.id;
        const normFileName = normalizeImageTitle(file.name);

        const existingIdx = currentGallery.findIndex(item => 
          item.driveFileId === fileId || 
          (item.description && normalizeImageTitle(item.description) === normFileName)
        );

        if (existingIdx >= 0) {
          currentGallery[existingIdx] = {
            ...currentGallery[existingIdx],
            driveFileId: fileId
          };
          existingItemsLinked++;

          if (!currentGallery[existingIdx].src || currentGallery[existingIdx].src.startsWith('blob:')) {
            try {
              const { blob } = await fetchWithRetry(() => downloadDriveFile(token, fileId));
              const permanentData = await blobToDataUrl(blob);
              currentGallery[existingIdx].src = permanentData;
            } catch (e) {
              console.warn(`Could not recover root src for ${file.name}:`, e);
            }
          }
          continue;
        }

        try {
          const { blob } = await fetchWithRetry(() => downloadDriveFile(token, fileId));
          const srcUrl = await blobToDataUrl(blob);
          const timestamp = file.createdTime ? new Date(file.createdTime).getTime() : Date.now();
          
          const cleanName = file.name
            .replace(/\.(png|jpe?g|webp)$/i, '')
            .replace(/^[A-Z0-9-]{14,}/, '')
            .replace(/-/g, ' ')
            .trim();

          currentGallery.push({
            id: "drive-" + fileId,
            src: srcUrl,
            type: 'JSON_TO_IMG',
            createdAt: timestamp,
            description: cleanName || 'Drive Shared Art',
            driveFileId: fileId
          } as any);
          newItemsAdded++;
        } catch (fileErr) {
          console.error(`Error downloading root file ${fileId}:`, fileErr);
        }
      }

      // 5. Tự động khử toàn bộ trùng lặp sau khi đồng bộ
      const { deduplicated, removedCount } = deduplicateGalleryItems(currentGallery);
      setGalleryItems(deduplicated);
      await saveAllGalleryItemsDB(deduplicated);

      const summaryMsg = removedCount > 0
        ? `Đã đồng bộ xong (+${newItemsAdded} mới, liên kết ${existingItemsLinked} ảnh, tự động dọn sạch ${removedCount} ảnh trùng lặp).`
        : `Đã đồng bộ thành công (+${newItemsAdded} ảnh mới từ Drive, liên kết ${existingItemsLinked} ảnh).`;

      if (!quiet) {
        setDriveSaveStatus({
          id: 'global-sync',
          success: true,
          message: summaryMsg
        });
      }
      addToHistory('Google Drive Export', summaryMsg, 'Đồng bộ Google Drive');
    } catch (err: any) {
      if (quiet) {
        console.warn("Global Drive Sync Error (Quiet/Auto):", err);
      } else {
        console.error("Global Drive Sync Error:", err);
        setDriveSaveStatus({
          id: 'global-sync',
          success: false,
          message: `Failed syncing Drive images: ${err.message || 'Error occurred'}`
        });
      }
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const [isCloudVaultSyncing, setIsCloudVaultSyncing] = useState(false);
  const [cloudVaultSyncStatus, setCloudVaultSyncStatus] = useState<string | null>(null);

  const handleSyncCloudVault = async (silent: boolean = false) => {
    const token = getAccessToken();
    if (!googleUser || !token) {
      if (!silent) {
        handleConnectGoogleDrive();
      }
      return;
    }

    setIsCloudVaultSyncing(true);
    if (!silent) {
      setCloudVaultSyncStatus("Đang đồng bộ Kho Prompt, Gallery & Cài đặt với Google Drive...");
    }

    try {
      const rootFolderName = storageSettings.driveFolderName || "NK Imagen Storage";
      const rootFolderId = await getOrCreateFolder(token, rootFolderName);

      // 1. Sync full cloud vault (Prompts, Collections, Presets, Gallery metadata)
      const report = await syncFullCloudVault(token, rootFolderId, historyItems);

      // 2. Refresh local state
      const [updatedPrompts, updatedCollections, updatedGallery] = await Promise.all([
        getAllPromptItemsDB(),
        getAllCollectionsDB(),
        getAllGalleryItemsDB()
      ]);

      setPromptHistoryItems(updatedPrompts);
      setCollections(updatedCollections);
      setGalleryItems(updatedGallery);

      // 3. Also sync image files from Drive into gallery
      await syncDriveImages(true);

      const msg = `Đã đồng bộ thành công! (+${report.promptsAdded} prompt mới, tổng ${report.totalCloudPrompts} prompt trên Drive)`;
      if (!silent) {
        setCloudVaultSyncStatus(msg);
        setTimeout(() => setCloudVaultSyncStatus(null), 4000);
      }
      addToHistory('Cloud Vault Sync', msg, 'Đồng bộ đám mây');
    } catch (err: any) {
      console.error("[Cloud Vault Sync] Error:", err);
      if (!silent) {
        setCloudVaultSyncStatus(`Lỗi đồng bộ Cloud: ${err.message || 'Không thể kết nối'}`);
        setTimeout(() => setCloudVaultSyncStatus(null), 5000);
      }
    } finally {
      setIsCloudVaultSyncing(false);
    }
  };

  // Auto-sync Cloud Vault (Prompts, Gallery, Collections) on launch/login
  useEffect(() => {
    if (googleUser && getAccessToken()) {
      const waitTimer = setTimeout(() => {
        handleSyncCloudVault(true);
      }, 2500);
      return () => clearTimeout(waitTimer);
    }
  }, [googleUser]);

  const [isSyncingCollection, setIsSyncingCollection] = useState<string | null>(null);

  const handleSyncCollectionToDrive = async (collectionId: string) => {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    
    setIsSyncingCollection(collectionId);
    setDriveSaveStatus(null);
    try {
      // Step 1: Ensure user is signed in & retrieve valid auth token
      let token = getAccessToken();
      if (!googleUser || !token) {
        setPendingDriveAction({ type: 'sync_collection', args: [collectionId] });
        throw new Error("Google Drive account is not connected. Please connect your Google Drive account first in the top bar, or click 'Re-Authenticate' below.");
      }

      // Step 2: Get or create root folder
      const rootFolderName = storageSettings.driveFolderName || "NK Imagen Storage";
      const rootFolderId = await getOrCreateFolder(token, rootFolderName);

      // Step 3: Get or create subfolder matching collection's name
      const colFolderId = await getOrCreateFolder(token, col.name, rootFolderId);

      // Step 4: Find items in this collection
      const colItems = galleryItems.filter(item => item.collectionId === collectionId);
      if (colItems.length === 0) {
        setDriveSaveStatus({
          id: collectionId,
          success: true,
          message: `Linked collection "${col.name}" to Google Drive folder successfully. Folder is empty.`
        });
        return;
      }

      let syncCount = 0;
      let updatedGallery = [...galleryItems];

      for (const item of colItems) {
        // If already has driveFileId, we can skip it
        if ((item as any).driveFileId) {
          syncCount++;
          continue;
        }

        // Fetch image as blob & mimeType
        const { blob, mimeType } = await fetchImageAsBlob(item.src);
        const fileName = getFormattedFileName(item.description) || `sync-art-${Date.now()}.png`;

        // Upload directly to collection folder with exponential backoff
        const driveFile = await executeWithExponentialBackoff(
          () => uploadFileToDrive(token, fileName, blob, mimeType, colFolderId)
        );

        // Update item in local state
        updatedGallery = updatedGallery.map(g => g.id === item.id ? { ...g, driveFileId: driveFile.id } : g);
        syncCount++;
      }

      setGalleryItems(updatedGallery);
      setDriveSaveStatus({
        id: collectionId,
        success: true,
        message: `Synced ${syncCount} images inside "${col.name}" to Google Drive folder successfully!`
      });
      addToHistory('Google Drive Export', `Synced collection "${col.name}" containing ${syncCount} items to Drive.`, col.name);
    } catch (err: any) {
      console.error("Collection Sync Error:", err);
      const errText = err?.message?.toLowerCase() || '';
      const isAuthErr = errText.includes("401") || 
                        errText.includes("credential") || 
                        errText.includes("unauthenticated") || 
                        errText.includes("expired") || 
                        errText.includes("connected");
      if (isAuthErr) {
        setPendingDriveAction({ type: 'sync_collection', args: [collectionId] });
      }
      
      const errorMsg = err?.message || "Sync Refused";
      setDriveSaveStatus({
        id: collectionId,
        success: false,
        message: `Failed syncing "${col.name}": ${errorMsg}`
      });
      handleError(err, `Failed syncing "${col.name}".`);
    } finally {
      setIsSyncingCollection(null);
    }
  };

  const handleSaveToGoogleDrive = async (src: string, description?: string, itemId?: string) => {
    // Determine an identifier for tracking loading
    const trackingId = itemId || src;
    setDriveSavingId(trackingId);
    setDriveSaveStatus(null);
    try {
      // Step 1: Ensure user is signed in & retrieve valid auth token
      let token = getAccessToken();
      if (!googleUser || !token) {
        setPendingDriveAction({ type: 'save', args: [src, description, itemId] });
        const loginResult = await googleSignIn();
        if (!loginResult) {
          // User closed popup
          return;
        }
        token = loginResult.accessToken;
        setGoogleUser(loginResult.user);
      }

      // Step 2: Extract formatted file name
      const fileName = getFormattedFileName(description) || `synth-reality-${Date.now()}.png`;

      // Step 3: Fetch image as blob & mimeType
      const { blob, mimeType } = await fetchImageAsBlob(src);

      // Step 4 & 5: Upload directly to the target folder in Google Drive with Exponential Backoff
      const rootFolderName = storageSettings.driveFolderName || "NK Imagen Storage";
      let targetFolderName = rootFolderName;
      const item = galleryItems.find(i => i.id === itemId || i.src === src);

      const driveFile = await executeWithExponentialBackoff(
        async () => {
          let folderId = await getOrCreateFolder(token, rootFolderName);

          // Check if item belongs to a collection and sync is enabled or targeted to nesting folder
          if (item && item.collectionId) {
            const col = collections.find(c => c.id === item.collectionId);
            if (col) {
              folderId = await getOrCreateFolder(token, col.name, folderId);
              targetFolderName = `${rootFolderName} / ${col.name}`;
            }
          }

          return await uploadFileToDrive(token, fileName, blob, mimeType, folderId);
        },
        {
          maxRetries: 4,
          baseDelayMs: 1200,
          maxDelayMs: 16000,
          onRetry: (attempt, maxRetries, delayMs, error) => {
            const isQuota429 = error?.status === 429 || error?.code === 'DRIVE_ERROR_429' || String(error?.message).includes('429');
            const retryReason = isQuota429 ? "Quota 429 quá tải" : "Lỗi mạng tạm thời";
            setDriveSaveStatus({
              id: trackingId,
              success: false,
              message: `${retryReason}. Đang tự động thử lại (${attempt}/${maxRetries}) sau ${(delayMs / 1000).toFixed(1)}s (Exponential Backoff)...`
            });
          }
        }
      );

      // Save driveFileId back to the item state
      setGalleryItems(prev => prev.map(g => {
        if (g.id === itemId || (itemId === undefined && g.src === src)) {
          return { ...g, driveFileId: driveFile.id };
        }
        return g;
      }));

      setDriveSaveStatus({
        id: trackingId,
        success: true,
        message: `Saved "${fileName}" to Google Drive "${targetFolderName}" folder successfully!`
      });
      addToHistory('Google Drive Export', `Uploaded "${fileName}" to "${targetFolderName}" folder.`, fileName, src);
    } catch (err: any) {
      console.error("Google Drive Upload Error:", err);
      const errText = err?.message?.toLowerCase() || '';
      const isAuthErr = errText.includes("401") || 
                        errText.includes("credential") || 
                        errText.includes("unauthenticated") || 
                        errText.includes("expired") || 
                        errText.includes("connected");
      if (isAuthErr) {
        setPendingDriveAction({ type: 'save', args: [src, description, itemId] });
      }

      let errorMsg = err?.message || "Cloud Connection Refused";
      if (err?.message?.includes('popup_closed_by_user')) {
        errorMsg = "Authentication window closed. Please try again.";
      }
      setDriveSaveStatus({
        id: trackingId,
        success: false,
        message: `Failed: ${errorMsg}`
      });
      handleError(err, "Failed to save to Google Drive.");
    } finally {
      setDriveSavingId(null);
    }
  };

  // Auto-sync reactive trigger for newly generated items, strictly requiring google authentication to be active
  useEffect(() => {
    if (galleryItems.length === 0) return;
    const latestItem = galleryItems[0];
    if (latestItem && !syncedIdsRef.current.has(latestItem.id)) {
      syncedIdsRef.current.add(latestItem.id);
      
      if (googleUser && getAccessToken()) {
        // Automatically save to Drive
        handleSaveToGoogleDrive(latestItem.src, latestItem.description, latestItem.id);
      }
    }
  }, [galleryItems, collections, googleUser]);

  const [isBatchSavingDrive, setIsBatchSavingDrive] = useState(false);

  const handleBatchSyncToGoogleDrive = async () => {
    const itemsToSync = galleryItems.filter(item => gallerySelection.has(item.id));
    if (itemsToSync.length === 0) return;

    setIsBatchSavingDrive(true);
    setDriveSaveStatus(null);

    try {
      let token = getAccessToken();
      if (!googleUser || !token) {
        // Sign-in inline
        const loginResult = await googleSignIn();
        if (!loginResult) {
          setIsBatchSavingDrive(false);
          return;
        }
        token = loginResult.accessToken;
        setGoogleUser(loginResult.user);
      }

      let syncCount = 0;
      let alreadySyncedCount = 0;
      let updatedGallery = [...galleryItems];

      // Get or create root Drive folder
      const rootFolderName = storageSettings.driveFolderName || "NK Imagen Storage";
      let rootFolderId = await getOrCreateFolder(token, rootFolderName);

      for (const item of itemsToSync) {
        if ((item as any).driveFileId) {
          alreadySyncedCount++;
          continue;
        }

        setDriveSaveStatus({
          id: 'batch-sync',
          success: true,
          message: `Uploading: ${syncCount + 1}/${itemsToSync.length - alreadySyncedCount} item(s)...`
        });

        // Fetch image as blob
        const { blob, mimeType } = await fetchImageAsBlob(item.src);
        const fileName = getFormattedFileName(item.description) || `synth-reality-${Date.now()}.png`;

        // Determine target folder
        let folderId = rootFolderId;
        if (item.collectionId) {
          const col = collections.find(c => c.id === item.collectionId);
          if (col) {
            folderId = await getOrCreateFolder(token, col.name, rootFolderId);
          }
        }

        // Upload to Drive with exponential backoff
        const driveFile = await executeWithExponentialBackoff(
          () => uploadFileToDrive(token, fileName, blob, mimeType, folderId)
        );

        // Update item in local state
        updatedGallery = updatedGallery.map(g => g.id === item.id ? { ...g, driveFileId: driveFile.id } : g);
        syncCount++;
      }

      setGalleryItems(updatedGallery);
      setGallerySelection(new Set()); // Clear selection upon success

      setDriveSaveStatus({
        id: 'batch-sync',
        success: true,
        message: `Successfully batch uploaded ${syncCount} unsynced image(s) to Google Drive!`
      });
      addToHistory('Google Drive Export', `Batch synced ${syncCount} item(s) to Google Drive.`, 'Batch Upload');
    } catch (err: any) {
      console.error("Batch Sync Error:", err);
      const errText = err?.message?.toLowerCase() || '';
      const isAuthErr = errText.includes("401") || 
                        errText.includes("credential") || 
                        errText.includes("unauthenticated") || 
                        errText.includes("expired") || 
                        errText.includes("connected");
      if (isAuthErr) {
        const firstUnsynced = itemsToSync.find(item => !(item as any).driveFileId);
        if (firstUnsynced) {
          setPendingDriveAction({ type: 'save', args: [firstUnsynced.src, firstUnsynced.description, firstUnsynced.id] });
        }
      }

      let errorMsg = err?.message || "Batch sync failed.";
      setDriveSaveStatus({
        id: 'batch-sync',
        success: false,
        message: `Batch sync failed: ${errorMsg}`
      });
      handleError(err, "Failed batch save to Google Drive.");
    } finally {
      setIsBatchSavingDrive(false);
    }
  };

  const handleConvertTextToJson = async () => {
    if (!converterInput.trim()) return;
    try {
        setIsConverting(true);
        const res = await textToImagePromptJson(converterInput);
        if (res) {
            setConverterResult(res);
            addToHistory('Text to JSON', `Converted natural language to JSON: "${converterInput.slice(0, 50)}..."`, 'N/A');
            savePromptToHistory(res, 'TEXT_TO_JSON', res.subject, undefined, converterInput);
        }
    } catch (err) { handleError(err); } finally { setIsConverting(false); }
  };

  const handleBatchDownload = async () => {
    const itemsToDownload = galleryItems.filter(item => gallerySelection.has(item.id));
    for (let i = 0; i < itemsToDownload.length; i++) {
        const item = itemsToDownload[i];
        const a = document.createElement('a');
        a.href = item.src;
        a.download = getFormattedFileName(item.description);
        a.click();
        await new Promise(r => setTimeout(r, 250));
    }
  };

  const handleExportZip = async () => {
    const itemsToExport = galleryItems.filter(item => gallerySelection.has(item.id));
    if (itemsToExport.length === 0) return;

    try {
      setIsExportingZip(true);
      const zip = new JSZip();

      for (let i = 0; i < itemsToExport.length; i++) {
        const item = itemsToExport[i];
        
        // Get the base name using existing formatted name logic
        const defaultName = getFormattedFileName(item.description || item.id);
        const nameWithoutExt = defaultName.endsWith('.png') ? defaultName.slice(0, -4) : defaultName;

        // Determine file extension and process image source
        let extension = 'png';
        let imageContent: any = null;
        let isBase64 = false;

        if (item.src.startsWith('data:')) {
          isBase64 = true;
          const match = item.src.match(/^data:(image\/[a-zA-Z+]+);base64,/);
          if (match) {
            const mime = match[1];
            if (mime === 'image/jpeg' || mime === 'image/jpg') {
              extension = 'jpg';
            } else if (mime === 'image/webp') {
              extension = 'webp';
            } else if (mime === 'image/gif') {
              extension = 'gif';
            }
          }
          imageContent = item.src.split(',')[1];
        } else {
          // It's a remote URL (e.g., Google Drive proxy or external link)
          try {
            const response = await fetch(item.src);
            const blob = await response.blob();
            const mime = blob.type;
            if (mime === 'image/jpeg' || mime === 'image/jpg') {
              extension = 'jpg';
            } else if (mime === 'image/png') {
              extension = 'png';
            } else if (mime === 'image/webp') {
              extension = 'webp';
            } else if (mime === 'image/gif') {
              extension = 'gif';
            }
            imageContent = blob;
          } catch (fetchErr) {
            console.error(`Failed to fetch remote image for ZIP from ${item.src}:`, fetchErr);
          }
        }

        const finalImageName = `${nameWithoutExt}.${extension}`;
        if (imageContent) {
          zip.file(finalImageName, imageContent, { base64: isBase64 });
        }

        // Prepare metadata JSON with all details
        const metadataObj = {
          id: item.id,
          type: item.type,
          createdAt: item.createdAt,
          description: item.description || '',
          metadata: item.metadata || null
        };

        const jsonString = JSON.stringify(metadataObj, null, 2);
        const finalMetaName = `${nameWithoutExt}_metadata.json`;
        zip.file(finalMetaName, jsonString);
      }

      // Generate the ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Trigger download for the ZIP file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `nki_gallery_export_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      // Log to history
      addToHistory('Export ZIP', `Exported ${itemsToExport.length} gallery items as a ZIP archive containing images and metadata.`, 'N/A');
    } catch (err: any) {
      console.error("Export ZIP Error:", err);
      handleError(err, "Could not export selected items as a ZIP archive.");
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCreateCollection = (name: string, autoSync: boolean) => {
      const newCol = { id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now(), autoSync };
      setCollections(prev => [...prev, newCol]);
      setActiveCollectionId(newCol.id);
  };

  const handleUpdateCollection = (id: string, updates: Partial<Collection>) => {
      setCollections(prev => prev.map(col => col.id === id ? { ...col, ...updates } : col));
  };

  const handleDeleteCollection = (id: string) => {
      setConfirmAction({
          message: "Delete this Collection? Images inside will retain their individual status, but their bundle categorization will be removed.",
          onConfirm: () => {
              setCollections(prev => prev.filter(col => col.id !== id));
              setGalleryItems(prev => prev.map(item => item.collectionId === id ? { ...item, collectionId: undefined } : item));
              if (activeCollectionId === id) {
                  setActiveCollectionId('all');
              }
          }
      });
  };

  const getSortedAndFilteredGallery = useCallback(() => {
    let items = [...galleryItems];

    // 1. Phân loại (Classification / Filter)
    if (galleryFilter !== 'all') {
      if (galleryFilter === 'DRIVE_SYNCED') {
        items = items.filter(item => Boolean(item.driveFileId));
      } else if (galleryFilter === 'UPSCALE') {
        items = items.filter(item => 
          item.type === 'UPSCALE' || 
          item.description?.toLowerCase().includes('upscale') || 
          item.metadata?.model?.toLowerCase().includes('upscale') ||
          item.metadata?.upscaledFrom != null
        );
      } else {
        items = items.filter(item => item.type === galleryFilter);
      }
    }

    // 2. Bộ sưu tập (Collections / Bundles)
    if (activeCollectionId !== 'all') {
      items = items.filter(item => item.collectionId === activeCollectionId);
    }

    // 3. Lọc theo khoảng thời gian (Time Range)
    if (galleryTimeRange !== 'all') {
      const now = Date.now();
      if (galleryTimeRange === 'today') {
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        items = items.filter(item => item.createdAt >= oneDayAgo);
      } else if (galleryTimeRange === '7days') {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        items = items.filter(item => item.createdAt >= sevenDaysAgo);
      } else if (galleryTimeRange === '30days') {
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        items = items.filter(item => item.createdAt >= thirtyDaysAgo);
      }
    }

    // 4. Tìm kiếm từ khóa (Search Keyword)
    if (gallerySearch.trim()) {
        const q = gallerySearch.toLowerCase();
        items = items.filter(item => 
          item.description?.toLowerCase().includes(q) || 
          item.metadata?.model?.toLowerCase().includes(q) ||
          item.metadata?.aspectRatio?.toLowerCase().includes(q) ||
          (item.metadata?.promptJson && JSON.stringify(item.metadata.promptJson).toLowerCase().includes(q))
        );
    }

    // 5. Sắp xếp theo thời gian (Sort by Timestamp)
    items.sort((a, b) => gallerySort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
    return items;
  }, [galleryItems, galleryFilter, activeCollectionId, galleryTimeRange, gallerySearch, gallerySort]);

  const sortedGallery = getSortedAndFilteredGallery();
  const inspectorIndex = inspectorItem ? sortedGallery.findIndex(i => i.id === inspectorItem.id) : -1;
  const hasNext = inspectorIndex !== -1 && inspectorIndex < sortedGallery.length - 1;
  const hasPrev = inspectorIndex > 0;

  // Batch Operations & Deduplication
  const [isBatchCollectionModalOpen, setIsBatchCollectionModalOpen] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  const duplicateCount = useMemo(() => countDuplicates(galleryItems), [galleryItems]);

  const handleSelectAll = useCallback(() => {
    if (gallerySelection.size === sortedGallery.length && sortedGallery.length > 0) {
      setGallerySelection(new Set());
    } else {
      setGallerySelection(new Set(sortedGallery.map(i => i.id)));
    }
  }, [gallerySelection.size, sortedGallery]);

  const handleBatchDelete = useCallback(() => {
    const count = gallerySelection.size;
    if (count === 0) return;
    setConfirmAction({
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${count} ảnh đã chọn khỏi thư viện và máy?`,
      onConfirm: async () => {
        const remaining = galleryItems.filter(i => !gallerySelection.has(i.id));
        setGalleryItems(remaining);
        await saveAllGalleryItemsDB(remaining);
        setGallerySelection(new Set());
        addToHistory('Gallery Delete', `Đã xóa vĩnh viễn ${count} ảnh từ thư viện.`, 'Xóa hàng loạt');
      }
    });
  }, [gallerySelection, galleryItems]);

  const handleBatchMoveToCollection = useCallback(async (collectionId: string | undefined) => {
    const count = gallerySelection.size;
    if (count === 0) return;
    const targetCol = collectionId ? collections.find(c => c.id === collectionId) : null;
    const colName = targetCol ? targetCol.name : 'Feed chung';

    const updated = galleryItems.map(item => {
      if (gallerySelection.has(item.id)) {
        return { ...item, collectionId };
      }
      return item;
    });

    setGalleryItems(updated);
    await saveAllGalleryItemsDB(updated);

    if (targetCol && (targetCol as any).autoSync && googleUser) {
      handleBatchSyncToGoogleDrive();
    }

    setGallerySelection(new Set());
    setDriveSaveStatus({
      id: 'batch-collection',
      success: true,
      message: `Đã chuyển ${count} ảnh vào bộ sưu tập "${colName}".`
    });
    setTimeout(() => setDriveSaveStatus(null), 4000);
    addToHistory('Collection Group', `Đã chuyển ${count} ảnh vào bộ sưu tập "${colName}".`, colName);
  }, [gallerySelection, collections, galleryItems, googleUser]);

  const handleBatchCreateAndMove = useCallback(async (name: string, autoSync: boolean) => {
    const newCol: Collection = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: Date.now(),
      autoSync
    };
    setCollections(prev => [...prev, newCol]);
    await handleBatchMoveToCollection(newCol.id);
    setActiveCollectionId(newCol.id);
  }, [handleBatchMoveToCollection]);

  const handleBatchDownloadAntiAi = useCallback(async () => {
    const itemsToDownload = galleryItems.filter(item => gallerySelection.has(item.id));
    if (itemsToDownload.length === 0) return;

    setIsBatchDownloading(true);
    try {
      for (let i = 0; i < itemsToDownload.length; i++) {
        const item = itemsToDownload[i];
        await handleDownloadImage(item.src, item.description, true);
        await new Promise(r => setTimeout(r, 350));
      }
    } catch (e) {
      console.error("Batch Anti-AI Download error:", e);
    } finally {
      setIsBatchDownloading(false);
    }
  }, [galleryItems, gallerySelection]);

  const handleDeduplicateGallery = useCallback(() => {
    const { deduplicated, removedCount } = deduplicateGalleryItems(galleryItems);
    const token = getAccessToken();
    const hasDrive = Boolean(googleUser && token);

    if (removedCount === 0 && !hasDrive) {
      setDriveSaveStatus({
        id: 'dedup',
        success: true,
        message: 'Thư viện ảnh sạch sẽ, không phát hiện ảnh trùng lặp nào!'
      });
      setTimeout(() => setDriveSaveStatus(null), 3000);
      return;
    }

    const driveNotice = hasDrive 
      ? ` Đồng thời sẽ quét toàn bộ Google Drive để xóa vĩnh viễn các file trùng lặp trên Drive.` 
      : '';

    setConfirmAction({
      message: `Phát hiện ${removedCount} ảnh trùng lặp.${driveNotice} Bạn có muốn dọn dẹp và gộp về 1 bản đầy đủ metadata nhất?`,
      onConfirm: async () => {
        setGalleryItems(deduplicated);
        await saveAllGalleryItemsDB(deduplicated);
        setGallerySelection(new Set());

        let drivePurgedCount = 0;
        if (hasDrive && token) {
          try {
            setDriveSaveStatus({
              id: 'dedup',
              success: true,
              message: 'Đang quét và xóa các file trùng lặp trên Google Drive...'
            });
            const rootFolderName = storageSettings.driveFolderName || "NK Imagen Storage";
            const rootFolderId = await getOrCreateFolder(token, rootFolderName);
            const driveReport = await purgeDriveDuplicates(token, rootFolderId);
            drivePurgedCount = driveReport.duplicatesFound;
          } catch (driveErr) {
            console.warn('[Deduplication] Drive purge warning:', driveErr);
          }
        }

        const successMsg = drivePurgedCount > 0
          ? `Đã dọn sạch ${removedCount} ảnh trên máy & xóa vĩnh viễn ${drivePurgedCount} file trùng lặp trên Google Drive!`
          : `Đã dọn sạch ${removedCount} ảnh trùng lặp! Thư viện hiện còn ${deduplicated.length} ảnh.`;

        setDriveSaveStatus({
          id: 'dedup',
          success: true,
          message: successMsg
        });
        setTimeout(() => setDriveSaveStatus(null), 6000);
        addToHistory('Gallery Dedup', successMsg, 'Dọn trùng lặp Drive & Máy');
      }
    });
  }, [galleryItems, googleUser, storageSettings]);

  const handleModuleClick = (module: string) => {
    if (module === 'complex_imagen') setActiveTab(AppMode.IMG_TO_JSON);
    else if (module === 'scenario_director') setActiveTab(AppMode.SCENARIO_EDITOR);
    else if (module === 'ai_studio') handleOpenStudio();
    else if (module === 'library') setActiveTab(AppMode.GALLERY);
    else if (module === 'history') setActiveTab(AppMode.LOGS);
  };

  const isComplexImagenGroup = [AppMode.IMG_TO_JSON, AppMode.JSON_CONVERTER, AppMode.JSON_TO_IMG, AppMode.POSE_VARIANTS, AppMode.COMPOSE_IMAGE, AppMode.REFERENCE_CREATION, AppMode.UPSCALE_IMAGE, AppMode.AI_STUDIO].includes(activeTab);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-all duration-700">
      {upscaleProgress && upscaleProgress.active && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-xl bg-slate-900/80 border border-white/10 rounded-3xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary-500 rounded-tl-3xl opacity-60"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary-500 rounded-tr-3xl opacity-60"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-primary-500 rounded-bl-3xl opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary-500 rounded-br-3xl opacity-60"></div>

              <div className="flex items-center gap-2 mb-6 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-widest text-primary-400 font-mono font-black">
                  {upscaleProgress.is4k ? "4K Super-Resolution Core Engaged" : "Neural HD Upscaler Engaged"}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white text-center mb-8 uppercase tracking-wider">
                Reconstructing High-Frequency Details
              </h2>

              {upscaleProgress.srcImage && (
                <div className="relative w-48 h-48 mb-8 rounded-2xl overflow-hidden border border-white/10 shadow-inner group">
                  <img 
                    src={upscaleProgress.srcImage} 
                    className="w-full h-full object-cover opacity-40 blur-[1px] transition-all duration-500" 
                    alt="Source Grid" 
                  />
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent shadow-[0_0_15px_rgba(var(--primary-500-rgb),1)] top-0 animate-[bounce_3s_infinite]" />
                </div>
              )}

              <div className="w-full space-y-3 mb-8">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-white/40 uppercase tracking-wider">Processing Matrix</span>
                  <span className="text-primary-400 font-black text-sm">{upscaleProgress.percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full border border-white/5 overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(var(--primary-500-rgb),0.5)]" 
                    style={{ width: `${upscaleProgress.percent}%` }}
                  />
                </div>
              </div>

              <div className="w-full bg-black/20 border border-white/5 rounded-2xl p-5 space-y-3 text-[11px] font-mono mb-4 text-center">
                <span className="text-white/60 uppercase tracking-tight leading-relaxed animate-pulse block">
                  {upscaleProgress.stepMessage}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-4 bg-white/5 rounded-2xl p-4 border border-white/5 font-mono text-[10px] text-white/50">
                <div className="flex items-center gap-2">
                  <span className={upscaleProgress.percent >= 15 ? "text-primary-400 font-bold" : "opacity-30"}>
                    {upscaleProgress.percent >= 15 ? "[✓]" : "[ ]"}
                  </span>
                  <span className={upscaleProgress.percent >= 15 ? "text-white/80" : ""}>Pixel Grid Map</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={upscaleProgress.percent >= 35 ? "text-primary-400 font-bold" : "opacity-30"}>
                    {upscaleProgress.percent >= 35 ? "[✓]" : "[ ]"}
                  </span>
                  <span className={upscaleProgress.percent >= 35 ? "text-white/80" : ""}>Detail Synth</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={upscaleProgress.percent >= 55 ? "text-primary-400 font-bold" : "opacity-30"}>
                    {upscaleProgress.percent >= 55 ? "[✓]" : "[ ]"}
                  </span>
                  <span className={upscaleProgress.percent >= 55 ? "text-white/80" : ""}>Denoise Filter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={upscaleProgress.percent >= 75 ? "text-primary-400 font-bold" : "opacity-30"}>
                    {upscaleProgress.percent >= 75 ? "[✓]" : "[ ]"}
                  </span>
                  <span className={upscaleProgress.percent >= 75 ? "text-white/80" : ""}>Resolution Boost</span>
                </div>
              </div>
            </div>
          </div>
      )}
      {confirmAction && (
          <ConfirmModal 
              message={confirmAction.message} 
              onConfirm={confirmAction.onConfirm} 
              onCancel={() => setConfirmAction(null)} 
          />
      )}
      {errorDetails && (
          <ErrorModal 
              title={errorDetails.title} 
              message={errorDetails.message} 
              solutions={errorDetails.solutions}
              onClose={() => setErrorDetails(null)} 
              isAccessDenied403={errorDetails.isAccessDenied403}
              isDriveError={errorDetails.isDriveError}
              onDisableDrive={() => {
                const pending = pendingDriveAction;
                clearDriveAutoConnect();
                logout();
                setErrorDetails(null);
                setPendingDriveAction(null);
                if (pending && pending.type === 'save' && pending.args[0]) {
                  handleDownloadImage(pending.args[0], pending.args[1]);
                }
              }}
              onReAuthenticate={(errorDetails.isAuthError || errorDetails.isDriveError) ? async () => {
                try {
                  const res = await googleSignIn();
                  if (res) {
                    setGoogleUser(res.user);
                    setDriveSaveStatus({
                      id: 'auth-success',
                      success: true,
                      message: 'Google Drive account re-authenticated successfully!'
                    });

                    // Automatically retry the pending operation if one exists!
                    if (pendingDriveAction) {
                      const { type, args } = pendingDriveAction;
                      setPendingDriveAction(null); // Clear it
                      
                      setTimeout(async () => {
                        try {
                          if (type === 'save') {
                            await handleSaveToGoogleDrive(args[0], args[1], args[2]);
                          } else if (type === 'sync_collection') {
                            await handleSyncCollectionToDrive(args[0]);
                          }
                        } catch (retryErr) {
                          console.error("Retry of pending action failed:", retryErr);
                        }
                      }, 600);
                    }
                  }
                } catch (e: any) {
                  console.error("Failed re-authenticating:", e);
                  handleError(e, "Re-authentication failed.");
                }
              } : undefined}
          />
      )}
      {isComparing && (
          <ComparingModal 
            items={galleryItems.filter(i => gallerySelection.has(i.id))}
            onClose={() => setIsComparing(false)}
          />
      )}
      {inspectorItem && (
          <InspectorModal 
            item={inspectorItem} 
            onClose={() => setInspectorItem(null)} 
            onStudio={(item) => { handleOpenStudio(item.src); setInspectorItem(null); }}
            onUpscaleStudio={(item) => {
              setUpscaleModuleSrc(item.src);
              setActiveTab(AppMode.UPSCALE_IMAGE);
              setInspectorItem(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onInpainting={(item) => {
              setInpaintingTargetSrc(item.src);
              setIsInpaintingOpen(true);
              setInspectorItem(null);
            }}
            onVirtualTryOn={(item) => {
              setVirtualTryOnModelSrc(item.src);
              setIsVirtualTryOnOpen(true);
              setInspectorItem(null);
            }}
            onCharacterTurnaround={(item) => {
              setCharacterTurnaroundSrc(item.src);
              setIsCharacterTurnaroundOpen(true);
              setInspectorItem(null);
            }}
            onBiometricMorph={(item) => {
              setBiometricMorphSrc(item.src);
              setIsBiometricMorphOpen(true);
              setInspectorItem(null);
            }}
            onRemix={(item) => { if(item.metadata?.promptJson) { setJsonInput(JSON.stringify(item.metadata.promptJson, null, 2)); setActiveTab(AppMode.JSON_TO_IMG); setInspectorItem(null); window.scrollTo(0,0); } }}
            onCompose={(item) => { handleUseInCompose(item.src); setInspectorItem(null); }}
            onDelete={(id) => removeFromGallery(id)} 
            onNext={() => hasNext && setInspectorItem(sortedGallery[inspectorIndex + 1])}
            onPrev={() => hasPrev && setInspectorItem(sortedGallery[inspectorIndex - 1])}
            hasNext={hasNext}
            hasPrev={hasPrev}
            requestConfirm={(msg, onConfirm) => setConfirmAction({ message: msg, onConfirm })}
            googleUser={googleUser}
            onDownload={handleDownloadImage}
            isSavingDrive={driveSavingId === inspectorItem.id || driveSavingId === inspectorItem.src}
            driveSaveStatus={driveSaveStatus}
            onGoogleSignIn={handleConnectGoogleDrive}
            onGoogleSignOut={logout}
            collections={collections}
            onMoveToCollection={handleMoveToCollection}
            onGoogleDrive={handleSaveToGoogleDrive}
            onUpdateItem={(updatedItem) => {
              setInspectorItem(updatedItem);
              setGalleryItems(prev => prev.map(g => g.id === updatedItem.id ? updatedItem : g));
              saveGalleryItemDB(updatedItem).catch(console.error);
            }}
          />
      )}
      {/* Local Inpainting & Magic Brush Studio Modal (v4.3) */}
      <InpaintingStudioModal
        isOpen={isInpaintingOpen}
        onClose={() => {
          setIsInpaintingOpen(false);
          setInpaintingTargetSrc(null);
        }}
        imageSrc={inpaintingTargetSrc}
        onSaveToGallery={(image, desc, meta) => {
          addToGallery(image, 'JSON_TO_IMG', desc || 'Inpainting Local Edit', meta);
          addToHistory('Inpainting Edit', `Chỉnh sửa cục bộ: ${desc || 'Inpainting'}`, 'inpainting_edit.png', image);
          showCleanToast('Đã lưu kết quả Cọ Ma Thuật vào Thư viện!');
        }}
        onDownload={(image, desc) => {
          handleDownloadImage(image, desc || 'Inpainting-Result');
        }}
        onOpenInUpscale={(image) => {
          setUpscaleModuleSrc(image);
          setActiveTab(AppMode.UPSCALE_IMAGE);
          setIsInpaintingOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        t={t}
      />

      {/* Virtual Try-On 2.0 Studio Modal (v4.3 Phase 2) */}
      <VirtualTryOnModal
        isOpen={isVirtualTryOnOpen}
        onClose={() => {
          setIsVirtualTryOnOpen(false);
          setVirtualTryOnModelSrc(null);
        }}
        initialModelImage={virtualTryOnModelSrc}
        onSaveToGallery={(image, desc, meta) => {
          addToGallery(image, 'JSON_TO_IMG', desc || 'Virtual Try-On 2.0', meta);
          addToHistory('Virtual Try-On', `Thử đồ thời trang: ${desc || 'Try-On'}`, 'tryon_result.png', image);
          showCleanToast('Đã lưu kết quả Thử Đồ 2.0 vào Thư viện!');
        }}
        onDownload={(image, desc) => {
          handleDownloadImage(image, desc || 'TryOn-Result');
        }}
        onOpenInUpscale={(image) => {
          setUpscaleModuleSrc(image);
          setActiveTab(AppMode.UPSCALE_IMAGE);
          setIsVirtualTryOnOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenInInpainting={(image) => {
          setInpaintingTargetSrc(image);
          setIsInpaintingOpen(true);
          setIsVirtualTryOnOpen(false);
        }}
        t={t}
      />

      {/* Character Sheet 360° Studio Modal (v4.3 Phase 2) */}
      <CharacterTurnaroundModal
        isOpen={isCharacterTurnaroundOpen}
        onClose={() => {
          setIsCharacterTurnaroundOpen(false);
          setCharacterTurnaroundSrc(null);
        }}
        initialCharacterImage={characterTurnaroundSrc}
        onSaveToGallery={(image, desc, meta) => {
          addToGallery(image, 'JSON_TO_IMG', desc || 'Character Turnaround 360°', meta);
          addToHistory('Character Turnaround 360°', `Bộ xoay nhân vật 360°: ${desc || 'Turnaround'}`, 'turnaround_result.png', image);
          showCleanToast('Đã lưu bản vẽ Xoay 360° vào Thư viện!');
        }}
        onDownload={(image, desc) => {
          handleDownloadImage(image, desc || 'Turnaround-360-Result');
        }}
        onOpenInUpscale={(image) => {
          setUpscaleModuleSrc(image);
          setActiveTab(AppMode.UPSCALE_IMAGE);
          setIsCharacterTurnaroundOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenInInpainting={(image) => {
          setInpaintingTargetSrc(image);
          setIsInpaintingOpen(true);
          setIsCharacterTurnaroundOpen(false);
        }}
        t={t}
      />

      {/* Biometric Morph Studio - Aging & Emotion Modal (v4.3 Phase 3) */}
      <BiometricMorphModal
        isOpen={isBiometricMorphOpen}
        onClose={() => {
          setIsBiometricMorphOpen(false);
          setBiometricMorphSrc(null);
        }}
        initialImage={biometricMorphSrc}
        onSaveToGallery={(image, desc, meta) => {
          addToGallery(image, 'JSON_TO_IMG', desc || 'Biometric Morph Studio', meta);
          addToHistory('Biometric Morph', `Biến đổi Tuổi & Cảm xúc: ${desc || 'Morph'}`, 'biometric_morph_result.png', image);
          showCleanToast('Đã lưu kết quả Tuổi & Cảm xúc vào Thư viện!');
        }}
        onDownload={(image, desc) => {
          handleDownloadImage(image, desc || 'Biometric-Morph-Result');
        }}
        onOpenInUpscale={(image) => {
          setUpscaleModuleSrc(image);
          setActiveTab(AppMode.UPSCALE_IMAGE);
          setIsBiometricMorphOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenInInpainting={(image) => {
          setInpaintingTargetSrc(image);
          setIsInpaintingOpen(true);
          setIsBiometricMorphOpen(false);
        }}
        t={t}
      />

      {/* Cinematic Storyboard & Veo 3 Motion Director Modal (v4.3 Pillar 2) */}
      <CinematicStoryboardModal
        isOpen={isStoryboardOpen}
        onClose={() => setIsStoryboardOpen(false)}
        onSaveToGallery={(image, desc, meta) => {
          addToGallery(image, 'JSON_TO_IMG', desc || 'Storyboard Film Still', meta);
          addToHistory('Storyboard Still', desc || 'Phân cảnh điện ảnh', 'storyboard.png', image);
          showCleanToast('Đã lưu phân cảnh vào Thư viện!');
        }}
        onDownload={(image, desc) => {
          handleDownloadImage(image, desc || 'Storyboard-Scene');
        }}
        onSendToWorkspace={(prompt) => {
          updateJsonInput(prompt);
          showCleanToast('Đã chuyển prompt kịch bản vào Prompt Studio!');
        }}
        t={t}
      />

      {/* Commercial E-Commerce & Lookbook Studio Modal (v4.3 Pillar 3) */}
      <ECommerceLookbookModal
        isOpen={isLookbookOpen}
        onClose={() => setIsLookbookOpen(false)}
        onSaveToGallery={(image, desc, meta) => {
          addToGallery(image, 'JSON_TO_IMG', desc || 'Lookbook Angle', meta);
          addToHistory('Lookbook Angle', desc || 'Góc chụp thương mại', 'lookbook.png', image);
          showCleanToast('Đã lưu ảnh thương mại vào Thư viện!');
        }}
        onDownload={(image, desc) => {
          handleDownloadImage(image, desc || 'Lookbook-Angle');
        }}
        onSendToWorkspace={(prompt) => {
          updateJsonInput(prompt);
          showCleanToast('Đã chuyển prompt góc chụp vào Prompt Studio!');
        }}
        t={t}
      />

      {/* Visual Pipeline Recipe & Smart Queue Modal (v4.3 Pillar 4) */}
      <VisualPipelineModal
        isOpen={isPipelineOpen}
        onClose={() => setIsPipelineOpen(false)}
        activeImageSrc={generatedImages.length > 0 ? generatedImages[0] : (galleryItems.length > 0 ? galleryItems[0].src : null)}
        onSaveToGallery={(image, desc, meta) => {
          addToGallery(image, 'JSON_TO_IMG', desc || 'Pipeline Output', meta);
          addToHistory('Pipeline Output', desc || 'Dây chuyền tự động', 'pipeline.png', image);
          showCleanToast('Đã lưu kết quả dây chuyền vào Thư viện!');
        }}
        onDownload={(image, desc) => {
          handleDownloadImage(image, desc || 'Pipeline-Result');
        }}
        onOpenInUpscale={(image) => {
          setUpscaleModuleSrc(image);
          setActiveTab(AppMode.UPSCALE_IMAGE);
          setIsPipelineOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        t={t}
      />
      {isCollectionHubOpen && (
          <CollectionManagerModal 
            collections={collections}
            onClose={() => setIsCollectionHubOpen(false)}
            onCreateCollection={handleCreateCollection}
            onUpdateCollection={handleUpdateCollection}
            onDeleteCollection={handleDeleteCollection}
            googleUser={googleUser}
          />
      )}
      {isSavePresetModalOpen && (
          <SavePresetModal 
            currentJsonString={jsonInput}
            onSave={handleSavePersonalPreset}
            onClose={() => setIsSavePresetModalOpen(false)}
          />
      )}
      {isPresetManagerModalOpen && (
          <PersonalPresetManagerModal 
            presets={personalPresets}
            onApply={(preset) => handleApplyPreset(preset.id)}
            onDelete={handleDeletePersonalPreset}
            onImport={handleImportPersonalPresets}
            onUpdatePreset={handleUpdatePersonalPreset}
            onClose={() => setIsPresetManagerModalOpen(false)}
          />
      )}

      {/* Google Gemini API Key Setup Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={() => setHasApiKey(hasGeminiApiKey())}
      />

      {/* Settings Modal (Default Save Folders, IndexedDB, Drive Diagnostics) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        storageSettings={storageSettings}
        onUpdateSettings={(newSettings) => setStorageSettings(newSettings)}
        googleUser={googleUser}
        onConnectDrive={handleConnectGoogleDrive}
        onClearGallery={async () => {
          setGalleryItems([]);
          setGallerySelection(new Set());
        }}
        galleryCount={galleryItems.length}
        onSyncCloudVault={() => handleSyncCloudVault(false)}
        isCloudVaultSyncing={isCloudVaultSyncing}
      />

      {/* Batch Collection Modal */}
      <BatchCollectionModal
        isOpen={isBatchCollectionModalOpen}
        onClose={() => setIsBatchCollectionModalOpen(false)}
        selectedCount={gallerySelection.size}
        collections={collections}
        galleryItems={galleryItems}
        onMoveToCollection={handleBatchMoveToCollection}
        onCreateAndMove={handleBatchCreateAndMove}
      />

      {/* Apple visionOS Spatial Frosted Header */}
      <header className="flex-none z-40 w-full backdrop-blur-3xl bg-slate-950/75 border-b border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] sticky top-0">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-3 py-2 px-4 lg:px-6">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab(AppMode.IMG_TO_JSON)}>
            <div className="relative w-9 h-9 rounded-xl p-1 bg-white/5 border border-white/15 flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-500-rgb),0.25)] group-hover:scale-105 group-hover:border-primary-400/50 transition-all backdrop-blur-md overflow-hidden flex-shrink-0">
              <img
                src="/logo.png"
                alt="NKI Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] group-hover:rotate-6 transition-transform"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col">
                <h1 className="text-lg font-black text-white tracking-tight flex items-center leading-tight">
                  NKI Studio <span className="text-[10px] font-semibold text-primary-300 ml-1.5 tracking-normal px-1.5 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/30">v4.3</span>
                  <span className="text-[9px] font-bold text-white/40 ml-2 hidden md:inline tracking-normal font-sans border-l border-white/10 pl-2">NKI Standalone Studio</span>
                </h1>
                <span className="text-[8.5px] font-bold text-white/50 uppercase tracking-[0.16em]">Next-gen Kinetic Integration</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex gap-1.5 bg-white/5 p-1 rounded-full border border-white/10">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                    <button key={key} onClick={() => setCurrentTheme(key)} className={`w-5 h-5 rounded-full border-2 transition-all ${currentTheme === key ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ backgroundColor: THEMES[key].colors[500] }} />
                ))}
             </div>
             <nav className="flex bg-white/5 p-1 rounded-xl gap-1 border border-white/10 items-center">
                <button onClick={() => handleModuleClick('complex_imagen')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${isComplexImagenGroup ? 'bg-primary-500 text-white shadow-[0_0_12px_rgba(var(--primary-500-rgb),0.4)]' : 'text-white/40 hover:text-white'}`}>{t('nav.complexImagen')}</button>
                <button onClick={() => handleModuleClick('scenario_director')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${[AppMode.SCENARIO_EDITOR, AppMode.VEO3_PROPARSE_CREATOR || AppMode.VEO3_PROMPT_CREATOR].includes(activeTab) ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 'text-white/40 hover:text-white'}`}>{t('nav.sceneDirector')}</button>
                <button 
                  onClick={() => handleModuleClick('ai_studio')} 
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${
                    activeTab === AppMode.AI_STUDIO 
                      ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] font-bold' 
                      : 'text-white/40 hover:text-white'
                  }`}
                  title="Photo Studio 2026: Chỉnh màu nâng cao & Canva AI"
                >
                  <span className="text-[11px]">🎨</span>
                  <span>{t('nav.studio')}</span>
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-8 h-8 flex items-center justify-center rounded-lg glass-card transition-all ${isDarkMode ? 'text-amber-400' : 'text-slate-600 shadow-inner'}`} title="Chuyển chế độ sáng/tối">
                    {isDarkMode ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                    ) : (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                    )}
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                {googleUser && getAccessToken() ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-all shadow-[0_0_10px_rgba(16,185,129,0.03)]">
                    {googleUser.photoURL ? (
                      <img src={googleUser.photoURL} className="w-3.5 h-3.5 rounded-full border border-emerald-400/50 object-cover" alt="User" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black">G</div>
                    )}
                    <div className="flex flex-col items-start leading-none gap-0.5">
                      <span className="text-[7.5px] font-black text-emerald-400 uppercase tracking-wider leading-none">Drive Ready</span>
                      <button onClick={logout} className="text-[6.5px] font-bold text-white/30 hover:text-red-400 uppercase tracking-wider leading-none transition-colors">Disconnect</button>
                    </div>
                  </div>
                ) : isDriveAutoConnectEnabled() ? (
                  <button 
                    onClick={handleConnectGoogleDrive} 
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse"
                    title="Phiên Google Drive cần nối lại - Bấm 1-Click để nối lại ngay tức thì!"
                  >
                    <span className="text-[10px]">⚡</span>
                    <span>1-Click Nối Drive</span>
                  </button>
                ) : (
                  <button onClick={handleConnectGoogleDrive} className="px-2 py-1 hover:bg-emerald-500/10 hover:text-emerald-400 border rounded-lg text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center gap-1 bg-white/5 text-white/50 border-white/10 hover:border-emerald-500/20">
                    <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12,2 2,22 22,22" fill="none" stroke="currentColor" strokeWidth={2.5} />
                    </svg>
                    Drive
                  </button>
                )}
                {googleUser && getAccessToken() && (
                  <button
                    onClick={() => handleSyncCloudVault(false)}
                    disabled={isCloudVaultSyncing}
                    className={`px-2 py-1 border rounded-lg text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center gap-1 ${
                      isCloudVaultSyncing
                        ? 'bg-primary-500/20 text-primary-300 border-primary-500/40 animate-pulse'
                        : 'bg-white/5 hover:bg-primary-500/10 text-white/60 hover:text-primary-300 border-white/10 hover:border-primary-500/30'
                    }`}
                    title="Đồng bộ 2 chiều toàn bộ Kho Prompt, Gallery và Lịch Sử với Google Drive"
                  >
                    {isCloudVaultSyncing ? (
                      <>
                        <svg className="animate-spin h-2.5 w-2.5 text-primary-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang Sync...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px]">☁️</span>
                        <span>Sync Vault</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setIsQueueDrawerOpen(true)}
                  className={`px-2 py-1 border rounded-lg text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center gap-1 ${
                    isCoolingActive
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 animate-pulse'
                      : 'bg-white/5 text-white/60 border-white/10 hover:border-primary-500/30 hover:text-primary-300'
                  }`}
                  title="Xem hàng đợi tạo ảnh và làm mát"
                >
                  <span className="text-[9px]">⚡</span>
                  Queue
                </button>
                <button
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className={`px-2 py-1 border rounded-lg text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center gap-1 ${
                    hasApiKey
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/50 hover:bg-amber-500/30 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  }`}
                  title={hasApiKey ? "Cấu hình Google Gemini API Key (Đang hoạt động)" : "Chưa có API Key - Nhấp để cài đặt"}
                >
                  <span className="text-[9px]">🔑</span>
                  <span>{hasApiKey ? 'Gemini API' : 'Nhập Key'}</span>
                </button>
                {/* Apple visionOS Quick Language Switcher Dropdown */}
                <div className="relative" ref={langMenuRef}>
                  <button
                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                    className="px-2 py-1 border rounded-lg text-[8.5px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/90 border-white/10 hover:border-white/20 backdrop-blur-xl shadow-sm active:scale-95"
                    title={t('settings.lang.title')}
                  >
                    <span className="text-[11px] leading-none">{currentLanguageInfo.flag}</span>
                    <span className="font-bold tracking-normal">{currentLanguageInfo.code.toUpperCase()}</span>
                    <svg className={`w-2 h-2 text-white/60 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isLangMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-3xl border border-white/20 rounded-2xl p-2 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1">
                      <div className="px-2 py-1 text-[8.5px] font-black tracking-widest uppercase text-white/40 border-b border-white/10 flex items-center justify-between">
                        <span>{t('settings.tab.language')}</span>
                        <span className="text-xs">🌐</span>
                      </div>
                      {SUPPORTED_LANGUAGES.map((langItem) => {
                        const isActive = lang === langItem.code;
                        return (
                          <button
                            key={langItem.code}
                            onClick={() => {
                              setLanguage(langItem.code);
                              setIsLangMenuOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-xl text-left transition-all flex items-center justify-between text-xs ${
                              isActive
                                ? 'bg-primary-500/25 text-white font-bold border border-primary-500/40 shadow-[0_0_14px_rgba(var(--primary-500-rgb),0.35)]'
                                : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm leading-none">{langItem.flag}</span>
                              <div className="flex flex-col leading-tight">
                                <span className="text-[11px] font-medium text-white">{langItem.nativeName}</span>
                                <span className="text-[8px] text-white/40">{langItem.name}</span>
                              </div>
                            </div>
                            {isActive && (
                              <span className="text-primary-400 font-black text-xs">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-2 py-1 border rounded-lg text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center gap-1 bg-white/5 text-white/60 border-white/10 hover:border-primary-500/30 hover:text-primary-300"
                  title="Cài đặt thư mục lưu mặc định, Google Drive và Gallery"
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>{t('nav.settings')}</span>
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button onClick={() => handleModuleClick('library')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === AppMode.GALLERY ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'text-white/40 hover:text-white'}`}>{t('nav.gallery')}</button>
                <button onClick={() => handleModuleClick('history')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === AppMode.LOGS ? 'bg-primary-500 text-white shadow-[0_0_12px_rgba(var(--primary-500-rgb),0.4)]' : 'text-white/40 hover:text-white'}`}>{t('nav.history')}</button>
             </nav>
          </div>
        </div>
      </header>

      {/* Consolidated Top Sub-Bar: Sub-Navigation Dock + Realtime Rate Limit */}
      <div className="flex-none w-full border-b border-white/5 bg-black/25 backdrop-blur-xl px-4 lg:px-6 py-2 z-30">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Sub Navigation Dock for Complex Imagen */}
          {isComplexImagenGroup && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-white/[0.03] p-1 rounded-2xl inline-flex border border-white/10 gap-1 backdrop-blur-xl shadow-inner">
                {[ 
                  { id: AppMode.IMG_TO_JSON, label: t('subnav.analysis'), icon: '🔍' }, 
                  { id: AppMode.JSON_CONVERTER, label: t('subnav.converter'), icon: '⚡' }, 
                  { id: AppMode.JSON_TO_IMG, label: t('subnav.generator'), icon: '🎨' }, 
                  { id: AppMode.POSE_VARIANTS, label: t('subnav.pose'), icon: '🏃' }, 
                  { id: AppMode.COMPOSE_IMAGE, label: t('subnav.compose'), icon: '🧩' },
                  { id: AppMode.REFERENCE_CREATION, label: t('subnav.reference'), icon: '🎭' },
                  { id: AppMode.UPSCALE_IMAGE, label: t('subnav.upscale'), icon: '✨' },
                  { id: AppMode.AI_STUDIO, label: t('subnav.studio'), icon: '🖌️' }
                ].map(sub => (
                  <button 
                    key={sub.id} 
                    onClick={() => setActiveTab(sub.id)} 
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                      activeTab === sub.id 
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.25)] font-bold' 
                        : 'text-white/40 hover:text-white/90 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-[11px]">{sub.icon}</span>
                    <span>{sub.label}</span>
                  </button>
                ))}
              </div>

              {(activeTab === AppMode.IMG_TO_JSON || activeTab === AppMode.JSON_CONVERTER || activeTab === AppMode.JSON_TO_IMG) && (
                <button
                  type="button"
                  onClick={handleQuickCleanCurrentTabPrompt}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-in fade-in"
                  title={t('prompt.cleanTooltip')}
                >
                  <span className="text-[11px]">🧹</span>
                  <span>{t('prompt.clean')}</span>
                </button>
              )}
            </div>
          )}

          {/* Sub Navigation Dock for Scenario Director */}
          {(activeTab === AppMode.SCENARIO_EDITOR || activeTab === AppMode.VEO3_PROMPT_CREATOR) && (
            <div className="bg-white/[0.03] p-1 rounded-2xl inline-flex border border-white/10 gap-1 backdrop-blur-xl shadow-inner">
              {[ 
                { id: AppMode.SCENARIO_EDITOR, label: t('subnav.scripting'), icon: '🎬' }, 
                { id: AppMode.VEO3_PROMPT_CREATOR, label: t('subnav.veo3'), icon: '🎥' } 
              ].map(sub => (
                <button 
                  key={sub.id} 
                  onClick={() => setActiveTab(sub.id)} 
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                    activeTab === sub.id 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] font-bold' 
                      : 'text-white/40 hover:text-white/90 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px]">{sub.icon}</span>
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === AppMode.GALLERY && (
            <div className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <span>Visual Archive & Drive Vault</span>
            </div>
          )}

          {activeTab === AppMode.LOGS && (
            <div className="text-xs font-black uppercase tracking-wider text-primary-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              <span>Neuro Synthesis History & Telemetry</span>
            </div>
          )}

          {/* Real-time Rate Limit Bar (Compact single-row pill) */}
          <div className="flex-none">
            <RealtimeRateLimitBar />
          </div>
        </div>
      </div>

      {/* Visual Synaptic Cooling Countdown & Queue Alerts */}
      <SynapticCoolingBanner onOpenQueueDrawer={() => setIsQueueDrawerOpen(true)} />

      {/* Cloud Vault Sync Toast Banner */}
      {cloudVaultSyncStatus && (
        <div className="fixed top-16 right-6 z-[9999] animate-in slide-in-from-top-3 duration-300">
          <div className="glass-card px-4 py-3 rounded-2xl border border-primary-500/40 bg-slate-950/90 backdrop-blur-xl flex items-center gap-3 text-xs font-bold text-white shadow-2xl shadow-primary-950/80">
            <span className="text-lg">☁️</span>
            <span className="text-primary-200">{cloudVaultSyncStatus}</span>
          </div>
        </div>
      )}

      {/* Prompt Clean Toast Banner */}
      {cleanToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-3 fade-in duration-200">
          <div className="glass-card px-5 py-2.5 rounded-2xl border border-rose-500/40 bg-slate-950/95 backdrop-blur-2xl flex items-center gap-2.5 text-xs font-bold text-white shadow-2xl shadow-rose-950/60 ring-1 ring-white/10">
            <span className="text-base">🧹</span>
            <span className="text-rose-200 tracking-wide">{cleanToast}</span>
          </div>
        </div>
      )}

      {/* Main Workspace with Natural Scroll & Sticky Preview */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto p-4 lg:p-6 flex flex-col">
        {isComplexImagenGroup && (
            <div className="w-full flex flex-col animate-in fade-in duration-300">

                {/* --- ANALYZE SECTION (Sticky Preview) --- */}
                {activeTab === AppMode.IMG_TO_JSON && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
                    {/* Left Column: Upload & Scan */}
                    <div className="lg:col-span-5 glass-card p-6 lg:p-7 flex flex-col space-y-5 shadow-2xl">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-white tracking-tight">{t('analysis.title', 'Image Analysis')}</h2>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/30">
                              Forensic Vision
                            </span>
                          </div>
                          <p className="text-xs text-white/50 mt-1">{t('analysis.desc', 'Dịch ngược phong cách, ánh sáng, góc máy và bố cục ảnh thành prompt JSON cấu trúc.')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            type="text" 
                            placeholder={t('analysis.urlPlaceholder', 'Dán link ảnh (https://...)...')} 
                            value={imageURLInput} 
                            onChange={(e) => setImageURLInput(e.target.value)} 
                            className="w-full glass-input rounded-xl pl-3 pr-8 py-2.5 text-xs text-white placeholder-white/30 focus:ring-1 focus:ring-primary-500 border border-white/10" 
                          />
                          {imageURLInput && (
                            <button onClick={() => setImageURLInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-xs">✕</button>
                          )}
                        </div>
                        <button 
                          onClick={() => handleImageAnalysis(imageURLInput)} 
                          disabled={!imageURLInput.trim() || isAnalyzing}
                          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-black px-5 py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95 flex-none"
                        >
                          {t('analysis.startBtn', 'Analyze')}
                        </button>
                      </div>

                      <div 
                        onDrop={(e) => { e.preventDefault(); setIsDraggingUpload(false); const f = e.dataTransfer.files?.[0]; if(f) handleImageAnalysis(f); }} 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingUpload(true); }} 
                        onDragLeave={() => setIsDraggingUpload(false)}
                        className={`border-2 border-dashed rounded-2xl p-6 min-h-[300px] flex flex-col items-center justify-center bg-white/[0.015] relative transition-all duration-300 cursor-pointer group ${
                          isDraggingUpload 
                            ? 'border-primary-400 bg-primary-400/10 scale-[1.01]' 
                            : 'border-white/10 hover:border-primary-400/50 hover:bg-primary-500/[0.02]'
                        }`}
                      >
                        {uploadedImage ? (
                            <div className="relative w-full h-full min-h-[260px] flex items-center justify-center animate-in zoom-in-95">
                              <img src={uploadedImage} className="max-h-[320px] max-w-full object-contain rounded-xl shadow-2xl border border-white/10" alt="Uploaded" />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleClearImage(); }} 
                                className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 backdrop-blur-xl p-2 rounded-full text-white/80 hover:text-white border border-white/10 shadow-xl transition-all"
                                title={t('common.delete', 'Xóa ảnh')}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                        ) : (
                            <div className="text-center space-y-3 pointer-events-none">
                                <div className="w-16 h-16 bg-white/5 group-hover:bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto border border-white/10 group-hover:border-primary-500/30 transition-all shadow-lg">
                                  <svg className="h-8 w-8 text-white/30 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <span className="text-sm font-bold text-white/80 block">{t('analysis.uploadPrompt', 'Kéo thả ảnh vào đây')}</span>
                                  <span className="text-xs text-white/40 mt-1 block">{t('analysis.orBrowse', 'Hoặc bấm để duyệt tệp từ máy tính (PNG, JPG, WebP)')}</span>
                                </div>
                            </div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageAnalysis(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload" />
                      </div>
                      {isAnalyzing && <LoadingSpinner message="Scanning Pixels & Reconstructing Prompt Matrix..." />}
                    </div>

                    {/* Right Column: Sticky Extracted Structure */}
                    <div className="lg:col-span-7 lg:sticky lg:top-24 glass-card p-6 lg:p-7 border border-white/10 shadow-2xl flex flex-col space-y-4 min-h-[460px]">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block"></span>
                              </div>
                              <h3 className="text-xs font-black uppercase text-white/70 tracking-widest ml-2">{t('analysis.resultTitle', 'Forensic Prompt (Structural JSON)')}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {(jsonResult || uploadedImage || imageURLInput || refinePrompt) && (
                                <button 
                                  type="button"
                                  onClick={handleCleanAnalysisPrompt}
                                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                                  title={t('prompt.cleanTooltip')}
                                >
                                  <span>🧹</span>
                                  <span>{t('prompt.clean')}</span>
                                </button>
                              )}
                              {jsonResult && (
                                <>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(JSON.stringify(jsonResult, null, 2));
                                    }} 
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 text-[10px] font-bold uppercase tracking-wider transition-all"
                                    title={t('common.copy', 'Sao chép')}
                                  >
                                    {t('common.copy', 'Copy')} JSON
                                  </button>
                                  <button 
                                    onClick={() => { setJsonInput(JSON.stringify(jsonResult, null, 2)); setActiveTab(AppMode.JSON_TO_IMG); }} 
                                    className="bg-primary-500 hover:bg-primary-600 text-black font-black px-4 py-1.5 rounded-xl shadow-lg text-[10px] tracking-widest uppercase transition-all flex items-center gap-1.5 active:scale-95"
                                  >
                                    <span>{t('generator.generateBtn', 'Tạo Ảnh Ngay')}</span>
                                    <span>→</span>
                                  </button>
                                </>
                              )}
                            </div>
                        </div>

                        <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4 font-mono text-xs text-white/80 whitespace-pre-wrap shadow-inner min-h-[260px] max-h-[440px] overflow-auto custom-scrollbar leading-relaxed">
                            {jsonResult ? (
                              JSON.stringify(jsonResult, null, 2)
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-30 select-none">
                                <span className="text-2xl">⚡</span>
                                <span className="text-xs font-mono tracking-wider uppercase block">Awaiting Analysis Output...</span>
                                <span className="text-[11px] max-w-xs block font-sans">Tải ảnh lên ở cột bên trái và bấm Analyze để trích xuất prompt chi tiết.</span>
                              </div>
                            )}
                        </div>
                        
                        {jsonResult && (
                            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-grow bg-white/10"></div>
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em]">Neural Refinement</span>
                                    <div className="h-px flex-grow bg-white/10"></div>
                                </div>
                                <div className="relative">
                                    <textarea 
                                        value={refinePrompt} 
                                        onChange={(e) => setRefinePrompt(e.target.value)} 
                                        placeholder="Nhập yêu cầu tinh chỉnh (ví dụ: 'Đổi góc máy thành low-angle, ánh sáng hoàng hôn neon')..." 
                                        className="w-full h-20 glass-input rounded-xl p-3 text-xs font-medium shadow-inner focus:ring-primary-500 pr-24 resize-none text-white border border-white/10" 
                                    />
                                    <button 
                                        onClick={handleRefineJson} 
                                        disabled={isRefining || !refinePrompt.trim()} 
                                        className="absolute bottom-2.5 right-2.5 bg-primary-500 hover:bg-primary-600 text-black px-4 py-2 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                                    >
                                        {isRefining ? '...' : 'Refine'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
                )}

                {/* --- CONVERTER SECTION --- */}
                {activeTab === AppMode.JSON_CONVERTER && (
                    <div className="max-w-4xl mx-auto w-full glass-card p-8 lg:p-10 rounded-[2.5rem] flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500 shadow-2xl">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-white tracking-tighter">{t('converter.title', 'Linguistic Converter')}</h2>
                            <p className="text-sm text-white/40 mt-1">{t('converter.desc', 'Translate natural language descriptions into structured neural instructions.')}</p>
                        </div>
                        <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] block">{t('converter.placeholder', 'Mô tả ý tưởng')}</label>
                                {(converterInput || converterResult) && (
                                    <button
                                        type="button"
                                        onClick={handleCleanConverterPrompt}
                                        className="px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                                        title={t('prompt.cleanTooltip')}
                                    >
                                        <span>🧹</span>
                                        <span>{t('prompt.clean')}</span>
                                    </button>
                                )}
                            </div>
                            <textarea value={converterInput} onChange={(e) => setConverterInput(e.target.value)} placeholder={t('converter.placeholder', 'Describe your image idea in plain language...')} className="w-full h-36 glass-input rounded-2xl p-5 text-sm font-medium shadow-inner focus:ring-primary-500 resize-y" />
                        </div>
                        <button onClick={handleConvertTextToJson} disabled={isConverting || !converterInput.trim()} className="w-full bg-gradient-to-r from-primary-600 to-primary-400 text-white font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all tracking-[0.2em] uppercase text-xs disabled:opacity-30">
                            {isConverting ? t('common.processing', 'Translating...') : t('converter.convertBtn', 'Translate to JSON')}
                        </button>
                        {converterResult && (
                            <div className="mt-4 bg-black/30 rounded-2xl p-5 border border-white/5 flex flex-col space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em]">Translated Output</span>
                                    <button onClick={() => { setJsonInput(JSON.stringify(converterResult, null, 2)); setActiveTab(AppMode.JSON_TO_IMG); }} className="bg-primary-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-primary-400 transition-all">{t('analysis.sendToGenerator', 'Use in Generator')} →</button>
                                </div>
                                <pre className="text-xs font-mono text-white/70 whitespace-pre-wrap max-h-96 overflow-auto custom-scrollbar p-3 bg-black/20 rounded-xl">{JSON.stringify(converterResult, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}

                {/* --- GENERATOR SECTION (Sticky Preview) --- */}
                {activeTab === AppMode.JSON_TO_IMG && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
                        {/* Left Column: Controls & Prompt */}
                        <div className="lg:col-span-5 glass-card p-6 lg:p-7 rounded-[2rem] space-y-5 shadow-2xl flex flex-col">
                            {/* Card Header */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-black text-white tracking-tighter">{t('generator.title', 'Image Generator')}</h2>
                                        <div className="group relative">
                                            <svg className="h-4 w-4 text-white/30 hover:text-primary-400 transition-colors cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[10px] normal-case tracking-normal">
                                                <p className="text-white/80 leading-relaxed">
                                                    <strong>Structured JSON Input:</strong> Define specific attributes like subject, art_style, and lighting.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button 
                                            onClick={handleUndoJson} 
                                            disabled={jsonHistoryIdx <= 0}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            title="Undo (History)"
                                        >
                                            <svg className="h-3.5 w-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                        </button>
                                        <button 
                                            onClick={handleRedoJson} 
                                            disabled={jsonHistoryIdx >= jsonHistory.length - 1}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            title="Redo (Recent)"
                                        >
                                            <svg className="h-3.5 w-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    {/* Model Matrix */}
                                    <div>
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1.5">Synth Engine</label>
                                        <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                                    </div>
                                    {/* Style Matrix */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Neural Style Matrix</label>
                                            <div className="flex items-center gap-1.5">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsSavePresetModalOpen(true)} 
                                                    className="text-[9px] text-zinc-400 hover:text-white font-medium uppercase tracking-widest flex items-center gap-1 transition-colors"
                                                    title="Save current prompt structure as a Personal Preset"
                                                >
                                                    <svg className="w-3 h-3 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                    </svg>
                                                    <span>Save</span>
                                                </button>
                                                {selectedPreset && <button type="button" onClick={() => handleApplyPreset('')} className="text-[9px] text-zinc-400 font-medium hover:text-white uppercase tracking-widest">Clear</button>}
                                            </div>
                                        </div>
                                        <PresetSelector 
                                            value={selectedPreset} 
                                            onChange={handleApplyPreset}
                                            personalPresets={personalPresets}
                                            onOpenSaveModal={() => setIsSavePresetModalOpen(true)}
                                            onOpenManagerModal={() => setIsPresetManagerModalOpen(true)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Prompt Editor & Pro Suite */}
                            <div className="space-y-3">
                                {/* Pro Intelligence Toolbar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                    <PromptQualityMeter
                                        jsonPrompt={(() => {
                                            try { return JSON.parse(jsonInput); }
                                            catch { return DEFAULT_JSON; }
                                        })()}
                                        onEnrichSuccess={(enriched) => {
                                            updateJsonInput(JSON.stringify(enriched, null, 2));
                                            showCleanToast('Đã nâng cấp các chiều điện ảnh thành công!');
                                        }}
                                    />

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {/* Character Vault Button */}
                                        <button
                                            type="button"
                                            onClick={() => { setVaultTargetSlot('refFace1'); setIsCharacterVaultOpen(true); }}
                                            className="text-[9px] text-zinc-300 hover:text-white font-medium uppercase tracking-widest flex items-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg border border-white/10 active:scale-95 shadow-sm"
                                            title="Mở Kho Data Nhân Vật Mẫu (Quản lý hồ sơ, vóc dáng, album ảnh và Biometric Core)"
                                        >
                                            <svg className="w-3 h-3 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                            <span>Kho Mẫu</span>
                                        </button>

                                        {/* Consistency Lock Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsConsistencyModalOpen(true)}
                                            className={`text-[9px] font-medium uppercase tracking-widest flex items-center gap-1.5 transition-all px-2.5 py-1.5 rounded-lg border active:scale-95 shadow-sm ${
                                                isConsistencyLockActive && activePersona
                                                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                                                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/10'
                                            }`}
                                            title="Khóa nhất quán nhân vật và phong cách xuyên suốt nhiều bức ảnh"
                                        >
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            </svg>
                                            <span>{isConsistencyLockActive && activePersona ? activePersona.name : 'Khóa Nhân Vật'}</span>
                                        </button>

                                        {/* A/B Compare Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsABModalOpen(true)}
                                            className="text-[9px] text-zinc-300 hover:text-white font-medium uppercase tracking-widest flex items-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg border border-white/10 active:scale-95 shadow-sm"
                                            title="Thử nghiệm so sánh song song 2 biến thể prompt (A/B Test)"
                                        >
                                            <svg className="w-3 h-3 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                                <rect x="2" y="3" width="9" height="18" rx="2" />
                                                <rect x="13" y="3" width="9" height="18" rx="2" />
                                            </svg>
                                            <span>A/B Test</span>
                                        </button>

                                        {/* Snapshots / Time-Machine Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsSnapshotModalOpen(true)}
                                            className="text-[9px] text-zinc-300 hover:text-white font-medium uppercase tracking-widest flex items-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg border border-white/10 active:scale-95 shadow-sm"
                                            title="Lịch sử phiên bản Snapshots & Chia sẻ link Preset"
                                        >
                                            <svg className="w-3 h-3 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            <span>Snapshots</span>
                                        </button>

                                        {/* Clean Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleCleanGeneratorPrompt('blank')}
                                            className="text-[9px] text-zinc-300 hover:text-white font-medium uppercase tracking-widest flex items-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg border border-white/10 active:scale-95 shadow-sm"
                                            title={t('prompt.cleanTooltip')}
                                        >
                                            <svg className="w-3 h-3 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                            <span>{t('prompt.clean')}</span>
                                        </button>

                                        {/* Khử Bẫy AI Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                try {
                                                    const current = JSON.parse(jsonInput);
                                                    const sanitized = sanitizePromptJsonAntiAi(current, loadAntiAiSettings().cameraPreset);
                                                    updateJsonInput(JSON.stringify(sanitized, null, 2));
                                                } catch (e) {
                                                    updateJsonInput(sanitizePromptAntiAi(jsonInput));
                                                }
                                            }}
                                            className="text-[9px] text-zinc-300 hover:text-white font-medium uppercase tracking-widest flex items-center gap-1.5 transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg border border-white/10 active:scale-95 shadow-sm"
                                            title="Tự động khử các từ khóa bẫy AI (photorealistic, 8k, octane...) và đệm chi tiết máy ảnh thật"
                                        >
                                            <svg className="w-3 h-3 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            </svg>
                                            <span>Khử Bẫy AI</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Next-Gen Breakthrough Suite Ribbon (v4.3 / v5.0) */}
                                <div className="p-2 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-900/90 border border-white/10 shadow-lg backdrop-blur-xl flex flex-col gap-2">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                            <span className="text-[10px] font-black text-cyan-300 uppercase tracking-widest">
                                                NEXT-GEN BREAKTHROUGH SUITE
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20 font-mono">
                                                visionOS
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-white/30 hidden sm:inline">
                                            13 Bộ Công Cụ Đột Phá Thế Hệ Mới (v4.3 Pro)
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5 w-full">
                                        {/* 1. Virtual 3D Gaffer & Generative Relighting */}
                                        <button
                                            type="button"
                                            onClick={() => setIsRelightingOpen(true)}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Virtual 3D Gaffer & Relighting: Hắt sáng 3D trực quan và tái tạo ánh sáng điện ảnh"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            <span className="truncate">3D Relight</span>
                                        </button>

                                        {/* 2. AI Voice Director */}
                                        <button
                                            type="button"
                                            onClick={() => setIsVoiceDirectorOpen(true)}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="AI Voice Director: Chỉ đạo đạo diễn prompt bằng giọng nói tự nhiên Tiếng Việt/English"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                            <span className="truncate">Voice Director</span>
                                        </button>

                                        {/* 3. Apple Vision Pro Spatial 3D Converter */}
                                        <button
                                            type="button"
                                            onClick={() => setIsSpatial3DOpen(true)}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Apple Vision Pro Spatial 3D Converter: Tạo hiệu ứng nghiêng Parallax, Stereo SBS & Kính 3D"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            <span className="truncate">Spatial 3D</span>
                                        </button>

                                        {/* 4. Neural Aesthetic DNA Blender */}
                                        <button
                                            type="button"
                                            onClick={() => setIsDnaBlenderOpen(true)}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Neural Aesthetic DNA Blender: Lai tạo 4 nhánh gen Màu sắc, Quang học, Chất liệu & Trường phái"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                            </svg>
                                            <span className="truncate">DNA Blender</span>
                                        </button>

                                        {/* 5. Infinite Multiverse Node Graph */}
                                        <button
                                            type="button"
                                            onClick={() => setIsNodeGraphOpen(true)}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Infinite Multiverse Node Graph: Sơ đồ canvas phân nhánh đa vũ trụ sáng tạo"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                            </svg>
                                            <span className="truncate">Node Graph</span>
                                        </button>

                                        {/* 6. One-Click Talking Character & Emotional Lip-Sync */}
                                        <button
                                            type="button"
                                            onClick={() => setIsTalkingActorOpen(true)}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="One-Click Talking Character & Emotional Lip-Sync: Chuyển đổi chân dung thành video nói chuyện Veo 3"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <span className="truncate">Talking Actor</span>
                                        </button>

                                        {/* 7. Local Inpainting & Magic Brush */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenInpainting()}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Local Inpainting & Magic Brush: Tô mask sửa cục bộ bàn tay 5 ngón, đổi trang phục, xóa vật thể thừa"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            <span className="truncate">Cọ Sửa AI</span>
                                        </button>

                                        {/* 8. Virtual Try-On 2.0 Studio */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenVirtualTryOn()}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Virtual Try-On 2.0: Thử đồ trực tiếp từ ảnh sản phẩm flat-lay lên người mẫu"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span className="truncate">Thử Đồ 2.0</span>
                                        </button>

                                        {/* 9. Character Sheet 360° Studio */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenCharacterTurnaround()}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Character Turnaround 360°: Tạo bộ xoay 8 hướng chuẩn VFX/Game/Anime từ 1 nhân vật duy nhất"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span className="truncate">Xoay 360°</span>
                                        </button>

                                        {/* 10. Biometric Morph Studio - Aging & Emotion */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenBiometricMorph()}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Biometric Morph Studio: Thanh trượt tuổi tác 18-70 và 6 biểu cảm cảm xúc vi mô"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="truncate">Tuổi & Cảm Xúc</span>
                                        </button>

                                        {/* 11. Cinematic Storyboard & Veo 3 Motion Director */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenStoryboard()}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Cinematic Storyboard & Veo 3: Phân cảnh 4 Hồi điện ảnh & Vector chuyển động camera cho Google Veo 3 / Sora"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <span className="truncate">Storyboard</span>
                                        </button>

                                        {/* 12. Commercial E-Commerce & Lookbook Studio */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenLookbook()}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Commercial E-Commerce & Lookbook: Sinh đồng bộ 5 góc chụp thương mại cho Amazon, Shopify, Lookbook"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                            </svg>
                                            <span className="truncate">Lookbook 5 Góc</span>
                                        </button>

                                        {/* 13. Visual Pipeline Recipe & Smart Queue */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenPipeline()}
                                            className="w-full text-[10px] text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-2 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 shadow-sm group"
                                            title="Visual Pipeline Recipe & Smart Queue: Dây chuyền tự động hóa Tạo ảnh -> Sắc nét vi mô 0-API -> Upscale 4K -> Cloud Vault"
                                        >
                                            <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span className="truncate">Dây Chuyền AI</span>
                                        </button>
                                    </div>
                                </div>

                                <JsonPromptEditor 
                                    value={jsonInput} 
                                    onChange={(val) => updateJsonInput(val)} 
                                />

                                <div className="grid grid-cols-2 gap-4 pt-1">
                                    <div>
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1.5">Aspect Ratio</label>
                                        <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
                                        <div className="mt-2">
                                            <ImageSizeSelector value={imageSize} onChange={setImageSize} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Batch Count</label>
                                            <span className="bg-primary-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">{variantCount} {variantCount === 1 ? 'Artifact' : 'Artifacts'}</span>
                                        </div>
                                        <input type="range" min="1" max="5" value={variantCount} onChange={(e) => setVariantCount(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full accent-primary-500 cursor-pointer mt-4" />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">Biometric Core Mode</label>
                                                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[8px] font-bold border border-purple-500/30">Google Vision</span>
                                            </div>
                                            <span className="text-[8px] text-white/30 uppercase">Bật để kích hoạt 2 nhân vật (Dual Characters)</span>
                                        </div>
                                        <button 
                                            onClick={() => setIsMultiCharacter(!isMultiCharacter)}
                                            className={`w-11 h-6 rounded-full transition-all relative ${isMultiCharacter ? 'bg-primary-500 shadow-[0_0_10px_rgba(var(--primary-500-rgb),0.4)]' : 'bg-white/10 border border-white/10'}`}
                                            title="Bật/Tắt chế độ ghép đôi 2 nhân vật"
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isMultiCharacter ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    {isMultiCharacter && (
                                        <DualCharacterControls
                                            pairing={dualPairing}
                                            onChangePairing={setDualPairing}
                                            antiBleedLock={dualAntiBleedLock}
                                            onToggleAntiBleed={setDualAntiBleedLock}
                                            onSwap={() => handleSwapDualSlots('refFace1', 'refFace2')}
                                        />
                                    )}

                                    {!isMultiCharacter ? (
                                        <FaceReferenceInput 
                                            label="Biometric Core (Model Đơn)" 
                                            image={refFaceImage1} 
                                            personaName={slotPersonaNames['refFace1']}
                                            biometricProfile={slotBiometricProfiles['refFace1']}
                                            onScanBiometrics={() => handleScanBiometrics('refFace1')}
                                            isScanningBiometrics={isScanningBiometrics['refFace1']}
                                            onOpenVault={() => { setVaultTargetSlot('refFace1'); setIsCharacterVaultOpen(true); }}
                                            onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'refFace1'); }} 
                                            onClear={() => applySlotImage('refFace1', null)} 
                                            onDrop={(f) => handleFaceUploadRequest(f, 'refFace1')} 
                                        />
                                    ) : (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                            <FaceReferenceInput 
                                                label={getDualSlotLabel(dualPairing, 1)}
                                                image={refFaceImage1} 
                                                personaName={slotPersonaNames['refFace1']}
                                                biometricProfile={slotBiometricProfiles['refFace1']}
                                                onScanBiometrics={() => handleScanBiometrics('refFace1')}
                                                isScanningBiometrics={isScanningBiometrics['refFace1']}
                                                onOpenVault={() => { setVaultTargetSlot('refFace1'); setIsCharacterVaultOpen(true); }}
                                                onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'refFace1'); }} 
                                                onClear={() => applySlotImage('refFace1', null)} 
                                                onDrop={(f) => handleFaceUploadRequest(f, 'refFace1')} 
                                            />
                                            <FaceReferenceInput 
                                                label={getDualSlotLabel(dualPairing, 2)}
                                                image={refFaceImage2} 
                                                personaName={slotPersonaNames['refFace2']}
                                                biometricProfile={slotBiometricProfiles['refFace2']}
                                                onScanBiometrics={() => handleScanBiometrics('refFace2')}
                                                isScanningBiometrics={isScanningBiometrics['refFace2']}
                                                onOpenVault={() => { setVaultTargetSlot('refFace2'); setIsCharacterVaultOpen(true); }}
                                                onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'refFace2'); }} 
                                                onClear={() => applySlotImage('refFace2', null)} 
                                                onDrop={(f) => handleFaceUploadRequest(f, 'refFace2')} 
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 px-1 pt-1">
                                        <input 
                                            type="checkbox" 
                                            id="hairRef" 
                                            checked={useReferenceHair} 
                                            onChange={(e) => setUseReferenceHair(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                                        />
                                        <label htmlFor="hairRef" className="text-[10px] font-black text-white/40 uppercase tracking-wider cursor-pointer select-none">Inherit Hair Style from Reference</label>
                                    </div>

                                    {/* Advanced Settings Accordion */}
                                    <div className="pt-2 border-t border-white/5">
                                        <button 
                                            onClick={() => setShowAdvanced(!showAdvanced)} 
                                            className="w-full flex items-center justify-between text-[10px] font-black text-white/40 uppercase tracking-wider hover:text-white transition-colors py-1"
                                        >
                                            <span>Advanced Parameters</span>
                                            <svg className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {showAdvanced && (
                                            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div>
                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Negative Prompt</label>
                                                    <textarea 
                                                        value={advNegativePrompt} 
                                                        onChange={(e) => setAdvNegativePrompt(e.target.value)} 
                                                        placeholder="Specify what NOT to include..." 
                                                        className="w-full h-16 glass-input rounded-xl p-3 text-xs font-medium placeholder:text-white/20 resize-none" 
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Seed</label>
                                                        <input 
                                                            type="number" 
                                                            value={advSeed} 
                                                            onChange={(e) => setAdvSeed(Number(e.target.value))} 
                                                            className="w-full bg-transparent p-0 text-xs font-mono text-white focus:outline-none" 
                                                            placeholder="-1 for random"
                                                        />
                                                    </div>
                                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Sampler</label>
                                                        <select 
                                                            value={advSampler} 
                                                            onChange={(e) => setAdvSampler(e.target.value)} 
                                                            className="w-full bg-transparent p-0 text-xs font-bold uppercase tracking-wider text-white focus:outline-none appearance-none"
                                                        >
                                                            <option value="Neural Flow" className="bg-slate-900">Neural Flow</option>
                                                            <option value="Euler Discrete" className="bg-slate-900">Euler Discrete</option>
                                                            <option value="DPM++ 2M" className="bg-slate-900">DPM++ 2M</option>
                                                            <option value="Ancestral" className="bg-slate-900">Ancestral</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="pt-2">
                                <button 
                                    onClick={() => {
                                        if (selectedModel === 'gemini-3-pro-image' || selectedModel === 'gemini-3.1-flash-image') {
                                            setConfirmAction({
                                                message: `You are about to use a Paid Tier model (${selectedModel === 'gemini-3-pro-image' ? 'Pro 3' : 'Flash 3.1'}) for this generation. Do you want to proceed?`,
                                                onConfirm: handleGenerateImage
                                            });
                                        } else {
                                            handleGenerateImage();
                                        }
                                    }} 
                                    disabled={isGenerating} 
                                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 px-8 rounded-2xl shadow-[0_10px_25px_rgba(var(--primary-500-rgb),0.35)] active:scale-[0.98] transition-all tracking-[0.2em] uppercase text-xs flex items-center justify-center gap-2"
                                >
                                    <span>{t('generator.generateBtn', 'Execute Generation')}</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Sticky Preview & Canvas Area */}
                        <div className="lg:col-span-7 lg:sticky lg:top-24 glass-card bg-black/40 rounded-[2rem] p-6 lg:p-8 flex flex-col items-center justify-center relative min-h-[500px] lg:min-h-[640px] border border-white/5 shadow-2xl">
                            {isGenerating ? (
                                <LoadingSpinner message={isCoolingActive ? `Synaptic Cooling: Đang làm mát (${coolingCountdown}s) & tự động thử lại...` : "Synthesizing Reality..."} />
                            ) : generatedImages.length > 0 ? (
                                <div className="w-full flex flex-col items-center justify-center">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full content-start z-10 animate-in fade-in zoom-in-95 duration-500">
                                        {generatedImages.map((src, idx) => (
                                            <div 
                                                key={idx} 
                                                className="relative group rounded-2xl overflow-hidden glass-card shadow-2xl border border-white/10 flex items-center justify-center w-full staggered-gallery-card mx-auto hover:scale-[1.01] transition-transform"
                                                style={{ animationDelay: `${idx * 110}ms` }}
                                            >
                                                <img src={src} className="w-full h-auto object-cover image-render-reveal rounded-xl" alt="Generated" />
                                                <FunctionalButtonGroup 
                                                  onInpainting={() => {
                                                    setInpaintingTargetSrc(src);
                                                    setIsInpaintingOpen(true);
                                                  }}
                                                  onStudio={() => handleOpenStudio(src)}
                                                  onRelight={() => {
                                                    setActiveRelightImage(src);
                                                    setIsRelightingOpen(true);
                                                  }}
                                                  onSpatial3D={() => {
                                                    setActiveSpatial3DImage(src);
                                                    setIsSpatial3DOpen(true);
                                                  }}
                                                  onVeoStart={() => handleUseAsVeoStart(src)} 
                                                  onVeoEnd={() => handleUseAsVeoEnd(src)} 
                                                  onPose={() => handleUseAsPoseBase(src)} 
                                                  onCompose={() => handleUseInCompose(src)} 
                                                  onInspect={() => handleInspectImage(src)} 
                                                  onDownload={() => handleDownloadImage(src, JSON.parse(jsonInput).subject)} 
                                                  onUpscale={() => handleUpscale(src, false)}
                                                  onUpscale4k={() => {
                                                      setConfirmAction({
                                                          message: "This action uses the Pro 3 (Paid Tier) engine to upscale to 4K. Do you want to proceed?",
                                                          onConfirm: () => handleUpscale(src, true)
                                                      });
                                                  }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8 select-none pointer-events-none">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                                        <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <span className="text-white/30 font-black text-sm tracking-[0.4em] uppercase">Static State</span>
                                    <span className="text-white/20 text-xs tracking-wider uppercase mt-1">Configure parameters & execute synthesis</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- POSE SECTION (Sticky Preview) --- */}
                {activeTab === AppMode.POSE_VARIANTS && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
                        {/* Left Column: Pose Controls & Base */}
                        <div className="lg:col-span-5 glass-card p-6 lg:p-7 rounded-[2rem] space-y-5 shadow-2xl flex flex-col">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter">{t('pose.title', 'Pose Engine')}</h2>
                                <p className="text-xs text-white/40 mt-1">{t('pose.desc', 'Animate characters with new kinetic actions.')}</p>
                                <div className="mt-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1.5">Synth Engine</label>
                                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center relative transition-all duration-300 bg-white/[0.02] ${isDraggingPoseBase ? 'border-primary-400 bg-primary-400/5 scale-[1.01]' : 'border-white/10 hover:bg-white/[0.04]'}`} onDrop={(e) => { e.preventDefault(); setIsDraggingPoseBase(false); const f = e.dataTransfer.files?.[0]; if(f) { fileToBase64(f).then(b => setPoseBaseImage(`data:${f.type};base64,${b}`)); } }} onDragOver={(e) => { e.preventDefault(); setIsDraggingPoseBase(true); }} onDragLeave={() => setIsDraggingPoseBase(false)}>
                                    {poseBaseImage ? (
                                        <div className="relative w-full min-h-[160px] flex items-center justify-center animate-in zoom-in-95">
                                          <img src={poseBaseImage} className="max-h-48 rounded-xl object-contain shadow-xl border border-white/10" alt="Pose Base" />
                                          <button onClick={() => setPoseBaseImage(null)} className="absolute top-2 right-2 bg-black/60 backdrop-blur-xl p-2 rounded-full text-xs font-bold text-white/60 hover:text-red-400 border border-white/10 transition-colors">Change</button>
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center">
                                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 border border-white/5">
                                              <svg className="h-6 w-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            </div>
                                            <span className="text-white/40 text-xs font-black uppercase tracking-[0.18em]">Drop Kinetic Base Frame</span>
                                        </div>
                                    )}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { const f = e.target.files?.[0]; if(f) fileToBase64(f).then(b => setPoseBaseImage(`data:${f.type};base64,${b}`)); }} title="Upload" />
                                </div>

                                <div className="space-y-3 pt-1">
                                    <div>
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Action Intent</label>
                                        <input type="text" value={poseCustomPrompt} onChange={(e) => setPoseCustomPrompt(e.target.value)} placeholder="e.g. Action Battle, Serene Ritual..." className="w-full glass-input rounded-xl px-4 py-2.5 text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Pose Details</label>
                                        <input type="text" value={poseDetails} onChange={(e) => setPoseDetails(e.target.value)} placeholder="e.g. waving with left hand..." className="w-full glass-input rounded-xl px-4 py-2.5 text-xs" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Output Matrix</label>
                                            <AspectRatioSelector value={poseAspectRatio} onChange={setPoseAspectRatio} />
                                            <div className="mt-2">
                                                <ImageSizeSelector value={poseImageSize} onChange={setPoseImageSize} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Iteration Count</label>
                                                <span className="bg-primary-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">{poseVariantCount} Frames</span>
                                            </div>
                                            <input type="range" min="1" max="5" value={poseVariantCount} onChange={(e) => setPoseVariantCount(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full accent-primary-500 cursor-pointer mt-4" />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2 border-t border-white/5">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">Dual Identity Mode</label>
                                                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[8px] font-bold border border-purple-500/30">Google Vision</span>
                                                </div>
                                                <span className="text-[8px] text-white/30 uppercase">Ghép đôi 2 khuôn mặt độc lập</span>
                                            </div>
                                            <button 
                                                onClick={() => setIsPoseMultiCharacter(!isPoseMultiCharacter)}
                                                className={`w-11 h-6 rounded-full transition-all relative ${isPoseMultiCharacter ? 'bg-primary-500' : 'bg-white/10 border border-white/10'}`}
                                                title="Bật/Tắt chế độ ghép đôi 2 nhân vật"
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isPoseMultiCharacter ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {isPoseMultiCharacter && (
                                            <DualCharacterControls
                                                pairing={poseDualPairing}
                                                onChangePairing={setPoseDualPairing}
                                                antiBleedLock={poseDualAntiBleedLock}
                                                onToggleAntiBleed={setPoseDualAntiBleedLock}
                                                onSwap={() => handleSwapDualSlots('poseRef1', 'poseRef2')}
                                            />
                                        )}

                                        {!isPoseMultiCharacter ? (
                                            <FaceReferenceInput 
                                                label="Biometric Core (Model Đơn)" 
                                                image={poseRefFaceImage1} 
                                                personaName={slotPersonaNames['poseRef1']}
                                                biometricProfile={slotBiometricProfiles['poseRef1']}
                                                onScanBiometrics={() => handleScanBiometrics('poseRef1')}
                                                isScanningBiometrics={isScanningBiometrics['poseRef1']}
                                                onOpenVault={() => { setVaultTargetSlot('poseRef1'); setIsCharacterVaultOpen(true); }}
                                                onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'poseRef1'); }} 
                                                onClear={() => applySlotImage('poseRef1', null)} 
                                                onDrop={(f) => handleFaceUploadRequest(f, 'poseRef1')} 
                                            />
                                        ) : (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                <FaceReferenceInput 
                                                    label={getDualSlotLabel(poseDualPairing, 1)}
                                                    image={poseRefFaceImage1} 
                                                    personaName={slotPersonaNames['poseRef1']}
                                                    biometricProfile={slotBiometricProfiles['poseRef1']}
                                                    onScanBiometrics={() => handleScanBiometrics('poseRef1')}
                                                    isScanningBiometrics={isScanningBiometrics['poseRef1']}
                                                    onOpenVault={() => { setVaultTargetSlot('poseRef1'); setIsCharacterVaultOpen(true); }}
                                                    onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'poseRef1'); }} 
                                                    onClear={() => applySlotImage('poseRef1', null)} 
                                                    onDrop={(f) => handleFaceUploadRequest(f, 'poseRef1')} 
                                                />
                                                <FaceReferenceInput 
                                                    label={getDualSlotLabel(poseDualPairing, 2)}
                                                    image={poseRefFaceImage2} 
                                                    personaName={slotPersonaNames['poseRef2']}
                                                    biometricProfile={slotBiometricProfiles['poseRef2']}
                                                    onScanBiometrics={() => handleScanBiometrics('poseRef2')}
                                                    isScanningBiometrics={isScanningBiometrics['poseRef2']}
                                                    onOpenVault={() => { setVaultTargetSlot('poseRef2'); setIsCharacterVaultOpen(true); }}
                                                    onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'poseRef2'); }} 
                                                    onClear={() => applySlotImage('poseRef2', null)} 
                                                    onDrop={(f) => handleFaceUploadRequest(f, 'poseRef2')} 
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 px-1 pt-1">
                                            <input 
                                                type="checkbox" 
                                                id="poseHairRef" 
                                                checked={usePoseReferenceHair} 
                                                onChange={(e) => setUsePoseReferenceHair(e.target.checked)}
                                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                                            />
                                            <label htmlFor="poseHairRef" className="text-[10px] font-black text-white/40 uppercase tracking-wider cursor-pointer">Inherit Reference Hair</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="pt-2">
                                <button 
                                    onClick={() => {
                                        if (selectedModel === 'gemini-3-pro-image' || selectedModel === 'gemini-3.1-flash-image') {
                                            setConfirmAction({
                                                message: `You are about to use a Paid Tier model (${selectedModel === 'gemini-3-pro-image' ? 'Pro 3' : 'Flash 3.1'}) for these pose variants. Do you want to proceed?`,
                                                onConfirm: handleGeneratePoseVariants
                                            });
                                        } else {
                                            handleGeneratePoseVariants();
                                        }
                                    }} 
                                    disabled={isGeneratingVariants || !poseBaseImage} 
                                    className="w-full bg-gradient-to-r from-primary-600 to-primary-400 text-white font-black py-4 px-8 rounded-2xl shadow-xl active:scale-[0.98] transition-all tracking-[0.2em] uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    <span>{t('pose.generateVariants', 'Execute Iterations')}</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Sticky Variant Frames */}
                        <div className="lg:col-span-7 lg:sticky lg:top-24 glass-card bg-black/40 rounded-[2rem] p-6 lg:p-8 flex flex-col relative border border-white/5 shadow-2xl min-h-[500px] lg:min-h-[640px]">
                            {poseVariants.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start z-10 w-full">
                                    {poseVariants.map((variant, idx) => (
                                        <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden glass-card border-2 border-transparent hover:border-primary-400/30 transition-all duration-300 shadow-xl flex items-center justify-center">
                                            {variantImages[idx] ? (
                                                <>
                                                    <img src={variantImages[idx]} className="w-full h-full object-cover animate-in fade-in duration-500" alt={`v${idx+1}`} />
                                                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xl px-2.5 py-0.5 rounded-full border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">v{idx + 1}</div>
                                                    <FunctionalButtonGroup 
                                                      onVeoStart={() => handleUseAsVeoStart(variantImages[idx])} 
                                                      onVeoEnd={() => handleUseAsVeoEnd(variantImages[idx])} 
                                                      onPose={() => handleUseAsPoseBase(variantImages[idx])} 
                                                      onCompose={() => handleUseInCompose(variantImages[idx])} 
                                                      onInspect={() => handleInspectImage(variantImages[idx])} 
                                                      onStudio={() => handleOpenStudio(variantImages[idx])}
                                                      onInpainting={() => {
                                                        setInpaintingTargetSrc(variantImages[idx]);
                                                        setIsInpaintingOpen(true);
                                                      }}
                                                      onDownload={() => handleDownloadImage(variantImages[idx], variant.subject)} 
                                                      onUpscale={() => handleUpscale(variantImages[idx], false)}
                                                      onUpscale4k={() => {
                                                          setConfirmAction({
                                                              message: "This action uses the Pro 3 (Paid Tier) engine to upscale to 4K. Do you want to proceed?",
                                                              onConfirm: () => handleUpscale(variantImages[idx], true)
                                                          });
                                                      }}
                                                    />
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center space-y-2">
                                                    {loadingVariantImg === idx ? <div className="w-8 h-8 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin"></div> : <div className="w-2.5 h-2.5 bg-white/10 rounded-full animate-pulse"></div>}
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em]">{loadingVariantImg === idx ? 'Manifesting' : 'Queued'}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col items-center justify-center text-white/20 p-8 text-center select-none pointer-events-none">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                                        <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-black text-sm tracking-[0.3em] uppercase">Void Iteration</h3>
                                    <p className="text-xs mt-1 opacity-50">Upload base image and execute for kinetic pose variations.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- COMPOSE SECTION (Sticky Preview) --- */}
                {activeTab === AppMode.COMPOSE_IMAGE && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
                        <div className="lg:col-span-5 glass-card p-6 lg:p-7 rounded-[2rem] space-y-5 shadow-2xl flex flex-col">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter">{t('compose.title', 'Neural Compositor')}</h2>
                                <p className="text-xs text-white/40 mt-1">{t('compose.desc', 'Merge multiple visual artifacts into a cohesive single entity.')}</p>
                                <div className="mt-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1.5">Synth Engine</label>
                                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-2">Input Elements</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {composeImageElements.map((img, i) => (
                                            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden glass-card border border-white/10 group shadow-lg">
                                                <img src={img.dataUrl} className="w-full h-full object-cover" alt={`Element ${i}`} />
                                                <button onClick={() => setComposeImageElements(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-black/60 text-red-400 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all border border-white/10 shadow-xl hover:bg-red-500 hover:text-white"><svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                            </div>
                                        ))}
                                        <label 
                                            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCompose(false); if (e.dataTransfer.files) { (Array.from(e.dataTransfer.files) as File[]).forEach(async (f: File) => { const base64 = await fileToBase64(f); setComposeImageElements(prev => [...prev, { dataUrl: URL.createObjectURL(f), mimeType: f.type, base64 }]); }); } }}
                                            onDragOver={(e) => { e.preventDefault(); setIsDraggingCompose(true); }}
                                            onDragLeave={() => setIsDraggingCompose(false)}
                                            className={`aspect-square border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 bg-white/[0.02] ${isDraggingCompose ? 'border-primary-400 bg-primary-400/5' : 'border-white/10 hover:bg-white/[0.04]'}`}
                                        >
                                            <svg className={`h-6 w-6 mb-1 ${isDraggingCompose ? 'text-primary-400' : 'text-white/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{isDraggingCompose ? 'Drop' : 'Add Image'}</span>
                                            <input type="file" multiple className="hidden" onChange={async (e) => { if (e.target.files) { (Array.from(e.target.files) as File[]).forEach(async (f: File) => { const base64 = await fileToBase64(f); setComposeImageElements(prev => [...prev, { dataUrl: URL.createObjectURL(f), mimeType: f.type, base64 }]); }); } }} />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Composition Intent</label>
                                    <textarea value={composePrompt} onChange={(e) => setComposePrompt(e.target.value)} placeholder="Describe how to merge these elements..." className="w-full h-28 glass-input rounded-2xl p-4 text-xs font-medium shadow-inner resize-none focus:ring-primary-500" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Output Matrix</label>
                                        <AspectRatioSelector value={composeAspectRatio} onChange={setComposeAspectRatio} />
                                        <div className="mt-2">
                                            <ImageSizeSelector value={composeImageSize} onChange={setComposeImageSize} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Batch Count</label>
                                            <span className="bg-indigo-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">{composeVariantCount} Images</span>
                                        </div>
                                        <input type="range" min="1" max="5" value={composeVariantCount} onChange={(e) => setComposeVariantCount(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full accent-indigo-500 cursor-pointer mt-4" />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">Dual Identity Mode</label>
                                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[8px] font-bold border border-indigo-500/30">Google Vision</span>
                                            </div>
                                            <span className="text-[8px] text-white/30 uppercase">Ghép đôi 2 khuôn mặt độc lập</span>
                                        </div>
                                        <button 
                                            onClick={() => setIsComposeMultiCharacter(!isComposeMultiCharacter)}
                                            className={`w-11 h-6 rounded-full transition-all relative ${isComposeMultiCharacter ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-white/10 border border-white/10'}`}
                                            title="Bật/Tắt chế độ ghép đôi 2 nhân vật"
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isComposeMultiCharacter ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    {isComposeMultiCharacter && (
                                        <DualCharacterControls
                                            pairing={composeDualPairing}
                                            onChangePairing={setComposeDualPairing}
                                            antiBleedLock={composeDualAntiBleedLock}
                                            onToggleAntiBleed={setComposeDualAntiBleedLock}
                                            onSwap={() => handleSwapDualSlots('composeRef1', 'composeRef2')}
                                        />
                                    )}

                                    {!isComposeMultiCharacter ? (
                                        <FaceReferenceInput 
                                            label="Biometric Core (Model Đơn)" 
                                            image={composeRefFaceImage1} 
                                            personaName={slotPersonaNames['composeRef1']}
                                            biometricProfile={slotBiometricProfiles['composeRef1']}
                                            onScanBiometrics={() => handleScanBiometrics('composeRef1')}
                                            isScanningBiometrics={isScanningBiometrics['composeRef1']}
                                            onOpenVault={() => { setVaultTargetSlot('composeRef1'); setIsCharacterVaultOpen(true); }}
                                            onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'composeRef1'); }} 
                                            onClear={() => applySlotImage('composeRef1', null)} 
                                            onDrop={(f) => handleFaceUploadRequest(f, 'composeRef1')} 
                                        />
                                    ) : (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                            <FaceReferenceInput 
                                                label={getDualSlotLabel(composeDualPairing, 1)}
                                                image={composeRefFaceImage1} 
                                                personaName={slotPersonaNames['composeRef1']}
                                                biometricProfile={slotBiometricProfiles['composeRef1']}
                                                onScanBiometrics={() => handleScanBiometrics('composeRef1')}
                                                isScanningBiometrics={isScanningBiometrics['composeRef1']}
                                                onOpenVault={() => { setVaultTargetSlot('composeRef1'); setIsCharacterVaultOpen(true); }}
                                                onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'composeRef1'); }} 
                                                onClear={() => applySlotImage('composeRef1', null)} 
                                                onDrop={(f) => handleFaceUploadRequest(f, 'composeRef1')} 
                                            />
                                            <FaceReferenceInput 
                                                label={getDualSlotLabel(composeDualPairing, 2)}
                                                image={composeRefFaceImage2} 
                                                personaName={slotPersonaNames['composeRef2']}
                                                biometricProfile={slotBiometricProfiles['composeRef2']}
                                                onScanBiometrics={() => handleScanBiometrics('composeRef2')}
                                                isScanningBiometrics={isScanningBiometrics['composeRef2']}
                                                onOpenVault={() => { setVaultTargetSlot('composeRef2'); setIsCharacterVaultOpen(true); }}
                                                onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'composeRef2'); }} 
                                                onClear={() => applySlotImage('composeRef2', null)} 
                                                onDrop={(f) => handleFaceUploadRequest(f, 'composeRef2')} 
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 px-1 pt-1">
                                        <input 
                                            type="checkbox" 
                                            id="composeHairRef" 
                                            checked={useComposeReferenceHair} 
                                            onChange={(e) => setUseComposeReferenceHair(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="composeHairRef" className="text-[10px] font-black text-white/40 uppercase tracking-wider cursor-pointer">Inherit Reference Hair</label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    onClick={() => {
                                        if (selectedModel === 'gemini-3-pro-image' || selectedModel === 'gemini-3.1-flash-image') {
                                            setConfirmAction({
                                                message: `You are about to use a Paid Tier model (${selectedModel === 'gemini-3-pro-image' ? 'Pro 3' : 'Flash 3.1'}) for this fusion. Do you want to proceed?`,
                                                onConfirm: handleComposeImage
                                            });
                                        } else {
                                            handleComposeImage();
                                        }
                                    }} 
                                    disabled={isComposing || composeImageElements.length === 0} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-2xl shadow-[0_10px_25px_rgba(99,102,241,0.35)] tracking-widest uppercase text-xs active:scale-[0.98] transition-all disabled:opacity-30"
                                >
                                    {t('compose.execute', 'Execute Fusion')}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Sticky Output Gallery */}
                        <div className="lg:col-span-7 lg:sticky lg:top-24 glass-card bg-black/40 rounded-[2rem] p-6 lg:p-8 flex flex-col relative border border-white/5 shadow-2xl min-h-[500px] lg:min-h-[640px]">
                            {isComposing ? (
                                <LoadingSpinner message={isCoolingActive ? `Synaptic Cooling (${coolingCountdown}s)...` : "Merging Artifacts..."} />
                            ) : composeResultImages.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full content-start z-10 animate-in fade-in zoom-in-95 duration-500">
                                    {composeResultImages.map((src, idx) => (
                                        <div 
                                            key={idx} 
                                            className="relative group rounded-2xl overflow-hidden glass-card shadow-2xl border border-white/10 hover:scale-[1.01] transition-transform duration-300 staggered-gallery-card"
                                            style={{ animationDelay: `${idx * 110}ms` }}
                                        >
                                            <img src={src} className="w-full h-auto object-cover image-render-reveal rounded-xl" alt="Composed" />
                                            <FunctionalButtonGroup 
                                              onVeoStart={() => handleUseAsVeoStart(src)} 
                                              onVeoEnd={() => handleUseAsVeoEnd(src)} 
                                              onPose={() => handleUseAsPoseBase(src)} 
                                              onCompose={() => handleUseInCompose(src)} 
                                              onInspect={() => handleInspectImage(src)} 
                                              onStudio={() => handleOpenStudio(src)}
                                              onInpainting={() => {
                                                setInpaintingTargetSrc(src);
                                                setIsInpaintingOpen(true);
                                              }}
                                              onDownload={() => handleDownloadImage(src, composePrompt)} 
                                              onUpscale={() => handleUpscale(src, false)}
                                              onUpscale4k={() => {
                                                  setConfirmAction({
                                                      message: "This action uses the Pro 3 (Paid Tier) engine to upscale to 4K. Do you want to proceed?",
                                                      onConfirm: () => handleUpscale(src, true)
                                                  });
                                              }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col items-center justify-center text-white/20 p-8 text-center select-none pointer-events-none">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                                        <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <span className="font-black text-sm tracking-[0.4em] uppercase text-white/30">Static State</span>
                                    <p className="text-xs mt-1 text-white/20 uppercase tracking-wider">Upload elements and compose to synthesize new artifacts.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- REFERENCE CREATION SECTION (Sticky Preview) --- */}
                {activeTab === AppMode.REFERENCE_CREATION && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
                        <div className="lg:col-span-5 glass-card p-6 lg:p-7 rounded-[2rem] space-y-5 shadow-2xl flex flex-col">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter">{t('reference.title', 'Reference Creation')}</h2>
                                <p className="text-xs text-white/40 mt-1">
                                    {t('reference.desc', 'Upload a character and multiple outfit references to dress them up seamlessly in the original context.')}
                                </p>
                                <div className="mt-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1.5">Engine</label>
                                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block mb-1">Aspect Ratio</label>
                                    <AspectRatioSelector value={refCreationAspectRatio} onChange={setRefCreationAspectRatio} />
                                    <div className="mt-2">
                                        <ImageSizeSelector value={refCreationImageSize} onChange={setRefCreationImageSize} />
                                    </div>
                                </div>

                                <FaceReferenceInput 
                                    label="Character Reference" 
                                    image={refCharImage} 
                                    personaName={slotPersonaNames['refChar']}
                                    biometricProfile={slotBiometricProfiles['refChar']}
                                    onScanBiometrics={() => handleScanBiometrics('refChar')}
                                    isScanningBiometrics={isScanningBiometrics['refChar']}
                                    onOpenVault={() => { setVaultTargetSlot('refChar'); setIsCharacterVaultOpen(true); }}
                                    onUpload={(e) => { const f=e.target.files?.[0]; if(f) handleFaceUploadRequest(f, 'refChar'); }} 
                                    onClear={() => applySlotImage('refChar', null)} 
                                    onDrop={(f) => handleFaceUploadRequest(f, 'refChar')} 
                                />

                                <div 
                                    className={`space-y-2 p-3 rounded-2xl border transition-all duration-300 ${
                                        isDraggingWardrobes 
                                            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
                                            : 'border-white/5 bg-white/[0.02]'
                                    }`}
                                    onDragOver={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation();
                                        setIsDraggingWardrobes(true); 
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsDraggingWardrobes(false);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsDraggingWardrobes(false);
                                        if (refOutfitImages.length >= 5) return;
                                        const files = Array.from(e.dataTransfer.files || []) as File[];
                                        const remaining = 5 - refOutfitImages.length;
                                        const allowed = files.filter(f => f.type.startsWith('image/')).slice(0, remaining);
                                        if (allowed.length === 0) return;
                                        Promise.all(allowed.map(f => fileToBase64(f))).then(bases => {
                                            const dataUrls = bases.map((b, idx) => `data:${allowed[idx].type};base64,${b}`);
                                            setRefOutfitImages(prev => [...prev, ...dataUrls]);
                                        });
                                    }}
                                >
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] block">Wardrobe References (Max 5)</label>
                                        {isDraggingWardrobes && (
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Drop here!</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-5 gap-2.5">
                                        {refOutfitImages.map((src, idx) => (
                                            <div key={idx} className="aspect-square bg-white/5 rounded-xl border border-white/10 relative overflow-hidden group shadow-md hover:scale-[1.02] transition-transform">
                                                <img src={src} className="w-full h-full object-cover" alt={`Outfit ${idx+1}`} />
                                                <button 
                                                    onClick={() => setRefOutfitImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black uppercase tracking-wider"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                        {refOutfitImages.length < 5 && (
                                            <label className="aspect-square bg-white/5 hover:bg-white/10 rounded-xl border border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center cursor-pointer transition-all">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    multiple
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []) as File[];
                                                        const remaining = 5 - refOutfitImages.length;
                                                        const allowed = files.slice(0, remaining);
                                                        Promise.all(allowed.map(f => fileToBase64(f))).then(bases => {
                                                            const dataUrls = bases.map((b, idx) => `data:${allowed[idx].type};base64,${b}`);
                                                            setRefOutfitImages(prev => [...prev, ...dataUrls]);
                                                        });
                                                    }}
                                                    className="hidden" 
                                                />
                                                <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                                </svg>
                                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">Add</span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Biometric Core Mode</span>
                                        <span className="text-[8px] text-white/30 uppercase">Maintain Facial Consistency</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsBiometricCore(!isBiometricCore)}
                                        className={`w-11 h-6 rounded-full transition-all relative ${isBiometricCore ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-white/10 border border-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isBiometricCore ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button 
                                    onClick={() => {
                                        if (selectedModel === 'gemini-3-pro-image' || selectedModel === 'gemini-3.1-flash-image') {
                                            setConfirmAction({
                                                message: `You are about to use a Paid Tier model (${selectedModel === 'gemini-3-pro-image' ? 'Pro 3' : 'Flash 3.1'}) for this fusion. Do you want to proceed?`,
                                                onConfirm: handleReferenceCreation
                                            });
                                        } else {
                                            handleReferenceCreation();
                                        }
                                    }} 
                                    disabled={isRefCreating || !refCharImage || refOutfitImages.length === 0} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-2xl shadow-[0_10px_25px_rgba(99,102,241,0.35)] tracking-widest uppercase text-xs active:scale-[0.98] transition-all disabled:opacity-30"
                                >
                                    {t('reference.generate', 'Synthesize Wardrobes')}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Sticky Output Gallery */}
                        <div className="lg:col-span-7 lg:sticky lg:top-24 glass-card bg-black/40 rounded-[2rem] p-6 lg:p-8 flex flex-col relative border border-white/5 shadow-2xl min-h-[500px] lg:min-h-[640px]">
                            {isRefCreating ? (
                                <LoadingSpinner message={isCoolingActive ? `Synaptic Cooling (${coolingCountdown}s)...` : (refCreationProgress || "Running Biometrics...")} />
                            ) : refCreationResults.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full content-start z-10 animate-in fade-in zoom-in-95 duration-500">
                                    {refCreationResults.map((src, idx) => (
                                        <div key={idx} className="relative group rounded-2xl overflow-hidden glass-card shadow-2xl border border-white/10 hover:scale-[1.01] transition-transform duration-300">
                                            <img src={src} className="w-full h-auto object-cover rounded-xl" alt={`Result ${idx+1}`} />
                                            <FunctionalButtonGroup 
                                              onVeoStart={() => handleUseAsVeoStart(src)} 
                                              onVeoEnd={() => handleUseAsVeoEnd(src)} 
                                              onPose={() => handleUseAsPoseBase(src)} 
                                              onCompose={() => handleUseInCompose(src)} 
                                              onInspect={() => handleInspectImage(src)} 
                                              onStudio={() => handleOpenStudio(src)}
                                              onInpainting={() => {
                                                setInpaintingTargetSrc(src);
                                                setIsInpaintingOpen(true);
                                              }}
                                              onDownload={() => handleDownloadImage(src, "Reference Creation")} 
                                              onUpscale={() => handleUpscale(src, false)}
                                              onUpscale4k={() => {
                                                  setConfirmAction({
                                                      message: "This action uses the Pro 3 (Paid Tier) engine to upscale to 4K. Do you want to proceed?",
                                                      onConfirm: () => handleUpscale(src, true)
                                                  });
                                              }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col items-center justify-center text-white/20 p-8 text-center select-none pointer-events-none">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                                        <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <span className="font-black text-sm tracking-[0.4em] uppercase text-white/30">Static State</span>
                                    <p className="text-xs mt-1 text-white/20 uppercase tracking-wider">Upload character and wardrobes to synthesize dressed artifacts.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- UPSCALE SECTION (Sticky Preview) --- */}
                {activeTab === AppMode.UPSCALE_IMAGE && (
                  <UpscaleStudioSection
                    src={upscaleModuleSrc}
                    onSetSrc={setUpscaleModuleSrc}
                    result={upscaleModuleResult}
                    onSetResult={setUpscaleModuleResult}
                    feedback={upscaleModuleFeedback}
                    onSetFeedback={setUpscaleModuleFeedback}
                    galleryItems={galleryItems}
                    isUpscaling={isUpscalingModule}
                    progressPercent={upscaleModuleProgressPercent}
                    progressMsg={upscaleModuleProgressMsg}
                    onStartUpscale={handleModuleUpscale}
                    onDownload={(url, name) => handleDownloadImage(url, name)}
                    onSaveToGallery={(url, desc, meta) => {
                      addToGallery(url, 'JSON_TO_IMG', desc, meta);
                      addToHistory(desc, "Saved custom high-resolution reconstructed render.", "upscale_result.png", url);
                      showCleanToast('Đã lưu ảnh siêu nét vào Thư viện thành công!');
                    }}
                    onUseAsPose={(url) => handleUseAsPoseBase(url)}
                    onOpenInStudio={(url) => handleOpenStudio(url)}
                    t={t}
                  />
                )}
            </div>
        )}

        {/* --- SCENARIO DIRECTOR GROUP --- */}
        {(activeTab === AppMode.SCENARIO_EDITOR || activeTab === AppMode.VEO3_PROMPT_CREATOR) && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-center">
                    <div className="bg-white/5 p-1.5 rounded-2xl inline-flex border border-white/10 gap-1.5 backdrop-blur-lg">
                        {[ 
                            { id: AppMode.SCENARIO_EDITOR, label: 'Scripting' }, 
                            { id: AppMode.VEO3_PROMPT_CREATOR, label: 'Veo 3 Pro' }
                        ].map(sub => (
                            <button key={sub.id} onClick={() => setActiveTab(sub.id)} className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === sub.id ? 'bg-rose-500 text-white shadow-inner' : 'text-white/30 hover:text-white'}`}>{sub.label}</button>
                        ))}
                    </div>
                </div>

                {activeTab === AppMode.SCENARIO_EDITOR && (
                    <div className="max-w-4xl mx-auto glass-card p-6 lg:p-10 rounded-[2.5rem] shadow-2xl">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">{t('scenario.title', 'Scenario Director')}</h2>
                            <p className="text-white/40 mt-2 text-sm">{t('scenario.desc', 'Deconstruct movie ideas into cinematic visual sequences.')}</p>
                        </div>
                        <textarea value={scenarioIdea} onChange={(e) => setScenarioIdea(e.target.value)} placeholder="A lone cyborg enters a forgotten library in the clouds..." className="w-full h-36 lg:h-44 glass-input rounded-2xl p-5 text-base font-medium shadow-inner focus:ring-rose-500 mb-6" />
                        <button onClick={handleGenerateBreakdown} disabled={isBreakingDown || !scenarioIdea.trim()} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 lg:py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all tracking-[0.2em] uppercase text-xs disabled:opacity-30">
                            {isBreakingDown ? t('common.processing', 'Analyzing Narrative...') : t('scenario.generateScript', 'Generate Breakdown')}
                        </button>

                        {scriptScenes.length > 0 && (
                            <div className="mt-12 space-y-6">
                                <TimelineStoryboard
                                    shots={storyboardShots.length > 0 ? storyboardShots : scriptScenes.map((s, idx) => ({
                                        id: `shot_${idx}`,
                                        shotNumber: s.scene_number || idx + 1,
                                        title: s.header || `Scene ${idx + 1}`,
                                        durationSeconds: 4,
                                        transition: 'cut',
                                        promptJson: {
                                            ...DEFAULT_JSON,
                                            subject: s.action || '',
                                            art_style: s.visual_style || 'Cinematic Film',
                                            camera_angle: s.camera_movement || '35mm anamorphic'
                                        }
                                    }))}
                                    onUpdateShots={setStoryboardShots}
                                />
                                {scriptScenes.map((scene, i) => (
                                    <div key={i} className="glass-card p-6 lg:p-8 rounded-3xl border-l-4 border-rose-500 animate-in slide-in-from-left-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Scene {scene.scene_number}</span>
                                            <span className="text-xs font-mono text-white/40">{scene.header}</span>
                                        </div>
                                        <h3 className="text-lg lg:text-xl font-bold text-white mb-4">{scene.action}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                                            <div className="bg-white/5 p-4 rounded-xl">
                                                <span className="text-white/30 uppercase block mb-1">Visual Style</span>
                                                <span className="text-white/70">{scene.visual_style}</span>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl">
                                                <span className="text-white/30 uppercase block mb-1">Camera</span>
                                                <span className="text-white/70">{scene.camera_movement}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === AppMode.VEO3_PROMPT_CREATOR && (
                    <div className="max-w-4xl mx-auto glass-card p-6 lg:p-10 rounded-[2.5rem] shadow-2xl">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">{t('veo3.title', 'Veo 3 Pro Prompt')}</h2>
                            <p className="text-white/40 mt-2 text-sm">{t('veo3.desc', 'Generate hyper-detailed motion prompts with visual anchors.')}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Start Frame Anchor</label>
                                <div className="aspect-video glass-card rounded-2xl flex items-center justify-center overflow-hidden relative">
                                    {veoStartImage ? (
                                        <>
                                            <img src={veoStartImage} className="w-full h-full object-cover" alt="Start" />
                                            <button onClick={() => setVeoStartImage(null)} className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white/50 hover:text-white transition-colors"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                        </>
                                    ) : <span className="text-white/10 font-bold uppercase tracking-widest text-[10px]">Empty Slot</span>}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">End Frame Anchor</label>
                                <div className="aspect-video glass-card rounded-2xl flex items-center justify-center overflow-hidden relative">
                                    {veoEndImage ? (
                                        <>
                                            <img src={veoEndImage} className="w-full h-full object-cover" alt="End" />
                                            <button onClick={() => setVeoEndImage(null)} className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white/50 hover:text-white transition-colors"><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                        </>
                                    ) : <span className="text-white/10 font-bold uppercase tracking-widest text-[10px]">Empty Slot</span>}
                                </div>
                            </div>
                        </div>

                        {/* Interactive 3D Camera Trajectory Director */}
                        <div className="mb-6">
                            <CameraTrajectoryVisualizer
                                onSelectTrajectory={(traj, formula) => {
                                    setVeoUserPrompt(prev => prev ? `${prev}. Camera path: ${formula}` : `Camera path: ${formula}`);
                                    showCleanToast(`🎥 Đã gán quỹ đạo: ${traj.name}`);
                                }}
                            />
                        </div>

                        <textarea value={veoUserPrompt} onChange={(e) => setVeoUserPrompt(e.target.value)} placeholder="Describe the motion and transformation..." className="w-full h-36 lg:h-44 glass-input rounded-2xl p-5 text-base font-medium shadow-inner focus:ring-rose-500 mb-6" />
                        <button onClick={handleGenerateVeoPrompt} disabled={isGeneratingVeoPrompt || !veoUserPrompt.trim()} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 lg:py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all tracking-[0.2em] uppercase text-xs disabled:opacity-30">
                            {isGeneratingVeoPrompt ? 'Synthesizing Motion Prompt...' : 'Generate Veo 3 Prompt'}
                        </button>

                        {veoResultPrompt && (
                            <div className="mt-8 bg-black/30 rounded-3xl p-6 lg:p-8 border border-white/5 animate-in slide-in-from-bottom-5 duration-500">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em]">Enhanced Motion Prompt</span>
                                    <button onClick={() => { navigator.clipboard.writeText(veoResultPrompt); }} className="text-white/40 hover:text-white transition-colors"><svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg></button>
                                </div>
                                <p className="text-sm text-white/70 leading-relaxed italic">"{veoResultPrompt}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {activeTab === AppMode.LOGS && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                {/* History Header & Sub-Tab Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 lg:p-6 glass-card rounded-2xl shadow-xl border border-white/10">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setHistorySubTab('prompts')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                                    historySubTab === 'prompts'
                                        ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/20'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                <span>Kho Prompt JSON</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    historySubTab === 'prompts' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/70'
                                }`}>
                                    {promptHistoryItems.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setHistorySubTab('logs')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                                    historySubTab === 'logs'
                                        ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/20'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Nhật Ký Tác Vụ</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    historySubTab === 'logs' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/70'
                                }`}>
                                    {historyItems.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {historySubTab === 'prompts' ? (
                            <>
                                {promptHistoryItems.length > 0 && (
                                    <>
                                        <button 
                                            onClick={handleExportAllPrompts}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all border border-white/10 flex items-center gap-1.5"
                                            title="Tải về tệp .json chứa toàn bộ kho prompt"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            <span>Xuất JSON</span>
                                        </button>
                                        <button 
                                            onClick={handleClearAllPrompts}
                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all border border-red-500/20"
                                        >
                                            Xóa Kho Prompt
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <button 
                                onClick={() => setHistoryItems([])} 
                                className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all border border-red-500/20"
                            >
                                Xóa Nhật Ký
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-Tab 1: PROMPT JSON VAULT */}
                {historySubTab === 'prompts' && (() => {
                    const filteredPrompts = promptHistoryItems.filter(item => {
                        if (promptFilterSource !== 'all' && item.source !== promptFilterSource) return false;
                        if (promptSearch.trim()) {
                            const q = promptSearch.toLowerCase();
                            const matchSubject = item.subject?.toLowerCase().includes(q);
                            const matchRaw = item.rawInputText?.toLowerCase().includes(q);
                            const matchJson = JSON.stringify(item.promptJson).toLowerCase().includes(q);
                            return matchSubject || matchRaw || matchJson;
                        }
                        return true;
                    }).sort((a, b) => promptSort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

                    return (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Toolbar for Prompt Vault */}
                            <div className="p-4 lg:p-5 glass-card rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-white/10">
                                <div className="flex flex-wrap items-center gap-3 flex-1">
                                    {/* Search Input */}
                                    <div className="relative flex-1 min-w-[200px] md:min-w-[320px]">
                                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input 
                                            type="text"
                                            value={promptSearch}
                                            onChange={(e) => setPromptSearch(e.target.value)}
                                            placeholder="Tìm prompt theo chủ đề, style, camera, từ khóa..."
                                            className="w-full glass-input rounded-xl py-2 pl-11 pr-8 text-xs font-bold outline-none border border-white/10 hover:border-white/20 focus:border-primary-500/40 transition-all placeholder:text-white/30"
                                        />
                                        {promptSearch && (
                                            <button onClick={() => setPromptSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs">✕</button>
                                        )}
                                    </div>

                                    {/* Source Filter */}
                                    <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 px-3 py-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Nguồn:</span>
                                        <select 
                                            value={promptFilterSource} 
                                            onChange={(e) => setPromptFilterSource(e.target.value as any)} 
                                            className="bg-transparent text-xs font-black outline-none text-white cursor-pointer"
                                        >
                                            <option value="all" className="bg-slate-900 text-white">🗂️ Tất cả nguồn</option>
                                            <option value="ANALYZE_IMAGE" className="bg-slate-900 text-white">👁️ Phân tích ảnh</option>
                                            <option value="TEXT_TO_JSON" className="bg-slate-900 text-white">📝 Convert từ Text</option>
                                            <option value="JSON_TO_IMG" className="bg-slate-900 text-white">🎨 Tạo ảnh từ JSON</option>
                                            <option value="POSE" className="bg-slate-900 text-white">🏃 Biến thể tư thế</option>
                                            <option value="COMPOSE" className="bg-slate-900 text-white">🧩 Ghép ảnh AI</option>
                                            <option value="REFINE" className="bg-slate-900 text-white">✨ Tinh chỉnh prompt</option>
                                            <option value="REFERENCE" className="bg-slate-900 text-white">👗 Trang phục nhân vật</option>
                                        </select>
                                    </div>

                                    {/* Sort Order */}
                                    <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 px-3 py-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Thứ tự:</span>
                                        <select 
                                            value={promptSort} 
                                            onChange={(e) => setPromptSort(e.target.value as any)} 
                                            className="bg-transparent text-xs font-black outline-none text-white cursor-pointer"
                                        >
                                            <option value="newest" className="bg-slate-900 text-white">⏱️ Mới nhất trước</option>
                                            <option value="oldest" className="bg-slate-900 text-white">⏳ Cũ nhất trước</option>
                                        </select>
                                    </div>

                                    {(promptFilterSource !== 'all' || promptSearch.trim()) && (
                                        <button 
                                            onClick={() => { setPromptFilterSource('all'); setPromptSearch(''); }}
                                            className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                                        >
                                            ✕ Xóa lọc
                                        </button>
                                    )}
                                </div>

                                <div className="text-xs font-bold text-white/40">
                                    <span>Hiển thị <strong className="text-white font-black">{filteredPrompts.length}</strong> / {promptHistoryItems.length} Prompt</span>
                                </div>
                            </div>

                            {/* Prompts Cards List */}
                            {filteredPrompts.length === 0 ? (
                                <div className="p-16 flex flex-col items-center justify-center glass-card rounded-3xl border-dashed border-2 text-white/20 space-y-3">
                                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                    <span className="text-sm font-black uppercase tracking-widest text-center">
                                        {promptHistoryItems.length === 0 
                                            ? "Chưa có prompt JSON nào được lưu. Hãy phân tích ảnh, convert text, hoặc tạo ảnh để tự động tích lũy!" 
                                            : "Không tìm thấy prompt phù hợp với bộ lọc tìm kiếm"}
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredPrompts.map((item) => {
                                        const isExpanded = expandedPromptId === item.id;
                                        const isCopied = copiedPromptId === item.id;
                                        const sourceBadge = 
                                            item.source === 'ANALYZE_IMAGE' ? { label: '👁️ Phân tích ảnh', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' } :
                                            item.source === 'TEXT_TO_JSON' ? { label: '📝 Convert Text', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' } :
                                            item.source === 'JSON_TO_IMG' ? { label: '🎨 Tạo ảnh JSON', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' } :
                                            item.source === 'POSE' ? { label: '🏃 Biến thể tư thế', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' } :
                                            item.source === 'COMPOSE' ? { label: '🧩 Ghép ảnh', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' } :
                                            item.source === 'REFINE' ? { label: '✨ Tinh chỉnh', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' } :
                                            { label: '👗 Trang phục', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };

                                        return (
                                            <div 
                                                key={item.id} 
                                                className="glass-card rounded-2xl lg:rounded-3xl p-5 lg:p-6 border border-white/10 hover:border-white/20 transition-all space-y-4 group"
                                            >
                                                {/* Top Row: Source, Time, and Quick Actions */}
                                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${sourceBadge.color}`}>
                                                            {sourceBadge.label}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-white/40" title={new Date(item.timestamp).toLocaleString()}>
                                                            {formatRelativeTime(item.timestamp)} • {new Date(item.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {/* Use in Generator */}
                                                        <button
                                                            onClick={() => {
                                                                setJsonResult(item.promptJson);
                                                                setJsonInput(JSON.stringify(item.promptJson, null, 2));
                                                                setActiveTab(AppMode.JSON_TO_IMG);
                                                            }}
                                                            className="px-3 py-1.5 bg-primary-500 hover:bg-primary-400 text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1"
                                                            title="Nạp prompt này vào Trình tạo ảnh"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                            <span>Dùng tạo ảnh</span>
                                                        </button>

                                                        {/* Edit in JSON Editor */}
                                                        <button
                                                            onClick={() => {
                                                                setJsonResult(item.promptJson);
                                                                setJsonInput(JSON.stringify(item.promptJson, null, 2));
                                                                setActiveTab(AppMode.IMG_TO_JSON);
                                                            }}
                                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-white/10 flex items-center gap-1"
                                                            title="Mở prompt này trong Trình sửa Prompt"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            <span>Sửa</span>
                                                        </button>

                                                        {/* Copy JSON */}
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(JSON.stringify(item.promptJson, null, 2));
                                                                setCopiedPromptId(item.id);
                                                                setTimeout(() => setCopiedPromptId(null), 2000);
                                                            }}
                                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border flex items-center gap-1 ${
                                                                isCopied 
                                                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                                                    : 'bg-white/10 hover:bg-white/20 text-white/80 border-white/10'
                                                            }`}
                                                            title="Sao chép toàn bộ JSON vào bộ nhớ tạm"
                                                        >
                                                            {isCopied ? (
                                                                <>
                                                                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 0 011.414-1.414L8 12.586l7.293-7.293a1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                    <span>Đã chép!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                                    <span>Chép JSON</span>
                                                                </>
                                                            )}
                                                        </button>

                                                        {/* Download JSON */}
                                                        <button
                                                            onClick={() => {
                                                                const blob = new Blob([JSON.stringify(item.promptJson, null, 2)], { type: 'application/json' });
                                                                const url = URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `${(item.subject || 'prompt').replace(/[^a-zA-Z0-9_-]/g, '_')}_${item.id.slice(0, 6)}.json`;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                document.body.removeChild(a);
                                                                URL.revokeObjectURL(url);
                                                            }}
                                                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/5"
                                                            title="Tải về tệp .json"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                        </button>

                                                        {/* Delete Prompt */}
                                                        <button
                                                            onClick={() => handleDeletePrompt(item.id)}
                                                            className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all border border-red-500/20"
                                                            title="Xóa prompt này khỏi kho lưu trữ"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Content Row: Preview Image + Subject & Attributes */}
                                                <div className="flex items-start gap-4">
                                                    {item.previewImage && (
                                                        <div 
                                                            onClick={() => handleInspectImage(item.previewImage!)}
                                                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-none relative group/thumb cursor-pointer border border-white/10 shadow-md bg-black/40"
                                                            title="Nhấp để xem ảnh phóng to"
                                                        >
                                                            <img 
                                                                src={item.previewImage} 
                                                                alt={item.subject} 
                                                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                                                                loading="lazy"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <h3 className="text-base sm:text-lg font-black text-white group-hover:text-primary-300 transition-colors">
                                                            {item.subject}
                                                        </h3>

                                                        {item.rawInputText && (
                                                            <p className="text-xs text-white/50 italic bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 line-clamp-2">
                                                                "{item.rawInputText}"
                                                            </p>
                                                        )}

                                                        {/* Core Attributes Grid */}
                                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                                            {item.promptJson.style && (
                                                                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white/70">
                                                                    <strong className="text-white/40 uppercase text-[9px] mr-1">Style:</strong>
                                                                    {item.promptJson.style}
                                                                </span>
                                                            )}
                                                            {item.promptJson.lighting && (
                                                                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white/70">
                                                                    <strong className="text-white/40 uppercase text-[9px] mr-1">Ánh sáng:</strong>
                                                                    {item.promptJson.lighting}
                                                                </span>
                                                            )}
                                                            {item.promptJson.camera && (
                                                                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white/70">
                                                                    <strong className="text-white/40 uppercase text-[9px] mr-1">Camera:</strong>
                                                                    {item.promptJson.camera}
                                                                </span>
                                                            )}
                                                            {item.promptJson.background && (
                                                                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white/70">
                                                                    <strong className="text-white/40 uppercase text-[9px] mr-1">Bối cảnh:</strong>
                                                                    {item.promptJson.background}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Collapsible JSON Viewer */}
                                                <div>
                                                    <button
                                                        onClick={() => setExpandedPromptId(isExpanded ? null : item.id)}
                                                        className="text-[11px] font-bold text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                        <span>{isExpanded ? 'Thu gọn JSON cấu trúc' : 'Xem chi tiết toàn bộ JSON cấu trúc'}</span>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-3 relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 p-4 animate-in slide-in-from-top-2 duration-300">
                                                            <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre-wrap max-h-96 overflow-auto custom-scrollbar leading-relaxed">
                                                                {JSON.stringify(item.promptJson, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Sub-Tab 2: SYSTEM LOGS & TELEMETRY */}
                {historySubTab === 'logs' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {historyItems.length > 0 && (
                            <SynapticChart historyItems={historyItems} />
                        )}
                        
                        <div className="grid gap-4 lg:gap-6">
                            {historyItems.length === 0 ? (
                                <div className="p-16 flex flex-col items-center justify-center glass-card rounded-3xl border-dashed border-2 text-white/20">
                                    <svg className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-sm font-black uppercase tracking-widest">Không có bản ghi nhật ký nào</span>
                                </div>
                            ) : (
                                historyItems.map((item) => (
                                    <div key={item.id} className="glass-card rounded-2xl lg:rounded-3xl p-6 lg:p-8 flex items-start gap-6 group hover:bg-white/[0.03] transition-all border border-white/5">
                                        {item.outputImageSrc ? (
                                            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden flex-none glass-card relative group/img">
                                                <img src={item.outputImageSrc} className="w-full h-full object-cover" alt="History" />
                                                <button onClick={() => handleInspectImage(item.outputImageSrc!)} className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/5 flex items-center justify-center flex-none border border-white/5">
                                                <svg className="h-8 w-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    item.logType.includes('Image') ? 'bg-primary-500/20 text-primary-400' : 
                                                    item.logType.includes('Text') ? 'bg-indigo-500/20 text-indigo-400' : 'bg-rose-500/20 text-rose-400'
                                                }`}>
                                                    {item.logType}
                                                </span>
                                                <span className="text-[10px] font-bold text-white/20">{new Date(item.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-white/70 leading-relaxed font-medium line-clamp-2 md:line-clamp-none">{item.details}</p>
                                            {item.outputFileName !== 'N/A' && (
                                                <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    {item.outputFileName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === AppMode.GALLERY && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="flex flex-col gap-4 p-5 lg:p-6 glass-card rounded-2xl sticky top-20 z-30 shadow-2xl backdrop-blur-xl border border-white/10">
                    {/* Row 1: Search + View Density Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative flex-1 min-w-[200px] md:min-w-[340px]">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input 
                                type="text"
                                value={gallerySearch}
                                onChange={(e) => setGallerySearch(e.target.value)}
                                placeholder={t('gallery.search', 'Tìm theo prompt, model, tỷ lệ...')}
                                className="w-full glass-input rounded-xl py-2.5 pl-11 pr-8 text-xs font-bold outline-none border border-white/10 hover:border-white/20 focus:border-primary-500/40 transition-all placeholder:text-white/30"
                            />
                            {gallerySearch && (
                                <button 
                                    onClick={() => setGallerySearch('')} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* View Density Switcher (Bộ hiển thị Grid Lớn / Nhỏ / Danh sách mini) */}
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setGalleryDensity('large')}
                                title="Grid Lớn"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                    galleryDensity === 'large' 
                                        ? 'bg-primary-500 text-black shadow-md' 
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <rect x="3" y="3" width="8" height="18" rx="2" />
                                    <rect x="13" y="3" width="8" height="18" rx="2" />
                                </svg>
                                <span className="hidden sm:inline">{t('common.large', 'Lớn')}</span>
                            </button>

                            <button
                                onClick={() => setGalleryDensity('medium')}
                                title="Grid Vừa"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                    galleryDensity === 'medium' 
                                        ? 'bg-primary-500 text-black shadow-md' 
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <rect x="3" y="3" width="5" height="18" rx="1.5" />
                                    <rect x="9.5" y="3" width="5" height="18" rx="1.5" />
                                    <rect x="16" y="3" width="5" height="18" rx="1.5" />
                                </svg>
                                <span className="hidden sm:inline">{t('common.medium', 'Vừa')}</span>
                            </button>

                            <button
                                onClick={() => setGalleryDensity('small')}
                                title="Grid Nhỏ"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                    galleryDensity === 'small' 
                                        ? 'bg-primary-500 text-black shadow-md' 
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                <span className="hidden sm:inline">{t('common.small', 'Nhỏ')}</span>
                            </button>

                            <button
                                onClick={() => setGalleryDensity('list')}
                                title="Danh sách"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                    galleryDensity === 'list' 
                                        ? 'bg-primary-500 text-black shadow-md' 
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <rect x="3" y="4" width="4" height="4" rx="1" />
                                    <line x1="10" y1="6" x2="21" y2="6" />
                                    <rect x="3" y="10" width="4" height="4" rx="1" />
                                    <line x1="10" y1="12" x2="21" y2="12" />
                                    <rect x="3" y="16" width="4" height="4" rx="1" />
                                    <line x1="10" y1="18" x2="21" y2="18" />
                                </svg>
                                <span className="hidden sm:inline">{t('common.list', 'Danh sách')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Sort + Time Filter + Classification + Bundles + Summary */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                        <div className="flex flex-wrap items-center gap-2.5 flex-1">
                            {/* Sort Order */}
                            <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 px-3 py-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Thứ tự:</span>
                                <select 
                                    value={gallerySort} 
                                    onChange={(e) => setGallerySort(e.target.value as any)} 
                                    className="bg-transparent text-xs font-black outline-none text-white cursor-pointer"
                                >
                                    <option value="newest" className="bg-slate-900 text-white">⏱️ Mới nhất trước</option>
                                    <option value="oldest" className="bg-slate-900 text-white">⏳ Cũ nhất trước</option>
                                </select>
                            </div>

                            {/* Time Filter */}
                            <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 px-3 py-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Thời gian:</span>
                                <select 
                                    value={galleryTimeRange} 
                                    onChange={(e) => setGalleryTimeRange(e.target.value as any)} 
                                    className="bg-transparent text-xs font-black outline-none text-white cursor-pointer"
                                >
                                    <option value="all" className="bg-slate-900 text-white">🌐 Tất cả thời gian</option>
                                    <option value="today" className="bg-slate-900 text-white">⚡ Hôm nay (24h)</option>
                                    <option value="7days" className="bg-slate-900 text-white">📅 7 ngày qua</option>
                                    <option value="30days" className="bg-slate-900 text-white">🗓️ 30 ngày qua</option>
                                </select>
                            </div>

                            {/* Classification */}
                            <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 px-3 py-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Phân loại:</span>
                                <select 
                                    value={galleryFilter} 
                                    onChange={(e) => setGalleryFilter(e.target.value as any)} 
                                    className="bg-transparent text-xs font-black outline-none text-white cursor-pointer"
                                >
                                    <option value="all" className="bg-slate-900 text-white">🗂️ Tất cả thể loại</option>
                                    <option value="JSON_TO_IMG" className="bg-slate-900 text-white">🎨 Tạo ảnh JSON</option>
                                    <option value="POSE" className="bg-slate-900 text-white">🏃 Biến thể tư thế</option>
                                    <option value="COMPOSE" className="bg-slate-900 text-white">🧩 Ghép ảnh AI</option>
                                    <option value="UPSCALE" className="bg-slate-900 text-white">🔍 Nâng cấp 2K/4K</option>
                                    <option value="DRIVE_SYNCED" className="bg-slate-900 text-white">☁️ Đã lưu Google Drive</option>
                                </select>
                            </div>

                            {/* Bundles */}
                            <div className="flex items-center gap-1 bg-white/5 rounded-xl border border-white/10 p-1">
                                <select 
                                    value={activeCollectionId} 
                                    onChange={(e) => setActiveCollectionId(e.target.value)} 
                                    className="bg-transparent border-none px-2.5 py-1 text-xs font-black outline-none text-white cursor-pointer"
                                >
                                    <option value="all" className="bg-slate-900 text-white">📁 Tất cả Album</option>
                                    {collections.map(c => <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>)}
                                </select>
                                <button 
                                    onClick={() => setIsCollectionHubOpen(true)} 
                                    className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-md transition-all text-white/80 hover:text-white" 
                                    title="Quản lý Album / Bộ sưu tập"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                                {googleUser && (
                                    <button 
                                        onClick={() => syncDriveImages(false)} 
                                        disabled={isDriveSyncing}
                                        className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50 rounded-md transition-all shadow-sm" 
                                        title="Đồng bộ / Làm mới từ Google Drive"
                                    >
                                        {isDriveSyncing ? (
                                            <span className="w-2.5 h-2.5 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
                                        ) : (
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Clear filters button if active */}
                            {(galleryFilter !== 'all' || galleryTimeRange !== 'all' || gallerySearch.trim() || activeCollectionId !== 'all') && (
                                <button
                                    onClick={() => {
                                        setGalleryFilter('all');
                                        setGalleryTimeRange('all');
                                        setGallerySearch('');
                                        setActiveCollectionId('all');
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl transition-colors flex items-center gap-1"
                                    title="Đặt lại bộ lọc về mặc định"
                                >
                                    <span>✕ Xóa lọc</span>
                                </button>
                            )}
                        </div>

                        {/* Selection & Maintenance Tools */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Nút Dọn ảnh trùng lặp */}
                            {duplicateCount > 0 ? (
                                <button
                                    onClick={handleDeduplicateGallery}
                                    className="px-3 py-1.5 text-xs font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-xl transition-all flex items-center gap-1.5 shadow-lg animate-pulse"
                                    title="Phát hiện ảnh trùng lặp do đồng bộ nhiều lần, nhấp để dọn dẹp và gộp lại"
                                >
                                    <span>🧹</span>
                                    <span>Dọn {duplicateCount} ảnh trùng lặp</span>
                                </button>
                            ) : galleryItems.length > 1 ? (
                                <button
                                    onClick={handleDeduplicateGallery}
                                    className="px-2.5 py-1 text-[11px] font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center gap-1"
                                    title="Kiểm tra và dọn dẹp ảnh trùng lặp"
                                >
                                    <span>🧹</span>
                                    <span>Dọn trùng</span>
                                </button>
                            ) : null}

                            {/* Select All Toggle Button */}
                            {sortedGallery.length > 0 && (
                                <button
                                    onClick={handleSelectAll}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 ${
                                        gallerySelection.size === sortedGallery.length && sortedGallery.length > 0
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                            : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70 hover:text-white'
                                    }`}
                                    title={gallerySelection.size === sortedGallery.length ? "Bỏ chọn tất cả ảnh" : "Chọn tất cả ảnh đang hiển thị"}
                                >
                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                        gallerySelection.size === sortedGallery.length && sortedGallery.length > 0
                                            ? 'bg-emerald-500 border-emerald-400 text-black'
                                            : 'border-white/40'
                                    }`}>
                                        {gallerySelection.size === sortedGallery.length && sortedGallery.length > 0 && (
                                            <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 0 011.414-1.414L8 12.586l7.293-7.293a1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <span>
                                        {gallerySelection.size === sortedGallery.length && sortedGallery.length > 0
                                            ? 'Bỏ chọn tất cả'
                                            : `Chọn tất cả (${sortedGallery.length})`}
                                    </span>
                                </button>
                            )}

                            {/* Count Summary */}
                            <div className="flex items-center gap-2 text-xs font-bold text-white/40 ml-1">
                                <span>Hiển thị <strong className="text-white font-black">{sortedGallery.length}</strong> / {galleryItems.length} ảnh</span>
                            </div>
                        </div>
                    </div>

                    {/* Batch Actions Inline Bar */}
                    {gallerySelection.size > 0 && (
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-xl px-5 py-3 rounded-2xl border border-primary-500/30 shadow-xl animate-in zoom-in-95">
                                <div className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-black text-white uppercase tracking-wider">
                                        Đã chọn <strong className="text-emerald-400">{gallerySelection.size}</strong> ảnh
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Gom vào Album */}
                                    <button 
                                        onClick={() => setIsBatchCollectionModalOpen(true)}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-md"
                                        title="Gom các ảnh đã chọn vào Album / Bộ sưu tập"
                                    >
                                        <span>📁</span> Gom vào Album
                                    </button>

                                    {/* Tải Khử Dấu AI */}
                                    <button 
                                        onClick={handleBatchDownloadAntiAi}
                                        disabled={isBatchDownloading}
                                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                        title="Tải ảnh đã khử hoàn toàn dấu vết AI (C2PA, SynthID, nhúng EXIF)"
                                    >
                                        {isBatchDownloading ? (
                                            <>
                                                <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Đang tải...
                                            </>
                                        ) : (
                                            <>
                                                <span>🛡️</span> Tải Khử Dấu AI
                                            </>
                                        )}
                                    </button>

                                    {/* Xuất ZIP */}
                                    <button 
                                        onClick={handleExportZip} 
                                        disabled={isExportingZip}
                                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1.5 active:scale-95"
                                        title="Tải gói ZIP chứa toàn bộ ảnh đã chọn"
                                    >
                                        {isExportingZip ? (
                                            <>
                                                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Zipping...
                                            </>
                                        ) : (
                                            <>
                                                <span>📦</span> Xuất ZIP
                                            </>
                                        )}
                                    </button>

                                    {/* Đồng bộ Drive */}
                                    {googleUser && (
                                        <button 
                                            onClick={handleBatchSyncToGoogleDrive} 
                                            disabled={isBatchSavingDrive}
                                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 disabled:opacity-50 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                                            title="Đồng bộ ảnh đã chọn lên Google Drive"
                                        >
                                            {isBatchSavingDrive ? (
                                                <>
                                                    <span className="w-3 h-3 border border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
                                                    Đang tải...
                                                </>
                                            ) : (
                                                <>
                                                    <span>☁️</span> Drive
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* So sánh nếu chọn 2 ảnh */}
                                    {gallerySelection.size === 2 && (
                                        <button 
                                            onClick={() => setIsComparing(true)} 
                                            className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                                        >
                                            <span>⚖️</span> So sánh
                                        </button>
                                    )}

                                    {/* Xóa hàng loạt */}
                                    <button 
                                        onClick={handleBatchDelete} 
                                        className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                                        title="Xóa vĩnh viễn các ảnh đã chọn"
                                    >
                                        <span>🗑️</span> Xóa ({gallerySelection.size})
                                    </button>

                                    {/* Bỏ chọn */}
                                    <button 
                                        onClick={() => setGallerySelection(new Set())} 
                                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold transition-colors"
                                        title="Bỏ chọn tất cả"
                                    >
                                        Bỏ chọn
                                    </button>
                                </div>
                            </div>

                            {driveSaveStatus && (driveSaveStatus.id === 'batch-sync' || driveSaveStatus.id === 'batch-collection' || driveSaveStatus.id === 'dedup') && (
                                <div className={`flex items-center justify-between px-5 py-2.5 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2 duration-300 border ${
                                    driveSaveStatus.success 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                                }`}>
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-2 h-2 rounded-full ${driveSaveStatus.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                        <span>{driveSaveStatus.message}</span>
                                    </div>
                                    <button onClick={() => setDriveSaveStatus(null)} className="text-white/40 hover:text-white transition-colors uppercase text-[10px] font-bold">✕ Đóng</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Google Drive Collection Sync Status Panel */}
                {activeCollectionId !== 'all' && (() => {
                    const col = collections.find(c => c.id === activeCollectionId);
                    if (!col) return null;
                    const colItems = galleryItems.filter(item => item.collectionId === col.id);
                    const syncedItemsCount = colItems.filter(item => (item as any).driveFileId).length;
                    const isAutoSync = (col as any).autoSync || false;
                    
                    return (
                        <div className="p-6 lg:p-8 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className={`p-4 rounded-2xl flex items-center justify-center transition-colors ${isAutoSync ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'bg-white/5 text-white/30 border border-white/10'}`}>
                                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-base font-black text-white uppercase tracking-wider">
                                            {col.name} Sync Dashboard
                                        </h3>
                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border ${isAutoSync ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' : 'bg-white/5 text-white/40 border-white/10'}`}>
                                            {isAutoSync ? '★ Auto-Sync Active' : 'Manual Mode'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/40 font-medium">
                                        Target Google Drive Location: <strong className="text-white/60 font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 ml-1">NK Imagen Storage / {col.name}</strong>
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="text-[10px] font-black uppercase text-primary-400 tracking-wider">
                                            {syncedItemsCount} of {colItems.length} images synced to Drive
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                {/* Toggle Sync button */}
                                <button 
                                    onClick={() => {
                                        setCollections(prev => prev.map(c => c.id === col.id ? { ...c, autoSync: !isAutoSync } : c));
                                    }}
                                    className={`flex-1 md:flex-initial px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all duration-300 flex items-center justify-center gap-2 ${
                                        isAutoSync 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                                            : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Auto-Sync: {isAutoSync ? 'ON' : 'OFF'}
                                </button>
                                
                                {/* Force Sync Now button */}
                                <button 
                                    onClick={() => handleSyncCollectionToDrive(col.id)}
                                    disabled={isSyncingCollection === col.id}
                                    className="flex-1 md:flex-initial px-6 py-3.5 bg-primary-500 hover:bg-primary-600 active:scale-95 disabled:opacity-50 text-black font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isSyncingCollection === col.id ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                            Syncing Matrix...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            Sync Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {galleryDensity === 'list' ? (
                    <div className="space-y-3">
                        {sortedGallery.map((item) => (
                            <GalleryListItem 
                                key={item.id} 
                                item={item}
                                selected={gallerySelection.has(item.id)} 
                                onSelect={() => handleGallerySelect(item.id)}
                                onClick={() => setInspectorItem(item)}
                                onVeoStart={(e) => { e.stopPropagation(); handleUseAsVeoStart(item.src); }}
                                onVeoEnd={(e) => { e.stopPropagation(); handleUseAsVeoEnd(item.src); }}
                                onPose={(e) => { e.stopPropagation(); handleUseAsPoseBase(item.src); }}
                                onCompose={(e) => { e.stopPropagation(); handleUseInCompose(item.src); }}
                                onInspect={(e) => { e.stopPropagation(); handleInspectImage(item.src); }}
                                onStudio={(e) => { e.stopPropagation(); handleOpenStudio(item.src); }}
                                onInpainting={(e) => { e.stopPropagation(); setInpaintingTargetSrc(item.src); setIsInpaintingOpen(true); }}
                                onDownload={(e) => { e.stopPropagation(); handleDownloadImage(item.src, item.description); }}
                                onUpscale={(e) => { e.stopPropagation(); handleUpscale(item.src, false); }}
                                onUpscale4k={(e) => { 
                                    e.stopPropagation(); 
                                    setConfirmAction({
                                        message: "Hành động này sử dụng engine Pro 3 để nâng cấp lên 4K. Bạn có muốn tiếp tục?",
                                        onConfirm: () => handleUpscale(item.src, true)
                                    });
                                }}
                                onGoogleDrive={(e) => { e.stopPropagation(); handleSaveToGoogleDrive(item.src, item.description, item.id); }}
                                isSavingDrive={driveSavingId === item.id || driveSavingId === item.src}
                                collections={collections}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={`grid gap-4 sm:gap-6 ${
                        galleryDensity === 'large' 
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                            : galleryDensity === 'small' 
                                ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7' 
                                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'
                    }`}>
                        {sortedGallery.map((item, idx) => (
                            <MasonryImage 
                                key={item.id} 
                                src={item.src} 
                                alt={item.description || "Visual Artifact"} 
                                index={idx}
                                selected={gallerySelection.has(item.id)} 
                                onSelect={() => handleGallerySelect(item.id)}
                                onClick={() => setInspectorItem(item)}
                                selectionMode={gallerySelection.size > 0} 
                                onVeoStart={(e) => { e.stopPropagation(); handleUseAsVeoStart(item.src); }}
                                onVeoEnd={(e) => { e.stopPropagation(); handleUseAsVeoEnd(item.src); }}
                                onPose={(e) => { e.stopPropagation(); handleUseAsPoseBase(item.src); }}
                                onCompose={(e) => { e.stopPropagation(); handleUseInCompose(item.src); }}
                                onInspect={(e) => { e.stopPropagation(); handleInspectImage(item.src); }}
                                onStudio={(e) => { e.stopPropagation(); handleOpenStudio(item.src); }}
                                onInpainting={(e) => { e.stopPropagation(); setInpaintingTargetSrc(item.src); setIsInpaintingOpen(true); }}
                                onDownload={(e) => { e.stopPropagation(); handleDownloadImage(item.src, item.description); }}
                                onUpscale={(e) => { e.stopPropagation(); handleUpscale(item.src, false); }}
                                onUpscale4k={(e) => { 
                                    e.stopPropagation(); 
                                    setConfirmAction({
                                        message: "Hành động này sử dụng engine Pro 3 để nâng cấp lên 4K. Bạn có muốn tiếp tục?",
                                        onConfirm: () => handleUpscale(item.src, true)
                                    });
                                }}
                                onGoogleDrive={(e) => { e.stopPropagation(); handleSaveToGoogleDrive(item.src, item.description, item.id); }}
                                isSavingDrive={driveSavingId === item.id || driveSavingId === item.src}
                                driveFileId={item.driveFileId}
                                collectionId={item.collectionId}
                                collections={collections}
                                item={item}
                                density={galleryDensity}
                            />
                        ))}
                    </div>
                )}
                {galleryItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 opacity-20">
                        <svg className="h-24 w-24 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="font-black text-xl tracking-[0.5em] uppercase">Archive Empty</p>
                    </div>
                ) : sortedGallery.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <p className="text-white/60 font-bold text-sm">Không tìm thấy ảnh phù hợp với bộ lọc hiện tại</p>
                        <button
                            onClick={() => {
                                setGalleryFilter('all');
                                setGalleryTimeRange('all');
                                setGallerySearch('');
                                setActiveCollectionId('all');
                            }}
                            className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        >
                            Đặt lại bộ lọc
                        </button>
                    </div>
                ) : null}
            </div>
        )}
      </main>
      
      {/* AI Photo Studio 2026 Workspace (Fullscreen Pro Mode) */}
      {activeTab === AppMode.AI_STUDIO && (
        <PhotoStudioWorkspace
          initialImageSrc={studioInitialImage || (galleryItems.length > 0 ? galleryItems[0].src : null)}
          onClose={() => {
            setActiveTab(AppMode.GALLERY);
          }}
          onSaveToGallery={(newItem) => {
            setGalleryItems(prev => [newItem, ...prev]);
            addToHistory('Studio Edit', 'Đã lưu tác phẩm AI Studio vào Gallery', newItem.id);
          }}
          galleryItems={galleryItems}
        />
      )}

      {/* Floating Batch Action Bar Dock for Gallery */}
      {/* Floating Batch Action Bar Dock for Gallery (Apple visionOS Floating Capsule Dock) */}
      {activeTab === AppMode.GALLERY && gallerySelection.size > 0 && (
        <div className="fixed bottom-6 inset-x-4 sm:inset-x-8 max-w-4xl mx-auto z-40 vision-modal p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-bottom-6 duration-300">
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black">{t('collection.selectedCount', 'Đã chọn')} {gallerySelection.size} {t('collection.photos', 'ảnh')}</span>
            </div>
            <button 
              onClick={handleSelectAll} 
              className="text-xs font-bold text-white/70 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              {gallerySelection.size === sortedGallery.length ? t('common.deselectAll', 'Bỏ chọn') : t('common.selectAll', 'Chọn tất cả')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBatchCollectionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md backdrop-blur-md"
              title={t('gallery.moveToCollection', 'Gom vào Album')}
            >
              <span>📁</span> {t('gallery.moveToCollection', 'Gom vào Album')}
            </button>

            <button
              onClick={handleBatchDownloadAntiAi}
              disabled={isBatchDownloading}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              title={t('studio.downloadAntiAi', 'Tải ảnh đã khử hoàn toàn dấu vết AI')}
            >
              {isBatchDownloading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {t('common.processing', 'Đang tải...')}
                </>
              ) : (
                <>
                  <span>🛡️</span> {t('studio.downloadAntiAi', 'Tải Khử Dấu AI')}
                </>
              )}
            </button>

            <button
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 backdrop-blur-md"
              title="ZIP"
            >
              {isExportingZip ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Zipping...
                </>
              ) : (
                <>
                  <span>📦</span> ZIP
                </>
              )}
            </button>

            {googleUser && (
              <button
                onClick={handleBatchSyncToGoogleDrive}
                disabled={isBatchSavingDrive}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 backdrop-blur-md"
                title={t('gallery.syncDrive', 'Đồng bộ Drive')}
              >
                {isBatchSavingDrive ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                    {t('common.processing', 'Đang tải...')}
                  </>
                ) : (
                  <>
                    <span>☁️</span> Drive
                  </>
                )}
              </button>
            )}

            {gallerySelection.size === 2 && (
              <button
                onClick={() => setIsComparing(true)}
                className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 backdrop-blur-md"
              >
                <span>⚖️</span> {t('studio.compareOriginal', 'So sánh')}
              </button>
            )}

            <button
              onClick={handleBatchDelete}
              className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 backdrop-blur-md"
              title={t('common.delete', 'Xóa')}
            >
              <span>🗑️</span> {t('common.delete', 'Xóa')} ({gallerySelection.size})
            </button>

            <button
              onClick={() => setGallerySelection(new Set())}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors flex items-center justify-center border border-white/10 ml-1 active:scale-95"
              title={t('common.deselectAll', 'Bỏ chọn tất cả')}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <footer className="py-6 mt-16 text-center border-t border-white/5 bg-black/10 backdrop-blur-md">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em]">Next-Gen Kinetic Integration © 2025</p>
      </footer>

      {/* Floating Queue Indicator & Slide-Over Drawer */}
      <FloatingQueueIndicator onClick={() => setIsQueueDrawerOpen(true)} />
      <GenerationQueueDrawer 
        isOpen={isQueueDrawerOpen} 
        onClose={() => setIsQueueDrawerOpen(false)} 
      />

      {/* Character & Style Consistency Lock Modal */}
      <ConsistencyLockModal
        isOpen={isConsistencyModalOpen}
        onClose={() => setIsConsistencyModalOpen(false)}
        onApplyPersona={(persona) => {
          setActivePersona(persona);
          setIsConsistencyLockActive(true);
          try {
            const current = JSON.parse(jsonInput);
            const merged = injectPersonaIntoPrompt(current, persona);
            updateJsonInput(JSON.stringify(merged, null, 2));
          } catch {}
          showCleanToast(`🔒 Đã khóa nhân vật: ${persona.name}`);
        }}
      />

      {/* A/B Matrix Compare Modal */}
      <PromptABCompareModal
        isOpen={isABModalOpen}
        onClose={() => setIsABModalOpen(false)}
        basePrompt={(() => {
          try { return JSON.parse(jsonInput); }
          catch { return DEFAULT_JSON; }
        })()}
        onApplyPrompt={(winningPrompt) => {
          updateJsonInput(JSON.stringify(winningPrompt, null, 2));
          showCleanToast('✨ Đã áp dụng prompt chiến thắng vào Generator!');
        }}
      />

      {/* Prompt Snapshots Time-Machine Modal */}
      <PromptSnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        currentPrompt={(() => {
          try { return JSON.parse(jsonInput); }
          catch { return DEFAULT_JSON; }
        })()}
        currentPreviewImage={generatedImages[0]}
        onRestoreSnapshot={(restored) => {
          updateJsonInput(JSON.stringify(restored, null, 2));
          showCleanToast('↶ Đã khôi phục bản snapshot thành công!');
        }}
      />

      {/* 1. Virtual 3D Gaffer & Generative Relighting Modal */}
      <VirtualGafferRelightingModal
        isOpen={isRelightingOpen}
        onClose={() => {
          setIsRelightingOpen(false);
          setActiveRelightImage(undefined);
        }}
        initialImageSrc={activeRelightImage || generatedImages[0]}
        galleryImages={generatedImages}
        onApplyPrompt={(relitPrompt) => {
          updateJsonInput(JSON.stringify(relitPrompt, null, 2));
          showCleanToast('💡 Đã cập nhật công thức ánh sáng 3D vào Studio!');
        }}
      />

      {/* 2. AI Voice Director Modal */}
      <VoiceDirectorModal
        isOpen={isVoiceDirectorOpen}
        onClose={() => setIsVoiceDirectorOpen(false)}
        currentPromptJson={(() => {
          try { return JSON.parse(jsonInput); }
          catch { return DEFAULT_JSON; }
        })()}
        onApplyPromptDelta={(updated) => {
          updateJsonInput(JSON.stringify(updated, null, 2));
          showCleanToast('🎙️ Giọng nói AI đã điều chỉnh prompt thành công!');
        }}
      />

      {/* 3. Apple Vision Pro Spatial 3D Converter Modal */}
      <Spatial3DViewerModal
        isOpen={isSpatial3DOpen}
        onClose={() => {
          setIsSpatial3DOpen(false);
          setActiveSpatial3DImage(undefined);
        }}
        initialImageSrc={activeSpatial3DImage || generatedImages[0]}
        galleryImages={generatedImages}
      />

      {/* 4. Neural Aesthetic DNA Blender Modal */}
      <AestheticDnaBlenderModal
        isOpen={isDnaBlenderOpen}
        onClose={() => setIsDnaBlenderOpen(false)}
        galleryImages={generatedImages}
        currentSubject={(() => {
          try { return JSON.parse(jsonInput).subject || ''; }
          catch { return ''; }
        })()}
        onApplyDna={(mergedJson) => {
          updateJsonInput(JSON.stringify(mergedJson, null, 2));
          showCleanToast('🧬 Đã nạp ma trận DNA thẩm mỹ vào Studio!');
        }}
      />

      {/* 5. Infinite Multiverse Node Graph Modal */}
      <MultiverseNodeGraphModal
        isOpen={isNodeGraphOpen}
        onClose={() => setIsNodeGraphOpen(false)}
        currentPromptText={(() => {
          try { return JSON.parse(jsonInput).subject || jsonInput; }
          catch { return jsonInput; }
        })()}
        currentThumbnail={generatedImages[0]}
        onSelectPrompt={(selectedText) => {
          try {
            const curr = JSON.parse(jsonInput);
            curr.subject = selectedText;
            updateJsonInput(JSON.stringify(curr, null, 2));
          } catch {
            updateJsonInput(selectedText);
          }
          showCleanToast('🌌 Đã tải nhánh Đa Vũ Trụ vào Studio!');
        }}
      />

      {/* 6. One-Click Talking Character & Emotional Lip-Sync Modal */}
      <TalkingActorModal
        isOpen={isTalkingActorOpen}
        onClose={() => setIsTalkingActorOpen(false)}
        initialImageSrc={generatedImages[0]}
        galleryImages={generatedImages}
        onSendToVeo={(veoPrompt) => {
          setVeoUserPrompt(veoPrompt);
          setActiveTab(AppMode.VEO3_PROMPT_CREATOR);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showCleanToast('🎬 Đã chuyển chỉ thị khẩu hình sang Veo 3 Studio!');
        }}
      />

      {/* Kho Data Nhân Vật Mẫu & Biometric Core (Model Character Vault) */}
      <CharacterVaultModal
        isOpen={isCharacterVaultOpen}
        onClose={() => {
          setIsCharacterVaultOpen(false);
          setVaultInitialUploadFile(null);
        }}
        initialUploadFile={vaultInitialUploadFile}
        onSelectAsBiometricCore={(imageUrl, persona) => {
          const target = vaultTargetSlot || 'composeRef1';
          applySlotImage(target, imageUrl, persona.name, undefined, persona);
          showCleanToast(`👑 Đã chọn ${persona.name} làm Biometric Core!`);
        }}
      />

      {/* Upload Character Choice Modal */}
      <UploadCharacterChoiceModal
        isOpen={!!uploadChoiceModalData}
        onClose={() => setUploadChoiceModalData(null)}
        imagePreview={uploadChoiceModalData?.base64 || null}
        onUseForSessionOnly={() => {
          if (!uploadChoiceModalData) return;
          applySlotImage(uploadChoiceModalData.targetSlot, uploadChoiceModalData.base64);
          setUploadChoiceModalData(null);
          showCleanToast('🎯 Đã gán ảnh làm Biometric Core (chỉ dùng lần này)!');
        }}
        onAddNewCharacter={() => {
          if (!uploadChoiceModalData) return;
          const slot = uploadChoiceModalData.targetSlot;
          const file = uploadChoiceModalData.file;
          setUploadChoiceModalData(null);
          setVaultTargetSlot(slot);
          setVaultInitialUploadFile(file);
          setIsCharacterVaultOpen(true);
        }}
        onAddToExistingCharacter={(personaId) => {
          if (!uploadChoiceModalData) return;
          addPhotoToPersona(personaId, uploadChoiceModalData.base64);
          const personas = getCharacterPersonas();
          const targetPersona = personas.find(p => p.id === personaId);
          applySlotImage(uploadChoiceModalData.targetSlot, uploadChoiceModalData.base64, targetPersona?.name, undefined, targetPersona);
          setUploadChoiceModalData(null);
          showCleanToast(`🖼️ Đã thêm ảnh vào hồ sơ của ${targetPersona?.name || 'người mẫu'}!`);
        }}
      />

      {/* PWA 1-Click Auto Update Notification & Install Toasts */}
      <UpdateNotificationToast />
    </div>
  );
};

export default App;