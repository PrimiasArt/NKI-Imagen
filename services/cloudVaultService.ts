/**
 * Cloud Vault Service - Đồng bộ toàn diện Đa Thiết Bị qua Google Drive
 * Đồng bộ Kho Prompt JSON, Bộ Sưu Tập, Presets, Lịch Sử và Metadata Gallery
 */

import { 
  PromptHistoryItem, 
  Collection, 
  LogItem, 
  PersonalPreset,
  GalleryItem 
} from '../types';
import {
  getAllPromptItemsDB,
  saveAllPromptItemsDB,
  getAllCollectionsDB,
  saveAllCollectionsDB,
  getAllGalleryItemsDB,
  saveGalleryItemDB,
  saveAllGalleryItemsDB
} from './indexedDbService';
import {
  getFileIdByName,
  updateFileContentInDrive,
  uploadFileToDrive,
  downloadDriveFileAsText,
  getOrCreateFolder
} from './googleService';
import { loadPersonalPresets, savePersonalPresetsToStorage } from './presetService';

export const CLOUD_VAULT_FILENAME = 'nki_cloud_vault.json';

export interface CloudVaultPayload {
  version: number;
  lastUpdated: number;
  originDeviceId: string;
  prompts: PromptHistoryItem[];
  collections: Collection[];
  history: LogItem[];
  presets: PersonalPreset[];
  galleryMetadata: Array<{
    id: string;
    description?: string;
    type: string;
    createdAt: number;
    metadata?: any;
    collectionId?: string;
    driveFileId?: string;
  }>;
}

export interface SyncReport {
  success: boolean;
  message: string;
  promptsAdded: number;
  collectionsAdded: number;
  presetsAdded: number;
  totalCloudPrompts: number;
  lastSyncedAt: number;
}

// Lấy hoặc tạo Device ID cố định cho thiết bị này
const getDeviceId = (): string => {
  let id = localStorage.getItem('nki_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    localStorage.setItem('nki_device_id', id);
  }
  return id;
};

/**
 * Đẩy toàn bộ dữ liệu nội bộ lên file nki_cloud_vault.json trên Google Drive
 */
