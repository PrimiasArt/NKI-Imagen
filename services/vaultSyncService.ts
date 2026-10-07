import { CharacterPersona } from '../types';
import { getCharacterPersonas, saveCharacterPersona } from './consistencyService';
import { savePersonasDB } from './indexedDbService';
import {
  getAccessToken,
  getOrCreateFolder,
  getFileIdByName,
  downloadDriveFileAsText,
  uploadFileToDrive,
  updateFileContentInDrive
} from './googleService';

const STORAGE_KEY_LAST_VAULT_SYNC = 'nki_vault_last_synced_at';
const DRIVE_VAULT_FOLDER_NAME = 'NKI_Imagen_Backups';
const DRIVE_VAULT_FILE_NAME = 'nki_character_vault_sync.json';

export interface VaultSyncResult {
  success: boolean;
  total: number;
  added?: number;
  updated?: number;
  cloudFileId?: string;
  lastSyncedAt?: number;
  message: string;
}

/**
 * Returns the timestamp of the last successful Google Drive vault sync
 */
export function getVaultLastSyncedAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_LAST_VAULT_SYNC);
  return raw ? parseInt(raw, 10) : null;
}

/**
 * Exports all character models and their synthesized biometric profiles to a downloadable JSON file.
 * Enables 100% offline, cross-machine migration.
 */
