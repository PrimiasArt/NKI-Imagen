import React, { useState } from 'react';
import { CharacterPersona } from '../types';
import { getCharacterPersonas, addPhotoToPersona } from '../services/consistencyService';

interface UploadCharacterChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  imagePreview: string | null;
  onUseForSessionOnly: () => void;
  onAddNewCharacter: () => void;
  onAddToExistingCharacter: (personaId: string) => void;
}

export const UploadCharacterChoiceModal: React.FC<UploadCharacterChoiceModalProps> = ({
  isOpen,
  onClose,
  imagePreview,
  onUseForSessionOnly,
  onAddNewCharacter,
  onAddToExistingCharacter
}) => {
  const [personas, setPersonas] = useState<CharacterPersona[]>([]);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  const [mode, setMode] = useState<'choices' | 'pick_existing'>('choices');

  React.useEffect(() => {
    if (isOpen) {
      const list = getCharacterPersonas();
      setPersonas(list);
      if (list.length > 0) {
        setSelectedExistingId(list[0].id);
      }
      setMode('choices');
    }
  }, [isOpen]);

  if (!isOpen || !imagePreview) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900/95 border border-white/20 rounded-[28px] shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-3xl overflow-hidden p-6 text-left space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with thumbnail */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/10">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/20 bg-slate-800 shadow-lg flex-shrink-0">
            <img src={imagePreview} alt="upload-preview" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📸</span>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Nhân Vật Mẫu Mới (Biometric Core)
              </h3>
            </div>
            <p className="text-[11px] text-white/60 mt-0.5">
              Bạn vừa tải lên một ảnh khuôn mặt mẫu. Bạn muốn xử lý ảnh này như thế nào?
            </p>
          </div>
        </div>

        {mode === 'choices' ? (
          /* 3 Choice Buttons */
          <div className="space-y-2.5">
            {/* 1. Dùng cho lần này */}
            <button
              type="button"
              onClick={onUseForSessionOnly}
              className="w-full p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 transition-all flex items-center gap-3.5 group text-left"
            >
              <span className="text-2xl p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                🎯
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Dùng cho lần này
                </div>
                <div className="text-[10px] text-white/50">
                  Chỉ áp dụng làm Biometric Core cho lượt tạo ảnh này, không lưu vào Kho Data.
                </div>
              </div>
            </button>

            {/* 2. Thêm Nhân Vật Mới Vào Kho */}
            <button
              type="button"
              onClick={onAddNewCharacter}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 hover:from-amber-500/20 hover:to-purple-500/20 border border-amber-500/30 hover:border-amber-400 transition-all flex items-center gap-3.5 group text-left shadow-sm"
            >
              <span className="text-2xl p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 group-hover:scale-110 transition-transform">
                👑
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-200 group-hover:text-amber-100 transition-colors">
                  ➕ Thêm Nhân vật Mới vào Kho Data
                </div>
                <div className="text-[10px] text-white/60">
                  Tạo hồ sơ model mới (quét AI diện mạo & vóc dáng) để dùng lại nhiều lần.
                </div>
              </div>
            </button>

            {/* 3. Thêm ảnh cho nhân vật có sẵn */}
            <button
              type="button"
              onClick={() => {
                if (personas.length === 0) {
                  onAddNewCharacter();
                } else {
                  setMode('pick_existing');
                }
              }}
              className="w-full p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-400/40 transition-all flex items-center gap-3.5 group text-left"
            >
              <span className="text-2xl p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform">
                🖼️
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                  Thêm ảnh vào Nhân vật có sẵn trong Kho
                </div>
                <div className="text-[10px] text-white/50">
                  Lưu vào album ảnh góc chụp khác của một người mẫu đã có trong danh sách.
                </div>
              </div>
            </button>
          </div>
        ) : (
          /* Pick existing character sub-view */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Chọn người mẫu nhận ảnh:</span>
              <button
                type="button"
                onClick={() => setMode('choices')}
                className="text-xs text-white/50 hover:text-white"
              >
                ← Quay lại
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
              {personas.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedExistingId(p.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    selectedExistingId === p.id
                      ? 'bg-purple-500/20 border-purple-400 text-white'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0">
                    {p.avatarImage ? (
                      <img src={p.avatarImage} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm">
                        {p.gender === 'Female' ? '👩' : '👨'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{p.name}</div>
                    <div className="text-[10px] text-white/40">{p.gender} • {p.ageRange}</div>
                  </div>
                  {selectedExistingId === p.id && (
                    <span className="text-purple-400 text-xs">✓</span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedExistingId) {
                  onAddToExistingCharacter(selectedExistingId);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all"
            >
              Xác Nhận Thêm Vào Model Này
            </button>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white py-1 px-3"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
