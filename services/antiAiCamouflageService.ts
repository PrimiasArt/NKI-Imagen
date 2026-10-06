/**
 * Anti-AI Camouflage Service
 * Bộ lọc tự nhiên hóa & Khử dấu vết AI (Bypass AI Detectors, SynthID & AI Tells)
 * 1. Phá vỡ ma trận tần số SynthID bằng Micro Resampling & Sensor Noise (Film Grain).
 * 2. Xóa sạch metadata C2PA / XMP / IPTC gốc của Imagen.
 * 3. Cấy giả lập siêu dữ liệu EXIF máy ảnh thực tế (Sony Alpha 7 IV, Fujifilm, Canon, iPhone).
 * 4. Tẩy rửa các từ khóa "bẫy AI" trong Prompt.
 */

// @ts-ignore
import piexif from 'piexifjs';
import { AntiAiCamouflageSettings, CameraPresetType, ImagePromptJson } from '../types';

export const DEFAULT_ANTIAI_SETTINGS: AntiAiCamouflageSettings = {
  enabled: true,
  grainIntensity: 0.022, // 2.2% hạt noise quang học tự nhiên
  microResample: true,   // Thu phóng vi mô 0.4% để bẻ gãy lưới SynthID
  cameraPreset: 'SONY_A7IV',
  stripMetadata: true,
  jpegQuality: 0.93      // Re-quantize DCT table ở 93%
};

const STORAGE_KEY = 'nki_anti_ai_settings';

export const loadAntiAiSettings = (): AntiAiCamouflageSettings => {
  if (typeof window === 'undefined') return DEFAULT_ANTIAI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ANTIAI_SETTINGS;
    return { ...DEFAULT_ANTIAI_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_ANTIAI_SETTINGS;
  }
};

export const saveAntiAiSettings = (settings: AntiAiCamouflageSettings): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save Anti-AI settings:', e);
  }
};

// Định nghĩa thông số EXIF thực tế của các dòng máy ảnh danh tiếng
export const CAMERA_PROFILES: Record<CameraPresetType, {
  name: string;
  make: string;
  model: string;
  lens: string;
  fNumber: [number, number];
  exposureTime: [number, number];
  iso: number;
  focalLength: [number, number];
  software: string;
}> = {
  SONY_A7IV: {
    name: 'Sony Alpha 7 IV (FE 50mm f/1.2 GM)',
    make: 'SONY',
    model: 'ILCE-7M4',
    lens: 'FE 50mm F1.2 GM',
    fNumber: [18, 10], // f/1.8
    exposureTime: [1, 320], // 1/320s
    iso: 200,
    focalLength: [50, 1], // 50mm
    software: 'ILCE-7M4 v2.01'
  },
  FUJIFILM_XT4: {
    name: 'Fujifilm X-T4 (Fujinon XF 35mm f/1.4 R)',
    make: 'FUJIFILM',
    model: 'X-T4',
    lens: 'XF35mmF1.4 R',
    fNumber: [20, 10], // f/2.0
    exposureTime: [1, 250], // 1/250s
    iso: 320,
    focalLength: [35, 1], // 35mm
    software: 'Digital Camera X-T4 Ver2.10'
  },
  CANON_R5: {
    name: 'Canon EOS R5 (RF 85mm f/1.2L USM)',
    make: 'Canon',
    model: 'Canon EOS R5',
    lens: 'RF85mm F1.2 L USM',
    fNumber: [14, 10], // f/1.4
    exposureTime: [1, 500], // 1/500s
    iso: 160,
    focalLength: [85, 1], // 85mm
    software: 'Canon EOS R5 Firmware Ver 1.8.1'
  },
  IPHONE_15_PRO: {
    name: 'Apple iPhone 15 Pro Max (24mm f/1.78)',
    make: 'Apple',
    model: 'iPhone 15 Pro Max',
    lens: 'iPhone 15 Pro Max back triple camera 6.78mm f/1.78',
    fNumber: [178, 100], // f/1.78
    exposureTime: [1, 400], // 1/400s
    iso: 80,
    focalLength: [678, 100],
    software: '17.5.1'
  }
};

/**
 * Format timestamp sang chuẩn EXIF DateTime: "YYYY:MM:DD HH:MM:SS"
 */
const formatExifDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Xử lý hình ảnh qua Canvas:
 * 1. Làm sạch metadata
 * 2. Phá vỡ lưới SynthID bằng Micro-Jitter / Resampling
 * 3. Bơm lớp hạt quang học tự nhiên (Analog Sensor Grain)
 * 4. Nhúng thông tin EXIF máy ảnh chuyên nghiệp
 */
