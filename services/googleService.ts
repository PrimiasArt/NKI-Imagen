import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

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

const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request the drive.file scope which is least permissive but allows creating files
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'consent select_account'
});

// Helper to accurately extract and localize Google Drive API errors
export const parseDriveApiError = (status: number, responseText: string): Error => {
  let message = responseText;
  let reason = '';
  try {
    const parsed = JSON.parse(responseText);
    if (parsed.error) {
      message = parsed.error.message || responseText;
      reason = parsed.error.errors?.[0]?.reason || parsed.error.status || '';
    }
  } catch (e) {
    // not json
  }

  const lowerMsg = message.toLowerCase();

  if (status === 401 || reason === 'authError' || lowerMsg.includes('invalid credentials') || lowerMsg.includes('token expired')) {
    handleAuthTokenExpired();
    const err = new Error('Phiên đăng nhập Google Drive đã hết hạn. Vui lòng bấm kết nối lại tài khoản.');
    (err as any).code = 'DRIVE_TOKEN_EXPIRED';
    return err;
  }

  if (
    reason === 'accessNotConfigured' ||
    lowerMsg.includes('has not been used in project') ||
    lowerMsg.includes('is disabled') ||
    lowerMsg.includes('enable it by visiting') ||
    lowerMsg.includes('drive.googleapis.com')
  ) {
    const err = new Error(
      'Google Drive API chưa được Kích hoạt (Enable) trên Google Cloud Console của dự án (gen-lang-client-0018947505). Bạn cần vào APIs & Services > Library > tìm "Google Drive API" và bấm ENABLE (Bật).'
    );
    (err as any).code = 'DRIVE_API_DISABLED';
    return err;
  }

  if (
    reason === 'insufficientPermissions' ||
    lowerMsg.includes('insufficient permission') ||
    lowerMsg.includes('insufficient authentication scopes') ||
    lowerMsg.includes('not granted the app read and write access')
  ) {
    handleAuthTokenExpired();
    const err = new Error(
      'Tài khoản chưa cấp quyền ghi vào Google Drive. Khi cửa sổ đăng nhập hiện ra, bạn cần TÍCH CHỌN vào ô vuông: "Xem, chỉnh sửa, tạo và xóa các tệp Google Drive mà bạn sử dụng với ứng dụng này".'
    );
    (err as any).code = 'DRIVE_SCOPE_MISSING';
    return err;
  }

  if (reason === 'storageQuotaExceeded' || lowerMsg.includes('storage quota')) {
    const err = new Error('Dung lượng Google Drive của bạn đã đầy (Storage Quota Exceeded).');
    (err as any).code = 'DRIVE_QUOTA_EXCEEDED';
    (err as any).status = status;
    return err;
  }

  if (
    status === 429 ||
    reason === 'rateLimitExceeded' ||
    reason === 'userRateLimitExceeded' ||
    reason === 'quotaExceeded' ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('quota exceeded') ||
    lowerMsg.includes('too many requests')
  ) {
    const err = new Error(`Google Drive API Quota Exceeded (429): ${message}`);
    (err as any).code = 'DRIVE_ERROR_429';
    (err as any).status = 429;
    return err;
  }

  const err = new Error(`Lỗi Google Drive (${status}): ${message}`);
  (err as any).code = `DRIVE_ERROR_${status}`;
  (err as any).status = status;
  return err;
};

// Check if an error is transient (e.g. Rate Limit 429, Server Error 5xx, or Network Drop)
export const isTransientDriveError = (err: any): boolean => {
  if (!err) return false;
  const status = Number(err?.status || err?.statusCode || 0);
  const code = String(err?.code || '');
  const msg = (err?.message || String(err)).toLowerCase();

  // Rate Limit / API Quota Exceeded (429)
  if (
    status === 429 ||
    code === 'DRIVE_ERROR_429' ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('quota exceeded') ||
    msg.includes('userratelimitexceeded') ||
    msg.includes('ratelimitexceeded') ||
    msg.includes('too many requests')
  ) {
    return true;
  }

  // Transient Google server errors (500, 502, 503, 504)
  if (
    (status >= 500 && status <= 504) ||
    code.startsWith('DRIVE_ERROR_5') ||
    msg.includes('backenderror') ||
    msg.includes('500 internal server error') ||
    msg.includes('502 bad gateway') ||
    msg.includes('503 service unavailable') ||
    msg.includes('504 gateway timeout')
  ) {
    return true;
  }

  // Transient network dropouts or fetch errors
  if (
    err?.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('connection reset') ||
    msg.includes('err_internet_disconnected')
  ) {
    return true;
  }

  return false;
};

