import React, { useState, useEffect } from 'react';
import { getGeminiApiKey, setGeminiApiKey, clearGeminiApiKey, getApiKeySource, validateApiKey } from '../services/geminiService';
import { useTranslation } from '../services/i18nService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (newKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const { t } = useTranslation();
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySource, setKeySource] = useState<'local_storage' | 'env' | 'none'>('none');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentKey = getGeminiApiKey();
      setKeyInput(currentKey);
      setKeySource(getApiKeySource());
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: t('apikey.enterKeyPrompt', 'Vui lòng nhập API Key trước khi lưu.') });
      return;
    }
    setGeminiApiKey(trimmed);
    setKeySource('local_storage');
    setSaveSuccess(true);
    setTestResult(null);
    if (onKeySaved) onKeySaved(trimmed);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleTest = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: t('apikey.enterKeyTestPrompt', 'Vui lòng nhập API Key để kiểm tra.') });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await validateApiKey(trimmed);
      setTestResult({
        success: res.valid,
        message: res.message
      });
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `${t('common.error', 'Lỗi')}: ${e?.message || String(e)}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    clearGeminiApiKey();
    setKeyInput('');
    setKeySource(getApiKeySource());
    setTestResult({ success: true, message: t('apikey.clearSuccess', 'Đã xóa API Key khỏi bộ nhớ trình duyệt.') });
    if (onKeySaved) onKeySaved('');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-2xl p-4 animate-in fade-in duration-200">
      <div className="vision-modal max-w-xl w-full p-8 flex flex-col relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/10"
          title={t('common.close', 'Đóng')}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl p-1 bg-white/10 border border-white/20 flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0 overflow-hidden backdrop-blur-xl">
            <img src="/logo.png" alt="NKI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">{t('apikey.title', 'Cấu Hình Google Gemini API Key')}</h2>
            <p className="text-xs text-white/60">{t('apikey.desc', 'NKI Studio v4.3 • Kết nối trực tiếp đến Google Gemini API')}</p>
          </div>
        </div>

        {/* Current Status Badge */}
        <div className="mb-5 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs backdrop-blur-md">
          <span className="text-white/60 font-medium">{t('apikey.statusLabel', 'Trạng thái cấu hình:')}</span>
          {keySource === 'local_storage' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-[11px] shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {t('apikey.statusLocal', 'Đã lưu trên Trình duyệt (LocalStorage)')}
            </span>
          )}
          {keySource === 'env' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold text-[11px] shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              {t('apikey.statusEnv', 'Đang dùng từ file .env / System')}
            </span>
          )}
          {keySource === 'none' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-[11px] shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {t('apikey.statusMissing', 'Chưa thiết lập API Key')}
            </span>
          )}
        </div>

        {/* Input Field */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">
            {t('apikey.inputLabel', 'Google Gemini API Key')}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setSaveSuccess(false);
              }}
              placeholder="AIzaSy..."
              className="w-full glass-input rounded-2xl px-4 py-3.5 pr-20 text-sm font-mono border border-white/15 focus:border-primary-400 transition-all placeholder:text-white/20 bg-black/40 backdrop-blur-md"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs text-white/60 hover:text-white rounded-xl bg-white/10 hover:bg-white/15 transition-all font-medium border border-white/10"
            >
              {showKey ? t('apikey.hide', 'Ẩn') : t('apikey.show', 'Hiện')}
            </button>
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            {t('apikey.inputNote', 'Khóa này chỉ được lưu cục bộ trong trình duyệt của bạn (LocalStorage) và trực tiếp gửi tới Google API, không đi qua server trung gian nào.')}
          </p>
        </div>

        {/* Alerts / Feedback */}
        {saveSuccess && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <span>✅</span>
            <span>{t('apikey.saveSuccess', 'Đã lưu API Key thành công! Ứng dụng đã sẵn sàng tạo ảnh.')}</span>
          </div>
        )}

        {testResult && (
          <div
            className={`mb-4 p-3 rounded-2xl border text-xs font-medium flex items-start gap-2 animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-red-500/15 border-red-400/40 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            }`}
          >
            <span className="text-sm mt-0.5">{testResult.success ? '🎉' : '⚠️'}</span>
            <div className="flex-1 leading-relaxed">{testResult.message}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 border border-primary-400/40"
          >
            <span>💾</span>
            {t('apikey.save', 'Lưu API Key')}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !keyInput.trim()}
            className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 hover:text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center gap-2 backdrop-blur-xl"
          >
            {isTesting ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white/80 border-t-transparent animate-spin"></span>
                {t('apikey.testing', 'Đang thử...')}
              </>
            ) : (
              <>
                <span>⚡</span>
                {t('apikey.test', 'Kiểm tra kết nối')}
              </>
            )}
          </button>

          {keySource === 'local_storage' && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
              title={t('apikey.clear', 'Xóa')}
            >
              {t('apikey.clear', 'Xóa')}
            </button>
          )}
        </div>

        {/* How to get API Key Section */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary-300">{t('apikey.guideTitle', '💡 Hướng dẫn lấy Gemini API Key miễn phí:')}</span>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-primary-400 hover:text-primary-300 underline font-bold flex items-center gap-1"
            >
              {t('apikey.openAiStudio', 'Mở Google AI Studio ↗')}
            </a>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-white/70 text-[11px] leading-relaxed">
            <li>
              {t('apikey.step1', 'Truy cập trang aistudio.google.com/apikey và đăng nhập bằng tài khoản Google.')}
            </li>
            <li>
              {t('apikey.step2', 'Bấm nút Create API key (Tạo khóa API) trong dự án của bạn (hoặc tạo dự án mới miễn phí).')}
            </li>
            <li>
              {t('apikey.step3', 'Sao chép chuỗi mã (bắt đầu bằng AIzaSy...) và dán vào ô bên trên, rồi bấm Lưu API Key.')}
            </li>
            <li>
              <em>{t('apikey.step4', 'Lưu ý: Bạn cũng có thể thiết lập biến môi trường GEMINI_API_KEY trong file .env.local ở thư mục dự án nếu muốn chạy mặc định.')}</em>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
