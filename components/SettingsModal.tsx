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
import { getAccessToken, logout } from '../services/googleService';
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
  const [activeTab, setActiveTab] = useState<'storage' | 'gallery' | 'drive' | 'update'>('storage');
  const [driveFolderInput, setDriveFolderInput] = useState(storageSettings.driveFolderName || 'NK Imagen Storage');
  const [prefixInput, setPrefixInput] = useState(storageSettings.customPrefix || 'NKI_');
  const [namingPattern, setNamingPattern] = useState(storageSettings.namingPattern || 'subject_timestamp');
  const [autoSaveGallery, setAutoSaveGallery] = useState(storageSettings.autoSaveToGallery);
  const [autoSyncDrive, setAutoSyncDrive] = useState(storageSettings.autoSyncToDrive);
  const [autoSaveLocalDisk, setAutoSaveLocalDisk] = useState(storageSettings.autoSaveToLocalDisk);
  const [localFolderName, setLocalFolderName] = useState<string | undefined>(storageSettings.localFolderName);
  const [hasLocalDirectory, setHasLocalDirectory] = useState(storageSettings.hasLocalDirectory);
  
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
  const isUsing127 = currentHost === '127.0.0.1';

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
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0b111e]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-wider uppercase">Cài Đặt Lưu Trữ & Hệ Thống</h2>
                <span className="text-[10px] bg-primary-500/20 text-primary-300 font-mono px-1.5 py-0.5 rounded-full border border-primary-500/30">
                  NKI v4.3
                </span>
              </div>
              <p className="text-[11px] text-white/50">Cấu hình thư mục lưu ảnh, bộ nhớ IndexedDB và Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/20 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'storage'
                ? 'border-primary-400 text-primary-300 bg-white/[0.03]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <span>📁</span>
            <span>Thư Mục & Lưu Trữ</span>
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'gallery'
                ? 'border-primary-400 text-primary-300 bg-white/[0.03]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <span>🖼️</span>
            <span>Bộ Nhớ Gallery</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/70 font-mono">
              {galleryEstimate.count}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('drive')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'drive'
                ? 'border-primary-400 text-primary-300 bg-white/[0.03]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <span>☁️</span>
            <span>Google Drive</span>
            {googleUser && getAccessToken() ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full">Chưa kết nối</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('update')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'update'
                ? 'border-primary-400 text-primary-300 bg-white/[0.03]'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <span>🚀</span>
            <span>Cập Nhật & App</span>
            {updateInfo?.hasUpdate && (
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-ping"></span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm custom-scrollbar">
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
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}
                  >
                    Host: {currentHost}
                  </span>
                </div>

                {isUsing127 ? (
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
                      <span>Bạn đang truy cập qua <strong>localhost</strong>. Tên miền này đã được ủy quyền hợp lệ trong Firebase Console!</span>
                    </p>
                  </div>
                )}

                {/* Checklist guide */}
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2 text-[11px] text-white/70">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Hướng Dẫn Khắc Phục Lỗi Drive:</h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-white/60">
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
