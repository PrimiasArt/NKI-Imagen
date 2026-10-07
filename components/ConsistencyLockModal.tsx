import React, { useState, useEffect } from 'react';
import { CharacterPersona } from '../types';
import {
  getCharacterPersonas,
  saveCharacterPersona,
  deleteCharacterPersona,
  getActivePersonaId,
  setActivePersonaId,
  isConsistencyLockEnabled,
  setConsistencyLockEnabled
} from '../services/consistencyService';

interface ConsistencyLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPersona: (persona: CharacterPersona) => void;
}

export const ConsistencyLockModal: React.FC<ConsistencyLockModalProps> = ({
  isOpen,
  onClose,
  onApplyPersona
}) => {
  const [personas, setPersonas] = useState<CharacterPersona[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lockEnabled, setLockEnabled] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form State for new Persona
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Female');
  const [ageRange, setAgeRange] = useState('Mid 20s');
  const [faceFeatures, setFaceFeatures] = useState('');
  const [hairStyle, setHairStyle] = useState('');
  const [signatureOutfit, setSignatureOutfit] = useState('');
  const [colorPalette, setColorPalette] = useState('');
  const [seed, setSeed] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPersonas(getCharacterPersonas());
      setActiveId(getActivePersonaId());
      setLockEnabled(isConsistencyLockEnabled());
      setIsCreating(false);
    }
  }, [isOpen]);

  const handleToggleLock = () => {
    const nextState = !lockEnabled;
    setLockEnabled(nextState);
    setConsistencyLockEnabled(nextState);
  };

  const handleSelectPersona = (p: CharacterPersona) => {
    setActiveId(p.id);
    setActivePersonaId(p.id);
    setLockEnabled(true);
    setConsistencyLockEnabled(true);
    onApplyPersona(p);
  };

  const handleDeletePersona = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa nhân vật này khỏi danh bạ nhất quán?')) {
      const updated = deleteCharacterPersona(id);
      setPersonas(updated);
      if (activeId === id) setActiveId(null);
    }
  };

  const handleSaveNewPersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPersona: CharacterPersona = {
      id: `persona_${Date.now()}`,
      name: name.trim(),
      gender,
      ageRange,
      faceFeatures: faceFeatures.trim(),
      hairStyle: hairStyle.trim(),
      signatureOutfit: signatureOutfit.trim(),
      colorPalette: colorPalette.trim(),
      seed: seed ? parseInt(seed, 10) : Math.floor(Math.random() * 9000000) + 1000000,
      createdAt: Date.now(),
      isActive: true
    };

    const updated = saveCharacterPersona(newPersona);
    setPersonas(updated);
    setActiveId(newPersona.id);
    setActivePersonaId(newPersona.id);
    setLockEnabled(true);
    setConsistencyLockEnabled(true);
    onApplyPersona(newPersona);
    setIsCreating(false);

    // Reset Form
    setName('');
    setFaceFeatures('');
    setHairStyle('');
    setSignatureOutfit('');
    setColorPalette('');
    setSeed('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-card rounded-3xl border border-white/15 bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
              🔒
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Character & Style Consistency Lock</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Actor DNA
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Cố định nhân diện khuôn mặt, trang phục và phong cách qua nhiều khung hình & cảnh phim.
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

        {/* Master Switch Bar */}
        <div className="px-6 py-3.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${lockEnabled ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse' : 'bg-white/20'}`} />
            <span className="text-xs font-bold text-white">
              {lockEnabled ? 'Đang BẬT khóa nhất quán nhân vật' : 'Đang TẮT khóa nhất quán'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleLock}
            className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
              lockEnabled
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
                : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/20'
            }`}
          >
            {lockEnabled ? 'Bật (Active)' : 'Tắt (Disabled)'}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {!isCreating ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white/40">
                  Danh Bạ Nhân Vật Đã Lưu ({personas.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/40 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>＋</span>
                  <span>Tạo Nhân Vật Mới</span>
                </button>
              </div>

              {/* Persona Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personas.map((p) => {
                  const isSelected = activeId === p.id && lockEnabled;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPersona(p)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-lg font-black text-white/80">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white flex items-center gap-2">
                                <span>{p.name}</span>
                                {isSelected && (
                                  <span className="text-[9px] bg-amber-500 text-black font-black px-1.5 py-0.2 rounded-md">
                                    LOCKED
                                  </span>
                                )}
                              </h4>
                              <span className="text-[10px] text-white/50">
                                {p.gender} • {p.ageRange}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePersona(p.id, e)}
                            className="text-white/20 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa nhân vật"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="mt-3 space-y-1 text-[11px] text-white/70">
                          <p className="line-clamp-2">
                            <strong className="text-white/40">Gương mặt:</strong> {p.faceFeatures || 'Tự nhiên'}
                          </p>
                          <p className="line-clamp-1">
                            <strong className="text-white/40">Tóc:</strong> {p.hairStyle || 'Tiêu chuẩn'}
                          </p>
                          <p className="line-clamp-1">
                            <strong className="text-white/40">Trang phục:</strong> {p.signatureOutfit || 'Đặc trưng'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-white/40">Seed: #{p.seed}</span>
                        <span className="text-primary-400 font-bold group-hover:underline">
                          {isSelected ? 'Đang khóa ✓' : 'Chọn nhân vật →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSaveNewPersona} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Khởi Tạo Hồ Sơ Diễn Viên Mới (Actor Profile)
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-white/50 hover:text-white"
                >
                  ← Quay lại danh sách
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-white/50 block mb-1">
                    Tên nhân vật *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Maya Lin, Marcus Cross..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white border border-white/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Giới tính</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full glass-input rounded-xl px-2.5 py-2 text-xs text-white bg-slate-900 border border-white/10"
                    >
                      <option value="Female">Nữ (Female)</option>
                      <option value="Male">Nam (Male)</option>
                      <option value="Non-binary">Phi nhị nguyên</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Độ tuổi</label>
                    <input
                      type="text"
                      placeholder="VD: Mid 20s"
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value)}
                      className="w-full glass-input rounded-xl px-2.5 py-2 text-xs text-white border border-white/10"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-white/50 block mb-1">
                    Đặc điểm khuôn mặt chi tiết (Face Features)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Sharp jawline, piercing emerald eyes, faint scar across bridge of nose, high cheekbones..."
                    value={faceFeatures}
                    onChange={(e) => setFaceFeatures(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-white border border-white/10 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Kiểu & màu tóc (Hair)</label>
                  <input
                    type="text"
                    placeholder="VD: Platinum blonde wavy bob with dark roots"
                    value={hairStyle}
                    onChange={(e) => setHairStyle(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white border border-white/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Trang phục thương hiệu (Signature Outfit)</label>
                  <input
                    type="text"
                    placeholder="VD: Tailored dark navy linen trenchcoat with silver cuffs"
                    value={signatureOutfit}
                    onChange={(e) => setSignatureOutfit(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white border border-white/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Bảng màu gắn liền (Palette)</label>
                  <input
                    type="text"
                    placeholder="VD: Warm terracotta, deep charcoal, muted amber"
                    value={colorPalette}
                    onChange={(e) => setColorPalette(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white border border-white/10"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Identity Seed (Khóa số ngẫu nhiên)</label>
                  <input
                    type="number"
                    placeholder="Tùy chọn (để trống sẽ tự sinh)"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white border border-white/10"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white/70 hover:text-white text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95"
                >
                  Lưu & Khóa Nhân Vật
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>* Các thông số nhân vật sẽ tự động đồng bộ vào Prompt Generator khi bật Khóa.</span>
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