export interface BackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
  onRetry?: (attempt: number, maxRetries: number, delayMs: number, error: any) => void;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Executes an async task with exponential backoff and randomized jitter for transient network/quota (429) errors.
 */
export const executeWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  options: BackoffOptions = {}
): Promise<T> => {
  const {
    maxRetries = 4,
    baseDelayMs = 1000,
    maxDelayMs = 16000,
    multiplier = 2,
    onRetry,
    shouldRetry = isTransientDriveError
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;

      // Non-transient or exhausted all retries -> propagate error
      if (attempt > maxRetries || !shouldRetry(err)) {
        throw err;
      }

      // Exponential backoff: min(baseDelay * multiplier^(attempt - 1), maxDelay) * jitter (0.8 ~ 1.2)
      const calculatedDelay = Math.min(baseDelayMs * Math.pow(multiplier, attempt - 1), maxDelayMs);
      const jitter = 0.8 + Math.random() * 0.4;
      const actualDelayMs = Math.round(calculatedDelay * jitter);

      console.warn(
        `[Google Drive Exponential Backoff] Attempt ${attempt}/${maxRetries} failed with transient error: "${err?.message || err}". Retrying in ${actualDelayMs}ms...`
      );

      if (onRetry) {
        onRetry(attempt, maxRetries, actualDelayMs, err);
      }

      await new Promise(resolve => setTimeout(resolve, actualDelayMs));
    }
  }
};

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize Auth Listener
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check if we have stored GIS session
  const storedToken = safeStorage.getItem('google_drive_access_token');
  const storedProfile = safeStorage.getItem('google_drive_user_profile');
  if (storedToken && storedProfile) {
    try {
      const parsedUser = JSON.parse(storedProfile);
      cachedAccessToken = storedToken;
      if (onAuthSuccess) onAuthSuccess(parsedUser, storedToken);
    } catch (e) {
      // ignore
    }
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        const token = safeStorage.getItem('google_drive_access_token');
        if (token) {
          cachedAccessToken = token;
          if (onAuthSuccess) onAuthSuccess(user, token);
        } else {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      // If we don't have a GIS cached session either
      if (!cachedAccessToken && !safeStorage.getItem('google_drive_access_token')) {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Google Identity Services (GIS) Direct OAuth2 Token Client
export const signInWithGIS = async (): Promise<{ user: any; accessToken: string }> => {
  const clientId = firebaseConfig.oAuthClientId || '481139169456-aucq56k4vf6a37a3d1eb9qeg4eas4u9h.apps.googleusercontent.com';
  const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

  // Ensure GIS script is loaded
  await new Promise<void>((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services SDK')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'));
    document.head.appendChild(script);
  });

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scope,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(`Google GIS Error: ${tokenResponse.error_description || tokenResponse.error}`));
            return;
          }
          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('No access token returned from Google Identity Services.'));
            return;
          }

          cachedAccessToken = accessToken;
          safeStorage.setItem('google_drive_access_token', accessToken);
          safeStorage.setItem('drive_auto_connect', 'true');

          let userObj: any = {
            uid: 'gis-' + Date.now(),
            displayName: 'Google Drive User',
            email: '',
            photoURL: ''
          };

          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userInfoRes.ok) {
              const info = await userInfoRes.json();
              userObj = {
                uid: info.sub || userObj.uid,
                displayName: info.name || info.given_name || 'Google Drive User',
                email: info.email || '',
                photoURL: info.picture || ''
              };
            }
          } catch (e) {
            console.warn('Could not fetch userinfo from Google:', e);
          }

          safeStorage.setItem('google_drive_user_profile', JSON.stringify(userObj));
          resolve({ user: userObj, accessToken });
        },
        error_callback: (err: any) => {
          reject(err);
        }
      });

      client.requestAccessToken({ prompt: 'consent select_account' });
    } catch (e) {
      reject(e);
    }
  });
};

