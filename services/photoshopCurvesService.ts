/**
 * Photoshop-Grade Curves & Levels Color Engine
 * 100% Zero-API, High Performance Client-Side Canvas 2D & Image Processing
 * 
 * Supports:
 * - Monotonic Cubic Spline Curves for RGB Composite, Red, Green, Blue channels
 * - Real-time Histogram calculation (Luminance, Red, Green, Blue 256-bin histograms)
 * - Photoshop Input Levels (Shadow, Gamma, Highlight) & Output Levels (Min, Max)
 * - Look-Up Table (LUT) 256-entry precalculation for 60fps real-time adjustment
 */

export interface CurvePoint {
  x: number; // 0 to 255
  y: number; // 0 to 255
}

export type CurveChannel = 'rgb' | 'r' | 'g' | 'b';

export interface ChannelCurves {
  rgb: CurvePoint[];
  r: CurvePoint[];
  g: CurvePoint[];
  b: CurvePoint[];
}

export interface LevelsSettings {
  inputShadow: number;    // 0 to 255 (default 0)
  inputMidtone: number;   // 0.1 to 9.99 (gamma, default 1.0)
  inputHighlight: number; // 0 to 255 (default 255)
  outputShadow: number;   // 0 to 255 (default 0)
  outputHighlight: number;// 0 to 255 (default 255)
}

export interface PhotoshopCurvesSettings {
  curves: ChannelCurves;
  levels: LevelsSettings;
  enabled: boolean;
}

export const DEFAULT_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 }
];

export const DEFAULT_LEVELS: LevelsSettings = {
  inputShadow: 0,
  inputMidtone: 1.0,
  inputHighlight: 255,
  outputShadow: 0,
  outputHighlight: 255
};

export const DEFAULT_CURVES_SETTINGS: PhotoshopCurvesSettings = {
  curves: {
    rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
  },
  levels: { ...DEFAULT_LEVELS },
  enabled: true
};

export interface CurvesPreset {
  id: string;
  name: string;
  description: string;
  curves: Partial<ChannelCurves>;
  levels?: Partial<LevelsSettings>;
}

export const CURVES_PRESETS: CurvesPreset[] = [
  {
    id: 'linear',
    name: 'Mặc định (Linear)',
    description: 'Đồ thị tuyến tính phẳng ban đầu',
    curves: {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
    }
  },
  {
    id: 'medium_contrast',
    name: 'Tương phản vừa (Medium S-Curve)',
    description: 'Nâng sáng highlight và dìm nhẹ shadow tạo độ sâu điện ảnh',
    curves: {
      rgb: [{ x: 0, y: 0 }, { x: 64, y: 52 }, { x: 192, y: 204 }, { x: 255, y: 255 }]
    }
  },
  {
    id: 'strong_contrast',
    name: 'Tương phản mạnh (Strong S-Curve)',
    description: 'Độ tương phản cao ấn tượng, màu sắc nổi khối sắc sảo',
    curves: {
      rgb: [{ x: 0, y: 0 }, { x: 64, y: 40 }, { x: 192, y: 218 }, { x: 255, y: 255 }]
    }
  },
  {
    id: 'film_matte',
    name: 'Film Matte (Cổ điển nâng đáy)',
    description: 'Nâng điểm đen shadow (Faded Black) đặc trưng phim nhựa 35mm',
    curves: {
      rgb: [{ x: 0, y: 32 }, { x: 64, y: 68 }, { x: 192, y: 196 }, { x: 255, y: 238 }]
    }
  },
  {
    id: 'warm_vintage',
    name: 'Vintage Ấm (Cross Warm)',
    description: 'Tăng sắc đỏ và hạ bớt xanh lam ở vùng tối để tạo gam màu ấm retro',
    curves: {
      rgb: [{ x: 0, y: 10 }, { x: 128, y: 135 }, { x: 255, y: 245 }],
      r: [{ x: 0, y: 0 }, { x: 128, y: 140 }, { x: 255, y: 255 }],
      b: [{ x: 0, y: 15 }, { x: 128, y: 115 }, { x: 255, y: 240 }]
    }
  },
  {
    id: 'cool_commercial',
    name: 'Thương mại Trong Trẻo (Clean Cool)',
    description: 'Tăng sáng trong trẻo, highlight sạch sẽ chuẩn lookbook châu Âu',
    curves: {
      rgb: [{ x: 0, y: 0 }, { x: 128, y: 138 }, { x: 255, y: 255 }],
      b: [{ x: 0, y: 0 }, { x: 128, y: 134 }, { x: 255, y: 255 }]
    }
  }
];

/**
 * Calculates a monotonic cubic spline for 0-255 mapping.
 * Ensures the curve never overshoots or produces loops.
 */
