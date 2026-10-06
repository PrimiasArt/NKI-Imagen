import React, { useState, useRef } from 'react';
import { PersonalPreset, PresetCategory, ImagePromptJson } from '../types';

interface PersonalPresetManagerModalProps {
  presets: PersonalPreset[];
  onApply: (preset: PersonalPreset) => void;
  onDelete: (presetId: string) => void;
  onImport: (importedPresets: PersonalPreset[]) => void;
  onUpdatePreset?: (updated: PersonalPreset) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { id: PresetCategory; label: string; icon: string; badgeClass: string }[] = [
  { id: 'Character', label: 'Character', icon: '👤', badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'Art Style', label: 'Art Style', icon: '🎨', badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'Scene', label: 'Scene', icon: '🏙️', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'Custom', label: 'Custom', icon: '⚙️', badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
];

export const PersonalPresetManagerModal: React.FC<PersonalPresetManagerModalProps> = ({
  presets,
  onApply,
  onDelete,
  onImport,
  onUpdatePreset,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Category quick-dropdown state
  const [categoryDropdownId, setCategoryDropdownId] = useState<string | null>(null);

  // Full inline edit mode state
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<PresetCategory>('Custom');
  const [editDescription, setEditDescription] = useState('');

  // Status/Toast messages
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const filteredPresets = presets.filter(p => {
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesSearch = !search.trim() || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Export all presets
  const handleExportAll = () => {
    if (presets.length === 0) {
      showToast('No presets available to export.', 'info');
      return;
    }
    const exportData = {
      app: 'HLC Imagen',
      version: '4.2',
      exportDate: new Date().toISOString(),
      count: presets.length,
      presets
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hlc_imagen_presets_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Đã xuất ${presets.length} preset thành công sang tệp JSON!`, 'success');
  };

  // Export single preset
  const handleExportSingle = (preset: PersonalPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanFilename = preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'preset';
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(preset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `preset_${cleanFilename}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Đã xuất preset "${preset.name}"!`, 'success');
  };

  // Copy preset JSON to clipboard
  const handleCopyJson = (preset: PersonalPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(JSON.stringify(preset, null, 2));
      showToast(`Đã sao chép cấu hình JSON của "${preset.name}" vào clipboard!`, 'info');
    } catch {
      showToast('Không thể sao chép vào clipboard.', 'error');
    }
  };

  // Process imported JSON files
  const processImportText = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      let listToImport: any[] = [];

      if (Array.isArray(parsed)) {
        listToImport = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.presets)) {
          listToImport = parsed.presets;
        } else if (parsed.name && parsed.data) {
          listToImport = [parsed];
        } else if (parsed.subject || parsed.art_style) {
          // Direct ImagePromptJson imported! Wrap as a preset
          listToImport = [{
            id: `preset_imported_${Date.now()}`,
            name: parsed.subject ? (parsed.subject.slice(0, 30) + '...') : 'Imported Style',
            category: 'Custom' as PresetCategory,
            description: 'Imported raw JSON prompt',
            data: parsed,
            createdAt: Date.now()
          }];
        } else {
          throw new Error("Không tìm thấy cấu trúc preset hợp lệ trong tệp.");
        }
      }

      if (listToImport.length === 0) {
        showToast('Tệp JSON không chứa preset nào.', 'error');
        return;
      }

      // Sanitize and validate imported presets
      const validPresets: PersonalPreset[] = listToImport.map((p, idx) => {
        let cat: PresetCategory = 'Custom';
        if (['Character', 'Art Style', 'Scene', 'Custom', 'General'].includes(p.category)) {
          cat = p.category as PresetCategory;
        }
        return {
          id: p.id || `preset_imported_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          name: p.name ? String(p.name).trim() : `Imported Preset ${idx + 1}`,
          category: cat,
          description: p.description ? String(p.description) : '',
          data: (p.data && typeof p.data === 'object') ? p.data : {},
          createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now()
        };
      });

      onImport(validPresets);
      showToast(`Nhập thành công ${validPresets.length} preset vào thư viện!`, 'success');
    } catch (err: any) {
      console.error("Failed to import presets JSON:", err);
      showToast(`Lỗi nhập tệp: ${err.message || 'Tệp JSON không hợp lệ'}`, 'error');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      processImportText(event.target?.result as string);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files || []) as File[];
    const jsonFile = files.find(f => f.name.endsWith('.json') || f.type.includes('json'));
    if (!jsonFile) {
      showToast('Vui lòng kéo thả tệp định dạng .json', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      processImportText(event.target?.result as string);
    };
    reader.readAsText(jsonFile);
  };

  // Quick category update
  const handleQuickChangeCategory = (preset: PersonalPreset, newCategory: PresetCategory) => {
    if (preset.category === newCategory) {
      setCategoryDropdownId(null);
      return;
    }
    const updated: PersonalPreset = {
      ...preset,
      category: newCategory
    };
    if (onUpdatePreset) {
      onUpdatePreset(updated);
    }
    setCategoryDropdownId(null);
    showToast(`Đã chuyển phân loại sang "${newCategory}"`, 'success');
  };

  // Start editing preset
  const handleStartEdit = (preset: PersonalPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetId(preset.id);
    setEditName(preset.name);
    setEditCategory(preset.category || 'Custom');
    setEditDescription(preset.description || '');
    setCategoryDropdownId(null);
  };

  // Save edited preset
  const handleSaveEdit = (preset: PersonalPreset) => {
    if (!editName.trim()) {
      showToast('Tên preset không được để trống.', 'error');
      return;
    }
    const updated: PersonalPreset = {
      ...preset,
      name: editName.trim(),
      category: editCategory,
      description: editDescription.trim()
    };
    if (onUpdatePreset) {
      onUpdatePreset(updated);
    }
    setEditingPresetId(null);
    showToast(`Đã lưu cập nhật preset "${updated.name}"!`, 'success');
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`glass-card rounded-[2.5rem] max-w-3xl w-full p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] border transition-all flex flex-col max-h-[90vh] ${
        isDraggingOver ? 'border-primary-400 ring-4 ring-primary-500/20 scale-[1.01]' : 'border-white/10'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center text-xl font-bold">
              ⭐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Personal Preset Manager</h3>
                <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {presets.length} saved
                </span>
              </div>
              <p className="text-xs text-white/50">Quản lý, chỉnh sửa danh mục và chia sẻ tệp JSON cấu hình Prompt</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export All JSON */}
            <button
              onClick={handleExportAll}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-white/10 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Xuất tất cả presets sang tệp JSON để chia sẻ"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export JSON</span>
            </button>

            {/* Import JSON */}
            <label className="px-3.5 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-primary-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import JSON</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".json" 
                onChange={handleFileImport} 
                className="hidden" 
              />
            </label>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Drag Over Hint or Status Banner */}
        {isDraggingOver && (
          <div className="mb-4 p-3 bg-primary-500/20 border border-primary-500/40 rounded-2xl text-center text-xs font-bold text-primary-300 animate-pulse">
            📥 Thả tệp .json vào đây để nạp Presets ngay lập tức
          </div>
        )}

        {statusMessage && (
          <div className={`mb-4 p-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
              : statusMessage.type === 'error'
              ? 'bg-red-500/20 border border-red-500/40 text-red-300'
              : 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
          }`}>
            <div className="flex items-center gap-2">
              <span>{statusMessage.type === 'success' ? '✓' : statusMessage.type === 'error' ? '⚠️' : 'ℹ️'}</span>
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-white/40 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Search & Category Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-none">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm preset theo tên, từ khóa hoặc mô tả..."
              className="w-full glass-input rounded-xl pl-9 pr-4 py-2.5 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <svg className="w-4 h-4 text-white/30 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-primary-500 text-white shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.3)]'
                  : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
              }`}
            >
              All ({presets.length})
            </button>
            {CATEGORY_OPTIONS.map(cat => {
              const count = presets.filter(p => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    categoryFilter === cat.id
                      ? 'bg-white/20 text-white border border-white/30 shadow-inner'
                      : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className="text-[9px] opacity-60 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-white/5">
          {filteredPresets.length === 0 ? (
            <div className="text-center py-16 opacity-50 flex flex-col items-center">
              <span className="text-4xl block mb-2">⭐</span>
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Không tìm thấy Preset nào</p>
              <p className="text-[11px] text-white/40 mt-1 max-w-sm">
                Lưu cấu hình JSON đang mở trong bảng vẽ bằng nút "⭐ Save Preset" hoặc bấm "Import JSON" để nạp từ máy tính.
              </p>
            </div>
          ) : (
            filteredPresets.map(preset => {
              const isEditing = editingPresetId === preset.id;
              const isDeleting = deleteConfirmId === preset.id;
              const isDropdownOpen = categoryDropdownId === preset.id;
              const keys = Object.keys(preset.data).filter(k => (preset.data as any)[k]);
              
              const currentCatConfig = CATEGORY_OPTIONS.find(c => c.id === preset.category) || {
                id: preset.category,
                label: preset.category,
                icon: '⭐',
                badgeClass: 'bg-white/10 text-white/70 border-white/20'
              };

              return (
                <div 
                  key={preset.id} 
                  className="pt-3 first:pt-0 flex flex-col gap-3 p-4 rounded-2xl hover:bg-white/[0.03] transition-colors border border-white/[0.03] hover:border-white/10 relative"
                >
                  {isEditing ? (
                    /* In-place Edit Form */
                    <div className="space-y-3 bg-white/[0.04] p-4 rounded-xl border border-primary-500/30 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-primary-400 tracking-wider">
                          ✏️ Chỉnh sửa Preset
                        </span>
                        <button 
                          onClick={() => setEditingPresetId(null)}
                          className="text-white/40 hover:text-white text-xs"
                        >
                          Hủy
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1">
                            Tên Preset *
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1">
                            Phân loại (Category) *
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {CATEGORY_OPTIONS.map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setEditCategory(cat.id)}
                                className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border transition-all ${
                                  editCategory === cat.id
                                    ? 'bg-primary-500 text-white border-primary-400 shadow-sm'
                                    : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                                }`}
                              >
                                <span>{cat.icon}</span>
                                <span className="hidden sm:inline">{cat.id}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block mb-1">
                          Mô tả ngắn gọn
                        </label>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Thêm mô tả cho nhân vật hoặc phong cách này..."
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingPresetId(null)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSaveEdit(preset)}
                          className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                        >
                          Lưu thay đổi
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-black text-white tracking-wide">
                            {preset.name}
                          </span>

                          {/* Interactive Category Badge with Quick Switcher Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryDropdownId(isDropdownOpen ? null : preset.id);
                              }}
                              className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 hover:scale-105 active:scale-95 ${currentCatConfig.badgeClass}`}
                              title="Bấm để đổi phân loại (Category) trực tiếp"
                            >
                              <span>{currentCatConfig.icon}</span>
                              <span>{currentCatConfig.label}</span>
                              <span className="text-[7px] opacity-60">▼</span>
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                              <div 
                                className="absolute left-0 top-full mt-1.5 z-30 w-44 glass-card bg-zinc-950/95 border border-white/20 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="text-[8px] font-black uppercase tracking-widest text-white/40 px-2 py-1">
                                  Chọn phân loại mới:
                                </div>
                                {CATEGORY_OPTIONS.map(cat => (
                                  <button
                                    key={cat.id}
                                    onClick={() => handleQuickChangeCategory(preset, cat.id)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-colors ${
                                      preset.category === cat.id
                                        ? 'bg-primary-500 text-white'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                    {preset.category === cat.id && <span className="ml-auto text-xs">✓</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {preset.description && (
                          <p className="text-[11px] text-white/60 mb-2 leading-relaxed">
                            {preset.description}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-mono text-white/30">Fields:</span>
                          {keys.slice(0, 6).map(k => (
                            <span key={k} className="text-[9px] font-mono text-white/45 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                              {k}
                            </span>
                          ))}
                          {keys.length > 6 && (
                            <span className="text-[9px] text-white/30">+{keys.length - 6} more</span>
                          )}
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex items-center gap-1.5 flex-none w-full sm:w-auto justify-end flex-wrap">
                        {isDeleting ? (
                          <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 p-1 rounded-xl animate-in fade-in">
                            <span className="text-[9px] font-black text-red-300 px-2 uppercase">Xóa preset này?</span>
                            <button
                              onClick={() => { onDelete(preset.id); setDeleteConfirmId(null); showToast(`Đã xóa preset "${preset.name}".`, 'info'); }}
                              className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-[9px] font-black rounded-lg transition-colors"
                            >
                              Xóa
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold rounded-lg transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Load / Apply */}
                            <button
                              onClick={() => { onApply(preset); onClose(); }}
                              className="px-3.5 py-1.5 bg-primary-500/20 hover:bg-primary-500 text-primary-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-primary-500/30 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                              title="Áp dụng cấu hình preset này vào bảng vẽ"
                            >
                              <span>Apply</span>
                            </button>

                            {/* Edit Details */}
                            <button
                              onClick={(e) => handleStartEdit(preset, e)}
                              className="p-1.5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-colors border border-transparent hover:border-white/10"
                              title="Chỉnh sửa tên, phân loại và mô tả"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Single Export JSON */}
                            <button
                              onClick={(e) => handleExportSingle(preset, e)}
                              className="p-1.5 hover:bg-white/10 text-white/50 hover:text-amber-400 rounded-xl transition-colors border border-transparent hover:border-white/10"
                              title="Tải về tệp JSON của preset này"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>

                            {/* Copy JSON to Clipboard */}
                            <button
                              onClick={(e) => handleCopyJson(preset, e)}
                              className="p-1.5 hover:bg-white/10 text-white/50 hover:text-primary-400 rounded-xl transition-colors border border-transparent hover:border-white/10"
                              title="Sao chép JSON vào clipboard"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>

                            {/* Delete Preset */}
                            <button
                              onClick={() => setDeleteConfirmId(preset.id)}
                              className="p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
                              title="Xóa preset này"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
