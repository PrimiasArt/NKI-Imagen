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
    <div className="flex flex-col gap-3 p-4 rounded-3xl bg-slate-900/90 border border-white/10 backdrop-blur-xl text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">🥞</span>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Multi-Layer Neural Composite</h3>
            <span className="text-[10px] text-slate-400">Hệ thống {layers.length} Layer không phá hủy</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onAddLayer}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xs text-cyan-300 hover:text-white transition-all"
            title="Thêm Layer mới"
          >
            +
          </button>
          <button
            onClick={onFlattenLayers}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-300 hover:text-white transition-all"
            title="Gộp tất cả Layer thành 1 ảnh phẳng (Flatten)"
          >
            Gộp Lớp
          </button>
        </div>
      </div>

      {/* Active Layer Controls Bar */}
      {activeLayer && (
        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-cyan-300 truncate max-w-[150px]">{activeLayer.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
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
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Blend Mode Selector */}
            <select
              value={activeLayer.blendMode}
              onChange={(e) => onChangeBlendMode(activeLayer.id, e.target.value as StudioBlendMode)}
              className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1 text-[11px] text-white focus:outline-none"
            >
              {blendModes.map((bm) => (
                <option key={bm.id} value={bm.id}>
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
                  ? 'bg-cyan-500/15 border-cyan-400/50 shadow-md shadow-cyan-500/10'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
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
                      : 'bg-white/5 text-slate-600'
                  }`}
                  title={layer.visible ? 'Ẩn Layer' : 'Hiện Layer'}
                >
                  {layer.visible ? '👁️' : '🙈'}
                </button>

                {/* Layer Thumbnail */}
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
                  {layer.dataUrl ? (
                    <img src={layer.dataUrl} alt="Layer thumb" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                      🎨
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block truncate">{layer.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
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
                  className="w-6 h-6 rounded-md hover:bg-white/10 text-[10px] text-slate-400 hover:text-white flex items-center justify-center"
                  title="Nhân bản Layer"
                >
                  📋
                </button>
                {!isBase && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    className="w-6 h-6 rounded-md hover:bg-red-500/20 text-[10px] text-red-400 hover:text-red-300 flex items-center justify-center"
                    title="Xóa Layer này"
                  >
                    🗑️
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
