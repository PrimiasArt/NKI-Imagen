/**
 * Photoshop Dodge & Burn and Clone Stamp Retouching Engines
 * 100% Zero-API, High Performance Client-Side Canvas 2D
 * 
 * Supports:
 * - Dodge (Làm sáng) & Burn (Làm tối) targeting Shadows, Midtones, Highlights
 * - Clone Stamp (Đóng dấu nhân bản chi tiết / xóa khuyết điểm blemish)
 * - Seamless feathered edges and continuous stroke stamping
 */

export type DodgeBurnMode = 'dodge' | 'burn';
export type DodgeBurnRange = 'shadows' | 'midtones' | 'highlights';

export interface DodgeBurnSettings {
  mode: DodgeBurnMode;
  range: DodgeBurnRange;
  exposure: number; // 1 to 100%
  size: number;     // 10 to 200 px
  hardness: number; // 0 to 1 (0 = ultra soft feather, 1 = hard edge)
}

export const DEFAULT_DODGE_BURN_SETTINGS: DodgeBurnSettings = {
  mode: 'dodge',
  range: 'midtones',
  exposure: 30,
  size: 50,
  hardness: 0.3
};

export interface CloneStampSettings {
  sourcePoint: { x: number; y: number } | null;
  size: number;     // 10 to 200 px
  hardness: number; // 0 to 1
  opacity: number;  // 1 to 100%
  isHealingMode: boolean; // True = blend with target skin tone texture
}

export const DEFAULT_CLONE_STAMP_SETTINGS: CloneStampSettings = {
  sourcePoint: null,
  size: 40,
  hardness: 0.4,
  opacity: 100,
  isHealingMode: true
};

/**
 * Calculates tonal range weight based on luminance (ITU-R BT.709).
 */
function getRangeWeight(luminance: number, range: DodgeBurnRange): number {
  const normL = luminance / 255;

  if (range === 'shadows') {
    // Peak at 0, drops to 0 at 0.65
    return Math.max(0, 1 - normL * 1.5);
  } else if (range === 'highlights') {
    // Peak at 1, drops to 0 below 0.35
    return Math.max(0, (normL - 0.35) * 1.5);
  } else {
    // Midtones: Bell curve peak at 0.5 (128)
    return Math.max(0, 1 - Math.abs(normL - 0.5) * 2);
  }
}

/**
 * Applies a Dodge or Burn brush stamp onto target canvas context.
 */
export function applyDodgeBurnStamp(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  settings: DodgeBurnSettings
): void {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  const radius = Math.max(3, settings.size / 2);
  const radiusSq = radius * radius;
  const exposure = Math.max(0.01, Math.min(1, settings.exposure / 100)) * 0.15; // Controlled per stamp
  const hardness = Math.max(0.05, Math.min(0.95, settings.hardness));

  const minX = Math.max(0, Math.floor(center.x - radius));
  const maxX = Math.min(width - 1, Math.ceil(center.x + radius));
  const minY = Math.max(0, Math.floor(center.y - radius));
  const maxY = Math.min(height - 1, Math.ceil(center.y + radius));

  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;
  if (bboxW <= 0 || bboxH <= 0) return;

  const imgData = ctx.getImageData(minX, minY, bboxW, bboxH);
  const data = imgData.data;

  const isDodge = settings.mode === 'dodge';
  const range = settings.range;

  for (let y = minY; y <= maxY; y++) {
    const dy = y - center.y;
    const dySq = dy * dy;

    for (let x = minX; x <= maxX; x++) {
      const dx = x - center.x;
      const dSq = dx * dx + dySq;
      if (dSq > radiusSq) continue;

      const d = Math.sqrt(dSq);
      const normD = d / radius; // 0 to 1

      // Soft feather falloff
      let falloff = 1;
      if (normD > hardness) {
        falloff = (1 - normD) / (1 - hardness);
      }
      falloff = Math.max(0, Math.min(1, falloff));
      if (falloff <= 0) continue;

      const idx = ((y - minY) * bboxW + (x - minX)) * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const rangeWeight = getRangeWeight(lum, range);
      const intensity = exposure * falloff * rangeWeight;
      if (intensity <= 0) continue;

      if (isDodge) {
        // Dodge formula: Color / (1 - exposure)
        const dodgeFactor = 1 + intensity * 1.5;
        r = Math.min(255, r * dodgeFactor);
        g = Math.min(255, g * dodgeFactor);
        b = Math.min(255, b * dodgeFactor);
      } else {
        // Burn formula: Color * (1 - exposure)
        const burnFactor = Math.max(0, 1 - intensity * 1.5);
        r = r * burnFactor;
        g = g * burnFactor;
        b = b * burnFactor;
      }

      data[idx] = Math.round(r);
      data[idx + 1] = Math.round(g);
      data[idx + 2] = Math.round(b);
    }
  }

  ctx.putImageData(imgData, minX, minY);
}