export async function applyAntiAiCamouflage(
  imageSrc: string,
  customSettings?: Partial<AntiAiCamouflageSettings>
): Promise<{ dataUrl: string; applied: boolean }> {
  const config: AntiAiCamouflageSettings = {
    ...loadAntiAiSettings(),
    ...(customSettings || {})
  };

  if (!config.enabled) {
    return { dataUrl: imageSrc, applied: false };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve({ dataUrl: imageSrc, applied: false });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Phá vỡ tọa độ SynthID: Vi phóng nhẹ 0.4% (Micro-Resampling Jitter)
        if (config.microResample) {
          const cropRatio = 0.004; // 0.4%
          const cropX = Math.round(originalWidth * cropRatio);
          const cropY = Math.round(originalHeight * cropRatio);
          const srcW = originalWidth - cropX * 2;
          const srcH = originalHeight - cropY * 2;

          ctx.drawImage(img, cropX, cropY, srcW, srcH, 0, 0, originalWidth, originalHeight);
        } else {
          ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
        }

        // 2. Bơm hạt quang học cảm biến (Analog / Optical Sensor Noise)
        if (config.grainIntensity > 0) {
          const imgData = ctx.getImageData(0, 0, originalWidth, originalHeight);
          const data = imgData.data;
          const intensity = config.grainIntensity * 255;
          const len = data.length;

          // Thêm độ nhiễu đơn sắc (monochromatic noise) như ISO máy ảnh thật
          for (let i = 0; i < len; i += 4) {
            // Giá trị nhiễu đồng đều cho R, G, B để tạo hạt grain sắc nét
            const noise = (Math.random() - 0.5) * intensity;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
            // Alpha giữ nguyên
          }

          ctx.putImageData(imgData, 0, 0);
        }

        // 3. Xuất ảnh JPEG chất lượng 93% (làm xáo trộn DCT table của AI)
        const quality = config.jpegQuality || 0.93;
        let cleanJpeg = canvas.toDataURL('image/jpeg', quality);

        // 4. Nhúng Camera EXIF thực tế nếu có thư viện piexif
        try {
          if (piexif && piexif.dump && piexif.insert) {
            const profile = CAMERA_PROFILES[config.cameraPreset] || CAMERA_PROFILES.SONY_A7IV;
            const now = new Date();
            const dateStr = formatExifDate(now);

            const zeroth: Record<number, any> = {};
            const exif: Record<number, any> = {};
            const gps: Record<number, any> = {};

            // 0th IFD
            zeroth[piexif.ImageIFD.Make] = profile.make;
            zeroth[piexif.ImageIFD.Model] = profile.model;
            zeroth[piexif.ImageIFD.Software] = profile.software;
            zeroth[piexif.ImageIFD.DateTime] = dateStr;
            zeroth[piexif.ImageIFD.XResolution] = [300, 1];
            zeroth[piexif.ImageIFD.YResolution] = [300, 1];
            zeroth[piexif.ImageIFD.ResolutionUnit] = 2; // Inches

            // Exif IFD
            exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
            exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;
            exif[piexif.ExifIFD.LensModel] = profile.lens;
            exif[piexif.ExifIFD.FNumber] = profile.fNumber;
            exif[piexif.ExifIFD.ExposureTime] = profile.exposureTime;
            exif[piexif.ExifIFD.ISOSpeedRatings] = profile.iso;
            exif[piexif.ExifIFD.FocalLength] = profile.focalLength;
            exif[piexif.ExifIFD.Flash] = 16; // Flash did not fire, compulsory flash mode
            exif[piexif.ExifIFD.ColorSpace] = 1; // sRGB

            const exifObj = { '0th': zeroth, 'Exif': exif, 'GPS': gps };
            const exifBytes = piexif.dump(exifObj);
            
            // Xóa bất kỳ EXIF cũ (nếu có) và cấy EXIF mới
            const strippedJpeg = piexif.remove(cleanJpeg);
            cleanJpeg = piexif.insert(exifBytes, strippedJpeg);
          }
        } catch (exifErr) {
          console.warn('[Anti-AI Camouflage] EXIF injection warning (retaining canvas clean image):', exifErr);
        }

        resolve({ dataUrl: cleanJpeg, applied: true });
      } catch (err) {
        console.error('[Anti-AI Camouflage] Processing failed:', err);
        resolve({ dataUrl: imageSrc, applied: false });
      }
    };

    img.onerror = () => {
      resolve({ dataUrl: imageSrc, applied: false });
    };

    img.src = imageSrc;
  });
}

/**
 * Tẩy sạch các từ khóa "bẫy AI" trong câu prompt và bổ sung phong cách chân thực
 */
export function sanitizePromptAntiAi(promptText: string): string {
  if (!promptText) return '';

  const aiBannedRegex = /\b(photorealistic|hyperrealistic|ultra-realistic|ultra realistic|hyper realistic|8k|4k resolution|16k|octane render|unreal engine 5|unreal engine|masterpiece|best quality|trending on artstation|flawless skin|plastic skin|porcelain skin|smooth face|perfect face|cinematic lighting|volumetric lighting)\b/gi;

  let sanitized = promptText.replace(aiBannedRegex, '').replace(/\s{2,}/g, ' ').trim();

  // Bổ sung các chỉ dẫn nhiếp ảnh tự nhiên nếu chưa có
  if (!/candid|raw photo|film grain|shot on/i.test(sanitized)) {
    sanitized += ', candid real photography, authentic skin texture with natural fine pores and subtle imperfections, shot on 35mm lens, natural ambient daylight';
  }

  return sanitized;
}

/**
 * Tự động thanh lọc ImagePromptJson để triệt tiêu các đặc trưng AI
 */
export function sanitizePromptJsonAntiAi(
  json: ImagePromptJson,
  camera: CameraPresetType = 'SONY_A7IV'
): ImagePromptJson {
  const profile = CAMERA_PROFILES[camera] || CAMERA_PROFILES.SONY_A7IV;
  const clone = { ...json };

  // Khử từ khóa trong art_style, texture, lighting
  clone.art_style = 'Authentic Candid Photography, raw unedited documentary photo style';
  clone.texture = 'Tactile real-world surfaces, subtle micro-texture, fine natural details';
  clone.skin_texture = 'Natural human skin with subtle visible pores, micro-imperfections, fine peach fuzz, authentic unretouched skin tone';
  clone.lighting = 'Natural ambient environment lighting, subtle diffused light falloff, zero artificial render glow';
  clone.camera_angle = `Eye-level natural framing, shot on ${profile.name}`;

  return clone;
}
