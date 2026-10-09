import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  AppStorageSettings, 
  DEFAULT_STORAGE_SETTINGS, 
  saveStorageSettingsDB, 
  saveLocalDirectoryHandle, 
  clearLocalDirectoryHandle,
  getGalleryStorageEstimate,
  clearGalleryDB
} from '../services/indexedDbService';
import { getAccessToken, logout, getEffectiveGoogleClientId, setCustomGoogleClientId } from '../services/googleService';
import { 
  APP_VERSION, 
  BUILD_TIME, 
  GITHUB_REPO, 
  checkGitHubUpdates, 
  RemoteUpdateInfo, 
  markCommitAsCurrent,
  subscribeInstallPrompt,
  promptPwaInstall,
  isRunningStandalone,
  triggerSwUpdate
} from '../services/updateService';
import { 
  loadAntiAiSettings, 
  saveAntiAiSettings, 
  CAMERA_PROFILES,
  STEALTH_PRESETS,
  sanitizePromptAntiAi
} from '../services/antiAiCamouflageService';
import { AntiAiCamouflageSettings, AntiAiStealthLevel, CameraPresetType } from '../types';
import { useTranslation, SUPPORTED_LANGUAGES, AppLanguage } from '../services/i18nService';
import {
  getStudioModelConfig,
  saveStudioModelConfig,
  StudioModelConfig,
  AVAILABLE_STUDIO_MODELS,
  AVAILABLE_ANALYSIS_MODELS,
  RESOLUTION_OPTIONS,
  DEFAULT_STUDIO_CONFIG
} from '../services/modelConfigService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageSettings: AppStorageSettings;
  onUpdateSettings: (newSettings: AppStorageSettings) => void;
  googleUser: User | null;
  onConnectDrive: () => Promise<void>;
  onClearGallery?: () => Promise<void>;
  galleryCount: number;
  onSyncCloudVault?: () => Promise<void>;
  isCloudVaultSyncing?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  storageSettings,
  onUpdateSettings,
  googleUser,
  onConnectDrive,
  onClearGallery,
  galleryCount,
  onSyncCloudVault,
  isCloudVaultSyncing,
}) => {
  const { lang, setLanguage, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'language' | 'storage' | 'gallery' | 'drive' | 'update' | 'anti-ai' | 'models'>('language');
  const [studioConfig, setStudioConfig] = useState<StudioModelConfig>(getStudioModelConfig);
  const [driveFolderInput, setDriveFolderInput] = useState(storageSettings.driveFolderName || 'NK Imagen Storage');
  const [prefixInput, setPrefixInput] = useState(storageSettings.customPrefix || 'NKI_');
  const [namingPattern, setNamingPattern] = useState(storageSettings.namingPattern || 'subject_timestamp');
  const [autoSaveGallery, setAutoSaveGallery] = useState(storageSettings.autoSaveToGallery);
  const [autoSyncDrive, setAutoSyncDrive] = useState(storageSettings.autoSyncToDrive);
  const [autoSaveLocalDisk, setAutoSaveLocalDisk] = useState(storageSettings.autoSaveToLocalDisk);
  const [localFolderName, setLocalFolderName] = useState<string | undefined>(storageSettings.localFolderName);
  const [hasLocalDirectory, setHasLocalDirectory] = useState(storageSettings.hasLocalDirectory);
  
  // Anti-AI Camouflage State
  const [antiAiSettings, setAntiAiSettings] = useState<AntiAiCamouflageSettings>(loadAntiAiSettings);
  const [sanitizePromptInput, setSanitizePromptInput] = useState<string>(
    'A hyperrealistic, 8k masterpiece portrait of a beautiful woman, octane render, unreal engine 5, smooth plastic skin, cinematic lighting'
  );
  const [sanitizedPromptResult, setSanitizedPromptResult] = useState<string>('');

  const updateAntiAi = (patch: Partial<AntiAiCamouflageSettings>) => {
    const updated = { ...antiAiSettings, ...patch };
    setAntiAiSettings(updated);
    saveAntiAiSettings(updated);
  };
  
  const [galleryEstimate, setGalleryEstimate] = useState<{ count: number; formattedSize: string }>({
    count: galleryCount,
    formattedSize: 'Calculating...',
  });
  const [isPickingDir, setIsPickingDir] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmClearGallery, setConfirmClearGallery] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);

  // PWA & Auto-Update states
  const [canInstallDesktop, setCanInstallDesktop] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<RemoteUpdateInfo | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [installSuccessMessage, setInstallSuccessMessage] = useState(false);

  useEffect(() => {
    const unsub = subscribeInstallPrompt((can) => {
      setCanInstallDesktop(can && !isRunningStandalone());
    });
    return unsub;
  }, []);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const isLocalhost = currentHost === 'localhost';
  const isUsing127 = currentHost === '127.0.0.1';
  const isCustomDomain = !isLocalhost && !isUsing127;

  const [customClientIdInput, setCustomClientIdInput] = useState(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('custom_google_client_id') || '') : '';
  });
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [clientIdSavedToast, setClientIdSavedToast] = useState(false);

  const handleSaveCustomClientId = () => {
    setCustomGoogleClientId(customClientIdInput);
    setClientIdSavedToast(true);
    setTimeout(() => setClientIdSavedToast(false), 3000);
  };

  const handleResetCustomClientId = () => {
    setCustomClientIdInput('');
    setCustomGoogleClientId('');
    setClientIdSavedToast(true);
    setTimeout(() => setClientIdSavedToast(false), 3000);
  };

  const handleCopyOrigin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    }
  };

  // Load storage size estimate when opening
  useEffect(() => {
    if (isOpen) {
      setDriveFolderInput(storageSettings.driveFolderName || 'NK Imagen Storage');
      setPrefixInput(storageSettings.customPrefix || 'NKI_');
      setNamingPattern(storageSettings.namingPattern || 'subject_timestamp');
      setAutoSaveGallery(storageSettings.autoSaveToGallery);
      setAutoSyncDrive(storageSettings.autoSyncToDrive);
      setAutoSaveLocalDisk(storageSettings.autoSaveToLocalDisk);
      setLocalFolderName(storageSettings.localFolderName);
      setHasLocalDirectory(storageSettings.hasLocalDirectory);

      getGalleryStorageEstimate().then((est) => {
        setGalleryEstimate({
          count: est.count,
          formattedSize: est.formattedSize,
        });
      });
    }
  }, [isOpen, storageSettings, galleryCount]);

  if (!isOpen) return null;

  // Save Settings
  const handleSaveSettings = async () => {
    const updated: AppStorageSettings = {
      ...storageSettings,
      driveFolderName: driveFolderInput.trim() || 'NK Imagen Storage',
      customPrefix: prefixInput.trim() || 'NKI_',
      namingPattern,
      autoSaveToGallery,
      autoSyncToDrive,
      autoSaveToLocalDisk: hasLocalDirectory ? autoSaveLocalDisk : false,
      localFolderName,
      hasLocalDirectory,
    };

    await saveStorageSettingsDB(updated);
    saveStudioModelConfig(studioConfig);
    onUpdateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  // Pick Directory using File System Access API
  const handlePickLocalDirectory = async () => {
    try {
      setIsPickingDir(true);
      if (!('showDirectoryPicker' in window)) {
        alert(
          'Trình duyệt của bạn không hỗ trợ File System Access API trực tiếp. Các tệp sẽ được tải về qua trình duyệt thông thường.'
        );
        return;
      }

      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      if (dirHandle && dirHandle.name) {
        await saveLocalDirectoryHandle(dirHandle, dirHandle.name);
        setLocalFolderName(dirHandle.name);
        setHasLocalDirectory(true);
        setAutoSaveLocalDisk(true);
        const updated = {
          ...storageSettings,
          localFolderName: dirHandle.name,
          hasLocalDirectory: true,
          autoSaveToLocalDisk: true,
        };
        await saveStorageSettingsDB(updated);
        onUpdateSettings(updated);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting directory:', err);
      }
    } finally {
      setIsPickingDir(false);
    }
  };

  const handleClearLocalDirectory = async () => {
    await clearLocalDirectoryHandle();
    setLocalFolderName(undefined);
    setHasLocalDirectory(false);
    setAutoSaveLocalDisk(false);
    const updated = {
      ...storageSettings,
      localFolderName: undefined,
      hasLocalDirectory: false,
      autoSaveToLocalDisk: false,
    };
    await saveStorageSettingsDB(updated);
    onUpdateSettings(updated);
  };

  const handleClearAllGalleryItems = async () => {
    try {
      setIsClearing(true);
      await clearGalleryDB();
      if (onClearGallery) {
        await onClearGallery();
      }
      setGalleryEstimate({ count: 0, formattedSize: '0 MB' });
      setConfirmClearGallery(false);
    } catch (e) {
      console.error('Failed to clear gallery:', e);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSwitchToLocalhost = () => {
    if (typeof window !== 'undefined') {
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.href = `http://localhost${port}${window.location.pathname}${window.location.search}`;
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-3xl bg-slate-900/80 border border-white/20 rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-3xl overflow-hidden flex flex-col max-h-[90vh] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* visionOS Spatial Glass Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-500/5 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.2)]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-wider uppercase">
                  {t('settings.title')}
                </h2>
                <span className="text-[10px] bg-white/10 text-white/80 font-mono px-2 py-0.5 rounded-full border border-white/15">
                  visionOS
                </span>
              </div>
              <p className="text-[11px] text-white/50">{t('settings.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white/60 hover:text-white flex items-center justify-center transition-all border border-white/15 backdrop-blur-md"
            title="Đóng (Close)"
          >
            ✕
          </button>
        </div>

        {/* visionOS Segmented Tab Bar */}
        <div className="p-2 border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="flex flex-wrap gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-2xl">
            <button
              onClick={() => setActiveTab('language')}
              className={`px-3.5 py-2 text-xs font-bold transition-all rounded-xl flex items-center gap-2 ${
                activeTab === 'language'
                  ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border border-white/25 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🌐</span>
              <span>{t('settings.tab.language')}</span>
              <span className="text-[11px]">{SUPPORTED_LANGUAGES.find(l => l.code === lang)?.flag}</span>
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`px-3.5 py-2 text-xs font-bold transition-all rounded-xl flex items-center gap-2 ${
                activeTab === 'storage'
                  ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border border-white/25 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>📁</span>
              <span>{t('settings.tab.storage')}</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3.5 py-2 text-xs font-bold transition-all rounded-xl flex items-center gap-2 ${
                activeTab === 'gallery'
                  ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border border-white/25 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🖼️</span>
              <span>{t('settings.tab.gallery')}</span>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/70 font-mono">
                {galleryEstimate.count}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('drive')}
              className={`px-3.5 py-2 text-xs font-bold transition-all rounded-xl flex items-center gap-2 ${
                activeTab === 'drive'
                  ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border border-white/25 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>☁️</span>
              <span>{t('settings.tab.drive')}</span>
              {googleUser && getAccessToken() ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full">!</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('update')}
              className={`px-3.5 py-2 text-xs font-bold transition-all rounded-xl flex items-center gap-2 ${
                activeTab === 'update'
                  ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border border-white/25 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🚀</span>
              <span>{t('settings.tab.update')}</span>
              {updateInfo?.hasUpdate && (
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('anti-ai')}
              className={`px-3.5 py-2 text-xs font-bold transition-all rounded-xl flex items-center gap-2 ${
                activeTab === 'anti-ai'
                  ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border border-white/25 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🛡️</span>
              <span>{t('settings.tab.antiAi')}</span>
              {antiAiSettings.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('models')}
              className={`px-3.5 py-2 text-xs font-bold transition-all rounded-xl flex items-center gap-2 ${
                activeTab === 'models'
                  ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border border-white/25 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🤖</span>
              <span>Mô Hình & Studio</span>
              <span className="text-[9px] bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 font-mono px-1.5 py-0.2 rounded-full border border-cyan-500/30 font-bold">
                2K HD
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm custom-scrollbar">
          {/* TAB 0: NGÔN NGỮ (LANGUAGE) - Apple Vision Pro Spatial Tiles */}
          {activeTab === 'language' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                    <span>🌐</span> {t('settings.lang.title')}
                  </h3>
                  <p className="text-xs text-white/60 mt-1 max-w-lg leading-relaxed">
                    {t('settings.lang.desc')}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 shadow-inner">
                  <span>{SUPPORTED_LANGUAGES.find(l => l.code === lang)?.flag}</span>
                  <span>{SUPPORTED_LANGUAGES.find(l => l.code === lang)?.nativeName}</span>
                </div>
              </div>

              {/* Apple visionOS Spatial Language Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUPPORTED_LANGUAGES.map((item) => {
                  const isSelected = lang === item.code;
                  return (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLanguage(item.code);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group relative backdrop-blur-xl ${
                        isSelected
                          ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/10 border-primary-400 text-white shadow-[0_10px_30px_rgba(var(--primary-500-rgb),0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] scale-[1.01]'
                          : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.09] hover:border-white/25 hover:text-white active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-3xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                          {item.flag}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black tracking-wide text-white">
                              {item.nativeName}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
                              {item.code.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-white/50 mt-0.5">
                            {item.name} • {item.region}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-7 h-7 rounded-full bg-primary-500 text-black flex items-center justify-center font-bold text-sm shadow-[0_0_12px_rgba(var(--primary-500-rgb),0.6)]">
                          ✓
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white/40">
                          →
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* visionOS Info Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center gap-3 text-xs text-white/60">
                <span className="text-xl">✨</span>
                <p className="leading-relaxed">
                  Toàn bộ giao diện, thanh điều hướng, cài đặt và NKI AI Photo Studio sẽ được cập nhật tức thì sang ngôn ngữ bạn đã chọn.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: THƯ MỤC LƯU TRỮ */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              {/* Google Drive Folder Setting */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">☁️</span>
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                        Thư Mục Gốc Trên Google Drive
                      </h3>
                      <p className="text-[11px] text-white/50">
                        Thư mục sẽ được tự động tạo hoặc lưu ảnh vào trong tài khoản Google Drive của bạn
                      </p>
                    </div>
                  </div>
                  {googleUser && (
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Drive Ready
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={driveFolderInput}
                    onChange={(e) => setDriveFolderInput(e.target.value)}
                    placeholder="NK Imagen Storage"
                    className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-primary-400 focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => setDriveFolderInput('NK Imagen Storage')}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors"
                    title="Đặt lại về mặc định"
                  >
                    Mặc định
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-white/70">Tự động đồng bộ ảnh vừa tạo lên Google Drive:</span>
                  <button
                    onClick={() => setAutoSyncDrive(!autoSyncDrive)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                      autoSyncDrive ? 'bg-primary-500' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        autoSyncDrive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Local PC Folder Setting */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💻</span>
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                        Thư Mục Lưu Trên Máy Tính (Local Directory)
                      </h3>
                      <p className="text-[11px] text-white/50">
                        Chọn một thư mục trực tiếp trên ổ cứng PC để tự động lưu ảnh mà không cần hỏi mỗi lần
                      </p>
                    </div>
                  </div>
                  {hasLocalDirectory ? (
                    <span className="text-[10px] text-primary-400 font-mono bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
                      Đã cấp quyền
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      Mặc định Downloads
                    </span>
                  )}
                </div>

                <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-primary-400 text-sm">📁</span>
                    <div className="truncate">
                      <span className="text-xs font-mono text-white/90">
                        {localFolderName ? localFolderName : 'Chưa chọn (Trình duyệt sẽ tải về thư mục Downloads mặc định)'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePickLocalDirectory}
                      disabled={isPickingDir}
                      className="px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <span>{isPickingDir ? 'Đang chọn...' : hasLocalDirectory ? 'Đổi Thư Mục' : 'Chọn Thư Mục PC'}</span>
                    </button>
                    {hasLocalDirectory && (
                      <button
                        onClick={handleClearLocalDirectory}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs transition-colors"
                        title="Xóa quyền truy cập thư mục"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {hasLocalDirectory && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-white/70">
                      Tự động ghi tệp vào thư mục máy tính ngay khi tạo ảnh xong:
                    </span>
                    <button
                      onClick={() => setAutoSaveLocalDisk(!autoSaveLocalDisk)}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        autoSaveLocalDisk ? 'bg-primary-500' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          autoSaveLocalDisk ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Naming Pattern Setting */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏷️</span>
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                      Quy Tắc Đặt Tên Tệp Ảnh (File Naming)
                    </h3>
                    <p className="text-[11px] text-white/50">Định dạng tên tệp khi lưu vào máy tính hoặc Google Drive</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">Tiền tố tệp (Prefix):</label>
                    <input
                      type="text"
                      value={prefixInput}
                      onChange={(e) => setPrefixInput(e.target.value)}
                      placeholder="NKI_"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-primary-400 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">Cấu trúc tên:</label>
                    <select
                      value={namingPattern}
                      onChange={(e: any) => setNamingPattern(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-primary-400 focus:outline-none font-mono"
                    >
                      <option value="subject_timestamp">[Tiền tố][Chủ thể]_[Thời gian].png</option>
                      <option value="timestamp">[Tiền tố][Thời gian]_[ID].png</option>
                      <option value="seed_prompt">[Tiền tố]seed[Seed]_[Prompt].png</option>
                    </select>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-[11px] text-white/50 font-mono">
                  Ví dụ tên tệp:{' '}
                  <span className="text-primary-300">
                    {prefixInput}
                    {namingPattern === 'subject_timestamp'
                      ? 'Cyberpunk_Character_20261006_113045.png'
                      : namingPattern === 'timestamp'
                      ? '20261006_113045_a1b2c3.png'
                      : 'seed89421_Cyberpunk_Girl.png'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GALLERY MEMORY & INDEXEDDB */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Storage Engine Status */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm">
                      💾
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-2">
                        <span>Bộ Nhớ IndexedDB Studio</span>
                        <span className="text-[9px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                          Vĩnh Viễn
                        </span>
                      </h3>
                      <p className="text-[11px] text-white/50">
                        Khắc phục hoàn toàn giới hạn 5MB của localStorage. Toàn bộ ảnh tạo ra luôn được lưu trữ an toàn.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center">
                    <span className="text-[11px] text-white/50 block">Số lượng ảnh lưu trữ</span>
                    <span className="text-lg font-black text-white font-mono">{galleryEstimate.count}</span>
                  </div>
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center">
                    <span className="text-[11px] text-white/50 block">Dung lượng sử dụng</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {galleryEstimate.formattedSize}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
                <h3 className="font-bold text-white text-xs uppercase tracking-wide">Tùy Chọn Gallery</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white/90 block">Tự động lưu ảnh vào Gallery</span>
                    <span className="text-[11px] text-white/50 block">Mọi ảnh được tạo từ các công cụ sẽ tự động thêm vào thư viện</span>
                  </div>
                  <button
                    onClick={() => setAutoSaveGallery(!autoSaveGallery)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                      autoSaveGallery ? 'bg-primary-500' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        autoSaveGallery ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Danger Zone: Clear Gallery */}
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-sm">⚠️</span>
                  <h3 className="font-bold text-red-400 text-xs uppercase tracking-wide">
                    Dọn Dẹp Bộ Nhớ Thư Viện
                  </h3>
                </div>
                <p className="text-[11px] text-white/50">
                  Xóa toàn bộ ảnh đang lưu trong IndexedDB trên trình duyệt này. Hãy chắc chắn bạn đã tải về các ảnh quan trọng.
                </p>

                {confirmClearGallery ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
                    <p className="text-xs text-red-300 font-semibold">
                      Bạn có chắc chắn muốn xóa toàn bộ {galleryEstimate.count} ảnh trong Gallery không?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearAllGalleryItems}
                        disabled={isClearing}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        {isClearing ? 'Đang xóa...' : 'Đồng ý xóa sạch'}
                      </button>
                      <button
                        onClick={() => setConfirmClearGallery(false)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearGallery(true)}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-colors"
                  >
                    Xóa Toàn Bộ Gallery
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE & KẾT NỐI */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              {/* Account Status */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {googleUser?.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full border border-emerald-400/50"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg font-bold">
                        G
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                        {googleUser ? googleUser.displayName || 'Google Account' : 'Chưa Kết Nối Google Drive'}
                      </h3>
                      <p className="text-[11px] text-white/50">
                        {googleUser ? googleUser.email : 'Đăng nhập để đồng bộ ảnh và tạo thư mục tự động trên Drive'}
                      </p>
                    </div>
                  </div>

                  {googleUser && getAccessToken() ? (
                    <button
                      onClick={async () => {
                        await logout();
                      }}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                    >
                      Đăng Xuất
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          setIsConnectingDrive(true);
                          await onConnectDrive();
                        } finally {
                          setIsConnectingDrive(false);
                        }
                      }}
                      disabled={isConnectingDrive}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1.5"
                    >
                      <span>{isConnectingDrive ? 'Đang mở đăng nhập...' : 'Kết Nối Drive'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cloud Vault - Multi-device Sync Box */}
              {googleUser && getAccessToken() && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary-950/40 via-black/40 to-indigo-950/40 border border-primary-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-300 text-lg font-black shadow-lg">
                        ☁️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                            Đồng Bộ Toàn Diện Đa Thiết Bị (Cloud Vault)
                          </h3>
                          <span className="text-[9px] bg-primary-500/20 text-primary-300 font-mono px-2 py-0.5 rounded-full border border-primary-500/30">
                            Sync 2 Chiều
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60">
                          Đồng bộ cả Kho Prompt JSON, Bộ Sưu Tập, Presets và Thư Viện Ảnh dùng chung giữa các máy
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={onSyncCloudVault}
                      disabled={isCloudVaultSyncing}
                      className="px-4 py-2 bg-gradient-to-r from-primary-500 to-emerald-400 hover:from-primary-400 hover:to-emerald-300 text-black font-black uppercase text-xs rounded-xl shadow-lg shadow-primary-500/25 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      {isCloudVaultSyncing ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Đang đồng bộ...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Đồng Bộ Ngay</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-white/70">
                    <div>
                      <span className="text-white/40 block text-[9px] uppercase">File Cloud Vault trên Drive:</span>
                      <span className="text-emerald-400 font-bold">nki_cloud_vault.json</span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[9px] uppercase">Lần đồng bộ gần nhất:</span>
                      <span className="text-white">
                        {localStorage.getItem('nki_cloud_vault_last_synced')
                          ? new Date(Number(localStorage.getItem('nki_cloud_vault_last_synced'))).toLocaleString()
                          : 'Chưa đồng bộ'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Domain & Host Diagnostic */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌐</span>
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                        Kiểm Tra Tên Miền (Domain Diagnostic)
                      </h3>
                      <p className="text-[11px] text-white/50">Tên miền hiện tại bạn đang mở ứng dụng</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isUsing127
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : isCustomDomain
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}
                  >
                    Host: {currentHost}
                  </span>
                </div>

                {isCustomDomain ? (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-3 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold text-sm">⚠️ Phát hiện Online Domain / Vercel:</span>
                    </div>
                    <p className="text-rose-200/90 text-[11px] leading-relaxed">
                      Bạn đang truy cập qua domain trực tuyến: <strong className="font-mono text-white bg-black/40 px-1.5 py-0.5 rounded">{currentOrigin}</strong>.
                      Nếu bấm kết nối Drive gặp thông báo <strong className="text-white">"Lỗi 400: origin_mismatch"</strong>, Google yêu cầu thêm domain này vào Google Cloud Console.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={handleCopyOrigin}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-mono text-xs rounded-lg border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <span>{copiedOrigin ? '✓ Đã chép Origin' : '📋 Sao chép Origin'}</span>
                      </button>
                      <a
                        href="https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0018947505"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                      >
                        <span>Mở Google Cloud Console Credentials ↗</span>
                      </a>
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0018947505/authentication/settings"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
                      >
                        <span>Firebase Authorized Domains ↗</span>
                      </a>
                    </div>

                    <div className="p-2.5 bg-black/50 rounded-lg text-[10px] text-white/70 space-y-1">
                      <div className="font-bold text-white uppercase tracking-wider text-[9px]">3 Bước cấp phép trong 1 phút:</div>
                      <div>1. Bấm link Google Cloud Console ở trên &gt; Nhấp vào <strong>Web client</strong> (OAuth 2.0 Client IDs).</div>
                      <div>2. Tại mục <strong>Authorized JavaScript origins</strong>: Bấm <em>ADD URI</em> &gt; Dán <code className="text-primary-300 font-mono">{currentOrigin}</code></div>
                      <div>3. Tại mục <strong>Authorized redirect URIs</strong>: Bấm <em>ADD URI</em> &gt; Dán <code className="text-primary-300 font-mono">{currentOrigin}</code> &gt; Nhấn <strong>SAVE (Lưu)</strong>.</div>
                    </div>
                  </div>
                ) : isUsing127 ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">⚠️ Chú ý quan trọng về lỗi Drive:</span>
                    </div>
                    <p className="text-amber-200/90 text-[11px]">
                      Bạn đang truy cập qua địa chỉ IP <strong className="font-mono text-white">127.0.0.1:3000</strong>.
                      Firebase Authorized Domains trong dự án Google chỉ cấp phép mặc định cho <strong className="font-mono text-white">localhost</strong>.
                      Điều này gây ra lỗi <code className="bg-black/30 px-1 py-0.5 rounded text-red-300">auth/unauthorized-domain</code> khi bấm đăng nhập!
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={handleSwitchToLocalhost}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-lg text-xs tracking-wide transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-1.5"
                      >
                        <span>👉 Bấm vào đây để chuyển sang http://localhost:3000</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
                    <p className="flex items-center gap-2">
                      <span>✅</span>
                      <span>Bạn đang truy cập qua <strong>localhost</strong>. Tên miền này đã được ủy quyền hợp lệ trong Google Cloud & Firebase Console!</span>
                    </p>
                  </div>
                )}

                {/* Custom Google OAuth Client ID Configuration */}
                <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-2">
                        <span>Tùy Chỉnh Google OAuth Client ID</span>
                        {localStorage.getItem('custom_google_client_id') && (
                          <span className="text-[9px] bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded font-mono">
                            Đang dùng Client riêng
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-white/50">
                        Nếu bạn triển khai web trên server / tên miền riêng của bạn, bạn có thể tự tạo OAuth 2.0 Web Client ID trong Google Cloud Console và nhập vào đây:
                      </p>
                    </div>
                    {clientIdSavedToast && (
                      <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">
                        ✓ Đã lưu thành công
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customClientIdInput}
                      onChange={(e) => setCustomClientIdInput(e.target.value)}
                      placeholder="VD: 123456789-abcdef.apps.googleusercontent.com (để trống để dùng mặc định)"
                      className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 font-mono focus:border-primary-500 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={handleSaveCustomClientId}
                      className="px-3.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-black font-bold text-xs rounded-lg transition-colors shadow-sm"
                    >
                      Lưu
                    </button>
                    {localStorage.getItem('custom_google_client_id') && (
                      <button
                        onClick={handleResetCustomClientId}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs rounded-lg transition-colors"
                        title="Khôi phục Client ID mặc định"
                      >
                        Mặc Định
                      </button>
                    )}
                  </div>

                  <div className="text-[10px] text-white/40 font-mono">
                    Client ID hiện hành:{' '}
                    <span className="text-white/70 truncate block">{getEffectiveGoogleClientId()}</span>
                  </div>
                </div>

                {/* Checklist guide */}
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2 text-[11px] text-white/70">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Hướng Dẫn Khắc Phục Lỗi Drive:</h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-white/60">
                    <li>
                      <strong className="text-white/90">Nếu gặp lỗi origin_mismatch:</strong> Domain bạn mở ứng dụng chưa được ủy quyền trên Google Cloud. Hãy thêm origin vào OAuth Client ID hoặc chạy trên <code className="text-primary-300 font-mono">http://localhost:3000</code>.
                    </li>
                    <li>
                      <strong className="text-white/90">Nếu gặp lỗi unauthorized-domain:</strong> Truy cập bằng{' '}
                      <a href="http://localhost:3000" className="text-primary-300 underline font-mono">http://localhost:3000</a>{' '}
                      thay vì 127.0.0.1, hoặc thêm <code className="text-white font-mono bg-white/10 px-1">127.0.0.1</code> vào{' '}
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0018947505/authentication/settings"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-300 underline"
                      >
                        Firebase Authorized Domains ↗
                      </a>.
                    </li>
                    <li>
                      <strong className="text-white/90">Nếu gặp lỗi Google Drive API disabled:</strong> Vào{' '}
                      <a
                        href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=gen-lang-client-0018947505"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-300 underline"
                      >
                        Google Cloud Console Drive API ↗
                      </a>{' '}
                      và bấm <strong className="text-emerald-400">ENABLE (Bật)</strong>.
                    </li>
                    <li>
                      <strong className="text-white/90">Quyền truy cập:</strong> Khi cửa sổ Google hiện lên, hãy tích chọn ô vuông cho phép ứng dụng tạo và lưu tệp vào Google Drive.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CẬP NHẬT & PWA DESKTOP APP */}
          {activeTab === 'update' && (
            <div className="space-y-6">
              {/* Box 1: Version & Repository Overview */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-lg">
                      🚀
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                          Phiên Bản Hệ Thống & Mã Nguồn
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                          v{APP_VERSION}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">
                        Hệ thống Progressive Web App tối ưu RAM và cập nhật 1-Click
                      </p>
                    </div>
                  </div>

                  <a
                    href={GITHUB_REPO}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <span>GitHub Repo ↗</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-black/30 p-3 rounded-xl border border-white/5 font-mono">
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">Phiên bản hiện tại:</span>
                    <span className="text-white font-bold">NKI Imagen v{APP_VERSION}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">GitHub Sync Target:</span>
                    <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="text-primary-300 hover:underline truncate block">
                      PrimiasArt/NKI-Imagen
                    </a>
                  </div>
                </div>
              </div>

              {/* Box 2: Auto Update 1-Click Checker */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-2">
                      <span>⚡</span>
                      <span>Kiểm Tra Bản Cập Nhật Mới (1-Click Update)</span>
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Kiểm tra trực tiếp với kho mã nguồn GitHub và Service Worker
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      setIsCheckingUpdate(true);
                      try {
                        if ('serviceWorker' in navigator) {
                          const reg = await navigator.serviceWorker.getRegistration();
                          if (reg) await reg.update();
                        }
                        const info = await checkGitHubUpdates();
                        setUpdateInfo(info);
                      } catch (err) {
                        console.error('Check update error:', err);
                      } finally {
                        setIsCheckingUpdate(false);
                      }
                    }}
                    disabled={isCheckingUpdate}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center gap-1.5"
                  >
                    {isCheckingUpdate ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang kiểm tra...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Kiểm Tra Cập Nhật</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Kết quả kiểm tra */}
                {updateInfo && (
                  <div className="animate-in fade-in duration-300">
                    {updateInfo.hasUpdate ? (
                      <div className="p-4 rounded-xl bg-primary-950/40 border border-primary-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🎉</span>
                            <div>
                              <h4 className="font-bold text-white text-xs">Đã tìm thấy bản cập nhật mới!</h4>
                              <p className="text-[11px] text-white/70">
                                Commit: <span className="font-mono text-primary-300">{updateInfo.latestCommitSha}</span>
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              setIsApplyingUpdate(true);
                              if (updateInfo.latestCommitSha) {
                                markCommitAsCurrent(updateInfo.latestCommitSha);
                              }
                              await triggerSwUpdate();
                            }}
                            disabled={isApplyingUpdate}
                            className="px-4 py-2 bg-gradient-to-r from-primary-400 to-emerald-400 hover:from-primary-300 hover:to-emerald-300 text-black font-black uppercase text-xs rounded-xl shadow-lg shadow-primary-500/30 active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            {isApplyingUpdate ? 'Đang nạp code mới...' : '⚡ Cập Nhật 1-Click Ngay'}
                          </button>
                        </div>
                        {updateInfo.latestCommitMessage && (
                          <div className="bg-black/40 p-2.5 rounded-lg border border-white/10 text-xs text-white/80 font-mono">
                            {updateInfo.latestCommitMessage}
                          </div>
                        )}
                      </div>
                    ) : updateInfo.error ? (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                        <span>ℹ️</span>
                        <span>{updateInfo.error}</span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
                        <span>✅</span>
                        <span>Bạn đang sử dụng phiên bản mới nhất từ kho lưu trữ!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Box 3: PWA Desktop App Installation */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
                      🖥️
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wide">
                        Cài Đặt Ứng Dụng Desktop (PWA)
                      </h3>
                      <p className="text-[11px] text-white/50">
                        Chạy cửa sổ độc lập, tiết kiệm RAM (~60MB), có Icon ngoài màn hình
                      </p>
                    </div>
                  </div>

                  {isRunningStandalone() ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Đang chạy Desktop App</span>
                    </span>
                  ) : canInstallDesktop ? (
                    <button
                      onClick={async () => {
                        const ok = await promptPwaInstall();
                        if (ok) {
                          setInstallSuccessMessage(true);
                          setTimeout(() => setInstallSuccessMessage(false), 4000);
                        }
                      }}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)] flex items-center gap-1.5"
                    >
                      <span>📲</span>
                      <span>Cài Đặt Vào Máy Tính</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-white/40 italic">
                      Đã cài đặt hoặc trình duyệt đang mở trực tiếp
                    </span>
                  )}
                </div>

                {installSuccessMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-in fade-in">
                    🎉 Đã thêm ứng dụng ra màn hình Desktop thành công!
                  </div>
                )}
              </div>

              {/* Box 4: Hướng dẫn cơ chế cập nhật tự động */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs text-white/70">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Cơ Chế Auto-Update 1-Click Hoạt Động Như Thế Nào?</span>
                </h4>
                <ul className="space-y-1.5 list-disc pl-4 text-white/60 text-[11px] leading-relaxed">
                  <li>
                    <strong className="text-white/90">Tự động nhận diện bản mới:</strong> Khi có commit mới đẩy lên <code className="text-primary-300 font-mono bg-white/5 px-1 rounded">github.com/PrimiasArt/NKI-Imagen</code> và deploy, Service Worker ngầm của app sẽ phát hiện ngay trong 15 phút.
                  </li>
                  <li>
                    <strong className="text-white/90">Thông báo 1-Click:</strong> Màn hình sẽ hiện thanh thông báo <em>"Đã có phiên bản mới"</em>. Nhấn <strong>Cập nhật ngay</strong> là app tự làm mới chỉ trong 1 giây.
                  </li>
                  <li>
                    <strong className="text-white/90">An toàn dữ liệu:</strong> Toàn bộ ảnh trong Gallery và Prompt JSON trong IndexedDB được lưu an toàn tuyệt đối ở máy tính, không bao giờ bị xóa khi cập nhật.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 5: KHỬ DẤU VẾT AI (ANTI-AI CAMOUFLAGE) */}
          {activeTab === 'anti-ai' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Banner Header */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-none text-xl border border-emerald-500/30">
                  🛡️
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Bộ Lọc Khử Dấu Vết AI & Ngụy Trang Máy Ảnh Thật
                    <span className="text-[9px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                      Anti-AI Camouflage
                    </span>
                  </h4>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Giải pháp toàn diện giúp hình ảnh vượt qua các bộ quét nhận diện AI (Facebook, TikTok, Sightengine, Hive...) bằng cách phá vỡ thủy ấn số <strong className="text-emerald-300">SynthID</strong> của Google, làm sạch siêu dữ liệu và cấy EXIF máy ảnh chuyên nghiệp.
                  </p>
                </div>
              </div>

              {/* Section 1: Master Switch */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Tự Động Kích Hoạt Khi Tải Ảnh</span>
                    </label>
                    <p className="text-xs text-white/40">
                      Mỗi khi tải ảnh về máy từ Gallery hoặc Inspector, hệ thống sẽ tự động chuyển đổi sang ảnh chụp quang học chân thực (.jpg).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={antiAiSettings.enabled}
                      onChange={(e) => updateAntiAi({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>

              {/* Section 1: Stealth Presets */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    1. Cấp Độ Ngụy Trang (Stealth Presets)
                  </label>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Khuyên dùng: Tối Thượng
                  </span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Lựa chọn cấu hình phù hợp với mục đích xuất ảnh. Chế độ <strong className="text-emerald-400">Tối Thượng</strong> được thiết kế đặc trị để triệt hạ mã <code className="text-emerald-300">gemini3</code> trên Hive Detect từ 99.9% xuống dưới 5%:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {(Object.keys(STEALTH_PRESETS) as AntiAiStealthLevel[]).map((levelKey) => {
                    const preset = STEALTH_PRESETS[levelKey];
                    const isSelected = (antiAiSettings.stealthLevel || 'ultra_stealth') === levelKey;
                    return (
                      <div
                        key={levelKey}
                        onClick={() => {
                          const updated = {
                            ...antiAiSettings,
                            stealthLevel: levelKey,
                            ...(preset.settings || {})
                          };
                          setAntiAiSettings(updated);
                          saveAntiAiSettings(updated);
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/40'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-white/20'}`}></span>
                              {preset.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/60 leading-relaxed line-clamp-3">
                            {preset.description}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {preset.badge}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              ✓ Đang chọn
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Camera Profile Selection */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                  2. Cấu Hình Máy Ảnh Giả Lập (Camera Hardware Profile)
                </label>
                <p className="text-xs text-white/50">
                  Siêu dữ liệu EXIF sẽ được nhúng các thông số vật lý của cảm biến, ống kính và firmware thực tế:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {(Object.keys(CAMERA_PROFILES) as CameraPresetType[]).map((key) => {
                    const prof = CAMERA_PROFILES[key];
                    const isSelected = antiAiSettings.cameraPreset === key;
                    return (
                      <div
                        key={key}
                        onClick={() => updateAntiAi({ cameraPreset: key })}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                            : 'bg-white/[0.01] border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                            <span className={`w-2 h-2 rounded-full flex-none ${isSelected ? 'bg-emerald-400' : 'bg-white/20'}`}></span>
                            <span className="truncate">{prof.make} {prof.model}</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex-none ml-1">
                            ISO {prof.iso}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 truncate font-mono">{prof.lens}</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-white/40 font-mono">
                          <span>f/{(prof.fNumber[0]/prof.fNumber[1]).toFixed(1)}</span>
                          <span>•</span>
                          <span>{prof.exposureTime[0]}/{prof.exposureTime[1]}s</span>
                          <span>•</span>
                          <span>{prof.focalLength35 || (prof.focalLength[0]/prof.focalLength[1])}mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Deep Forensic Technologies & Fine-Tuning */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <label className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                  3. Bộ Công Nghệ Quang Học Chuyên Sâu (Forensic Bypass Suite)
                </label>

                {/* Sub-pixel Elastic Phase Warp */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-semibold text-white/90">Vi Biến Dạng Đàn Hồi Sub-Pixel (Elastic Phase Warp)</span>
                    <p className="text-[11px] text-white/40">
                      Dịch chuyển toạ độ phi tuyến tính hình sin chu kỳ nguyên tố (43/23px) để bẻ gãy lưới VAE 8x8/16x16 và dập tắt tính đồng pha của SynthID.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-none">
                    <input
                      type="checkbox"
                      checked={antiAiSettings.microResample}
                      onChange={(e) => updateAntiAi({ microResample: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <hr className="border-white/5" />

                {/* Radial Chromatic Aberration */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-semibold text-white/90">Tán Sắc Thấu Kính Quang Học (Radial Chromatic Aberration)</span>
                    <p className="text-[11px] text-white/40">
                      Mô phỏng hiện tượng khúc xạ thủy tinh thực tế của ống kính khẩu lớn f/1.2 - f/1.4 (dịch nhẹ kênh Đỏ hướng biên, kênh Lam hướng tâm).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-none">
                    <input
                      type="checkbox"
                      checked={antiAiSettings.chromaticAberration !== false}
                      onChange={(e) => updateAntiAi({ chromaticAberration: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <hr className="border-white/5" />

                {/* Bayer CFA & Poisson-Gaussian Sensor Simulation */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-semibold text-white/90">Cảm Biến Bayer CFA & Nhiễu Lượng Tử Photon (Poisson-Gaussian)</span>
                    <p className="text-[11px] text-white/40">
                      Tái tạo ma trận cảm biến vật lý RGGB với nhiễu quang điện phụ thuộc cường độ sáng (Shot noise), triệt tiêu nhiễu giả tạo.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-none">
                    <input
                      type="checkbox"
                      checked={antiAiSettings.bayerCfaEmulation !== false}
                      onChange={(e) => updateAntiAi({ bayerCfaEmulation: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <hr className="border-white/5" />

                {/* Dermis Micro-Texture Pore Synthesis */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-semibold text-white/90">Cấy Vi Lỗ Chân Lông Biểu Bì (Dermis Micro-Pore Synthesis)</span>
                    <p className="text-[11px] text-white/40">
                      Tự động dò tìm vùng da người và cấy vi cấu trúc tế bào sinh học, xóa sạch chỉ số "da sáp búp bê" đặc thù của Imagen/Midjourney.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-none">
                    <input
                      type="checkbox"
                      checked={antiAiSettings.dermisTexture !== false}
                      onChange={(e) => updateAntiAi({ dermisTexture: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <hr className="border-white/5" />

                {/* Grain slider */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/90">Độ Đậm Hạt Cảm Biến Quang Học:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {(antiAiSettings.grainIntensity * 100).toFixed(1)}% ({antiAiSettings.grainIntensity <= 0.018 ? 'Siêu Mịn' : antiAiSettings.grainIntensity <= 0.030 ? 'Chuẩn Cảm Biến Thực' : 'Đậm Hạt Film'})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.008"
                    max="0.045"
                    step="0.002"
                    value={antiAiSettings.grainIntensity}
                    onChange={(e) => updateAntiAi({ grainIntensity: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 bg-white/10 rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-white/30 font-mono">
                    <span>0.8% (Siêu mịn)</span>
                    <span>2.6% (Tối ưu Hive Detect)</span>
                    <span>4.5% (Cổ điển)</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Prompt Sanitizer Sandbox */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    3. Công Cụ Khử "Từ Khóa Bẫy AI" Trong Prompt
                  </label>
                  <span className="text-[10px] text-white/40">Test nhanh Prompt</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Các từ như <code>photorealistic, 8k, octane, masterpiece</code> là mồi nhử khiến AI bị phát hiện. Nhập thử prompt dưới đây để thanh lọc:
                </p>

                <textarea
                  value={sanitizePromptInput}
                  onChange={(e) => setSanitizePromptInput(e.target.value)}
                  className="w-full h-16 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:border-emerald-500 resize-none font-mono"
                  placeholder="Nhập câu prompt chứa từ khóa cần khử..."
                />

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const cleaned = sanitizePromptAntiAi(sanitizePromptInput);
                      setSanitizedPromptResult(cleaned);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                  >
                    <span>🧹</span>
                    <span>Làm Sạch Prompt Ngay</span>
                  </button>
                </div>

                {sanitizedPromptResult && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 animate-in fade-in duration-300">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Kết quả Prompt đã khử bẫy AI:</span>
                    <p className="text-xs font-mono text-emerald-100 select-all leading-relaxed">
                      {sanitizedPromptResult}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: MÔ HÌNH AI & STUDIO HIGH-RES (visionOS Model Engine) */}
          {activeTab === 'models' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🤖</span>
                    <span>Tùy Chỉnh Mô Hình AI & Độ Phân Giải Studio</span>
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    Cấu hình mô hình thế hệ mới và tăng cường độ nét để ảnh sinh ra không bị mờ nhạt
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStudioConfig(DEFAULT_STUDIO_CONFIG)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-all"
                >
                  ↺ Khôi Phục Mặc Định HQ
                </button>
              </div>

              {/* Blurry Fix Information Callout */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-cyan-500/10 border border-purple-500/30 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🔍</span>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-purple-200 flex items-center gap-2">
                    <span>Khắc Phục Lỗi Ảnh Mờ & Độ Phân Giải Thấp</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                      FIXED
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Trước đây, bộ nén ảnh đầu vào giới hạn ở mức 480px khiến các tính năng như <strong className="text-white">Virtual Wardrobe</strong>, <strong className="text-white">Expression Sculptor</strong> và <strong className="text-white">Inpainting</strong> cho ra kết quả mờ hoặc vỡ nét. Hệ thống hiện đã nâng cấp lên chuẩn <strong className="text-cyan-300">1536px – 2048px (2K)</strong> với chất lượng nén 92%+, bảo toàn trọn vẹn chi tiết sợi vải, chân tóc và vân da quang học!
                  </p>
                </div>
              </div>

              {/* 1. Studio Resolution Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>📐</span>
                    <span>Độ Phân Giải Tối Đa Studio (Max Dimension):</span>
                  </label>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {studioConfig.maxDimension}px
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStudioConfig(prev => ({ ...prev, maxDimension: opt.value }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        studioConfig.maxDimension === opt.value
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{opt.label}</span>
                        {studioConfig.maxDimension === opt.value && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        {opt.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Studio Image Generation Model */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🎨</span>
                  <span>Mô Hình Sinh Ảnh & Studio Edit:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_STUDIO_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setStudioConfig(prev => ({ ...prev, studioModel: model.id }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        studioConfig.studioModel === model.id
                          ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/10'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{model.label}</span>
                        {studioConfig.studioModel === model.id && (
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/30 px-2 py-0.5 rounded-full border border-purple-400/40">
                            Đang dùng
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        {model.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Analysis & Multimodal Vision Model */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🧠</span>
                  <span>Mô Hình Phân Tích Đa Phương Thức & Tư Duy:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {AVAILABLE_ANALYSIS_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setStudioConfig(prev => ({ ...prev, analysisModel: model.id }))}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        studioConfig.analysisModel === model.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/10'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{model.label}</span>
                        {studioConfig.analysisModel === model.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        {model.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. JPEG Quality Slider */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white/80">Chất lượng nén ảnh Studio (JPEG Quality):</span>
                  <span className="font-mono text-purple-400 font-bold">
                    {Math.round(studioConfig.jpegQuality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="0.98"
                  step="0.02"
                  value={studioConfig.jpegQuality}
                  onChange={(e) => setStudioConfig(prev => ({ ...prev, jpegQuality: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>80% (Nhanh)</span>
                  <span>92% (Chuẩn Studio HQ)</span>
                  <span>98% (Lossless Tối Đa)</span>
                </div>
              </div>

              {/* 5. Cấu hình Siêu Phân Giải Upscale 4K / 2K Studio */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>✨</span>
                    <span>Cấu Hình Siêu Phân Giải Upscale (Super-Resolution):</span>
                  </label>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    Pro 3 & Flash 3.1
                  </span>
                </div>
                <p className="text-[11px] text-white/50">
                  Tùy chỉnh mô hình và chế độ phục hồi mặc định khi nâng cấp ảnh trong Thư viện, Studio và Thanh công cụ.
                </p>

                {/* Default Upscale Engine */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-white/80">Mô hình Upscale mặc định:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'gemini-3-pro-image', label: 'Pro 3 Image', desc: 'Google Pro 4K (Khuyên dùng)' },
                      { id: 'gemini-3.1-flash-image', label: 'Flash 3.1 Image', desc: 'Nhanh & Sắc nét 2K/4K' },
                      { id: 'auto', label: 'Tự Động Tối Ưu', desc: 'Tự chọn Pro 3 cho 4K' }
                    ].map(eng => (
                      <button
                        key={eng.id}
                        type="button"
                        onClick={() => setStudioConfig(prev => ({ ...prev, upscaleModel: eng.id }))}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                          (studioConfig.upscaleModel || 'gemini-3-pro-image') === eng.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'
                        }`}
                      >
                        <span className="text-xs font-bold text-white">{eng.label}</span>
                        <span className="text-[9px] text-white/40">{eng.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Preset */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-white/80">Preset chuyên ngành mặc định:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'portrait', label: 'Chân dung & Da', icon: '👤' },
                      { id: 'fashion', label: 'Thời trang & Vải', icon: '👗' },
                      { id: 'cinematic', label: 'Điện ảnh & Cảnh', icon: '🎬' },
                      { id: 'anime', label: 'Digital & Anime', icon: '🎨' },
                      { id: 'faithful', label: 'Phục hồi trung thực', icon: '🛡️' }
                    ].map(pst => (
                      <button
                        key={pst.id}
                        type="button"
                        onClick={() => setStudioConfig(prev => ({ ...prev, upscalePreset: pst.id as any }))}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                          (studioConfig.upscalePreset || 'portrait') === pst.id
                            ? 'bg-indigo-500/20 border-indigo-400 text-white'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'
                        }`}
                      >
                        <span className="text-sm">{pst.icon}</span>
                        <span className="text-[10px] font-bold text-white leading-tight">{pst.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Face Enhancement & Clarity Boost */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="p-3 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Ưu tiên phục hồi khuôn mặt & mắt</span>
                      <span className="text-[9px] text-white/40">Tập trung chi tiết con ngươi, lông mi, không lệch nét mặt</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={studioConfig.upscaleFaceEnhance ?? true}
                      onChange={(e) => setStudioConfig(prev => ({ ...prev, upscaleFaceEnhance: e.target.checked }))}
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                  </label>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white/80">Tăng vi tương phản (Clarity):</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {studioConfig.upscaleClarityBoost ?? 15}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="5"
                      value={studioConfig.upscaleClarityBoost ?? 15}
                      onChange={(e) => setStudioConfig(prev => ({ ...prev, upscaleClarityBoost: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span>✓</span> Đã lưu cài đặt thành công!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center gap-1.5"
            >
              <span>Lưu Cài Đặt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
