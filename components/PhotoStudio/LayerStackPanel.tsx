import React from 'react';
import { StudioLayer, StudioBlendMode } from '../../services/studioLayerService';

interface LayerStackPanelProps {
  layers: StudioLayer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
  onChangeBlendMode: (id: string, mode: StudioBlendMode) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onFlattenLayers: () => void;
}

export const LayerStackPanel: React.FC<LayerStackPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleVisibility,
  onChangeOpacity,
  onChangeBlendMode,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onFlattenLayers
}) => {
  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  const blendModes: { id: StudioBlendMode; label: string }[] = [
    { id: 'source-over', label: 'Bình thường (Normal)' },
    { id: 'screen', label: 'Làm sáng (Screen)' },
    { id: 'overlay', label: 'Phủ chồng (Overlay)' },
    { id: 'soft-light', label: 'Ánh sáng êm (Soft Light)' },
    { id: 'multiply', label: 'Nhân tối (Multiply)' },
    { id: 'color-dodge', label: 'Lóa màu (Color Dodge)' },
    { id: 'lighten', label: 'Sáng hơn (Lighten)' },
    { id: 'hard-light', label: 'Ánh sáng gắt (Hard Light)' }
  ];

  return (
    <div className="flex flex-col gap-3 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl text-zinc-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11l-7 4-7-4m14 4l-7 4-7-4M12 3L5 7l7 4 7-4-7-4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Multi-Layer Composite</h3>
            <span className="text-[10px] text-zinc-400">Hệ thống {layers.length} Layer không phá hủy</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddLayer}
            className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-xs text-zinc-200 hover:text-white transition-all"
            title="Thêm Layer mới"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onFlattenLayers}
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[10px] font-medium text-zinc-300 hover:text-white transition-all"
            title="Gộp tất cả Layer thành 1 ảnh phẳng (Flatten)"
          >
            Gộp Lớp
          </button>
        </div>
      </div>

      {/* Active Layer Controls Bar */}
      {activeLayer && (
        <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white truncate max-w-[150px]">{activeLayer.name}</span>
            <span className="text-[10px] text-zinc-400 font-mono">
              Opacity: {Math.round(activeLayer.opacity * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Opacity Slider */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={activeLayer.opacity}
                onChange={(e) => onChangeOpacity(activeLayer.id, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Blend Mode Selector */}
            <select
              value={activeLayer.blendMode}
              onChange={(e) => onChangeBlendMode(activeLayer.id, e.target.value as StudioBlendMode)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-2 py-1 text-[11px] text-zinc-200 focus:outline-none"
            >
              {blendModes.map((bm) => (
                <option key={bm.id} value={bm.id} className="bg-zinc-900 text-zinc-200">
                  {bm.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Layer Stack Items List (Reversed so top layer is on top of list) */}
      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
        {[...layers].reverse().map((layer) => {
          const isSelected = layer.id === activeLayerId;
          const isBase = layer.type === 'base';

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white/[0.08] border-white/30 shadow-sm'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Visibility Toggle Eye */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${
                    layer.visible
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-zinc-600'
                  }`}
                  title={layer.visible ? 'Ẩn Layer' : 'Hiện Layer'}
                >
                  {layer.visible ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  )}
                </button>

                {/* Layer Thumbnail */}
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
                  {layer.dataUrl ? (
                    <img src={layer.dataUrl} alt="Layer thumb" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-medium text-white block truncate">{layer.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {layer.blendMode} • {Math.round(layer.opacity * 100)}%
                  </span>
                </div>
              </div>

              {/* Action Buttons for non-base layers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateLayer(layer.id);
                  }}
                  className="w-6 h-6 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                  title="Nhân bản Layer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {!isBase && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    className="w-6 h-6 rounded-md hover:bg-red-500/20 text-zinc-400 hover:text-red-300 flex items-center justify-center transition-all"
                    title="Xóa Layer này"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
