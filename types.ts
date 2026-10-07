
export interface ImagePromptJson {
  subject: string;
  art_style: string;
  posing: string;
  lighting: string;
  color_palette: string;
  composition: string;
  camera_angle: string;
  texture: string;
  skin_texture: string;
  font: string;
  mood: string;
  additional_details: string;
}

export enum AppMode {
  // Complex Imagen Group
  IMG_TO_JSON = 'IMG_TO_JSON',
  JSON_CONVERTER = 'JSON_CONVERTER',
  JSON_TO_IMG = 'JSON_TO_IMG',
  POSE_VARIANTS = 'POSE_VARIANTS',
  COMPOSE_IMAGE = 'COMPOSE_IMAGE',
  REFERENCE_CREATION = 'REFERENCE_CREATION',
  UPSCALE_IMAGE = 'UPSCALE_IMAGE',
  
  // Scene Director Group
  SCENARIO_EDITOR = 'SCENARIO_EDITOR',
  VEO3_PROMPT_CREATOR = 'VEO3_PROMPT_CREATOR',
  
  // AI Photo Studio (Photoshop 2026 + Canva AI)
  AI_STUDIO = 'AI_STUDIO',
  
  // Others
  GALLERY = 'GALLERY',
  LOGS = 'LOGS',
}

export interface ScriptScene {
  scene_number: number;
  header: string; // e.g. EXT. CYBER CITY - NIGHT
  action: string;
  visual_style: string;
  camera_movement: string;
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  data: string | null; // JSON string or Base64 Image string
}

// Enhanced Metadata for Gallery Inspector
export interface GenerationMetadata {
  promptJson: ImagePromptJson; // The full JSON used
  negativePrompt?: string;     // Optional
  seed?: number;               // Simulated or actual seed
  model: string;               // e.g., 'gemini-3.1-flash-lite-image'
  cfgScale?: number;
  steps?: number;
  sampler?: string;
  aspectRatio: string;
  imageSize?: string;
  upscaledFrom?: string;
  upscaleFeedback?: any;
}

export type GalleryItemType = 'JSON_TO_IMG' | 'POSE' | 'COMPOSE' | 'UPSCALE';
export type GalleryFilterType = 'all' | 'JSON_TO_IMG' | 'POSE' | 'COMPOSE' | 'UPSCALE' | 'DRIVE_SYNCED';
export type GalleryTimeRange = 'all' | 'today' | '7days' | '30days';
export type GalleryDensity = 'large' | 'medium' | 'small' | 'list';

export interface GalleryItem {
  id: string;
  src: string;
  type: GalleryItemType;
  createdAt: number;
  description?: string;
  metadata?: GenerationMetadata; // New detailed metadata
  collectionId?: string; // For Folder/Collection organization
  driveFileId?: string;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
  autoSync?: boolean;
}

export interface LogItem {
  id: string;
  timestamp: number;
  logType: 'Image to JSON' | 'Text to JSON' | 'JSON to Image' | 'Pose Variant Image' | 'Compose Image' | 'Refine JSON' | 'Veo3 Prompt' | 'Script Gen' | 'Reference Creation' | 'Export ZIP' | 'Google Drive Export' | 'Upscale Module 4K' | 'Upscale Module 2K';
  details: string;
  outputFileName: string;
  outputImageSrc?: string;
}

export type PromptSourceType = 'ANALYZE_IMAGE' | 'TEXT_TO_JSON' | 'JSON_TO_IMG' | 'POSE' | 'COMPOSE' | 'REFINE' | 'REFERENCE';

export interface PromptHistoryItem {
  id: string;
  timestamp: number;
  source: PromptSourceType;
  promptJson: ImagePromptJson;
  subject: string;
  previewImage?: string;
  rawInputText?: string;
  tags?: string[];
}

export type PresetCategory = 'Character' | 'Art Style' | 'Scene' | 'Custom' | 'General';

export interface PersonalPreset {
  id: string;
  name: string;
  category: PresetCategory;
  description?: string;
  data: Partial<ImagePromptJson>;
  createdAt: number;
}

export type CameraPresetType = 'SONY_A7IV' | 'FUJIFILM_XT4' | 'CANON_R5' | 'IPHONE_15_PRO';

export interface AntiAiCamouflageSettings {
  enabled: boolean;
  grainIntensity: number; // 0.012 to 0.045
  microResample: boolean; // Subtle cropping and spatial jitter to break SynthID grids
  cameraPreset: CameraPresetType;
  stripMetadata: boolean;
  jpegQuality: number; // e.g. 0.93
}

// --- v4.4-v5.0 Upgrade Types ---

export interface PromptQualityResult {
  score: number; // 0 - 100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  dimensionScores: {
    subject: number;
    lighting: number;
    composition: number;
    camera: number;
    style: number;
    details: number;
  };
  strengths: string[];
  improvements: string[];
  warnings: string[];
  detectedAiTraps: string[];
}

export interface CharacterPersona {
  id: string;
  name: string;
  gender: string;
  ageRange: string;
  faceFeatures: string;
  hairStyle: string;
  signatureOutfit: string;
  colorPalette: string;
  bodyType?: string;
  avatarImage?: string;
  photos?: string[];
  seed?: number;
  createdAt: number;
  updatedAt?: number;
  isActive: boolean;
  biometricProfile?: BiometricProfile;
  biometricAnalysisCount?: number;
  biometricConfidence?: number;
  lastBiometricSync?: number;
}

export interface PromptSnapshot {
  id: string;
  name: string;
  timestamp: number;
  promptJson: ImagePromptJson;
  previewImage?: string;
  tags?: string[];
}

export interface CameraTrajectory {
  id: string;
  name: string;
  category: 'dolly' | 'orbit' | 'boom' | 'fpv' | 'pan_tilt' | 'special';
  description: string;
  veoPromptFormula: string;
  icon: string;
  speed: 'slow' | 'medium' | 'fast';
  elevationAngle?: number;
}

export interface StoryboardShot {
  id: string;
  shotNumber: number;
  title: string;
  durationSeconds: number;
  transition: 'cut' | 'dissolve' | 'fade_black' | 'wipe';
  promptJson: ImagePromptJson;
  renderedImage?: string;
  cameraMovement?: string;
  voiceover?: string;
  audioMood?: string;
}

// --- Biometric Core & Multi-Identity Types ---

export interface BiometricProfile {
  id?: string;
  name?: string;
  gender: 'Female' | 'Male' | 'Non-binary';
  estimatedAge: string;
  ethnicity: string;
  faceShape: string;
  jawline: string;
  eyes: {
    shape: string;
    color: string;
    brows: string;
  };
  nose: string;
  lips: string;
  hair: {
    color: string;
    style: string;
    length: string;
    texture: string;
  };
  distinguishingFeatures: string;
  undertone: string;
  summaryDescriptor: string;
  analyzedAt: number;
  sampleCount?: number;
  confidenceScore?: number;
  anglesCovered?: string[];
}

export type DualCharacterPairing = 'auto' | 'mf' | 'ff' | 'mm';

export interface DualCharacterConfig {
  pairing: DualCharacterPairing;
  character1Role?: string;
  character2Role?: string;
  antiBleedLock: boolean;
  useReferenceHair: boolean;
}

