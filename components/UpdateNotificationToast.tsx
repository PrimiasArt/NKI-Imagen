import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { 
  APP_VERSION, 
  GITHUB_REPO, 
  checkGitHubUpdates, 
  RemoteUpdateInfo, 
  markCommitAsCurrent,
  subscribeInstallPrompt,
  promptPwaInstall,
  isRunningStandalone 
} from '../services/updateService';

export const UpdateNotificationToast: React.FC = () => {
  const [githubUpdate, setGithubUpdate] = useState<RemoteUpdateInfo | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Hook chính thức từ VitePWA
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registered:', swUrl);
      if (registration) {
        // Tự động kiểm tra bản cập nhật mỗi 15 phút
        setInterval(() => {
          registration.update().catch(e => console.warn('[PWA] Check update failed:', e));
        }, 15 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration failed:', error);
    },
  });

  // Lắng nghe sự kiện Desktop Install
  useEffect(() => {
    const unsub = subscribeInstallPrompt((available) => {
      setCanInstall(available && !isRunningStandalone());
    });
    return unsub;
  }, []);

  // Kiểm tra GitHub Repo ngầm khi khởi động
  useEffect(() => {
    let isMounted = true;
    checkGitHubUpdates().then((info) => {
      if (isMounted && info.hasUpdate) {
        setGithubUpdate(info);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    if (githubUpdate?.latestCommitSha) {
      markCommitAsCurrent(githubUpdate.latestCommitSha);
    }
    try {
      await updateServiceWorker(true);
    } catch (e) {
      console.warn('[PWA] Update error, falling back to reload:', e);
      window.location.reload();
    }
  };

  const handleInstallDesktop = async () => {
    const accepted = await promptPwaInstall();
    if (accepted) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  const hasUpdate = needRefresh || (githubUpdate && githubUpdate.hasUpdate);

  if (isDismissed && !hasUpdate) return null;

  return (
    <>
      {/* 1. TOAST THÔNG BÁO CẬP NHẬT 1-CLICK */}
      {hasUpdate && !isDismissed && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
          <div className="glass-card p-5 rounded-3xl border border-primary-500/40 shadow-2xl shadow-primary-950/60 bg-slate-950/90 backdrop-blur-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-500 to-emerald-300 text-black flex items-center justify-center flex-none font-black text-xl shadow-lg shadow-primary-500/30 animate-pulse">
                🚀
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>Đã có phiên bản mới!</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                      v{APP_VERSION}
                    </span>
                  </h4>
                  <button 
                    onClick={() => setIsDismissed(true)}
                    className="text-white/40 hover:text-white text-xs p-1 transition-colors"
                    title="Để sau"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-white/70 mt-1 line-clamp-2">
                  {githubUpdate?.latestCommitMessage 
                    ? `Nội dung: ${githubUpdate.latestCommitMessage}` 
                    : 'Bản cập nhật tối ưu hiệu năng và bổ sung tính năng mới đã sẵn sàng tải.'}
                </p>
                {githubUpdate?.latestCommitSha && (
                  <p className="text-[10px] font-mono text-primary-400/80 mt-1">
                    Commit: {githubUpdate.latestCommitSha}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setIsDismissed(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
              >
                Để sau
              </button>
              <button
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-gradient-to-r from-primary-400 to-emerald-400 hover:from-primary-300 hover:to-emerald-300 shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Cập nhật ngay (1-Click)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. THÔNG BÁO CÀI ĐẶT THÀNH CÔNG */}
      {installSuccess && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-top-4 duration-300">
          <div className="glass-card px-4 py-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/80 backdrop-blur-xl flex items-center gap-3 text-xs font-bold text-white shadow-xl">
            <span className="text-lg">🎉</span>
            <span>Ứng dụng NKI Studio đã được cài đặt thành công ra màn hình máy tính!</span>
          </div>
        </div>
      )}
    </>
  );
};
