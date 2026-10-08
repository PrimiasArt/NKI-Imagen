/**
 * Photoshop-Grade Interactive Liquify & Mesh Warp Engine
 * 100% Zero-API, High Performance Client-Side Canvas 2D
 * 
 * Supports:
 * - Forward Warp (Push): Nắn đẩy khuôn mặt, bóp eo, thon gọn cằm V-line
 * - Bloat (Expand): Phóng to mắt, làm căng mọng môi, tăng phồng tóc
 * - Pinch (Contract): Thu nhỏ cánh mũi, thu gọn bọng mắt, làm thon gọn
 * - Reconstruct (Restore): Cọ quét khôi phục vùng gốc mượt mà
 * - High-Precision Bilinear Interpolation for razor-sharp edge preservation
 */

export type LiquifyMode = 'push' | 'bloat' | 'pinch' | 'reconstruct';

export interface LiquifyBrushSettings {
  mode: LiquifyMode;
  size: number;     // 10 to 300 px
  density: number;  // 10 to 100% (feather radius falloff)
  pressure: number; // 1 to 100% (warp displacement intensity per frame)
}

export const DEFAULT_LIQUIFY_SETTINGS: LiquifyBrushSettings = {
  mode: 'push',
  size: 80,
  density: 60,
  pressure: 45
};

/**
 * Bilinear sample helper to read sub-pixel values smoothly without aliasing.
 */
function sampleBilinear(
  srcData: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  outPixel: Uint8ClampedArray
): void {
  // Clamp boundaries
  const xClamped = Math.max(0, Math.min(width - 1, x));
  const yClamped = Math.max(0, Math.min(height - 1, y));

  const x0 = Math.floor(xClamped);
  const y0 = Math.floor(yClamped);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);

  const fx = xClamped - x0;
  const fy = yClamped - y0;
  const invFx = 1 - fx;
  const invFy = 1 - fy;

  const w00 = invFx * invFy;
  const w10 = fx * invFy;
  const w01 = invFx * fy;
  const w11 = fx * fy;

  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;

  outPixel[0] = Math.round(srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11);
  outPixel[1] = Math.round(srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11);
  outPixel[2] = Math.round(srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11);
  outPixel[3] = Math.round(srcData[i00 + 3] * w00 + srcData[i10 + 3] * w10 + srcData[i01 + 3] * w01 + srcData[i11 + 3] * w11);
}

/**
 * Applies a single Liquify brush stamp / stroke segment to the target canvas.
 * 
 * @param targetCtx Canvas rendering context to mutate
 * @param originalImageData Pristine original image data (used for Reconstruct mode)
 * @param fromPoint Start of stroke segment in image coordinates
 * @param toPoint End of stroke segment in image coordinates
 * @param settings Brush parameters (mode, size, density, pressure)
 */
export function applyLiquifyStroke(
  targetCtx: CanvasRenderingContext2D,
  originalImageData: ImageData | null,
  fromPoint: { x: number; y: number },
  toPoint: { x: number; y: number },
  settings: LiquifyBrushSettings
): void {
  const canvas = targetCtx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  const radius = Math.max(5, settings.size / 2);
  const radiusSq = radius * radius;
  const pressure = Math.max(0.01, Math.min(1, settings.pressure / 100));
  const density = Math.max(0.1, Math.min(1, settings.density / 100));

  // Determine bounding box of affected area
  const minX = Math.max(0, Math.floor(Math.min(fromPoint.x, toPoint.x) - radius));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(fromPoint.x, toPoint.x) + radius));
  const minY = Math.max(0, Math.floor(Math.min(fromPoint.y, toPoint.y) - radius));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(fromPoint.y, toPoint.y) + radius));

  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;
  if (bboxW <= 0 || bboxH <= 0) return;

  // Read current canvas pixels for this bounding box
  const currentImgData = targetCtx.getImageData(minX, minY, bboxW, bboxH);
  const currentData = currentImgData.data;

  // Read full canvas snapshot for interpolation source
  const fullImgData = targetCtx.getImageData(0, 0, width, height);
  const fullSrc = new Uint8ClampedArray(fullImgData.data);

  const origData = originalImageData ? originalImageData.data : null;

  const deltaX = toPoint.x - fromPoint.x;
  const deltaY = toPoint.y - fromPoint.y;
  const distTravel = Math.hypot(deltaX, deltaY);

  const cx = toPoint.x;
  const cy = toPoint.y;
  const tempPixel = new Uint8ClampedArray(4);

  for (let y = minY; y <= maxY; y++) {
    const dy = y - cy;
    const dySq = dy * dy;

    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dSq = dx * dx + dySq;
      if (dSq > radiusSq) continue;

      const d = Math.sqrt(dSq);
      const normDist = d / radius; // 0 at center, 1 at edge

      // Smooth cosine-quartic falloff influenced by brush density
      const falloff = Math.pow(Math.max(0, 1 - normDist), 2.5 * (1.1 - density * 0.5));
      const factor = falloff * pressure;

      let srcX = x;
      let srcY = y;

      if (settings.mode === 'push') {
        // Forward warp: pulls pixels from opposite direction of brush motion
        const warpDist = Math.max(1.5, distTravel) * factor * 1.8;
        const normDirX = distTravel > 0.001 ? deltaX / distTravel : 0;
        const normDirY = distTravel > 0.001 ? deltaY / distTravel : 0;

        srcX = x - normDirX * warpDist;
        srcY = y - normDirY * warpDist;
      } else if (settings.mode === 'bloat') {
        // Bloat: pushes outward by sampling from inwards towards center
        const shrinkFactor = 1 - factor * 0.45;
        srcX = cx + dx * shrinkFactor;
        srcY = cy + dy * shrinkFactor;
      } else if (settings.mode === 'pinch') {
        // Pinch: pulls inward by sampling from further outwards
        const expandFactor = 1 + factor * 0.45;
        srcX = cx + dx * expandFactor;
        srcY = cy + dy * expandFactor;
      } else if (settings.mode === 'reconstruct') {
        // Reconstruct: blends directly towards pristine original image
        if (origData) {
          const globalIdx = (y * width + x) * 4;
          const localIdx = ((y - minY) * bboxW + (x - minX)) * 4;
          const blendRate = Math.min(1, factor * 0.65);
          const invBlend = 1 - blendRate;

          currentData[localIdx] = Math.round(currentData[localIdx] * invBlend + origData[globalIdx] * blendRate);
          currentData[localIdx + 1] = Math.round(currentData[localIdx + 1] * invBlend + origData[globalIdx + 1] * blendRate);
          currentData[localIdx + 2] = Math.round(currentData[localIdx + 2] * invBlend + origData[globalIdx + 2] * blendRate);
          currentData[localIdx + 3] = Math.round(currentData[localIdx + 3] * invBlend + origData[globalIdx + 3] * blendRate);
          continue;
        }
      }

      // Sample sub-pixel with bilinear interpolation
      sampleBilinear(fullSrc, width, height, srcX, srcY, tempPixel);

      const localIdx = ((y - minY) * bboxW + (x - minX)) * 4;
      currentData[localIdx] = tempPixel[0];
      currentData[localIdx + 1] = tempPixel[1];
      currentData[localIdx + 2] = tempPixel[2];
      currentData[localIdx + 3] = tempPixel[3];
    }
  }

  // Put updated pixels back to target canvas
  targetCtx.putImageData(currentImgData, minX, minY);
}
