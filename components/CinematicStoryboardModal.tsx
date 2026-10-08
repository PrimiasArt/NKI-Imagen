import React, { useState } from 'react';
import { 
  StoryboardScene, 
  DirectorStyle, 
  DIRECTOR_PRESETS, 
  CAMERA_MOTION_LABELS, 
  LENS_LABELS, 
  CameraMovement, 
  LensType, 
  createDefaultStoryboard, 
  synthesizeVeo3Prompt, 
  synthesizeImagePromptForScene,
  exportStoryboardProjectJson,
  exportStoryboardMarkdown
} from '../services/cinematicStoryboardService';

interface CinematicStoryboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToGallery: (image: string, desc: string, meta?: any) => void;
  onDownload: (image: string, desc: string) => void;
  onOpenInUpscale?: (image: string) => void;
  onSendToWorkspace?: (prompt: string) => void;
  t?: (key: string) => string;
}

export const CinematicStoryboardModal: React.FC<CinematicStoryboardModalProps> = ({
  isOpen,
  onClose,
  onSaveToGallery,
  onDownload,
  onOpenInUpscale,
  onSendToWorkspace
}) => {
  const [projectTitle, setProjectTitle] = useState('Chuyến Du Hành Không Gian 2099');
  const [conceptDescription, setConceptDescription] = useState('Nhà thám hiểm cô độc bước vào di tích công nghệ cổ đại trên hành tinh cát đỏ');
  const [directorStyle, setDirectorStyle] = useState<DirectorStyle>('denis_villeneuve');
  const [scenes, setScenes] = useState<StoryboardScene[]>(() => 
    createDefaultStoryboard('Chuyến Du Hành Không Gian 2099', 'Nhà thám hiểm cô độc trên hành tinh cát đỏ', 'denis_villeneuve')
  );
  const [activeSceneId, setActiveSceneId] = useState<string>(() => scenes[0]?.id || '');
  const [copiedVeoId, setCopiedVeoId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDirector = DIRECTOR_PRESETS.find(d => d.id === directorStyle) || DIRECTOR_PRESETS[0];
  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];

  const handleUpdateScene = (id: string, updates: Partial<StoryboardScene>) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...updates };
      updated.veoPrompt = synthesizeVeo3Prompt(updated, directorStyle);
      return updated;
    }));
  };

  const handleRecreateStoryboard = () => {
    const newScenes = createDefaultStoryboard(projectTitle, conceptDescription, directorStyle);
    setScenes(newScenes);
    if (newScenes.length > 0) setActiveSceneId(newScenes[0].id);
  };

  const handleDirectorChange = (newStyle: DirectorStyle) => {
    setDirectorStyle(newStyle);
    setScenes(prev => prev.map(s => ({
      ...s,
      veoPrompt: synthesizeVeo3Prompt(s, newStyle)
    })));
  };

  const handleCopyVeoPrompt = (scene: StoryboardScene) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(scene.veoPrompt);
      setCopiedVeoId(scene.id);
      setTimeout(() => setCopiedVeoId(null), 2000);
    }
  };

  const handleExportJson = () => {
    const jsonStr = exportStoryboardProjectJson(projectTitle, scenes);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Storyboard_${projectTitle.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const mdStr = exportStoryboardMarkdown(projectTitle, scenes, directorStyle);
    const blob = new Blob([mdStr], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Director_Script_${projectTitle.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendPromptToWorkspace = (scene: StoryboardScene) => {
    const prompt = synthesizeImagePromptForScene(scene, directorStyle);
    if (onSendToWorkspace) {
      onSendToWorkspace(prompt);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cinematic Storyboard & Veo 3 Motion Director</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">v4.3 Pro</span>
              </div>
              <p className="text-[11px] text-zinc-400">Phân cảnh 4 Hồi điện ảnh & Vector chuyển động camera cho Google Veo 3 / Sora</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMarkdown}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium rounded-lg border border-white/10 transition-colors flex items-center gap-1.5"
              title="Xuất file Markdown kịch bản cho đạo diễn"
            >
              <span>📄 Xuất Markdown</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium rounded-lg border border-white/10 transition-colors flex items-center gap-1.5"
              title="Xuất kịch bản dạng JSON"
            >
              <span>💾 Xuất JSON</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Top Control Bar: Concept & Director */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border-b border-white/5 bg-zinc-900/40 text-xs">
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Tên Dự Án Phim</label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30 font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Ý Tưởng Cốt Truyện</label>
            <input
              type="text"
              value={conceptDescription}
              onChange={(e) => setConceptDescription(e.target.value)}
              placeholder="Mô tả bối cảnh và diễn biến chính..."
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30 font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Phong Cách Đạo Diễn</label>
              <button
                onClick={handleRecreateStoryboard}
                className="text-[10px] text-zinc-300 hover:text-white underline font-mono"
              >
                ↻ Tạo Lại 4 Hồi
              </button>
            </div>
            <select
              value={directorStyle}
              onChange={(e) => handleDirectorChange(e.target.value as DirectorStyle)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30 font-medium"
            >
              {DIRECTOR_PRESETS.map(d => (
                <option key={d.id} value={d.id} className="bg-zinc-900">{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Timeline Act Sequence Cards */}
          <div className="w-full md:w-5/12 border-r border-white/5 p-4 overflow-y-auto space-y-3 bg-zinc-950/40">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Danh Sách Phân Cảnh (Timeline)</span>
              <span className="text-[10px] text-zinc-500 font-mono">{scenes.length} Scenes</span>
            </div>

            {scenes.map((scene) => {
              const isActive = scene.id === activeSceneId;
              const motion = CAMERA_MOTION_LABELS[scene.cameraMovement];
              return (
                <div
                  key={scene.id}
                  onClick={() => setActiveSceneId(scene.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                    isActive 
                      ? 'bg-white/[0.08] border-white/30 shadow-lg' 
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200 text-[11px] tracking-wide">{scene.actTitle}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono">
                      Scene {scene.sceneNumber}
                    </span>
                  </div>

                  <p className="text-zinc-400 text-[11px] line-clamp-2 leading-relaxed">
                    {scene.actionDescription}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-zinc-500">
                    <span className="px-1.5 py-0.5 bg-black/40 rounded border border-white/5">{scene.shotType}</span>
                    <span className="px-1.5 py-0.5 bg-black/40 rounded border border-white/5 truncate max-w-[130px]">
                      {motion?.label.split(' ')[0]}
                    </span>
                    <span className="px-1.5 py-0.5 bg-black/40 rounded border border-white/5">
                      {LENS_LABELS[scene.lens]?.label.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400 space-y-1.5">
              <span className="font-bold text-zinc-300 text-[10px] uppercase block">Phong cách: {currentDirector.name}</span>
              <p className="text-[10px] text-zinc-500 leading-normal">{currentDirector.description}</p>
            </div>
          </div>

          {/* Right Column: Scene Director & Motion Vector Studio */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-zinc-900/20">
            {activeScene ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{activeScene.actTitle}</h3>
                    <p className="text-[11px] text-zinc-400">Thiết lập thông số camera và chuyển động khung hình</p>
                  </div>

                  <button
                    onClick={() => handleSendPromptToWorkspace(activeScene)}
                    className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <span>⚡ Chuyển Sang Workspace Tạo Ảnh</span>
                  </button>
                </div>

                {/* Grid controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Cỡ Cảnh (Framing)</label>
                    <select
                      value={activeScene.shotType}
                      onChange={(e) => handleUpdateScene(activeScene.id, { shotType: e.target.value as any })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30"
                    >
                      <option value="Extreme Wide Shot">Extreme Wide Shot (Toàn cảnh rộng)</option>
                      <option value="Wide Shot">Wide Shot (Toàn cảnh)</option>
                      <option value="Medium Shot">Medium Shot (Trung cảnh)</option>
                      <option value="Close Up">Close Up (Cận cảnh)</option>
                      <option value="Extreme Close Up">Extreme Close Up (Đặc tả chi tiết)</option>
                      <option value="Dutch Tilt">Dutch Tilt (Góc nghiêng điện ảnh)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Chuyển Động Camera</label>
                    <select
                      value={activeScene.cameraMovement}
                      onChange={(e) => handleUpdateScene(activeScene.id, { cameraMovement: e.target.value as CameraMovement })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30"
                    >
                      {Object.entries(CAMERA_MOTION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Ống Kính Điện Ảnh (Lens)</label>
                    <select
                      value={activeScene.lens}
                      onChange={(e) => handleUpdateScene(activeScene.id, { lens: e.target.value as LensType })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-white/30"
                    >
                      {Object.entries(LENS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Scene Action description */}
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Mô Tả Diễn Biến & Hành Động</label>
                  <textarea
                    rows={2}
                    value={activeScene.actionDescription}
                    onChange={(e) => handleUpdateScene(activeScene.id, { actionDescription: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-white/30 leading-relaxed font-sans"
                  />
                </div>

                {/* Lighting mood */}
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Ánh Sáng & Không Khí (Lighting & Atmospheric Tone)</label>
                  <input
                    type="text"
                    value={activeScene.lightingMood}
                    onChange={(e) => handleUpdateScene(activeScene.id, { lightingMood: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Google Veo 3 / Sora Motion Vector Prompt Box */}
                <div className="p-4 rounded-xl bg-black/70 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🎬</span>
                      <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                        Google Veo 3 / Runway Gen-3 Motion Vector Prompt
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyVeoPrompt(activeScene)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-zinc-200 text-[10px] font-mono rounded-lg border border-white/10 transition-colors flex items-center gap-1"
                    >
                      <span>{copiedVeoId === activeScene.id ? '✓ Đã Copy' : '📋 Copy Prompt Video'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] font-mono text-zinc-300 bg-black/60 p-2.5 rounded-lg border border-white/5 leading-relaxed select-all">
                    {activeScene.veoPrompt}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Prompt chuẩn hóa cho các mô hình video AI mới nhất: bao gồm vector dịch chuyển camera, tiêu cự lens, nhịp độ 24fps và phong cách điện ảnh.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
};