// Sign in with Google Popup with GIS Fallback
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve the Google Drive authorization token from active session.');
    }

    cachedAccessToken = credential.accessToken;
    safeStorage.setItem('google_drive_access_token', cachedAccessToken);
    safeStorage.setItem('drive_auto_connect', 'true');
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const errStr = error?.message || String(error);
    const errCode = error?.code || '';

    // If user closed the popup, it is a normal user cancellation, not a system failure
    if (errCode === 'auth/popup-closed-by-user' || errStr.includes('popup-closed-by-user')) {
      console.warn('Google Sign-in popup was closed by user.');
      safeStorage.removeItem('drive_auto_connect');
      return null;
    }

    console.error('Google Sign-in Error:', error);
    safeStorage.removeItem('drive_auto_connect');

    if (
      errStr.includes('access_denied') || 
      errStr.includes('403') || 
      errCode === 'auth/access-denied' ||
      errStr.toLowerCase().includes('permission denied')
    ) {
      const accessErr = new Error(
        "Lỗi 403: access_denied - Google Cloud OAuth Consent Screen đang ở chế độ Testing (Thử nghiệm). Quyền Google Drive (drive.file) chỉ cho phép tài khoản trong danh sách 'Test users' trên Google Cloud Console truy cập."
      );
      (accessErr as any).code = 'auth/access-denied';
      throw accessErr;
    }

    // If Firebase threw auth/unauthorized-domain or partitioned storage error, automatically fallback to GIS
    if (
      errCode === 'auth/unauthorized-domain' || 
      errStr.includes('unauthorized-domain') || 
      errStr.includes('unauthorized domain') ||
      errCode === 'auth/internal-error'
    ) {
      console.warn('Firebase popup encountered auth/unauthorized-domain. Automatically attempting Google Identity Services (GIS) Token Client...');
      try {
        const gisResult = await signInWithGIS();
        return gisResult;
      } catch (gisErr: any) {
        console.error('GIS token request failed as well:', gisErr);
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const unauthErr = new Error(
          `Tên miền hoặc IP "${currentHost}" chưa được cấp phép trong danh sách "Authorized Domains" của dự án Firebase (gen-lang-client-0018947505).`
        );
        (unauthErr as any).code = 'auth/unauthorized-domain';
        (unauthErr as any).currentHost = currentHost;
        throw unauthErr;
      }
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Clear Google Drive auto connection intent and token
export const clearDriveAutoConnect = () => {
  cachedAccessToken = null;
  safeStorage.removeItem('drive_auto_connect');
  safeStorage.removeItem('google_drive_access_token');
  safeStorage.removeItem('google_drive_user_profile');
};

// Retrieve Cached Token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Set token manually (e.g. on redirect / page refresh logic if needed)
export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    safeStorage.setItem('google_drive_access_token', token);
    safeStorage.setItem('drive_auto_connect', 'true');
  } else {
    safeStorage.removeItem('google_drive_access_token');
    safeStorage.removeItem('drive_auto_connect');
  }
};

// Sign out
export const logout = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
  safeStorage.removeItem('google_drive_access_token');
  safeStorage.removeItem('drive_auto_connect');
};

// Handle Expired Token
export const handleAuthTokenExpired = () => {
  cachedAccessToken = null;
  safeStorage.removeItem('google_drive_access_token');
  safeStorage.removeItem('drive_auto_connect');
  
  // Do NOT force fully sign out from firebase, but notify the App about Google Drive token expiry
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('google_drive_token_expired'));
  }
};

