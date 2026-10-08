import React, { useState, useRef, useEffect } from 'react';
import { PhotoStudioInstructionContent } from './PhotoStudioInstructionContent';

interface PhotoStudioFloatingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onDockToSidebar: () => void;
  onActivateTool: (tool: string) => void;
  onActivateTab: (tab: string) => void;
}

export const PhotoStudioFloatingGuide: React.FC<PhotoStudioFloatingGuideProps> = ({
  isOpen,
  onClose,
  onDockToSidebar,
  onActivateTool,
  onActivateTab
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    // Default position: top-left area over canvas
    if (typeof window !== 'undefined') {
      return { x: 84, y: 70 };
    }
    return { x: 84, y: 70 };
  });

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from header or drag handle
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, .no-drag')) {
      return;
    }

    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y
    };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvt.clientX - dragStartRef.current.mouseX;
      const dy = moveEvt.clientY - dragStartRef.current.mouseY;

      const maxX = Math.max(0, window.innerWidth - 120);
      const maxY = Math.max(0, window.innerHeight - 80);

      setPosition({
        x: Math.max(10, Math.min(maxX, dragStartRef.current.startX + dx)),
        y: Math.max(10, Math.min(maxY, dragStartRef.current.startY + dy))
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  // Minimized Capsule Mode
  if (isMinimized) {
    return (
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onMouseDown={handleMouseDown}
        className="fixed z-50 flex items-center gap-2 px-3 py-2 bg-slate-900/95 border border-white/20 rounded-full backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] cursor-move select-none animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
          <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Hướng Dẫn</span>
        </div>

        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all text-xs"
          title="Mở rộng bảng hướng dẫn"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-300 transition-all text-xs"
          title="Đóng"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // Full Floating Window Mode
  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 w-96 md:w-[410px] max-h-[78vh] flex flex-col bg-slate-900/95 border border-white/20 rounded-3xl backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Draggable Window Header */}
      <div
        onMouseDown={handleMouseDown}
        className="flex-none p-3.5 bg-black/40 border-b border-white/10 flex items-center justify-between cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          {/* Drag Grip Dots */}
          <div className="flex flex-col gap-0.5 opacity-40">
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-white"></span>
              <span className="w-1 h-1 rounded-full bg-white"></span>
            </div>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-white"></span>
              <span className="w-1 h-1 rounded-full bg-white"></span>
            </div>
          </div>

          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>Hướng Dẫn Thao Tác</span>
              <span className="text-[9px] font-mono font-normal bg-white/10 px-1.5 py-0.2 rounded text-zinc-300">
                Kéo thả
              </span>
            </h3>
            <span className="text-[10px] text-zinc-400 block -mt-0.5">Vừa xem vừa thao tác trực tiếp</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 no-drag">
          {/* Dock to Sidebar Button */}
          <button
            onClick={onDockToSidebar}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all text-xs"
            title="Ghim về cột điều khiển bên phải (Dock to Sidebar)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all text-xs"
            title="Thu nhỏ thành viên capsule nổi"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-red-500/20 text-zinc-400 hover:text-red-300 transition-all text-xs"
            title="Đóng bảng hướng dẫn"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Instruction Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <PhotoStudioInstructionContent
          onActivateTool={onActivateTool}
          onActivateTab={onActivateTab}
        />
      </div>

      {/* Bottom Hint Footer */}
      <div className="flex-none px-4 py-2 bg-black/40 border-t border-white/10 text-[10px] text-zinc-400 flex items-center justify-between">
        <span>💡 Giữ thanh trên cùng để kéo di chuyển</span>
        <button
          onClick={onDockToSidebar}
          className="text-primary-300 hover:text-primary-200 underline font-medium"
        >
          Ghim vào thanh bên →
        </button>
      </div>
    </div>
  );
};
