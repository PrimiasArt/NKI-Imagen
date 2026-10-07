import React, { useState } from 'react';
import { CameraTrajectory } from '../types';

interface CameraTrajectoryVisualizerProps {
  onSelectTrajectory: (trajectory: CameraTrajectory, generatedPromptPart: string) => void;
  className?: string;
}

export const HOLLYWOOD_TRAJECTORIES: CameraTrajectory[] = [
  {
    id: 'orbit_360',
    name: 'Orbit 360° Circular',
    category: 'orbit',
    description: 'Camera quay một vòng 360 độ mượt mà xung quanh chủ thể với tiêu cự cố định, tạo cảm giác điện ảnh hùng tráng.',
    veoPromptFormula: 'Smooth 360-degree orbital camera rotation around the central subject, maintaining constant parallax, stabilized cinema rig',
    icon: '🔄',
    speed: 'medium'
  },
  {
    id: 'vertigo_dolly_zoom',
    name: 'Vertigo Dolly Zoom (Hitchcock)',
    category: 'special',
    description: 'Camera lùi về phía sau đồng thời zoom quang học vào phía trước, khiến hậu cảnh co giãn trong khi chủ thể giữ nguyên kích thước.',
    veoPromptFormula: 'Dramatic Vertigo effect (contra-zoom / dolly zoom), camera dollies backward while zooming in simultaneously, background warping with spatial distortion',
    icon: '🌀',
    speed: 'slow'
  },
  {
    id: 'crane_boom_down',
    name: 'Crane Jib Boom Down',
    category: 'boom',
    description: 'Hạ máy quay từ trên cao (high overhead angle) xuống ngang tầm mắt chủ thể (eye-level intimate close-up).',
    veoPromptFormula: 'Cinematic crane boom descent from high aerial vantage point down to intimate eye-level, smooth hydraulic jib crane motion',
    icon: '🏗️',
    speed: 'slow'
  },
  {
    id: 'fpv_drone_pursuit',
    name: 'FPV Drone Forward Pursuit',
    category: 'fpv',
    description: 'Máy quay bay lướt tốc độ cao bám sát chuyển động về phía trước, luồn lách qua các chướng ngại vật.',
    veoPromptFormula: 'High-speed FPV drone tracking shot, dynamic forward momentum, sweeping close through obstacles, acrobatic roll banking',
    icon: '🚀',
    speed: 'fast'
  },
  {
    id: 'dutch_angle_roll',
    name: 'Dutch Angle Roll & Tilt',
    category: 'pan_tilt',
    description: 'Nghiêng góc máy 25-45 độ tạo cảm giác căng thẳng, hồi hộp hoặc mất phương hướng nghệ thuật.',
    veoPromptFormula: 'Canted Dutch angle tilt rolling from 0 to 35 degrees off-axis, psychological tension framing, stabilized cinema gimbals',
    icon: '📐',
    speed: 'medium'
  },
  {
    id: 'whip_pan_snap',
    name: 'Whip Pan Snap & Reveal',
    category: 'pan_tilt',
    description: 'Quét lia máy thật nhanh với vệt mờ chuyển động (motion blur) rồi dừng lại khóa nét vào một chi tiết bất ngờ.',
    veoPromptFormula: 'Rapid kinetic whip pan with directional motion blur, snapping instantaneously into sharp focus on the secondary subject',
    icon: '⚡',
    speed: 'fast'
  }
];

export const CameraTrajectoryVisualizer: React.FC<CameraTrajectoryVisualizerProps> = ({
  onSelectTrajectory,
  className = ''
}) => {
  const [selectedTrajectory, setSelectedTrajectory] = useState<CameraTrajectory>(HOLLYWOOD_TRAJECTORIES[0]);
  const [speedModifier, setSpeedModifier] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [lensFocal, setLensFocal] = useState<'24mm' | '35mm' | '50mm' | '85mm'>('35mm');

  const getFullFormula = (t: CameraTrajectory) => {
    return `${t.veoPromptFormula}, ${lensFocal} anamorphic cinema prime lens, ${speedModifier} camera velocity, 24fps motion cadence`;
  };

  const handleApply = (t: CameraTrajectory) => {
    setSelectedTrajectory(t);
    onSelectTrajectory(t, getFullFormula(t));
  };

  return (
    <div className={`glass-card p-6 rounded-3xl border border-white/10 bg-slate-950/80 space-y-5 shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xl shadow-inner">
            🎥
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>Interactive 3D Camera Trajectory Director</span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Veo 3 Engine
              </span>
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Chọn quỹ đạo máy quay điện ảnh kinh điển để tự động đồng bộ vào kịch bản video.
            </p>
          </div>
        </div>

        {/* Global Lens / Speed Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-[10px]">
            {(['slow', 'medium', 'fast'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSpeedModifier(s)}
                className={`px-2 py-1 rounded-lg uppercase font-bold transition-all ${
                  speedModifier === s ? 'bg-rose-500 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-[10px]">
            {(['24mm', '35mm', '50mm', '85mm'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLensFocal(l)}
                className={`px-2 py-1 rounded-lg uppercase font-bold transition-all ${
                  lensFocal === l ? 'bg-rose-500 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trajectories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {HOLLYWOOD_TRAJECTORIES.map((traj) => {
          const isSelected = selectedTrajectory.id === traj.id;
          return (
            <div
              key={traj.id}
              onClick={() => handleApply(traj)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                isSelected
                  ? 'bg-rose-500/15 border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{traj.icon}</span>
                    <h4 className="text-xs font-black text-white group-hover:text-rose-300 transition-colors">
                      {traj.name}
                    </h4>
                  </div>
                  {isSelected && (
                    <span className="text-[9px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-md">
                      ACTIVE
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-white/60 mt-2 leading-relaxed">
                  {traj.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                <span className="font-mono text-white/40 uppercase">{traj.category}</span>
                <span className="text-rose-400 font-bold group-hover:underline">
                  {isSelected ? 'Đã gán vào Veo 3 ✓' : 'Chọn quỹ đạo →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Trajectory Prompt Formula Output Bar */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider flex items-center gap-1.5">
            <span>🎬</span> Đoạn Lệnh Chuyển Động Camera Chuẩn Veo 3
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(getFullFormula(selectedTrajectory));
              alert('Đã sao chép prompt chuyển động máy quay!');
            }}
            className="text-[10px] text-white/60 hover:text-white uppercase font-bold underline"
          >
            Sao Chép
          </button>
        </div>
        <p className="font-mono text-xs text-white/80 whitespace-pre-wrap bg-black/30 p-2.5 rounded-xl border border-white/5">
          {getFullFormula(selectedTrajectory)}
        </p>
      </div>
    </div>
  );
};
