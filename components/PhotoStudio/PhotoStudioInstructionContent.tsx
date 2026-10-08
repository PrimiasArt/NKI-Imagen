import React, { useState, useMemo } from 'react';
import {
  INSTRUCTION_CATEGORIES,
  INSTRUCTIONS_DATA,
  InstructionItem
} from '../../services/photoStudioInstructionData';

interface PhotoStudioInstructionContentProps {
  onActivateTool?: (tool: string) => void;
  onActivateTab?: (tab: string) => void;
  compact?: boolean;
}

export const PhotoStudioInstructionContent: React.FC<PhotoStudioInstructionContentProps> = ({
  onActivateTool,
  onActivateTab,
  compact = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string>('qs_standard_workflow');

  // Filter items by category and search term
  const filteredItems = useMemo(() => {
    return INSTRUCTIONS_DATA.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchShortcut = item.shortcut?.toLowerCase().includes(q);
      const matchSteps = item.steps.some(s => s.toLowerCase().includes(q));

      return matchTitle || matchSubtitle || matchSummary || matchShortcut || matchSteps;
    });
  }, [selectedCategory, searchQuery]);

  const handleActionClick = (item: InstructionItem) => {
    if (item.recommendedTab && onActivateTab) {
      onActivateTab(item.recommendedTab);
    }
    if (item.recommendedTool && onActivateTool) {
      onActivateTool(item.recommendedTool);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 text-zinc-100 select-text">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm hướng dẫn, phím tắt (Curves, HSL, Liquify, Clone...)"
          className="w-full bg-black/40 border border-white/10 rounded-2xl py-2 pl-9 pr-8 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all font-sans"
        />
        <svg
          className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {INSTRUCTION_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`py-1 px-2.5 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1 border ${
              selectedCategory === cat.id
                ? 'bg-white text-black border-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white bg-white/[0.04] border-white/5 hover:border-white/15'
            }`}
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={cat.icon} />
            </svg>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Instruction Cards Accordion / List */}
      <div className="flex flex-col gap-2.5">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40">
            Không tìm thấy hướng dẫn phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-white/[0.05] border-white/20 shadow-xl'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                }`}
              >
                {/* Header Button */}
                <button
                  onClick={() => setExpandedId(isExpanded ? '' : item.id)}
                  className="w-full text-left p-3 flex items-start justify-between gap-2 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-white tracking-tight">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md border ${item.badgeColor || 'bg-white/10 text-white border-white/20'}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono font-bold bg-white/10 border border-white/20 px-1.5 py-0.5 rounded text-zinc-200">
                        {item.shortcut}
                      </kbd>
                    )}
                    <svg
                      className={`w-4 h-4 text-white/50 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-white' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/10 text-xs space-y-3 animate-in fade-in duration-200">
                    <p className="text-zinc-300 leading-relaxed text-[11px] bg-black/20 p-2.5 rounded-xl border border-white/5">
                      {item.summary}
                    </p>

                    {/* Step-by-Step Guide */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Các Bước Thao Tác:
                      </span>
                      <div className="space-y-1.5 bg-black/30 p-2.5 rounded-xl border border-white/5 font-sans">
                        {item.steps.map((step, idx) => (
                          <div key={idx} className="text-[11px] text-zinc-200 leading-relaxed flex items-start gap-1.5">
                            <span className="text-zinc-500 font-mono text-[10px] mt-0.5 flex-shrink-0">•</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tips */}
                    {item.tips && item.tips.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[10px] uppercase tracking-wider">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span>Mẹo Thực Tế (Pro Tip):</span>
                        </div>
                        {item.tips.map((tip, tIdx) => (
                          <p key={tIdx} className="leading-relaxed pl-1">{tip}</p>
                        ))}
                      </div>
                    )}

                    {/* Quick Action Button */}
                    {(item.recommendedTool || item.recommendedTab) && (
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          onClick={() => handleActionClick(item)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                          <span>Kích Hoạt Công Cụ Này</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