export function buildSplineLut(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  if (!points || points.length === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  // Sort points by X
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // Ensure 0 and 255 bounds
  if (sorted[0].x > 0) {
    sorted.unshift({ x: 0, y: sorted[0].y });
  }
  if (sorted[sorted.length - 1].x < 255) {
    sorted.push({ x: 255, y: sorted[sorted.length - 1].y });
  }

  const n = sorted.length;
  const x = sorted.map(p => p.x);
  const y = sorted.map(p => p.y);

  // Compute secants (slopes between adjacent points)
  const d = new Float64Array(n - 1);
  const m = new Float64Array(n);

  for (let i = 0; i < n - 1; i++) {
    const dx = x[i + 1] - x[i];
    d[i] = dx === 0 ? 0 : (y[i + 1] - y[i]) / dx;
  }

  // Internal tangents
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = (d[i - 1] + d[i]) / 2;
  }

  // Monotonicity constraints (Fritsch-Carlson algorithm)
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / d[i];
      const beta = m[i + 1] / d[i];
      if (alpha < 0) m[i] = 0;
      if (beta < 0) m[i + 1] = 0;
      if (alpha * alpha + beta * beta > 9) {
        const tau = 3 / Math.sqrt(alpha * alpha + beta * beta);
        m[i] = tau * alpha * d[i];
        m[i + 1] = tau * beta * d[i];
      }
    }
  }

  // Interpolate for every value in 0..255
  for (let val = 0; val < 256; val++) {
    // Find enclosing segment
    let seg = 0;
    while (seg < n - 2 && val > x[seg + 1]) {
      seg++;
    }

    const h = x[seg + 1] - x[seg];
    if (h === 0) {
      lut[val] = Math.max(0, Math.min(255, Math.round(y[seg])));
      continue;
    }

    const t = (val - x[seg]) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    // Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const interpolated = h00 * y[seg] + h10 * h * m[seg] + h01 * y[seg + 1] + h11 * h * m[seg + 1];
    lut[val] = Math.max(0, Math.min(255, Math.round(interpolated)));
  }

  return lut;
}

/**
 * Builds a Levels 256-LUT from Photoshop shadow/gamma/highlight parameters.
 */
export function buildLevelsLut(levels: LevelsSettings): Uint8Array {
  const lut = new Uint8Array(256);
  const inLow = Math.max(0, Math.min(254, levels.inputShadow));
  const inHigh = Math.max(inLow + 1, Math.min(255, levels.inputHighlight));
  const inRange = inHigh - inLow;

  const gamma = Math.max(0.01, levels.inputMidtone);
  const invGamma = 1 / gamma;

  const outLow = Math.max(0, Math.min(255, levels.outputShadow));
  const outHigh = Math.max(0, Math.min(255, levels.outputHighlight));
  const outRange = outHigh - outLow;

  for (let i = 0; i < 256; i++) {
    let normalized = (i - inLow) / inRange;
    normalized = Math.max(0, Math.min(1, normalized));

    // Apply gamma curve
    const gammaAdjusted = Math.pow(normalized, invGamma);

    // Map to output levels
    const finalVal = outLow + gammaAdjusted * outRange;
    lut[i] = Math.max(0, Math.min(255, Math.round(finalVal)));
  }

  return lut;
}

/**
 * Calculates complete image histogram across 4 channels (Luminance, Red, Green, Blue)
 */
export interface ImageHistogram {
  lum: Uint32Array;
  r: Uint32Array;
  g: Uint32Array;
  b: Uint32Array;
  maxLum: number;
  maxRgb: number;
}

export function computeHistogram(imageData: ImageData): ImageHistogram {
  const data = imageData.data;
  const lum = new Uint32Array(256);
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);

  const len = data.length;
  // Subsample large images to guarantee instant <5ms calculation
  const step = len > 4000000 ? 16 : (len > 1000000 ? 8 : 4);

  for (let i = 0; i < len; i += step) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const l = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue);

    r[red]++;
    g[green]++;
    b[blue]++;
    lum[l]++;
  }

  let maxLum = 1;
  let maxRgb = 1;
  for (let i = 0; i < 256; i++) {
    if (lum[i] > maxLum) maxLum = lum[i];
    if (r[i] > maxRgb) maxRgb = r[i];
    if (g[i] > maxRgb) maxRgb = g[i];
    if (b[i] > maxRgb) maxRgb = b[i];
  }

  return { lum, r, g, b, maxLum, maxRgb };
}

/**
 * Applies combined Curves & Levels transformation to ImageData in-place.
 */
export function applyPhotoshopCurvesToImageData(
  imageData: ImageData,
  settings: PhotoshopCurvesSettings
): void {
  if (!settings.enabled) return;

  const data = imageData.data;
  const len = data.length;

  // Build combined LUTs
  const levelsLut = buildLevelsLut(settings.levels);
  const curveRgbLut = buildSplineLut(settings.curves.rgb);
  const curveRLut = buildSplineLut(settings.curves.r);
  const curveGLut = buildSplineLut(settings.curves.g);
  const curveBLut = buildSplineLut(settings.curves.b);

  // Precombine: Level -> Channel Curve -> RGB Composite Curve
  const finalR = new Uint8Array(256);
  const finalG = new Uint8Array(256);
  const finalB = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    const afterLevels = levelsLut[i];
    finalR[i] = curveRgbLut[curveRLut[afterLevels]];
    finalG[i] = curveRgbLut[curveGLut[afterLevels]];
    finalB[i] = curveRgbLut[curveBLut[afterLevels]];
  }

  // Fast single pass execution
  for (let i = 0; i < len; i += 4) {
    data[i] = finalR[data[i]];
    data[i + 1] = finalG[data[i + 1]];
    data[i + 2] = finalB[data[i + 2]];
  }
}
