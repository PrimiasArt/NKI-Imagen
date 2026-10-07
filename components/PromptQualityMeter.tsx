import React, { useState, useMemo } from 'react';
import { ImagePromptJson, PromptQualityResult } from '../types';
import { calculatePromptQuality, autoEnrichPrompt } from '../services/promptQualityService';
import { useTranslation } from '../services/i18nService';

interface PromptQualityMeterProps {
  jsonPrompt: ImagePromptJson;
  onEnrichSuccess: (enrichedJson: ImagePromptJson) => void;
  className?: string;
}

export const PromptQualityMeter: React.FC<PromptQualityMeterProps> = ({
  jsonPrompt,
  onEnrichSuccess,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichNotice, setEnrichNotice] = useState<string | null>(null);

  // Real-time calculation on prompt change
  const quality: PromptQualityResult = useMemo(() => {
    return calculatePromptQuality(jsonPrompt);
  }, [jsonPrompt]);

  const handleAutoEnrich = async () => {
    try {
      setIsEnriching(true);
      setEnrichNotice(null);
      const enriched = await autoEnrichPrompt(jsonPrompt);
      onEnrichSuccess(enriched);
      setEnrichNotice('✨ Đã nâng cấp các chiều điện ảnh thành công!');
      setTimeout(() => setEnrichNotice(null), 3000);
    } catch (err: any) {
      console.error('Auto-enrich error:', err);
      setEnrichNotice('Lỗi: ' + (err.message || 'Không thể tự động hoàn thiện prompt.'));
      setTimeout(() => setEnrichNotice(null), 4000);
    } finally {
      setIsEnriching(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'from-amber-400 to-yellow-300 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]';
      case 'A': return 'from-emerald-500 to-teal-400 text-white border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.35)]';
      case 'B': return 'from-blue-500 to-indigo-400 text-white border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]';
      case 'C': return 'from-amber-600 to-orange-500 text-white border-orange-400/50';
      default: return 'from-rose-600 to-red-500 text-white border-rose-400/50';
    }
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 85) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    if (score >= 65) return 'bg-gradient-to-r from-blue-500 to-cyan-400';
    if (score >= 45) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    return 'bg-gradient-to-r from-rose-500 to-red-400';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Compact Capsule Bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 backdrop-blur-xl transition-all active:scale-95 group shadow-sm"
          title="Bấm để xem chi tiết chấm điểm chất lượng prompt & phân tích 6 chiều"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">⚡</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70 group-hover:text-white">
              Chất Lượng:
            </span>
          </div>

          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getScoreBarColor(quality.score)}`}
              style={{ width: `${quality.score}%` }}
            />
          </div>

          <span className="text-[11px] font-black font-mono text-white/90">
            {quality.score}%
          </span>

          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r border ${getGradeColor(quality.grade)}`}>
            Rank {quality.grade}
          </span>

          <span className="text-[10px] text-white/40 group-hover:text-white/80 transition-transform">
            {isExpanded ? '▲' : '▼'}
          </span>
        </button>

        {/* 1-Click Auto Enrich Button */}
        <button
          type="button"
          onClick={handleAutoEnrich}
          disabled={isEnriching}
          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-primary-500/20 to-amber-500/20 hover:from-primary-500/30 hover:to-amber-500/30 text-amber-200 border border-amber-500/30 hover:border-amber-400/50 text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)] active:scale-95 disabled:opacity-50"
          title="Tự động sử dụng AI để điền sâu bối cảnh, ánh sáng và chi tiết điện ảnh cao cấp"
        >
          <span>{isEnriching ? '⏳' : '✨'}</span>
          <span>{isEnriching ? 'Đang hoàn thiện...' : 'Auto-Enrich'}</span>
        </button>
      </div>

      {/* Floating Notice Toast */}
      {enrichNotice && (
        <div className="absolute left-0 top-full mt-2 z-50 animate-in fade-in slide-in-from-top-1">
          <div className="glass-card px-3 py-1.5 rounded-xl border border-amber-500/40 bg-slate-950/95 text-xs font-bold text-amber-200 shadow-xl flex items-center gap-2">
            <span>⚡</span>
            <span>{enrichNotice}</span>
          </div>
        </div>
      )}

      {/* Expanded VisionOS Inspection Drawer */}
      {isExpanded && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 p-4 rounded-2xl glass-card border border-white/15 bg-slate-950/95 backdrop-blur-2xl shadow-2xl z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎯</span>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">
                Phân Tích Chi Tiết 6 Chiều
              </h4>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/40 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>

          {/* 6 Dimension Radar / Progress Bars */}
          <div className="space-y-2">
            {[
              { key: 'subject', label: 'Chủ Thể (Subject)', val: quality.dimensionScores.subject, icon: '👤' },
              { key: 'lighting', label: 'Ánh Sáng (Lighting)', val: quality.dimensionScores.lighting, icon: '⚡' },
              { key: 'composition', label: 'Bố Cục (Composition)', val: quality.dimensionScores.composition, icon: '📐' },
              { key: 'camera', label: 'Góc Máy & Lens', val: quality.dimensionScores.camera, icon: '📷' },
              { key: 'style', label: 'Phong Cách (Style)', val: quality.dimensionScores.style, icon: '🎨' },
              { key: 'details', label: 'Vi Mô & Bề Mặt', val: quality.dimensionScores.details, icon: '💎' },
            ].map(dim => (
              <div key={dim.key} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/70 flex items-center gap-1">
                    <span>{dim.icon}</span>
                    <span>{dim.label}</span>
                  </span>
                  <span className="font-mono font-bold text-white/90">{dim.val}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getScoreBarColor(dim.val)}`}
                    style={{ width: `${dim.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Strengths */}
          {quality.strengths.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-white/5">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                <span>✓</span> Điểm mạnh
              </span>
              <ul className="text-[11px] text-white/70 space-y-0.5 list-disc list-inside">
                {quality.strengths.map((s, i) => (
                  <li key={i} className="leading-tight">{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {quality.improvements.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-white/5">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                <span>💡</span> Gợi ý nâng cấp
              </span>
              <ul className="text-[11px] text-white/70 space-y-0.5 list-disc list-inside">
                {quality.improvements.map((imp, i) => (
                  <li key={i} className="leading-tight">{imp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings (AI Traps) */}
          {quality.warnings.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-white/5 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
              <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
                <span>⚠️</span> Cảnh báo bẫy AI
              </span>
              <ul className="text-[11px] text-rose-200 space-y-0.5 list-disc list-inside">
                {quality.warnings.map((w, i) => (
                  <li key={i} className="leading-tight">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer CTA */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-[9px] text-white/40">Powered by Gemini Cinematography</span>
            <button
              type="button"
              onClick={handleAutoEnrich}
              disabled={isEnriching}
              className="px-3 py-1.5 bg-primary-500 hover:bg-primary-400 text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isEnriching ? 'Đang xử lý...' : '⚡ Tối ưu ngay'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
