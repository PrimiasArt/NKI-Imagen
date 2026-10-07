export type StudioBlendMode =
  | 'source-over'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'multiply'
  | 'color-dodge'
  | 'lighten'
  | 'hard-light';

export interface StudioLayer {
  id: string;
  name: string;
  type: 'base' | 'subject' | 'inpaint' | 'adjustment' | 'gobo' | 'atmosphere';
  visible: boolean;
  opacity: number; // 0.0 to 1.0
  blendMode: StudioBlendMode;
  dataUrl: string;
}

/**
 * Creates the initial base background plate layer.
 */
export function createBaseLayer(imageSrc: string): StudioLayer {
  return {
    id: 'layer-base',
    name: 'Background Plate (Ảnh gốc)',
    type: 'base',
    visible: true,
    opacity: 1.0,
    blendMode: 'source-over',
    dataUrl: imageSrc
  };
}

/**
 * Creates a new AI inpaint or generative modification layer.
 */
export function createAiLayer(
  imageSrc: string,
  name: string = 'AI Inpaint Patch',
  type: StudioLayer['type'] = 'inpaint'
): StudioLayer {
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    type,
    visible: true,
    opacity: 1.0,
    blendMode: 'source-over',
    dataUrl: imageSrc
  };
}

/**
 * Loads an image from a Data URL into an HTMLImageElement.
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
 * Composites a stack of layers onto a canvas with their respective opacities and blend modes.
 */
export async function compositeLayersToCanvas(
  targetCanvas: HTMLCanvasElement,
  layers: StudioLayer[]
): Promise<void> {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0 || !layer.dataUrl) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
    ctx.globalCompositeOperation = layer.blendMode;

    try {
      const img = await loadImage(layer.dataUrl);
      ctx.drawImage(img, 0, 0, targetCanvas.width, targetCanvas.height);
    } catch (err) {
      console.warn(`Could not render layer ${layer.id}:`, err);
    }

    ctx.restore();
  }
}

/**
 * Flattens all visible layers into a single composite image Data URL.
 */
export async function flattenLayers(
  layers: StudioLayer[],
  width: number,
  height: number
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  await compositeLayersToCanvas(canvas, layers);
  return canvas.toDataURL('image/png', 0.95);
}