/**
 * Applies a Clone Stamp or Healing Brush stamp from source point to destination target.
 */
export function applyCloneStamp(
  ctx: CanvasRenderingContext2D,
  sourceSnapshot: ImageData,
  sourceAnchor: { x: number; y: number },
  targetCenter: { x: number; y: number },
  strokeStart: { x: number; y: number },
  settings: CloneStampSettings
): void {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // The offset vector from stroke start to source anchor
  const offsetX = sourceAnchor.x - strokeStart.x;
  const offsetY = sourceAnchor.y - strokeStart.y;

  const radius = Math.max(3, settings.size / 2);
  const radiusSq = radius * radius;
  const opacity = Math.max(0.01, Math.min(1, settings.opacity / 100));
  const hardness = Math.max(0.05, Math.min(0.95, settings.hardness));

  const minX = Math.max(0, Math.floor(targetCenter.x - radius));
  const maxX = Math.min(width - 1, Math.ceil(targetCenter.x + radius));
  const minY = Math.max(0, Math.floor(targetCenter.y - radius));
  const maxY = Math.min(height - 1, Math.ceil(targetCenter.y + radius));

  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;
  if (bboxW <= 0 || bboxH <= 0) return;

  const targetImgData = ctx.getImageData(minX, minY, bboxW, bboxH);
  const targetData = targetImgData.data;
  const srcData = sourceSnapshot.data;
  const srcW = sourceSnapshot.width;
  const srcH = sourceSnapshot.height;

  for (let y = minY; y <= maxY; y++) {
    const dy = y - targetCenter.y;
    const dySq = dy * dy;

    for (let x = minX; x <= maxX; x++) {
      const dx = x - targetCenter.x;
      const dSq = dx * dx + dySq;
      if (dSq > radiusSq) continue;

      const d = Math.sqrt(dSq);
      const normD = d / radius;

      let falloff = 1;
      if (normD > hardness) {
        falloff = (1 - normD) / (1 - hardness);
      }
      falloff = Math.max(0, Math.min(1, falloff));
      const blendAlpha = falloff * opacity;
      if (blendAlpha <= 0) continue;

      // Source coordinate
      const sx = Math.max(0, Math.min(srcW - 1, Math.round(x + offsetX)));
      const sy = Math.max(0, Math.min(srcH - 1, Math.round(y + offsetY)));
      const srcIdx = (sy * srcW + sx) * 4;

      const tgtIdx = ((y - minY) * bboxW + (x - minX)) * 4;

      const sr = srcData[srcIdx];
      const sg = srcData[srcIdx + 1];
      const sb = srcData[srcIdx + 2];

      const tr = targetData[tgtIdx];
      const tg = targetData[tgtIdx + 1];
      const tb = targetData[tgtIdx + 2];

      if (settings.isHealingMode) {
        // Healing mode: preserves destination base luminance while taking source texture detail
        const srcLum = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
        const tgtLum = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb;
        const lumRatio = srcLum > 5 ? tgtLum / srcLum : 1;

        const healedR = Math.min(255, sr * (0.4 + 0.6 * lumRatio));
        const healedG = Math.min(255, sg * (0.4 + 0.6 * lumRatio));
        const healedB = Math.min(255, sb * (0.4 + 0.6 * lumRatio));

        targetData[tgtIdx] = Math.round(tr * (1 - blendAlpha) + healedR * blendAlpha);
        targetData[tgtIdx + 1] = Math.round(tg * (1 - blendAlpha) + healedG * blendAlpha);
        targetData[tgtIdx + 2] = Math.round(tb * (1 - blendAlpha) + healedB * blendAlpha);
      } else {
        // Direct Clone Stamp: direct alpha blend
        targetData[tgtIdx] = Math.round(tr * (1 - blendAlpha) + sr * blendAlpha);
        targetData[tgtIdx + 1] = Math.round(tg * (1 - blendAlpha) + sg * blendAlpha);
        targetData[tgtIdx + 2] = Math.round(tb * (1 - blendAlpha) + sb * blendAlpha);
      }
    }
  }

  ctx.putImageData(targetImgData, minX, minY);
}
