import React, { useState } from 'react';
import {
  generateTalkingActorDirectives,
  TALKING_EMOTIONS,
  TalkingActorParams,
  TalkingActorOutput
} from '../services/talkingActorService';

interface TalkingActorModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryImages?: string[];
  initialImageSrc?: string;
  onSendToVeo?: (prompt: string) => void;
}

export const TalkingActorModal: React.FC<TalkingActorModalProps> = ({
  isOpen,
  onClose,
  galleryImages = [],
  initialImageSrc,
  onSendToVeo
}) => {
  const [actorName, setActorName] = useState<string>('Diễn viên Cinematic');
  const [portraitSrc, setPortraitSrc] = useState<string>(initialImageSrc || '');
  const [dialogueText, setDialogueText] = useState<string>(
    'Chúng ta đang đứng trước kỷ nguyên mới của điện ảnh AI. Mọi giới hạn thị giác đều có thể được khai phóng.'
  );
  const [emotion, setEmotion] = useState<TalkingActorParams['emotion']>('confident');
  const [headMovement, setHeadMovement] = useState<TalkingActorParams['headMovement']>('subtle_nod');
  const [voicePacing, setVoicePacing] = useState<TalkingActorParams['voicePacing']>('natural_cadence');

  const [output, setOutput] = useState<TalkingActorOutput | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerateDirectives = () => {
    if (!dialogueText.trim()) {
      alert('Vui lòng nhập lời thoại cho nhân vật.');
      return;
    }

    const directives = generateTalkingActorDirectives({
      actorName,
      portraitImageSrc: portraitSrc,
      dialogueText,
      emotion,
      headMovement,
      voicePacing
    });

    setOutput(directives);
  };

  const handleCopyPrompt = () => {
    if (!output?.veoVideoPrompt) return;
    navigator.clipboard.writeText(output.veoVideoPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleDialogues = [
    'Chúng ta đang đứng trước kỷ nguyên mới của điện ảnh AI. Mọi giới hạn thị giác đều có thể được khai phóng.',
    'Thời gian không còn nhiều nữa. Hãy kích hoạt giao thức ngay bây giờ!',
    'Welcome to the dawn of generative hyper-realism. Watch closely as the world transforms.',
    'Tôi đã từng thấy những khoảnh khắc đẹp đẽ tan biến vào khoảng không của thời gian.'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900/90 border border-white/15 shadow-2xl shadow-rose-500/10 overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-orange-500/30 border border-rose-400/30 flex items-center justify-center text-rose-300 text-xl shadow-inner">
              🗣️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  One-Click Talking Character & Emotional Lip-Sync
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  Veo 3 Speech Physics
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Biến ảnh chân dung thành nhân vật nói chuyện biểu cảm, đồng bộ khẩu hình và ánh mắt theo Veo 3
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Actor & Dialogue Controls (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Actor Profile & Name */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/40 border border-white/10">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shrink-0 flex items-center justify-center">
                {portraitSrc ? (
                  <img src={portraitSrc} alt="Portrait" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-slate-500">👤</span>
                )}
                <label className="absolute inset-0 bg-black/40 hover:bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-[10px] text-white">
                  Đổi ảnh
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setPortraitSrc(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tên nhân vật / Vai diễn:
                </label>
                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="Ví dụ: Nữ cơ trưởng Elena, Samurai Kage..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            {/* Dialogue Input */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Kịch bản lời thoại (Dialogue Script)
                </label>
                <span className="text-[11px] text-slate-500">
                  {dialogueText.trim().split(/\s+/).filter(Boolean).length} từ
                </span>
              </div>
              <textarea
                rows={3}
                value={dialogueText}
                onChange={(e) => setDialogueText(e.target.value)}
                placeholder="Nhập câu thoại của nhân vật..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none leading-relaxed"
              />

              {/* Sample Dialogues Pills */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-[10px] text-slate-500 py-1">Gợi ý mẫu:</span>
                {sampleDialogues.map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => setDialogueText(sample)}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-400 hover:text-white transition-all max-w-[200px] truncate"
                    title={sample}
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion Presets */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/10 flex flex-col gap-2.5">
              <label className="text-xs font-semibold text-slate-300">
                Cảm xúc & Khí chất (Emotion & Vibe)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TALKING_EMOTIONS.map((emo) => (
                  <button
                    key={emo.id}
                    onClick={() => setEmotion(emo.id as any)}
                    className={`p-2 rounded-xl text-left border transition-all flex flex-col gap-1 ${
                      emotion === emo.id
                        ? 'bg-rose-500/20 border-rose-400 text-white shadow-md shadow-rose-500/10'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span>{emo.icon}</span>
                      <span className="truncate">{emo.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Movement & Pacing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/10 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300">
                  Chuyển động đầu & Ánh mắt
                </label>
                <select
                  value={headMovement}
                  onChange={(e) => setHeadMovement(e.target.value as any)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="subtle_nod">Gật đầu nhẹ tự nhiên (Subtle Nod)</option>
                  <option value="camera_stare">Nhìn thẳng sâu vào ống kính</option>
                  <option value="slow_turn">Quay chậm từ góc nghiêng</option>
                  <option value="expressive">Biểu cảm sống động & linh hoạt</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/10 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300">
                  Nhịp điệu phát âm (Pacing)
                </label>
                <select
                  value={voicePacing}
                  onChange={(e) => setVoicePacing(e.target.value as any)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="slow_thoughtful">Trầm lắng, suy tư (Chậm)</option>
                  <option value="natural_cadence">Đối thoại tự nhiên (Chuẩn)</option>
                  <option value="rapid_intense">Dồn dập, căng thẳng (Nhanh)</option>
                </select>
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateDirectives}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs shadow-xl shadow-rose-500/20 border border-rose-400/30 flex items-center justify-center gap-2 transition-all"
            >
              <span>🎬</span>
              <span>Tổng Hợp Chỉ Thị Khẩu Hình & Chuyển Động Veo 3</span>
            </button>

          </div>

          {/* Right Column: Output & Directives Display (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Gallery picker if available */}
            {galleryImages.length > 0 && !portraitSrc && (
              <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/10 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-400">Chọn chân dung từ thư viện:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {galleryImages.slice(0, 8).map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setPortraitSrc(src)}
                      className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-rose-400 transition-all"
                    >
                      <img src={src} alt="Pick" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {output ? (
              <div className="p-4 rounded-3xl bg-slate-950/80 border border-rose-500/30 flex flex-col gap-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <span>⚡</span> Veo 3 Motion Directive Ready
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                    ~{output.estimatedDurationSeconds}s video
                  </span>
                </div>

                {/* Video Prompt Result */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Veo 3 Visual Prompt (Cinematic Speech):
                  </span>
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono text-rose-200/90 leading-relaxed max-h-48 overflow-y-auto select-all">
                    {output.veoVideoPrompt}
                  </div>
                </div>

                {/* Cadence Specs */}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300 flex flex-col gap-1">
                  <span className="font-semibold text-slate-400">🎙️ Chỉ đạo âm thanh & khẩu hình:</span>
                  <p className="text-slate-300">{output.audioVoiceoverDirection}</p>
                  <p className="text-[10px] text-rose-300 font-mono mt-1">{output.phonemeCadenceSummary}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleCopyPrompt}
                    className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-medium flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span>{copied ? 'Đã sao chép prompt' : 'Sao chép Prompt Veo 3'}</span>
                  </button>

                  {onSendToVeo && (
                    <button
                      onClick={() => {
                        onSendToVeo(output.veoVideoPrompt);
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>🚀</span>
                      <span>Chuyển sang Tab Veo Studio</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-slate-950/40 border border-dashed border-white/10 text-slate-500">
                <span className="text-4xl mb-3">🗣️</span>
                <p className="text-xs text-slate-400 font-medium">Chưa có chỉ thị chuyển động</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-[240px]">
                  Nhập lời thoại và bấm nút tổng hợp để tạo prompt khẩu hình chuyên sâu cho Veo 3
                </p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
