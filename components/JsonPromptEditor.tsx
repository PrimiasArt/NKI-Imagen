import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  PromptTag, 
  TagCategory, 
  CATEGORY_META, 
  detectJsonContext, 
  getSuggestedTags, 
  COMMON_PROMPT_TAGS 
} from '../services/promptTags';
import { 
  PromptHistoryItem, 
  getRecentPromptGenerations 
} from '../services/promptHistoryService';

interface JsonPromptEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
}

export const JsonPromptEditor: React.FC<JsonPromptEditorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);

  const [cursorPos, setCursorPos] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<TagCategory | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<TagCategory | 'all'>('all');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [suggestedTags, setSuggestedTags] = useState<PromptTag[]>([]);

  // Generation History State (Last 5 successful generations)
  const [historyItems, setHistoryItems] = useState<PromptHistoryItem[]>(() => getRecentPromptGenerations());
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number>(-1);
  const [showHistoryMenu, setShowHistoryMenu] = useState<boolean>(false);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);

  // Sync history on mount and on custom events
  useEffect(() => {
    const handleHistoryUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setHistoryItems(e.detail);
      } else {
        setHistoryItems(getRecentPromptGenerations());
      }
    };

    window.addEventListener('hlc_prompt_history_updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('hlc_prompt_history_updated', handleHistoryUpdate);
    };
  }, []);

  // Update suggestions based on cursor & typing
  const updateSuggestions = useCallback((text: string, cursor: number, manualFilter?: TagCategory | 'all') => {
    const ctx = detectJsonContext(text, cursor);
    setActiveCategory(ctx.activeCategory);
    setActiveField(ctx.activeField);
    setQuery(ctx.query);

    const effectiveFilter = manualFilter !== undefined ? manualFilter : (ctx.activeCategory || 'all');
    setFilterCategory(effectiveFilter);

    const tags = getSuggestedTags(ctx.query, ctx.activeCategory, effectiveFilter);
    setSuggestedTags(tags);
    setSelectedIndex(0);

    // Auto-open dropdown if query is >= 1 char or if cursor is inside a known category field value
    if (ctx.query.length >= 1 || (ctx.isInValueString && ctx.activeCategory)) {
      setShowDropdown(tags.length > 0);
    }
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const newCursor = e.target.selectionStart || 0;
    setCursorPos(newCursor);
    onChange(newVal);
    updateSuggestions(newVal, newCursor);
    setActiveHistoryIndex(-1); // Reset active index when manually edited
  };

  const handleSelectionOrCursorChange = () => {
    if (!textareaRef.current) return;
    const cur = textareaRef.current.selectionStart || 0;
    setCursorPos(cur);
    const ctx = detectJsonContext(value, cur);
    setActiveCategory(ctx.activeCategory);
    setActiveField(ctx.activeField);
    setQuery(ctx.query);
  };

  const insertTag = (tag: PromptTag) => {
    if (!textareaRef.current) return;

    const cur = textareaRef.current.selectionStart || cursorPos;
    const ctx = detectJsonContext(value, cur);

    let newVal = value;
    let newCursor = cur;

    if (ctx.isInValueString) {
      // Replace the current query token in the value string
      const beforePrefix = value.slice(0, ctx.prefixStart);
      const afterPrefix = value.slice(ctx.prefixEnd);

      const needsLeadingComma = ctx.prefixStart > 0 && 
        beforePrefix.trim().length > 0 && 
        !beforePrefix.trimEnd().endsWith(',') && 
        !beforePrefix.trimEnd().endsWith('"') && 
        !beforePrefix.trimEnd().endsWith(':');

      const insertion = (needsLeadingComma ? ', ' : '') + tag.name;
      newVal = beforePrefix + insertion + afterPrefix;
      newCursor = ctx.prefixStart + insertion.length;
    } else {
      try {
        const parsed = JSON.parse(value);
        const targetField = tag.category === 'lighting' ? 'lighting'
          : tag.category === 'art_style' ? 'art_style'
          : tag.category === 'texture' ? 'texture'
          : tag.category === 'composition' ? 'composition'
          : 'mood';

        if (parsed[targetField] !== undefined) {
          const currentVal = String(parsed[targetField] || '');
          parsed[targetField] = currentVal ? `${currentVal}, ${tag.name}` : tag.name;
          newVal = JSON.stringify(parsed, null, 2);
        }
      } catch {
        newVal = value + `\n// Added tag: ${tag.name}`;
      }
    }

    onChange(newVal);
    setShowDropdown(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || suggestedTags.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestedTags.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestedTags.length) % suggestedTags.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestedTags[selectedIndex]) {
        e.preventDefault();
        insertTag(suggestedTags[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        historyMenuRef.current && 
        !historyMenuRef.current.contains(e.target as Node)
      ) {
        setShowHistoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCategoryChipClick = (cat: TagCategory) => {
    setFilterCategory(cat);
    const tags = getSuggestedTags('', cat, cat);
    setSuggestedTags(tags);
    setSelectedIndex(0);
    setShowDropdown(true);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Cycling through previous 5 successful prompt generations
  const handleApplyHistory = (index: number) => {
    if (index < 0 || index >= historyItems.length) return;
    const item = historyItems[index];
    setActiveHistoryIndex(index);
    onChange(item.jsonString);
    setShowHistoryMenu(false);

    setHistoryNotice(`Đã nạp bản tạo #${index + 1}: ${item.subjectPreview}`);
    setTimeout(() => {
      setHistoryNotice(null);
    }, 3500);

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleCyclePrev = () => {
    if (historyItems.length === 0) return;
    const nextIdx = activeHistoryIndex === -1 ? 0 : Math.min(historyItems.length - 1, activeHistoryIndex + 1);
    handleApplyHistory(nextIdx);
  };

  const handleCycleNext = () => {
    if (historyItems.length === 0) return;
    const nextIdx = activeHistoryIndex <= 0 ? 0 : activeHistoryIndex - 1;
    handleApplyHistory(nextIdx);
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return `${diffSec}s trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}p trước`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour}h trước`;
  };

  return (
    <div className="relative w-full space-y-1.5">
      {/* 5 Recent Generations Quick Cycle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 rounded-xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[9px] font-black text-amber-400 uppercase tracking-wider pl-1">
            <span>⚡</span>
            <span>Lịch sử 5 lần:</span>
          </div>

          {historyItems.length === 0 ? (
            <span className="text-[10px] text-white/40 italic">
              (Chưa có lần tạo ảnh nào - lịch sử sẽ tự lưu khi tạo thành công)
            </span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Quick Cycle Backward */}
              <button
                type="button"
                onClick={handleCyclePrev}
                disabled={activeHistoryIndex >= historyItems.length - 1}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white/80 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider border border-white/5 flex items-center gap-1 transition-all active:scale-95"
                title="Lùi về cấu hình prompt lần tạo trước đó"
              >
                <span>◀ Cũ hơn</span>
              </button>

              {/* Numbered Pills 1 to 5 */}
              {historyItems.map((item, idx) => {
                const isActive = activeHistoryIndex === idx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleApplyHistory(idx)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold transition-all border flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-105' 
                        : 'bg-white/5 text-white/70 border-white/10 hover:border-amber-400/40 hover:text-white'
                    }`}
                    title={`#${idx + 1} (${formatRelativeTime(item.timestamp)}): ${item.subjectPreview}`}
                  >
                    <span className="font-sans font-black">#{idx + 1}</span>
                    <span className="text-[8px] opacity-70 hidden sm:inline truncate max-w-[80px]">
                      {item.subjectPreview}
                    </span>
                  </button>
                );
              })}

              {/* Quick Cycle Forward */}
              <button
                type="button"
                onClick={handleCycleNext}
                disabled={activeHistoryIndex <= 0}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white/80 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider border border-white/5 flex items-center gap-1 transition-all active:scale-95"
                title="Tiến tới cấu hình prompt lần tạo mới hơn"
              >
                <span>Mới hơn ▶</span>
              </button>
            </div>
          )}
        </div>

        {/* Dropdown Menu Toggle for Full History view */}
        {historyItems.length > 0 && (
          <div className="relative" ref={historyMenuRef}>
            <button
              type="button"
              onClick={() => setShowHistoryMenu(!showHistoryMenu)}
              className="text-[9px] font-black uppercase tracking-wider text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition-colors"
            >
              <span>Xem chi tiết 5 bản</span>
              <svg className={`w-3 h-3 transition-transform ${showHistoryMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showHistoryMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-84 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                <div className="px-2 py-1.5 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
                    5 Cấu hình tạo gần nhất
                  </span>
                  <span className="text-[9px] text-white/40">Bấm để tải lại</span>
                </div>
                <div className="space-y-1 pt-1 max-h-60 overflow-y-auto">
                  {historyItems.map((hist, idx) => (
                    <button
                      key={hist.id}
                      type="button"
                      onClick={() => handleApplyHistory(idx)}
                      className={`w-full text-left p-2 rounded-xl transition-all border flex items-start gap-2 ${
                        activeHistoryIndex === idx 
                          ? 'bg-amber-500/20 border-amber-500/40 text-white' 
                          : 'bg-white/[0.02] border-transparent hover:bg-white/5 text-white/80'
                      }`}
                    >
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 flex-none mt-0.5">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-bold text-white truncate">
                            {hist.subjectPreview}
                          </span>
                          <span className="text-[8px] text-white/40 font-mono flex-none">
                            {formatRelativeTime(hist.timestamp)}
                          </span>
                        </div>
                        <p className="text-[8px] text-white/40 font-mono truncate">
                          {hist.jsonString.slice(0, 60)}...
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Flash Notification Notice */}
      {historyNotice && (
        <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-[10px] font-bold text-amber-200 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <span>{historyNotice}</span>
          </div>
          <span className="text-[9px] text-amber-300/80 font-mono">Đã khôi phục</span>
        </div>
      )}

      {/* Category Suggestions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mr-1 flex items-center gap-1">
            <svg className="w-3 h-3 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Prompt Tags:
          </span>
          {(['lighting', 'art_style', 'texture', 'composition', 'mood'] as TagCategory[]).map(cat => {
            const meta = CATEGORY_META[cat];
            const isFieldActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChipClick(cat)}
                className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  isFieldActive 
                    ? `${meta.bg} ${meta.color} ${meta.border} shadow-[0_0_10px_rgba(255,255,255,0.05)] scale-105`
                    : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20 hover:text-white'
                }`}
                title={`Browse ${meta.label} suggestions`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current Active Field Context Pill */}
        {activeField && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>field: <strong className="text-white/80">{activeField}</strong></span>
          </div>
        )}
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onSelect={handleSelectionOrCursorChange}
          onClick={handleSelectionOrCursorChange}
          onKeyUp={handleSelectionOrCursorChange}
          onKeyDown={handleKeyDown}
          placeholder="Paste or type your Image Prompt JSON structure..."
          className={`w-full h-56 min-h-[180px] glass-input rounded-2xl p-4 font-mono text-xs leading-relaxed shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all resize-y ${className}`}
          spellCheck={false}
        />

        {/* Floating Autocomplete Dropdown */}
        {showDropdown && suggestedTags.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 left-6 right-6 bottom-4 sm:right-auto sm:w-[420px] bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {/* Dropdown Header / Category Tabs */}
            <div className="p-2.5 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory('all');
                    setSuggestedTags(getSuggestedTags(query, activeCategory, 'all'));
                  }}
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md transition-all ${
                    filterCategory === 'all' 
                      ? 'bg-primary-500 text-white' 
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  All
                </button>
                {(['lighting', 'art_style', 'texture', 'composition', 'mood'] as TagCategory[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setFilterCategory(cat);
                      setSuggestedTags(getSuggestedTags(query, cat, cat));
                    }}
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                      filterCategory === cat
                        ? `${CATEGORY_META[cat].bg} ${CATEGORY_META[cat].color} border ${CATEGORY_META[cat].border}`
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <span>{CATEGORY_META[cat].icon}</span>
                    <span>{CATEGORY_META[cat].label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowDropdown(false)}
                className="text-white/40 hover:text-white text-xs px-1.5 py-0.5 rounded transition-colors"
                title="Close suggestions"
              >
                ✕
              </button>
            </div>

            {/* Suggestions List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-white/5 p-1">
              {suggestedTags.map((tag, idx) => {
                const isSelected = idx === selectedIndex;
                const meta = CATEGORY_META[tag.category];
                return (
                  <div
                    key={tag.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => insertTag(tag)}
                    className={`px-3 py-2 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected 
                        ? 'bg-primary-500/20 border border-primary-500/30' 
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white tracking-wide truncate">
                          {tag.name}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color} ${meta.border}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/50 truncate">
                        {tag.description}
                      </p>
                    </div>

                    <span className="text-[9px] text-white/30 font-mono mt-0.5 flex-none hidden sm:inline">
                      {isSelected ? '↵ Enter' : '+ Add'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Helper footer */}
            <div className="px-3 py-1.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] text-white/30">
              <span>Use <kbd className="bg-white/10 px-1 py-0.5 rounded text-white/60">↑</kbd> <kbd className="bg-white/10 px-1 py-0.5 rounded text-white/60">↓</kbd> to navigate, <kbd className="bg-white/10 px-1 py-0.5 rounded text-white/60">Enter</kbd> to insert</span>
              <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-white/60">Esc</kbd> to close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
