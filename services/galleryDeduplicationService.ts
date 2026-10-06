/**
 * Gallery Deduplication Service
 * Phát hiện, gộp và dọn dẹp các ảnh trùng lặp trong thư viện ảnh NKI
 */

import { GalleryItem } from '../types';

/**
 * Chuẩn hóa tên/mô tả ảnh để so khớp
 */
export const normalizeImageTitle = (title?: string): string => {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\.(png|jpg|jpeg|webp)$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Tạo fingerprint vân tay nhanh cho ảnh để phát hiện trùng lặp
 */
export const getImageFingerprint = (item: GalleryItem): string => {
  // 1. Nếu có driveFileId
  if (item.driveFileId && item.driveFileId.trim()) {
    return `drive:${item.driveFileId.trim()}`;
  }

  // 2. Nếu là Data URL base64, lấy độ dài + mẫu chuỗi đặc trưng
  if (item.src && item.src.startsWith('data:image')) {
    const len = item.src.length;
    const sampleHead = item.src.slice(40, 100);
    const sampleTail = item.src.slice(-60);
    return `data:${len}:${sampleHead}:${sampleTail}`;
  }

  // 3. Nếu là URL thông thường (không phải blob)
  if (item.src && !item.src.startsWith('blob:')) {
    return `url:${item.src}`;
  }

  // 4. Nếu là blob URL kèm tên mô tả
  const normTitle = normalizeImageTitle(item.description);
  const aspect = item.metadata?.aspectRatio || '1:1';
  return `meta:${normTitle}:${aspect}`;
};

/**
 * Kiểm tra xem 2 GalleryItem có phải là bản sao của nhau không
 */
export const areItemsDuplicate = (a: GalleryItem, b: GalleryItem): boolean => {
  if (a.id === b.id) return true;

  // Cùng driveFileId
  if (a.driveFileId && b.driveFileId && a.driveFileId === b.driveFileId) {
    return true;
  }

  // Cùng src (nếu là Data URL hoặc HTTP URL)
  if (a.src && b.src && a.src === b.src && !a.src.startsWith('blob:')) {
    return true;
  }

  // So sánh Fingerprint Data URL
  if (a.src?.startsWith('data:image') && b.src?.startsWith('data:image')) {
    if (a.src.length === b.src.length && a.src.slice(0, 120) === b.src.slice(0, 120)) {
      return true;
    }
  }

  // Cùng tên file / mô tả chuẩn hóa
  const normA = normalizeImageTitle(a.description);
  const normB = normalizeImageTitle(b.description);
  if (normA && normB && normA === normB) {
    // Nếu cùng tên và hoặc cùng tỉ lệ, hoặc thời gian tạo cách nhau dưới 15 phút
    const timeDiff = Math.abs(a.createdAt - b.createdAt);
    const sameRatio = a.metadata?.aspectRatio === b.metadata?.aspectRatio;
    if (sameRatio || timeDiff < 15 * 60 * 1000) {
      return true;
    }
  }

  return false;
};

/**
 * Gộp 2 item thành 1 item hoàn hảo nhất
 */
export const mergeDuplicateItems = (primary: GalleryItem, duplicate: GalleryItem): GalleryItem => {
  // Ưu tiên src nào là Data URL thay vì blob
  let bestSrc = primary.src;
  if ((!bestSrc || bestSrc.startsWith('blob:')) && duplicate.src && !duplicate.src.startsWith('blob:')) {
    bestSrc = duplicate.src;
  }

  // Ưu tiên giữ driveFileId
  const driveFileId = primary.driveFileId || duplicate.driveFileId;

  // Ưu tiên giữ collectionId
  const collectionId = primary.collectionId || duplicate.collectionId;

  // Ưu tiên metadata đầy đủ nhất
  const metadata = (primary.metadata?.promptJson ? primary.metadata : duplicate.metadata) || primary.metadata;

  // Giữ thời gian tạo sớm nhất
  const createdAt = Math.min(primary.createdAt || Date.now(), duplicate.createdAt || Date.now());

  // Chọn description đầy đủ nhất
  const description = (primary.description && primary.description.length >= (duplicate.description?.length || 0))
    ? primary.description
    : duplicate.description || primary.description;

  return {
    ...primary,
    src: bestSrc,
    driveFileId,
    collectionId,
    metadata,
    createdAt,
    description,
    type: primary.type || duplicate.type || 'JSON_TO_IMG'
  };
};

/**
 * Đếm số lượng ảnh trùng lặp trong danh sách
 */
export const countDuplicates = (items: GalleryItem[]): number => {
  const seenFingerprints = new Set<string>();
  const seenTitles = new Map<string, number>();
  let duplicateCount = 0;

  for (const item of items) {
    const fp = getImageFingerprint(item);
    const normTitle = normalizeImageTitle(item.description);

    if (seenFingerprints.has(fp)) {
      duplicateCount++;
      continue;
    }

    if (normTitle && normTitle.length > 5) {
      const prevTime = seenTitles.get(normTitle);
      if (prevTime !== undefined && Math.abs(item.createdAt - prevTime) < 15 * 60 * 1000) {
        duplicateCount++;
        continue;
      }
      seenTitles.set(normTitle, item.createdAt);
    }

    seenFingerprints.add(fp);
  }

  return duplicateCount;
};

/**
 * Làm sạch và loại bỏ toàn bộ ảnh trùng lặp
 */
export const deduplicateGalleryItems = (
  items: GalleryItem[]
): { deduplicated: GalleryItem[]; removedCount: number } => {
  const result: GalleryItem[] = [];
  let removedCount = 0;

  for (const candidate of items) {
    let matchedIndex = -1;

    for (let i = 0; i < result.length; i++) {
      if (areItemsDuplicate(result[i], candidate)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex >= 0) {
      // Đã tồn tại bản sao, gộp thông tin tốt nhất vào item đã có
      result[matchedIndex] = mergeDuplicateItems(result[matchedIndex], candidate);
      removedCount++;
    } else {
      result.push(candidate);
    }
  }

  return { deduplicated: result, removedCount };
};