export async function pushVaultToCloud(
  accessToken: string,
  rootFolderId: string,
  currentHistory: LogItem[] = []
): Promise<string> {
  const [prompts, collections, galleryItems] = await Promise.all([
    getAllPromptItemsDB(),
    getAllCollectionsDB(),
    getAllGalleryItemsDB()
  ]);

  const presets = loadPersonalPresets();

  // Chỉ đóng gói metadata & driveFileId của ảnh, không nhét base64 khổng lồ để file nhẹ và nhanh
  const galleryMetadata = galleryItems.map(item => ({
    id: item.id,
    description: item.description,
    type: item.type,
    createdAt: item.createdAt,
    metadata: item.metadata,
    collectionId: item.collectionId,
    driveFileId: (item as any).driveFileId
  }));

  const payload: CloudVaultPayload = {
    version: 1,
    lastUpdated: Date.now(),
    originDeviceId: getDeviceId(),
    prompts,
    collections,
    history: currentHistory.slice(0, 100), // lưu 100 logs gần nhất
    presets,
    galleryMetadata
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  // Kiểm tra xem file nki_cloud_vault.json đã tồn tại chưa
  const existingFileId = await getFileIdByName(accessToken, CLOUD_VAULT_FILENAME, rootFolderId);

  let fileId: string;
  if (existingFileId) {
    await updateFileContentInDrive(accessToken, existingFileId, blob, 'application/json');
    fileId = existingFileId;
  } else {
    const res = await uploadFileToDrive(accessToken, CLOUD_VAULT_FILENAME, blob, 'application/json', rootFolderId);
    fileId = res.id;
  }

  localStorage.setItem('nki_cloud_vault_last_synced', String(payload.lastUpdated));
  return fileId;
}

/**
 * Kéo dữ liệu từ nki_cloud_vault.json trên Google Drive và gộp (merge) an toàn vào máy cục bộ
 */
export async function pullVaultFromCloud(
  accessToken: string,
  rootFolderId: string
): Promise<SyncReport> {
  const existingFileId = await getFileIdByName(accessToken, CLOUD_VAULT_FILENAME, rootFolderId);
  if (!existingFileId) {
    return {
      success: true,
      message: 'Chưa có file Cloud Vault trên Google Drive. Sẽ tự động khởi tạo khi đồng bộ.',
      promptsAdded: 0,
      collectionsAdded: 0,
      presetsAdded: 0,
      totalCloudPrompts: 0,
      lastSyncedAt: Date.now()
    };
  }

  const jsonText = await downloadDriveFileAsText(accessToken, existingFileId);
  if (!jsonText || !jsonText.trim()) {
    throw new Error('File Cloud Vault trên Drive bị rỗng.');
  }

  const cloudPayload: CloudVaultPayload = JSON.parse(jsonText);

  // 1. Gộp Kho Prompt JSON (Merge Prompts)
  const localPrompts = await getAllPromptItemsDB();
  const localPromptMap = new Map(localPrompts.map(p => [p.id, p]));
  let promptsAdded = 0;

  if (Array.isArray(cloudPayload.prompts)) {
    cloudPayload.prompts.forEach(cp => {
      if (!localPromptMap.has(cp.id)) {
        localPromptMap.set(cp.id, cp);
        promptsAdded++;
      } else {
        // Cập nhật nếu cloud có bản timestamp mới hơn
        const existing = localPromptMap.get(cp.id)!;
        if (cp.timestamp > existing.timestamp) {
          localPromptMap.set(cp.id, cp);
        }
      }
    });
    await saveAllPromptItemsDB(Array.from(localPromptMap.values()));
  }

  // 2. Gộp Bộ Sưu Tập (Merge Collections)
  const localCollections = await getAllCollectionsDB();
  const colMap = new Map(localCollections.map(c => [c.id, c]));
  let collectionsAdded = 0;

  if (Array.isArray(cloudPayload.collections)) {
    cloudPayload.collections.forEach(cc => {
      if (!colMap.has(cc.id)) {
        colMap.set(cc.id, cc);
        collectionsAdded++;
      }
    });
    await saveAllCollectionsDB(Array.from(colMap.values()));
  }

  // 3. Gộp Presets cá nhân
  const localPresets = loadPersonalPresets();
  const presetMap = new Map(localPresets.map(p => [p.id, p]));
  let presetsAdded = 0;

  if (Array.isArray(cloudPayload.presets)) {
    cloudPayload.presets.forEach(cp => {
      if (!presetMap.has(cp.id)) {
        presetMap.set(cp.id, cp);
        presetsAdded++;
      }
    });
    savePersonalPresetsToStorage(Array.from(presetMap.values()));
  }

  // 4. Bổ sung Gallery Metadata cho các ảnh đã liên kết Drive
  if (Array.isArray(cloudPayload.galleryMetadata) && cloudPayload.galleryMetadata.length > 0) {
    const localGallery = await getAllGalleryItemsDB();
    const metaMap = new Map(cloudPayload.galleryMetadata.filter(m => m.driveFileId).map(m => [m.driveFileId!, m]));
    let galleryUpdated = false;

    const updatedGallery = localGallery.map(item => {
      const driveId = (item as any).driveFileId;
      if (driveId && metaMap.has(driveId)) {
        const cloudMeta = metaMap.get(driveId)!;
        if (!item.metadata && cloudMeta.metadata) {
          galleryUpdated = true;
          return { ...item, metadata: cloudMeta.metadata, collectionId: item.collectionId || cloudMeta.collectionId };
        }
      }
      return item;
    });

    if (galleryUpdated) {
      await saveAllGalleryItemsDB(updatedGallery);
    }
  }

  localStorage.setItem('nki_cloud_vault_last_synced', String(Date.now()));

  return {
    success: true,
    message: `Đã đồng bộ thành công! (+${promptsAdded} prompt, +${collectionsAdded} bộ sưu tập, +${presetsAdded} preset)`,
    promptsAdded,
    collectionsAdded,
    presetsAdded,
    totalCloudPrompts: cloudPayload.prompts?.length || 0,
    lastSyncedAt: Date.now()
  };
}

/**
 * Đồng bộ hai chiều toàn diện: Kéo từ Cloud về gộp trước, sau đó đẩy ngược lại Cloud
 */
export async function syncFullCloudVault(
  accessToken: string,
  rootFolderId: string,
  currentHistory: LogItem[] = []
): Promise<SyncReport> {
  // Bước 1: Kéo từ Cloud về gộp vào local
  const pullReport = await pullVaultFromCloud(accessToken, rootFolderId);

  // Bước 2: Đẩy toàn bộ trạng thái đã gộp ngược lên Cloud để đồng nhất
  await pushVaultToCloud(accessToken, rootFolderId, currentHistory);

  return pullReport;
}