// Fetch image as blob from Data URL or absolute URL
export const fetchImageAsBlob = async (src: string): Promise<{ blob: Blob; mimeType: string }> => {
  if (src.startsWith('data:')) {
    const parts = src.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const base64Data = parts[1];
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return { blob, mimeType };
  } else {
    const response = await fetch(src);
    const blob = await response.blob();
    return { blob, mimeType: blob.type || 'image/png' };
  }
};

// Convert a Blob to a permanent Base64 Data URL (data:image/png;base64,...)
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed converting blob to data URL.'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Find Google Drive folder by name
export const getFolderIdByName = async (
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string | null> => {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw parseDriveApiError(response.status, errorText);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

// Create a new folder
export const createFolder = async (
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> => {
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  };

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw parseDriveApiError(response.status, errorText);
  }

  const data = await response.json();
  return data.id;
};

// Get or create a Google Drive folder by name
export const getOrCreateFolder = async (
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> => {
  const existingId = await getFolderIdByName(accessToken, folderName, parentId);
  if (existingId) {
    return existingId;
  }
  return await createFolder(accessToken, folderName, parentId);
};

// Upload Blob/File to Google Drive
export const uploadFileToDrive = async (
  accessToken: string,
  filename: string,
  blob: Blob,
  mimeType: string,
  folderId?: string
): Promise<{ id: string; name: string; mimeType: string }> => {
  // Check if a file with the same name already exists in this folder to avoid creating duplicate files
  if (folderId) {
    try {
      const existingId = await getFileIdByName(accessToken, filename, folderId);
      if (existingId) {
        await updateFileContentInDrive(accessToken, existingId, blob, mimeType);
        return { id: existingId, name: filename, mimeType };
      }
    } catch (checkErr) {
      console.warn('[uploadFileToDrive] Check existing file failed, proceeding to upload new:', checkErr);
    }
  }

  const metadata = {
    name: filename,
    mimeType: mimeType,
    parents: folderId ? [folderId] : undefined,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', blob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw parseDriveApiError(response.status, errText);
  }

  return response.json();
};

// Retrieve subfolders inside a specific parent folder ID
export const getSubfolders = async (
  accessToken: string,
  parentFolderId: string
): Promise<Array<{ id: string; name: string }>> => {
  const query = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw parseDriveApiError(response.status, errText);
  }

  const data = await response.json();
  return data.files || [];
};

// List image files in a folder ID
export const listDriveFiles = async (
  accessToken: string,
  folderId: string
): Promise<Array<{ id: string; name: string; mimeType: string; createdTime?: string }>> => {
  const query = `'${folderId}' in parents and trashed = false and mimeType starts with 'image/'`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime desc`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw parseDriveApiError(response.status, errText);
  }

  const data = await response.json();
  return data.files || [];
};

// Download Drive file as local blob URL for temporary image display
export const downloadDriveFile = async (
  accessToken: string,
  fileId: string
): Promise<{ blob: Blob; mimeType: string }> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw parseDriveApiError(response.status, errText);
  }

  const blob = await response.blob();
  return { blob, mimeType: response.headers.get('content-type') || 'image/png' };
};

// Prompt for re-authentication or refresh Google session
export const refreshGoogleDriveSession = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await googleSignIn();
    return result;
  } catch (error) {
    console.error("Refresh Google Drive Session error:", error);
    throw error;
  }
};

// Find a file by exact name in a specific parent folder
export const getFileIdByName = async (
  accessToken: string,
  fileName: string,
  parentId?: string
): Promise<string | null> => {
  let query = `name = '${fileName}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw parseDriveApiError(response.status, errorText);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

// Update existing file content on Google Drive
export const updateFileContentInDrive = async (
  accessToken: string,
  fileId: string,
  blob: Blob,
  mimeType: string
): Promise<{ id: string; name: string }> => {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType,
    },
    body: blob,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw parseDriveApiError(response.status, errText);
  }

  return response.json();
};

// Download Drive file as UTF-8 text (e.g. JSON database)
export const downloadDriveFileAsText = async (
  accessToken: string,
  fileId: string
): Promise<string> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw parseDriveApiError(response.status, errText);
  }

  return response.text();
};

