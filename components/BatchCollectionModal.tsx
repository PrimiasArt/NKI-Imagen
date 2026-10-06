import React, { useState } from 'react';
import { Collection, GalleryItem } from '../types';
import { useTranslation } from '../services/i18nService';

interface BatchCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  collections: Collection[];
  galleryItems: GalleryItem[];
  onMoveToCollection: (collectionId: string | undefined) => void;
  onCreateAndMove: (name: string, autoSync: boolean) => void;
}

export const BatchCollectionModal: React.FC<BatchCollectionModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  collections,
  galleryItems,
  onMoveToCollection,
  onCreateAndMove,
}) => {
  const { t } = useTranslation();
  const [newColName, setNewColName] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    onCreateAndMove(newColName.trim(), autoSync);
    setNewColName('');
    setIsCreating(false);
    onClose();
  };

  const getCollectionItemCount = (colId: string) => {
    return galleryItems.filter(item => item.collectionId === colId).length;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xl p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="vision-modal w-full max-w-lg overflow-hidden p-6 sm:p-7 space-y-6 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-lg shadow-[0_0_12px_rgba(var(--primary-500-rgb),0.2)]">
              📁
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('collection.title', 'Gom vào Bộ Sưu Tập')}</h3>
              <p className="text-xs text-white/50">
                {t('collection.selectedCount', 'Đang chọn')} <strong className="text-primary-400 font-bold">{selectedCount}</strong> {t('collection.photos', 'ảnh')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all flex items-center justify-center border border-white/10"
            title={t('common.close', 'Đóng')}
          >
            ✕
          </button>
        </div>

        {/* Existing Collections List */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
            {t('collection.selectExisting', 'Chọn Bộ Sưu Tập Có Sẵn:')}
          </label>
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {collections.map(col => {
              const count = getCollectionItemCount(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    onMoveToCollection(col.id);
                    onClose();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-500/40 text-left flex items-center justify-between transition-all group active:scale-[0.99] backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">📂</span>
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors block">
                        {col.name}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {count} {t('collection.existingPhotos', 'ảnh hiện có')} {col.autoSync ? `• ${t('collection.driveSynced', 'Đồng bộ Drive')}` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {t('collection.moveToHere', 'Gom vào đây →')}
                  </span>
                </button>
              );
            })}

            {collections.length === 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-white/40 backdrop-blur-md">
                {t('collection.empty', 'Chưa có album nào. Tạo album mới bên dưới!')}
              </div>
            )}
          </div>
        </div>

        {/* Create New Collection Inline */}
        {!isCreating ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="flex-1 py-3 px-4 rounded-2xl bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-primary-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.15)] active:scale-95"
            >
              <span>{t('collection.createNewBtn', '➕ Tạo Album mới & Gom vào')}</span>
            </button>
            <button
              onClick={() => {
                onMoveToCollection(undefined);
                onClose();
              }}
              className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold text-xs transition-all active:scale-95"
              title={t('collection.removeFromAlbum', 'Bỏ khỏi Album')}
            >
              {t('collection.removeFromAlbum', 'Bỏ khỏi Album')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in duration-200 backdrop-blur-xl">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary-400 block">
              {t('collection.nameLabel', 'Tên Bộ Sưu Tập Mới:')}
            </label>
            <input 
              type="text"
              autoFocus
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder={t('collection.namePlaceholder', 'VD: Chân dung Cyberpunk, Lookbook Mùa Thu...')}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/20 text-white text-xs font-medium outline-none focus:border-primary-500 transition-all placeholder:text-white/20"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded text-primary-500 accent-primary-500"
                />
                {t('collection.autoSync', 'Tự động đồng bộ thư mục Google Drive')}
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={!newColName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-black font-black text-xs transition-all active:scale-95 shadow-md shadow-primary-500/20"
              >
                {t('collection.submitCreate', 'Tạo Album & Gom')} {selectedCount} {t('collection.photos', 'Ảnh')}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95 border border-white/10"
              >
                {t('common.cancel', 'Hủy')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
