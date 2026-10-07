import React, { useState, useRef } from 'react';
import { ImagePromptJson } from '../types';

export interface MultiverseNode {
  id: string;
  parentId: string | null;
  type: 'root' | 'variation' | 'lighting' | 'camera' | 'style' | 'veo_video';
  title: string;
  subtitle: string;
  promptText: string;
  thumbnail?: string;
  x: number;
  y: number;
}

interface MultiverseNodeGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPromptText?: string;
  currentThumbnail?: string;
  onSelectPrompt?: (promptText: string) => void;
}

export const MultiverseNodeGraphModal: React.FC<MultiverseNodeGraphModalProps> = ({
  isOpen,
  onClose,
  currentPromptText = 'A cinematic master shot of a cybernetic warrior',
  currentThumbnail,
  onSelectPrompt
}) => {
  // Initial tree with root and branches
  const [nodes, setNodes] = useState<MultiverseNode[]>([
    {
      id: 'node-root',
      parentId: null,
      type: 'root',
      title: 'Multiverse Genesis (Gốc)',
      subtitle: 'Prompt chủ đạo hiện tại',
      promptText: currentPromptText,
      thumbnail: currentThumbnail,
      x: 100,
      y: 220
    },
    {
      id: 'node-light',
      parentId: 'node-root',
      type: 'lighting',
      title: 'Branch A: Cyberpunk Neon Rim',
      subtitle: 'Tăng sáng viền xanh neon và sương khói tím',
      promptText: `${currentPromptText}, intense cyan and violet rim lighting, volumetric foggy atmospheric glare, high dynamic range shadows`,
      x: 440,
      y: 100
    },
    {
      id: 'node-cam',
      parentId: 'node-root',
      type: 'camera',
      title: 'Branch B: Low-Angle Dutch Tilt',
      subtitle: 'Góc máy nghiêng từ dưới lên uy lực',
      promptText: `${currentPromptText}, extreme low-angle heroic perspective, dutch angle tilt 15 degrees, 24mm ultra-wide cine lens`,
      x: 440,
      y: 240
    },
    {
      id: 'node-veo',
      parentId: 'node-root',
      type: 'veo_video',
      title: 'Branch C: Veo 3 Orbit 360 Video',
      subtitle: 'Quỹ đạo fly-cam xoay 360 độ điện ảnh',
      promptText: `Cinematic continuous 360 camera orbit around ${currentPromptText}, slow-motion particles drifting in air, 24fps film cadence`,
      x: 440,
      y: 380
    }
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-root');
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  // Pan canvas handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains('canvas-bg')) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (draggingNodeId) {
      const deltaX = (e.clientX - dragStartPos.x) / scale;
      const deltaY = (e.clientY - dragStartPos.y) / scale;
      setNodes((prev) =>
        prev.map((node) =>
          node.id === draggingNodeId
            ? { ...node, x: node.x + deltaX, y: node.y + deltaY }
            : node
        )
      );
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    setDraggingNodeId(id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  // Add branch from selected node
  const handleAddBranch = (type: MultiverseNode['type']) => {
    if (!selectedNode) return;

    const newId = `node-${Date.now()}`;
    const branchCount = nodes.filter((n) => n.parentId === selectedNode.id).length;
    const offsetY = (branchCount - 1) * 110;

    let title = 'Nhánh mới';
    let subtitle = 'Biến thể tùy biến';
    let addedPrompt = '';

    switch (type) {
      case 'lighting':
        title = `Lighting Shift #${nodes.length + 1}`;
        subtitle = 'Hắt sáng dramatic & golden hour';
        addedPrompt = ', dramatic golden hour rim lighting, warm tungsten fill with long dusk shadows';
        break;
      case 'camera':
        title = `Camera Shift #${nodes.length + 1}`;
        subtitle = 'Cận cảnh Macro 85mm';
        addedPrompt = ', extreme close-up macro portrait, razor-sharp eye detail, creamy f/1.4 bokeh';
        break;
      case 'style':
        title = `Style Shift #${nodes.length + 1}`;
        subtitle = 'Trường phái Cyber-Noir & Oil Texture';
        addedPrompt = ', cyber-noir aesthetic, textured impasto brushstrokes, gritty moody atmosphere';
        break;
      case 'veo_video':
        title = `Veo 3 Motion Shot #${nodes.length + 1}`;
        subtitle = 'Cú máy Vertigo Dolly Zoom';
        addedPrompt = ', dramatic Hitchcock vertigo dolly zoom effect, optical focal shift, subject anchored';
        break;
      default:
        title = `Variation #${nodes.length + 1}`;
        subtitle = 'Đột phá ý tưởng tiếp theo';
        addedPrompt = ', alternative artistic variation with intensified realism and detail';
    }

    const newNode: MultiverseNode = {
      id: newId,
      parentId: selectedNode.id,
      type,
      title,
      subtitle,
      promptText: `${selectedNode.promptText}${addedPrompt}`,
      x: selectedNode.x + 320,
      y: selectedNode.y + offsetY,
      thumbnail: selectedNode.thumbnail
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  const handleDeleteNode = (id: string) => {
    if (id === 'node-root') {
      alert('Không thể xóa Node Gốc (Root Node).');
      return;
    }
    setNodes((prev) => prev.filter((n) => n.id !== id && n.parentId !== id));
    setSelectedNodeId('node-root');
  };

  const getNodeColor = (type: MultiverseNode['type']) => {
    switch (type) {
      case 'root':
        return {
          bg: 'from-amber-500/20 to-orange-500/10',
          border: 'border-amber-400/40',
          pill: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
          badge: '👑 Root'
        };
      case 'lighting':
        return {
          bg: 'from-yellow-500/20 to-amber-500/10',
          border: 'border-yellow-400/40',
          pill: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
          badge: '💡 Lighting'
        };
      case 'camera':
        return {
          bg: 'from-blue-500/20 to-cyan-500/10',
          border: 'border-blue-400/40',
          pill: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
          badge: '🎥 Camera'
        };
      case 'style':
        return {
          bg: 'from-purple-500/20 to-pink-500/10',
          border: 'border-purple-400/40',
          pill: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
          badge: '🎨 Style'
        };
      case 'veo_video':
        return {
          bg: 'from-rose-500/20 to-red-500/10',
          border: 'border-rose-400/40',
          pill: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
          badge: '🎬 Veo Video'
        };
      default:
        return {
          bg: 'from-emerald-500/20 to-teal-500/10',
          border: 'border-emerald-400/40',
          pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
          badge: '✨ Variant'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl bg-slate-900/90 border border-white/15 shadow-2xl shadow-emerald-500/10 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 border border-emerald-400/30 flex items-center justify-center text-emerald-300 text-xl shadow-inner">
              🌌
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Infinite Multiverse Node Graph
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Visual Branching Tree
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sơ đồ phân nhánh đa vũ trụ sáng tạo: mở rộng ý tưởng từ Prompt Gốc thành vô số nhánh ánh sáng, góc máy & video
              </p>
            </div>
          </div>

          {/* Canvas Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(0.4, s - 0.1))}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xs text-slate-300"
              title="Thu nhỏ (Zoom out)"
            >
              -
            </button>
            <span className="text-xs font-mono text-slate-400 min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(1.8, s + 0.1))}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xs text-slate-300"
              title="Phóng to (Zoom in)"
            >
              +
            </button>
            <button
              onClick={() => {
                setScale(1);
                setPan({ x: 0, y: 0 });
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300"
            >
              Căn giữa
            </button>

            <div className="w-[1px] h-6 bg-white/10 mx-1" />

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Workspace: Graph Canvas + Inspector Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Main Visual Canvas */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="flex-1 relative overflow-hidden bg-slate-950/80 cursor-grab active:cursor-grabbing select-none canvas-bg"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* Transform Layer for Pan & Zoom */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                position: 'absolute',
                width: '3000px',
                height: '3000px'
              }}
            >
              {/* SVG Connecting Bezier Cables */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {nodes.map((node) => {
                  if (!node.parentId) return null;
                  const parent = nodes.find((n) => n.id === node.parentId);
                  if (!parent) return null;

                  const x1 = parent.x + 220; // right middle of parent
                  const y1 = parent.y + 45;
                  const x2 = node.x;         // left middle of child
                  const y2 = node.y + 45;

                  const dx = (x2 - x1) * 0.5;
                  const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                  return (
                    <g key={`edge-${parent.id}-${node.id}`}>
                      <path
                        d={path}
                        fill="none"
                        stroke="rgba(16, 185, 129, 0.25)"
                        strokeWidth="4"
                      />
                      <path
                        d={path}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="animate-pulse"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Render Nodes */}
              {nodes.map((node) => {
                const colors = getNodeColor(node.type);
                const isSelected = node.id === selectedNodeId;

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: '230px'
                    }}
                    className={`absolute p-3 rounded-2xl bg-gradient-to-b ${colors.bg} bg-slate-900/95 border backdrop-blur-md shadow-xl transition-shadow cursor-pointer ${
                      isSelected
                        ? `${colors.border} ring-2 ring-emerald-400 shadow-emerald-500/20`
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${colors.pill}`}>
                        {colors.badge}
                      </span>
                      {node.thumbnail && (
                        <div className="w-5 h-5 rounded-md overflow-hidden border border-white/10">
                          <img src={node.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-white truncate">{node.title}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{node.subtitle}</p>

                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500">
                      <span className="font-mono truncate max-w-[130px]">{node.id}</span>
                      <span>Kéo để di chuyển</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom floating hint */}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-xs text-slate-400 pointer-events-none">
              💡 Rê chuột giữ kéo canvas để Pan • Kéo từng thẻ Node để sắp xếp vị trí
            </div>
          </div>

          {/* Right Inspector & Node Brancher Panel (320px) */}
          <div className="w-80 border-l border-white/10 bg-slate-950/60 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
            {selectedNode ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Node Chi Tiết</span>
                  {selectedNode.id !== 'node-root' && (
                    <button
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[10px] transition-all"
                    >
                      Xóa Node
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-emerald-300">{selectedNode.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{selectedNode.subtitle}</p>
                </div>

                {/* Prompt Preview */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">Prompt Đầy Đủ Của Nhánh:</span>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-emerald-200/90 leading-relaxed max-h-36 overflow-y-auto select-all">
                    {selectedNode.promptText}
                  </div>
                </div>

                {/* Branch out actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-semibold text-slate-300">
                    + Tạo phân nhánh từ Node này:
                  </span>
                  
                  <button
                    onClick={() => handleAddBranch('lighting')}
                    className="py-1.5 px-3 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-medium text-left flex items-center gap-2 transition-all"
                  >
                    <span>💡</span>
                    <span>Biến thể Ánh sáng (Lighting)</span>
                  </button>

                  <button
                    onClick={() => handleAddBranch('camera')}
                    className="py-1.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium text-left flex items-center gap-2 transition-all"
                  >
                    <span>🎥</span>
                    <span>Biến thể Góc quay (Camera)</span>
                  </button>

                  <button
                    onClick={() => handleAddBranch('style')}
                    className="py-1.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium text-left flex items-center gap-2 transition-all"
                  >
                    <span>🎨</span>
                    <span>Biến thể Trường phái (Style)</span>
                  </button>

                  <button
                    onClick={() => handleAddBranch('veo_video')}
                    className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium text-left flex items-center gap-2 transition-all"
                  >
                    <span>🎬</span>
                    <span>Chuyển động Video (Veo 3)</span>
                  </button>
                </div>

                {/* Apply to Studio */}
                {onSelectPrompt && (
                  <div className="pt-2 mt-auto">
                    <button
                      onClick={() => {
                        onSelectPrompt(selectedNode.promptText);
                        onClose();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <span>✨</span>
                      <span>Tải Nhánh Này Vào Studio</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-6 text-slate-500 text-xs">
                Chọn một node để kiểm tra và phân nhánh
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