export function exportCharacterVaultToJson(): void {
  if (typeof window === 'undefined') return;

  const personas = getCharacterPersonas();
  const payload = {
    app: 'NKI Studio Imagen v4.3',
    format: 'CharacterModelVault_BiometricCore',
    version: '4.3.0',
    exportedAt: Date.now(),
    exportedAtFormatted: new Date().toLocaleString('vi-VN'),
    totalCharacters: personas.length,
    characters: personas
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `nki_character_vault_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports a Character Model Vault JSON backup file and merges models and biometric profiles
 * into the local database without overwriting or duplicating unnecessarily.
 */
export async function importCharacterVaultFromJson(file: File): Promise<VaultSyncResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp sao lưu.'));
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('Tệp rỗng.');
        const parsed = JSON.parse(text);

        let incomingPersonas: CharacterPersona[] = [];
        if (Array.isArray(parsed)) {
          incomingPersonas = parsed;
        } else if (parsed && Array.isArray(parsed.characters)) {
          incomingPersonas = parsed.characters;
        } else if (parsed && Array.isArray(parsed.personas)) {
          incomingPersonas = parsed.personas;
        } else {
          throw new Error('Định dạng tệp sao lưu kho mẫu không hợp lệ.');
        }

        const localList = getCharacterPersonas();
        const mergedMap = new Map<string, CharacterPersona>();
        localList.forEach(p => mergedMap.set(p.id, p));

        let added = 0;
        let updated = 0;

        for (const inc of incomingPersonas) {
          if (!inc.id || !inc.name) continue;
          if (mergedMap.has(inc.id)) {
            const existing = mergedMap.get(inc.id)!;
            // Merge photos uniquely
            const combinedPhotos = Array.from(new Set([...(existing.photos || []), ...(inc.photos || [])]));
            // Merge biometric profile prioritizing higher photo sample count or newer sync
            const existingCount = existing.biometricAnalysisCount || (existing.biometricProfile?.sampleCount || 0);
            const incCount = inc.biometricAnalysisCount || (inc.biometricProfile?.sampleCount || 0);
            const bestBiometric = (incCount > existingCount || (!existing.biometricProfile && inc.biometricProfile))
              ? inc.biometricProfile
              : existing.biometricProfile;

            const merged: CharacterPersona = {
              ...existing,
              ...inc,
              photos: combinedPhotos,
              avatarImage: existing.avatarImage || inc.avatarImage || combinedPhotos[0],
              biometricProfile: bestBiometric,
              biometricAnalysisCount: Math.max(existingCount, incCount),
              biometricConfidence: Math.max(existing.biometricConfidence || 0, inc.biometricConfidence || 0),
              lastBiometricSync: Math.max(existing.lastBiometricSync || 0, inc.lastBiometricSync || 0),
              updatedAt: Date.now()
            };
            mergedMap.set(inc.id, merged);
            updated++;
          } else {
            mergedMap.set(inc.id, {
              ...inc,
              updatedAt: Date.now()
            });
            added++;
          }
        }

        const finalList = Array.from(mergedMap.values());
        // Save to IndexedDB and update storage
        await savePersonasDB(finalList);
        try {
          localStorage.setItem('nki_character_personas', JSON.stringify(finalList));
        } catch {}

        window.dispatchEvent(new CustomEvent('nki_personas_updated', { detail: finalList }));

        resolve({
          success: true,
          total: finalList.length,
          added,
          updated,
          message: `Đã nạp thành công! Thêm mới: ${added}, Cập nhật: ${updated}, Tổng cộng: ${finalList.length} người mẫu.`
        });
      } catch (err: any) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Bi-directional Cloud Synchronization of Character Vault & Biometric Profiles with Google Drive.
 * Merges personas across multiple machines using Google Drive App Folder.
 */
export async function syncCharacterVaultWithGoogleDrive(customToken?: string): Promise<VaultSyncResult> {
  const token = customToken || getAccessToken();
  if (!token) {
    throw new Error('Chưa kết nối Google Drive. Vui lòng kết nối tài khoản Google Drive để kích hoạt đồng bộ đám mây.');
  }

  // 1. Get or create the cloud sync folder
  const folderId = await getOrCreateFolder(token, DRIVE_VAULT_FOLDER_NAME);
  if (!folderId) {
    throw new Error('Không thể khởi tạo thư mục đồng bộ NKI trên Google Drive.');
  }

  // 2. Check if the vault sync file exists on Google Drive
  const existingFileId = await getFileIdByName(token, DRIVE_VAULT_FILE_NAME, folderId);

  const localList = getCharacterPersonas();
  const mergedMap = new Map<string, CharacterPersona>();
  localList.forEach(p => mergedMap.set(p.id, p));

  let addedFromCloud = 0;
  let updatedFromCloud = 0;

  if (existingFileId) {
    // 3. File exists: Download cloud JSON and merge bi-directionally
    try {
      const cloudContent = await downloadDriveFileAsText(token, existingFileId);
      if (cloudContent) {
        const cloudData = JSON.parse(cloudContent);
        const cloudPersonas: CharacterPersona[] = Array.isArray(cloudData)
          ? cloudData
          : (cloudData.characters || cloudData.personas || []);

        for (const cloudP of cloudPersonas) {
          if (!cloudP.id || !cloudP.name) continue;

          if (mergedMap.has(cloudP.id)) {
            const localP = mergedMap.get(cloudP.id)!;
            // Combine all photo strings uniquely
            const combinedPhotos = Array.from(new Set([...(localP.photos || []), ...(cloudP.photos || [])]));
            
            // Compare which biometric profile has richer synthesis
            const localCount = localP.biometricAnalysisCount || localP.biometricProfile?.sampleCount || 0;
            const cloudCount = cloudP.biometricAnalysisCount || cloudP.biometricProfile?.sampleCount || 0;
            const useCloudBio = (cloudCount > localCount) || (!localP.biometricProfile && !!cloudP.biometricProfile);
            
            const bestBio = useCloudBio ? cloudP.biometricProfile : localP.biometricProfile;

            const merged: CharacterPersona = {
              ...localP,
              ...cloudP,
              photos: combinedPhotos,
              avatarImage: localP.avatarImage || cloudP.avatarImage || combinedPhotos[0],
              biometricProfile: bestBio,
              biometricAnalysisCount: Math.max(localCount, cloudCount),
              biometricConfidence: Math.max(localP.biometricConfidence || 0, cloudP.biometricConfidence || 0),
              lastBiometricSync: Math.max(localP.lastBiometricSync || 0, cloudP.lastBiometricSync || 0),
              updatedAt: Date.now()
            };
            mergedMap.set(cloudP.id, merged);
            updatedFromCloud++;
          } else {
            // New model from other machine!
            mergedMap.set(cloudP.id, {
              ...cloudP,
              updatedAt: Date.now()
            });
            addedFromCloud++;
          }
        }
      }
    } catch (readErr) {
      console.warn('[VaultSyncService] Lỗi khi đọc file cloud, sẽ ghi đè bản mới nhất từ local:', readErr);
    }
  }

  const finalList = Array.from(mergedMap.values());

  // 4. Save merged result locally into IndexedDB and localStorage
  await savePersonasDB(finalList);
  try {
    localStorage.setItem('nki_character_personas', JSON.stringify(finalList));
  } catch {}

  // 5. Upload/Update merged JSON back to Google Drive
  const payload = {
    app: 'NKI Studio Imagen v4.3',
    format: 'CharacterModelVault_BiometricCore',
    version: '4.3.0',
    syncedAt: Date.now(),
    syncedAtFormatted: new Date().toLocaleString('vi-VN'),
    totalCharacters: finalList.length,
    characters: finalList
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

  let driveFileId = existingFileId;
  if (existingFileId) {
    await updateFileContentInDrive(token, existingFileId, blob, 'application/json');
  } else {
    const uploadRes = await uploadFileToDrive(token, folderId, blob, DRIVE_VAULT_FILE_NAME, 'application/json');
    driveFileId = uploadRes.id;
  }

  // 6. Record last sync timestamp and dispatch update event
  const now = Date.now();
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LAST_VAULT_SYNC, now.toString());
    window.dispatchEvent(new CustomEvent('nki_personas_updated', { detail: finalList }));
    window.dispatchEvent(new CustomEvent('nki_vault_synced', { detail: { lastSyncedAt: now, total: finalList.length } }));
  }

  return {
    success: true,
    total: finalList.length,
    added: addedFromCloud,
    updated: updatedFromCloud,
    cloudFileId: driveFileId || undefined,
    lastSyncedAt: now,
    message: `Đã đồng bộ thành công với Google Drive! (Tổng: ${finalList.length} người mẫu, Nhận từ cloud: +${addedFromCloud} mới, ${updatedFromCloud} cập nhật)`
  };
}
