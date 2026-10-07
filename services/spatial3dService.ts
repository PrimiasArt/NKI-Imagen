/**
 * Apple Vision Pro Spatial 3D Converter & Stereoscopic Processing Service
 */

/**
 * Loads an image from src into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Generates a Side-by-Side (SBS) 3D stereoscopic image.
 * Uses synthetic horizontal disparity map to create distinct Left and Right eye perspectives.
 */
export async function generateStereoscopicSBS(
  imageSrc: string,
  disparityStrength: number = 18
): Promise<string> {
  const img = await loadImage(imageSrc);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  // SBS canvas has 2x width
  const canvas = document.createElement('canvas');
  canvas.width = w * 2;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Temporary canvas to process displacement
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(img, 0, 0, w, h);
  const srcData = tempCtx.getImageData(0, 0, w, h);

  // Left Eye Image (Shifted slightly rightward based on center depth)
  const leftEyeData = tempCtx.createImageData(w, h);
  // Right Eye Image (Shifted slightly leftward based on center depth)
  const rightEyeData = tempCtx.createImageData(w, h);

  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.hypot(cx, cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // Depth heuristic: Luminance + radial center weight
      const lum = (srcData.data[idx] * 0.299 + srcData.data[idx + 1] * 0.587 + srcData.data[idx + 2] * 0.114) / 255;
      const distFromCenter = 1 - (Math.hypot(x - cx, y - cy) / maxDist);
      const depth = (lum * 0.6) + (distFromCenter * 0.4);

      const shift = Math.round((depth - 0.5) * disparityStrength);

      // Left eye pixel
      const lx = Math.max(0, Math.min(w - 1, x + shift));
      const lIdx = (y * w + lx) * 4;
      leftEyeData.data[idx] = srcData.data[lIdx];
      leftEyeData.data[idx + 1] = srcData.data[lIdx + 1];
      leftEyeData.data[idx + 2] = srcData.data[lIdx + 2];
      leftEyeData.data[idx + 3] = srcData.data[lIdx + 3];

      // Right eye pixel
      const rx = Math.max(0, Math.min(w - 1, x - shift));
      const rIdx = (y * w + rx) * 4;
      rightEyeData.data[idx] = srcData.data[rIdx];
      rightEyeData.data[idx + 1] = srcData.data[rIdx + 1];
      rightEyeData.data[idx + 2] = srcData.data[rIdx + 2];
      rightEyeData.data[idx + 3] = srcData.data[rIdx + 3];
    }
  }

  // Draw Left Eye on left half
  tempCtx.putImageData(leftEyeData, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0);

  // Draw Right Eye on right half
  tempCtx.putImageData(rightEyeData, 0, 0);
  ctx.drawImage(tempCanvas, w, 0);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Generates an Anaglyph 3D (Red / Cyan) image playable with classic 3D glasses.
 */
export async function generateAnaglyph3D(
  imageSrc: string,
  disparityStrength: number = 14
): Promise<string> {
  const img = await loadImage(imageSrc);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img, 0, 0, w, h);
  const srcData = ctx.getImageData(0, 0, w, h);
  const anaglyphData = ctx.createImageData(w, h);

  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.hypot(cx, cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      const lum = (srcData.data[idx] * 0.299 + srcData.data[idx + 1] * 0.587 + srcData.data[idx + 2] * 0.114) / 255;
      const depth = (lum * 0.6) + ((1 - Math.hypot(x - cx, y - cy) / maxDist) * 0.4);
      const shift = Math.round((depth - 0.5) * disparityStrength);

      // Left eye sample (Red channel)
      const lx = Math.max(0, Math.min(w - 1, x + shift));
      const lIdx = (y * w + lx) * 4;

      // Right eye sample (Cyan = Green + Blue channels)
      const rx = Math.max(0, Math.min(w - 1, x - shift));
      const rIdx = (y * w + rx) * 4;

      anaglyphData.data[idx] = srcData.data[lIdx];         // Red from left
      anaglyphData.data[idx + 1] = srcData.data[rIdx + 1]; // Green from right
      anaglyphData.data[idx + 2] = srcData.data[rIdx + 2]; // Blue from right
      anaglyphData.data[idx + 3] = srcData.data[idx + 3];   // Alpha
    }
  }

  ctx.putImageData(anaglyphData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
}
