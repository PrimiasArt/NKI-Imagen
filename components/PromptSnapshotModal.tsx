import React, { useState, useEffect } from 'react';
import { ImagePromptJson, PromptSnapshot } from '../types';
import {
  getPromptSnapshots,
  savePromptSnapshot,
  deletePromptSnapshot,
  encodePromptToShareUrl,
  decodePromptFromShareHash
} from '../services/promptSnapshotService';

interface PromptSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: ImagePromptJson;
  currentPreviewImage?: string;
  onRestoreSnapshot: (prompt: ImagePromptJson) => void;
}

export const PromptSnapshotModal: React.FC<PromptSnapshotModalProps> = ({
  isOpen,
  onClose,
  currentPrompt,
  currentPreviewImage,
  onRestoreSnapshot
}) => {
  const [snapshots, setSnapshots] = useState<PromptSnapshot[]>([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSnapshots(getPromptSnapshots());
      setSnapshotName('');
      setShareUrl(null);
      setCopied(false);
      setImportText('');
      setImportNotice(null);
    }
  }, [isOpen]);

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const name = snapshotName.trim() || `Bản lưu ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const newSnap = savePromptSnapshot(name, currentPrompt, currentPreviewImage);
    setSnapshots(getPromptSnapshots());
    setSnapshotName('');
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Xóa bản lưu snapshot này?')) {
      const updated = deletePromptSnapshot(id);
      setSnapshots(updated);
    }
  };

  const handleShareCurrent = () => {
    const url = encodePromptToShareUrl(currentPrompt);
    setShareUrl(url);
  };

  const handleShareSnapshot = (snap: PromptSnapshot, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = encodePromptToShareUrl(snap.promptJson);
    setShareUrl(url);
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportPreset = () => {
    if (!importText.trim()) return;
    const parsed = decodePromptFromShareHash(importText);
    if (parsed) {
      onRestoreSnapshot(parsed);
      setImportNotice('✨ Đã nhập Preset thành công!');
      setTimeout(() => {
        setImportNotice(null);
        onClose();
      }, 1200);
    } else {
      setImportNotice('❌ Liên kết hoặc mã không hợp lệ!');
      setTimeout(() => setImportNotice(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl glass-card rounded-3xl border border-white/15 bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-xl">
              ⏳
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Prompt Time-Machine & Cloud Vault</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  Version Git-Style
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Lưu lại các mốc phát triển ý tưởng, chia sẻ qua link mã hóa và khôi phục trong 1-click.
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
          {/* Quick Create Snapshot Bar */}
          <form onSubmit={handleCreateSnapshot} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap sm:flex-nowrap gap-3 items-center">
            <input
              type="text"
              placeholder="Đặt tên mốc lưu (VD: V1 - Concept ban đầu, V2 - Ánh sáng Neon...)"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              className="flex-1 glass-input rounded-xl px-4 py-2.5 text-xs text-white border border-white/10 placeholder-white/30"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-1.5 flex-none"
            >
              <span>💾</span>
              <span>Lưu Mốc Hiện Tại</span>
            </button>
            <button
              type="button"
              onClick={handleShareCurrent}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 flex-none"
              title="Tạo link chia sẻ mã hóa của prompt hiện tại"
            >
              <span>🔗</span>
              <span>Chia Sẻ Link</span>
            </button>
          </form>

          {/* Share Modal Dialog if active */}
          {shareUrl && (
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-teal-300 tracking-wider flex items-center gap-1.5">
                  <span>🔗</span> Link Chia Sẻ 1-Click
                </span>
                <button
                  type="button"
                  onClick={() => setShareUrl(null)}
                  className="text-white/40 hover:text-white text-xs"
                >
                  Đóng
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 glass-input rounded-xl px-3 py-2 text-xs font-mono text-white/80 select-all border border-white/10"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-black text-xs uppercase rounded-xl transition-all shadow-md active:scale-95 flex-none"
                >
                  {copied ? 'Đã Chép ✓' : 'Sao Chép'}
                </button>
              </div>
              <p className="text-[10px] text-teal-200/70">
                * Bất kỳ ai mở link này trên NKI Studio sẽ tự động nạp cấu trúc 12 trường JSON của bạn vào generator.
              </p>
            </div>
          )}

          {/* Import Preset Bar */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-xs font-black uppercase text-white/50 tracking-wider block">
              Nhập Preset Từ Liên Kết Hoặc Mã Chia Sẻ:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Dán URL chia sẻ hoặc mã #preset=... vào đây..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="flex-1 glass-input rounded-xl px-3 py-2 text-xs text-white border border-white/10"
              />
              <button
                type="button"
                onClick={handleImportPreset}
                className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/40 rounded-xl text-xs font-bold uppercase transition-all flex-none"
              >
                Nhập Ngay
              </button>
            </div>
            {importNotice && (
              <span className="text-xs font-bold text-teal-300 block">{importNotice}</span>
            )}
          </div>

          {/* Snapshots List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white/40">
                Các Mốc Lịch Sử Đã Lưu ({snapshots.length})
              </span>
            </div>

            {snapshots.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-xs">
                Chưa có bản snapshot nào. Nhập tên và bấm "Lưu Mốc Hiện Tại" để ghi nhớ các phiên bản sáng tạo của bạn.
              </div>
            ) : (
              <div className="space-y-2.5">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {snap.previewImage ? (
                        <img
                          src={snap.previewImage}
                          alt="preview"
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-none"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg flex-none text-white/40">
                          📜
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-black text-white truncate group-hover:text-teal-300 transition-colors">
                          {snap.name}
                        </h4>
                        <p className="text-[10px] text-white/40 truncate mt-0.5">
                          {snap.promptJson.subject || 'Không có chủ thể'}
                        </p>
                        <span className="text-[9px] font-mono text-white/30">
                          {new Date(snap.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-none">
                      <button
                        type="button"
                        onClick={(e) => handleShareSnapshot(snap, e)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white text-[10px] font-bold uppercase transition-all"
                        title="Tạo link chia sẻ"
                      >
                        🔗 Link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreSnapshot(snap.promptJson);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                      >
                        Khôi Phục ↶
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                        className="p-1.5 text-white/20 hover:text-rose-400 transition-colors"
                        title="Xóa mốc này"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>* Hệ thống tự động ghi nhớ tối đa 50 mốc snapshot an toàn trên trình duyệt.</span>
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
