/**
 * Service quản lý PWA Cài đặt Desktop & Auto-Update 1-Click
 * Kết nối với Service Worker và GitHub Repo (https://github.com/PrimiasArt/NKI-Imagen)
 */

export interface RemoteUpdateInfo {
  hasUpdate: boolean;
  latestCommitSha?: string;
  latestCommitMessage?: string;
  latestCommitDate?: string;
  latestReleaseTag?: string;
  releaseNotes?: string;
  error?: string;
}

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '4.3.0';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
export const GITHUB_REPO = 'https://github.com/PrimiasArt/NKI-Imagen';
export const GITHUB_API_COMMITS = 'https://api.github.com/repos/PrimiasArt/NKI-Imagen/commits/main';
export const GITHUB_API_RELEASES = 'https://api.github.com/repos/PrimiasArt/NKI-Imagen/releases/latest';

let deferredInstallPrompt: any = null;
const installListeners = new Set<(canInstall: boolean) => void>();

// Lắng nghe sự kiện cài đặt PWA
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installListeners.forEach(cb => cb(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installListeners.forEach(cb => cb(false));
    console.log('[PWA] Ứng dụng NKI Studio đã được cài đặt vào hệ thống.');
  });
}

/**
 * Đăng ký listener khi trạng thái có thể cài đặt Desktop thay đổi
 */
export function subscribeInstallPrompt(callback: (canInstall: boolean) => void) {
  installListeners.add(callback);
  callback(!!deferredInstallPrompt);
  return () => {
    installListeners.delete(callback);
  };
}

/**
 * Kiểm tra xem app đã đang chạy ở chế độ Desktop Standalone hay chưa
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Kích hoạt popup cài đặt ứng dụng vào máy tính (1-Click Install)
 */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;
  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredInstallPrompt = null;
      installListeners.forEach(cb => cb(false));
      return true;
    }
  } catch (err) {
    console.error('[PWA] Lỗi khi kích hoạt cài đặt:', err);
  }
  return false;
}

/**
 * Kiểm tra cập nhật từ GitHub Repo (PrimiasArt/NKI-Imagen)
 */
export async function checkGitHubUpdates(): Promise<RemoteUpdateInfo> {
  try {
    const res = await fetch(GITHUB_API_COMMITS, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { hasUpdate: false, error: 'Chưa tìm thấy nhánh main trên GitHub repo hoặc repo đang đặt chế độ riêng tư.' };
      }
      return { hasUpdate: false, error: `GitHub API trả về mã lỗi: ${res.status}` };
    }

    const commitData = await res.json();
    const sha = commitData.sha ? commitData.sha.substring(0, 7) : '';
    const message = commitData.commit?.message || 'Bản cập nhật mới';
    const date = commitData.commit?.committer?.date || '';

    // Kiểm tra xem commit SHA này đã từng được lưu là commit hiện tại chưa
    const storedSha = localStorage.getItem('nki_last_synced_commit');
    const isNew = storedSha ? storedSha !== sha : false;

    return {
      hasUpdate: isNew,
      latestCommitSha: sha,
      latestCommitMessage: message,
      latestCommitDate: date
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      error: err.message || 'Không thể kết nối đến máy chủ GitHub để kiểm tra.'
    };
  }
}

/**
 * Đánh dấu commit hiện tại là đã cập nhật xong
 */
export function markCommitAsCurrent(sha: string) {
  if (sha) {
    localStorage.setItem('nki_last_synced_commit', sha);
  }
}

/**
 * Kích hoạt cập nhật Service Worker ngay lập tức (1-Click)
 */
export async function triggerSwUpdate(registration?: ServiceWorkerRegistration | null) {
  if (registration && registration.waiting) {
    // Gửi tín hiệu SKIP_WAITING tới Service Worker đang đợi
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Đợi 200ms và reload trang để áp dụng bản cập nhật mới
  setTimeout(() => {
    window.location.reload();
  }, 250);
}
