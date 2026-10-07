import React, { useState, useEffect, useRef } from 'react';
import { ImagePromptJson } from '../types';
import {
  isSpeechRecognitionSupported,
  executeVoiceDirectorCommand,
  VoiceDirectorResult
} from '../services/voiceDirectorService';

interface VoiceDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: ImagePromptJson;
  onApplyPrompt: (updatedPrompt: ImagePromptJson) => void;
}

export const VoiceDirectorModal: React.FC<VoiceDirectorModalProps> = ({
  isOpen,
  onClose,
  currentPrompt,
  onApplyPrompt
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<VoiceDirectorResult | null>(null);
  const [language, setLanguage] = useState<'vi-VN' | 'en-US'>('vi-VN');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setTranscript('');
      setResult(null);
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói trực tiếp. Hãy dùng Chrome, Edge hoặc nhập văn bản bên dưới.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleExecuteVoice = async () => {
    if (!transcript.trim()) return;
    try {
      setIsProcessing(true);
      const res = await executeVoiceDirectorCommand(transcript, currentPrompt, language);
      setResult(res);
      onApplyPrompt(res.updatedJson);
    } catch (e: any) {
      alert('Lỗi xử lý giọng nói: ' + (e.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-card rounded-3xl border border-white/15 bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xl shadow-inner">
              🎙️
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>AI Voice Director (Chỉ Đạo Bằng Giọng Nói)</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Multimodal Speech
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Nói yêu cầu chỉnh sửa bằng giọng nói tự nhiên, AI sẽ tự định vị và cập nhật đúng trường JSON.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Language Selector */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40 uppercase font-black tracking-wider text-[10px]">
              Ngôn Ngữ Nhận Diện:
            </span>
            <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setLanguage('vi-VN')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  language === 'vi-VN' ? 'bg-rose-500 text-white shadow-md' : 'text-white/50 hover:text-white'
                }`}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en-US')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  language === 'en-US' ? 'bg-rose-500 text-white shadow-md' : 'text-white/50 hover:text-white'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>

          {/* Central Microphone Button with Pulse Animation */}
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <button
              type="button"
              onClick={toggleListening}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl transition-all shadow-2xl relative ${
                isListening
                  ? 'bg-rose-600 text-white shadow-[0_0_40px_rgba(244,63,94,0.6)] scale-105 animate-pulse'
                  : 'bg-white/10 hover:bg-rose-500/20 text-white border border-white/20 hover:border-rose-500/50'
              }`}
            >
              <span>{isListening ? '🛑' : '🎙️'}</span>
              {isListening && (
                <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-75" />
              )}
            </button>

            <span className="text-xs font-bold text-white/80">
              {isListening ? 'Đang lắng nghe chỉ đạo... Bấm để dừng.' : 'Bấm mic để nói câu lệnh chỉ đạo'}
            </span>
          </div>

          {/* Live Transcript Box */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
                Văn Bản Nhận Diện Được:
              </span>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="text-[10px] text-white/40 hover:text-white"
                >
                  Xóa
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="VD: 'Đổi góc máy thành low-angle 35mm, thêm mưa đêm, và ánh đèn neon phản chiếu trên mặt đường ướt'..."
              className="w-full glass-input rounded-2xl p-4 text-xs font-medium text-white border border-white/10 shadow-inner resize-none placeholder:text-white/30"
            />
          </div>

          {/* Action Trigger */}
          <button
            type="button"
            onClick={handleExecuteVoice}
            disabled={isProcessing || !transcript.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <span>{isProcessing ? '⏳' : '⚡'}</span>
            <span>{isProcessing ? 'Đang phân tích và điều chỉnh JSON...' : 'Thực Thi Chỉ Đạo Voice (AI Update)'}</span>
          </button>

          {/* Result Feedback Display */}
          {result && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-rose-300 tracking-wider flex items-center gap-1.5">
                  <span>✓</span> {result.explanation}
                </span>
                <span className="text-[10px] font-mono bg-rose-500/20 text-rose-200 px-2 py-0.5 rounded-full">
                  Đã đổi: {result.changedFields.join(', ')}
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-sans">
                Đã tự động tiêm các thông số mới vào Generator. Bạn có thể bấm "Tạo Ảnh" ngay lập tức!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>* Voice Director chỉ cập nhật những trường cần thiết và giữ nguyên 100% bối cảnh còn lại.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
