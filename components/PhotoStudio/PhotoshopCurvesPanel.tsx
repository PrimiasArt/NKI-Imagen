import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  CurvePoint,
  CurveChannel,
  PhotoshopCurvesSettings,
  DEFAULT_CURVES_SETTINGS,
  CURVES_PRESETS,
  ImageHistogram,
  buildSplineLut
} from '../../services/photoshopCurvesService';

interface PhotoshopCurvesPanelProps {
  settings: PhotoshopCurvesSettings;
  histogram: ImageHistogram | null;
  onChange: (newSettings: PhotoshopCurvesSettings) => void;
  onApplyToCanvas: () => void;
  onReset: () => void;
}

export const PhotoshopCurvesPanel: React.FC<PhotoshopCurvesPanelProps> = ({
  settings,
  histogram,
  onChange,
  onApplyToCanvas,
  onReset
}) => {
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('rgb');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const SVG_SIZE = 256;

  // Active channel curve points
  const points = settings.curves[activeChannel];

  // Precomputed Spline path string for SVG rendering
  const splinePath = useMemo(() => {
    const lut = buildSplineLut(points);
    let d = `M 0 ${SVG_SIZE - lut[0]}`;
    for (let x = 1; x < 256; x++) {
      d += ` L ${x} ${SVG_SIZE - lut[x]}`;
    }
    return d;
  }, [points]);

  // Channel color scheme
  const channelColors = {
    rgb: { line: '#ffffff', point: '#38bdf8', glow: 'rgba(255,255,255,0.4)', text: 'text-white' },
    r: { line: '#ef4444', point: '#f87171', glow: 'rgba(239,68,68,0.4)', text: 'text-red-400' },
    g: { line: '#22c55e', point: '#4ade80', glow: 'rgba(34,197,94,0.4)', text: 'text-emerald-400' },
    b: { line: '#3b82f6', point: '#60a5fa', glow: 'rgba(59,130,246,0.4)', text: 'text-blue-400' }
  };
  const activeColor = channelColors[activeChannel];

  // Histogram SVG path
  const histogramPath = useMemo(() => {
    if (!histogram) return '';
    let arr: Uint32Array;
    let max = histogram.maxLum;
    if (activeChannel === 'r') {
      arr = histogram.r;
      max = histogram.maxRgb;
    } else if (activeChannel === 'g') {
      arr = histogram.g;
      max = histogram.maxRgb;
    } else if (activeChannel === 'b') {
      arr = histogram.b;
      max = histogram.maxRgb;
    } else {
      arr = histogram.lum;
    }

    if (max <= 0) return '';
    let path = `M 0 ${SVG_SIZE}`;
    for (let i = 0; i < 256; i++) {
      const height = (arr[i] / max) * (SVG_SIZE * 0.7);
      path += ` L ${i} ${SVG_SIZE - height}`;
    }
    path += ` L 255 ${SVG_SIZE} Z`;
    return path;
  }, [histogram, activeChannel]);

  // Coordinate conversion from pointer event to [0..255]
  const getCoordinatesFromEvent = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const x = Math.max(0, Math.min(255, Math.round((rawX / rect.width) * 255)));
    const y = Math.max(0, Math.min(255, Math.round(((rect.height - rawY) / rect.height) * 255)));
    return { x, y };
  };

  // Click on SVG to select or add point
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const coords = getCoordinatesFromEvent(e);
    if (!coords) return;

    // Check if clicked near an existing point
    const threshold = 14;
    let foundIndex = -1;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (Math.hypot(p.x - coords.x, p.y - coords.y) <= threshold) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      setSelectedPointIndex(foundIndex);
      setIsDragging(true);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } else {
      // Add new point (max 10 points per channel)
      if (points.length < 10) {
        const newPoints = [...points, coords].sort((a, b) => a.x - b.x);
        const newIndex = newPoints.findIndex(p => p.x === coords.x && p.y === coords.y);
        setSelectedPointIndex(newIndex);
        setIsDragging(true);

        const newCurves = {
          ...settings.curves,
          [activeChannel]: newPoints
        };
        onChange({ ...settings, curves: newCurves });
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || selectedPointIndex === null) return;
    const coords = getCoordinatesFromEvent(e);
    if (!coords) return;

    const currentPoints = [...points];
    const isFirst = selectedPointIndex === 0;
    const isLast = selectedPointIndex === currentPoints.length - 1;

    // Clamp X between neighbours
    let newX = coords.x;
    if (isFirst) {
      newX = 0; // Black point anchor fixed at x=0
    } else if (isLast) {
      newX = 255; // White point anchor fixed at x=255
    } else {
      const prevX = currentPoints[selectedPointIndex - 1]?.x ?? 0;
      const nextX = currentPoints[selectedPointIndex + 1]?.x ?? 255;
      newX = Math.max(prevX + 1, Math.min(nextX - 1, coords.x));
    }

    currentPoints[selectedPointIndex] = {
      x: newX,
      y: coords.y
    };

    const newCurves = {
      ...settings.curves,
      [activeChannel]: currentPoints
    };
    onChange({ ...settings, curves: newCurves });
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false);
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // Delete currently selected point (except first and last)
  const handleDeletePoint = () => {
    if (selectedPointIndex === null) return;
    if (selectedPointIndex === 0 || selectedPointIndex === points.length - 1) return;

    const newPoints = points.filter((_, idx) => idx !== selectedPointIndex);
    setSelectedPointIndex(null);
    const newCurves = {
      ...settings.curves,
      [activeChannel]: newPoints
    };
    onChange({ ...settings, curves: newCurves });
  };

  // Levels handlers
  const handleLevelsChange = (key: keyof typeof settings.levels, val: number) => {
    onChange({
      ...settings,
      levels: {
        ...settings.levels,
        [key]: val
      }
    });
  };

  // Presets handler
  const handleApplyPreset = (preset: typeof CURVES_PRESETS[0]) => {
    const updatedCurves = {
      ...settings.curves,
      ...preset.curves
    };
    const updatedLevels = {
      ...settings.levels,
      ...(preset.levels || {})
    };
    onChange({
      ...settings,
      curves: updatedCurves,
      levels: updatedLevels
    });
  };

  const selectedPoint = selectedPointIndex !== null ? points[selectedPointIndex] : null;

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 19V5m0 14h18M3 19l4-4 4 2 4-6 5 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Photoshop Curves & Levels</h3>
            <span className="text-[10px] text-zinc-400">Đồ thị Spline 16-bit & Histogram thời gian thực</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[10px] font-medium text-zinc-300 hover:text-white transition-all"
            title="Đặt lại đồ thị về mặc định"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Channel Switcher Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-2xl border border-white/10">
        {(['rgb', 'r', 'g', 'b'] as CurveChannel[]).map((ch) => {
          const isActive = activeChannel === ch;
          const labels = { rgb: 'RGB', r: 'Red (R)', g: 'Green (G)', b: 'Blue (B)' };
          const badgeColors = {
            rgb: isActive ? 'bg-white text-black' : 'text-zinc-400',
            r: isActive ? 'bg-red-500 text-white' : 'text-red-400/70',
            g: isActive ? 'bg-emerald-500 text-white' : 'text-emerald-400/70',
            b: isActive ? 'bg-blue-500 text-white' : 'text-blue-400/70'
          };

          return (
            <button
              key={ch}
              onClick={() => {
                setActiveChannel(ch);
                setSelectedPointIndex(null);
              }}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${badgeColors[ch]} ${
                isActive ? 'shadow-md scale-[1.02]' : 'hover:bg-white/5'
              }`}
            >
              {labels[ch]}
            </button>
          );
        })}
      </div>

      {/* SVG Interactive Curve Graph */}
      <div className="relative w-full aspect-square bg-black/60 rounded-2xl border border-white/15 overflow-hidden select-none p-1">
        {/* Background Grid Lines (Photoshop 4x4 Grid) */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="border-r border-b border-white/[0.07]" />
          ))}
        </div>

        {/* Diagonal Reference Line (Neutral 45 degrees) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 256 256">
          <line x1="0" y1="256" x2="256" y2="0" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" strokeWidth="1" />
        </svg>

        {/* Live Histogram Area Overlay */}
        {histogramPath && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 256 256">
            <path
              d={histogramPath}
              fill={activeChannel === 'rgb' ? 'rgba(255,255,255,0.12)' : `${activeColor.line}25`}
            />
          </svg>
        )}

        {/* Interactive Curves SVG Canvas */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          viewBox="0 0 256 256"
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
        >
          {/* Spline Curve Path */}
          <path
            d={splinePath}
            fill="none"
            stroke={activeColor.line}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${activeColor.glow})` }}
          />

          {/* Control Points */}
          {points.map((p, idx) => {
            const isSelected = selectedPointIndex === idx;
            return (
              <g key={idx}>
                {/* Outer halo */}
                {isSelected && (
                  <circle
                    cx={p.x}
                    cy={256 - p.y}
                    r="8"
                    fill="none"
                    stroke={activeColor.point}
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                )}
                {/* Core point */}
                <circle
                  cx={p.x}
                  cy={256 - p.y}
                  r="5"
                  fill={isSelected ? activeColor.point : '#ffffff'}
                  stroke="#000000"
                  strokeWidth="1.5"
                  className="transition-all hover:scale-125"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Point Numeric Readout & Delete */}
      <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-black/40 rounded-xl border border-white/10 font-mono">
        {selectedPoint ? (
          <div className="flex items-center gap-3">
            <span>In (Vào): <strong className="text-white">{selectedPoint.x}</strong></span>
            <span>Out (Ra): <strong className={activeColor.text}>{selectedPoint.y}</strong></span>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-500 font-sans">
            Nhấp chuột vào đồ thị để thêm/chọn điểm mốc (Tối đa 10 điểm)
          </span>
        )}

        {selectedPointIndex !== null && selectedPointIndex !== 0 && selectedPointIndex !== points.length - 1 && (
          <button
            onClick={handleDeletePoint}
            className="px-2 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[10px] font-sans font-bold transition-all"
            title="Xóa điểm mốc đang chọn"
          >
            Xóa điểm
          </button>
        )}
      </div>

      {/* Levels Quick Input Sliders (Shadows, Gamma Midtone, Highlights) */}
      <div className="p-3 bg-black/30 rounded-2xl border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-white/90">
          <span>Levels (Cân Bằng Mức Sáng)</span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {settings.levels.inputShadow} | γ {settings.levels.inputMidtone.toFixed(2)} | {settings.levels.inputHighlight}
          </span>
        </div>

        {/* Input Shadow (Black point) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Điểm Đen (Input Shadows)</span>
            <span className="font-mono">{settings.levels.inputShadow}</span>
          </div>
          <input
            type="range"
            min="0"
            max="254"
            value={settings.levels.inputShadow}
            onChange={(e) => handleLevelsChange('inputShadow', Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Input Gamma (Midtones) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Trung Tính Gamma (Midtones)</span>
            <span className="font-mono">{settings.levels.inputMidtone.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.05"
            value={settings.levels.inputMidtone}
            onChange={(e) => handleLevelsChange('inputMidtone', Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Input Highlight (White point) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Điểm Trắng (Input Highlights)</span>
            <span className="font-mono">{settings.levels.inputHighlight}</span>
          </div>
          <input
            type="range"
            min="1"
            max="255"
            value={settings.levels.inputHighlight}
            onChange={(e) => handleLevelsChange('inputHighlight', Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>
      </div>

      {/* Curves Presets Grid */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Presets Curves Tiêu Chuẩn</span>
        <div className="grid grid-cols-2 gap-1.5">
          {CURVES_PRESETS.map((pr) => (
            <button
              key={pr.id}
              onClick={() => handleApplyPreset(pr)}
              className="text-left p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 transition-all group"
            >
              <div className="text-[11px] font-bold text-zinc-200 group-hover:text-white truncate">
                {pr.name}
              </div>
              <div className="text-[9px] text-zinc-500 truncate">{pr.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Apply Action Button */}
      <button
        onClick={onApplyToCanvas}
        className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 active:scale-[0.98] text-black text-xs font-black uppercase tracking-wider transition-all shadow-md"
      >
        Áp Dụng Curves & Levels
      </button>
    </div>
  );
};
