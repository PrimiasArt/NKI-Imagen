import React, { useState, useEffect } from 'react';
import { StoryboardShot } from '../types';

interface TimelineStoryboardProps {
  shots: StoryboardShot[];
  onUpdateShots: (shots: StoryboardShot[]) => void;
  className?: string;
}

export const TimelineStoryboard: React.FC<TimelineStoryboardProps> = ({
  shots,
  onUpdateShots,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState<number>(0);
  const [bpmTempo, setBpmTempo] = useState<number>(90); // Ambient cinematic default

  // Calculate total timeline runtime
  const totalDurationSeconds = shots.reduce((acc, s) => acc + (s.durationSeconds || 4), 0);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying || shots.length === 0) return;

    const currentShot = shots[currentPlaybackIndex];
    const durationMs = (currentShot?.durationSeconds || 4) * 1000;

    const timer = setTimeout(() => {
      if (currentPlaybackIndex < shots.length - 1) {
        setCurrentPlaybackIndex(prev => prev + 1);
      } else {
        // End of timeline
        setIsPlaying(false);
        setCurrentPlaybackIndex(0);
      }
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isPlaying, currentPlaybackIndex, shots]);

  const handleDurationChange = (index: number, newDuration: number) => {
    const updated = [...shots];
    updated[index] = { ...updated[index], durationSeconds: Math.max(1, newDuration) };
    onUpdateShots(updated);
  };

  const handleTransitionChange = (index: number, trans: 'cut' | 'dissolve' | 'fade_black') => {
    const updated = [...shots];
    updated[index] = { ...updated[index], transition: trans };
    onUpdateShots(updated);
  };

  return (
    <div className={`glass-card p-6 rounded-3xl border border-white/10 bg-slate-950/80 space-y-6 shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xl shadow-inner">
            🎞️
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>Timeline Storyboard & Animatic Director</span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/40">
                Timeline Player
              </span>
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Ghép các cảnh thành chuỗi thời gian, căn chỉnh thời lượng và xem trước nhịp phim (Animatic).
            </p>
          </div>
        </div>

        {/* Timeline Stats & Playback Trigger */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-white/40 block">Tổng thời lượng</span>
            <span className="text-sm font-black font-mono text-primary-300">
              {totalDurationSeconds}s ({Math.floor(totalDurationSeconds / 60)}m {totalDurationSeconds % 60}s)
            </span>
          </div>

          {/* BPM Tempo selector */}
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
            <span className="text-white/40 text-[10px] uppercase font-bold">BPM:</span>
            <select
              value={bpmTempo}
              onChange={(e) => setBpmTempo(Number(e.target.value))}
              className="bg-transparent text-white font-mono font-bold focus:outline-none"
            >
              <option value={65} className="bg-slate-900">65 (Slow Drama)</option>
              <option value={90} className="bg-slate-900">90 (Cinematic)</option>
              <option value={128} className="bg-slate-900">128 (High-Tech)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else {
                setCurrentPlaybackIndex(0);
                setIsPlaying(true);
              }
            }}
            disabled={shots.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-30 ${
              isPlaying
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : 'bg-primary-500 hover:bg-primary-400 text-black shadow-primary-500/30'
            }`}
          >
            <span>{isPlaying ? '⏹' : '▶'}</span>
            <span>{isPlaying ? 'Dừng Xem Lại' : 'Phát Animatic'}</span>
          </button>
        </div>
      </div>

      {/* Live Animatic Preview Screen during playback */}
      {isPlaying && shots[currentPlaybackIndex] && (
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-primary-500/50 bg-black shadow-2xl flex items-center justify-center animate-in zoom-in-95 duration-200">
          {shots[currentPlaybackIndex].renderedImage ? (
            <img
              src={shots[currentPlaybackIndex].renderedImage}
              alt="Shot playback"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-8 space-y-2">
              <span className="text-3xl">🎬</span>
              <h4 className="text-lg font-black text-white">{shots[currentPlaybackIndex].title}</h4>
              <p className="text-xs text-white/50 max-w-lg">{shots[currentPlaybackIndex].promptJson.subject}</p>
            </div>
          )}

          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>Shot {currentPlaybackIndex + 1}/{shots.length}: {shots[currentPlaybackIndex].title}</span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
            <span className="text-primary-300 font-mono">
              Hiệu ứng: {shots[currentPlaybackIndex].transition.toUpperCase()}
            </span>
            <span className="text-white/60 font-mono">
              Thời lượng cảnh: {shots[currentPlaybackIndex].durationSeconds}s
            </span>
          </div>
        </div>
      )}

      {/* Horizontal Storyboard Track */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-white/40">
            Dải Phân Cảnh (Timeline Track - {shots.length} Shots)
          </span>
          <span className="text-[10px] text-white/40">Kéo ngang để xem toàn bộ mạch phim →</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar">
          {shots.map((shot, idx) => {
            const isActive = isPlaying && currentPlaybackIndex === idx;
            return (
              <div
                key={shot.id || idx}
                className={`flex-none w-64 p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-primary-500/20 border-primary-400 shadow-[0_0_20px_rgba(var(--primary-500-rgb),0.3)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 mb-2.5 flex items-center justify-center">
                    {shot.renderedImage ? (
                      <img src={shot.renderedImage} alt={shot.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-white/30 font-mono">Shot #{shot.shotNumber || idx + 1}</span>
                    )}
                    <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-black text-white font-mono">
                      #{idx + 1}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-white truncate">{shot.title}</h4>
                  <p className="text-[10px] text-white/50 line-clamp-2 mt-0.5">
                    {shot.promptJson.subject}
                  </p>
                </div>

                {/* Duration & Transition Inputs */}
                <div className="mt-3 pt-2.5 border-t border-white/5 space-y-2 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Thời lượng:</span>
                    <div className="flex items-center gap-1">
                      {[2, 4, 8].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDurationChange(idx, d)}
                          className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all ${
                            shot.durationSeconds === d ? 'bg-primary-500 text-black' : 'bg-white/5 text-white/50 hover:text-white'
                          }`}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Chuyển cảnh:</span>
                    <select
                      value={shot.transition || 'cut'}
                      onChange={(e) => handleTransitionChange(idx, e.target.value as any)}
                      className="bg-black/50 text-white/80 rounded px-1.5 py-0.5 border border-white/10 text-[9px]"
                    >
                      <option value="cut">Cắt dứt khoát (Cut)</option>
                      <option value="dissolve">Hòa tan (Dissolve)</option>
                      <option value="fade_black">Mờ tối (Fade Black)</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
