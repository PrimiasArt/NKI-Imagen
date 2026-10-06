/**
 * Multi-Language Internationalization (i18n) Engine for NKI Imagen
 * 
 * Supported Languages:
 * - vi: Tiếng Việt (Default)
 * - en: English
 * - zh: 简体中文 (Chinese Simplified)
 * - th: ภาษาไทย (Thai)
 * - ko: 한국어 (Korean)
 * - es: Español (Spanish)
 * - ru: Русский (Russian)
 */

import { useState, useEffect } from 'react';

export type AppLanguage = 'vi' | 'en' | 'zh' | 'th' | 'ko' | 'es' | 'ru';

export interface LanguageInfo {
  code: AppLanguage;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'vi', name: 'Tiếng Việt', nativeName: 'Tiếng Việt', flag: '🇻🇳', region: 'Việt Nam (Mặc định)' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'Global / United States' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', region: 'China / Singapore' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭', region: 'Thailand' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'South Korea' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Spain / Latin America' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'Russia / CIS' },
];

const LANGUAGE_STORAGE_KEY = 'nki_app_language';
const LANGUAGE_CHANGE_EVENT = 'nki_language_change';

/**
 * Translations Dictionary for All 7 Languages
 */
export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  // ==========================================
  // 1. TIẾNG VIỆT (Default)
  // ==========================================
  vi: {
    // Nav & Header
    'nav.complexImagen': 'Complex Imagen',
    'nav.sceneDirector': 'Đạo Diễn Cảnh',
    'nav.gallery': 'Gallery',
    'nav.history': 'Lịch Sử',
    'nav.studio': 'AI Photo Studio',
    'nav.settings': 'Cài Đặt',
    'nav.language': 'Ngôn Ngữ',
    'nav.queue': 'Hàng Đợi',
    'nav.apiKey': 'Gemini API',
    'nav.needKey': 'Nhập Key',
    'nav.syncVault': 'Sync Vault',
    'nav.syncing': 'Đang Sync...',

    // Sub Nav
    'subnav.analysis': 'Phân Tích',
    'subnav.converter': 'Chuyển Đổi',
    'subnav.generator': 'Tạo Ảnh',
    'subnav.pose': 'Biến Thể Pose',
    'subnav.compose': 'Ghép Ảnh',
    'subnav.reference': 'Tham Chiếu',
    'subnav.upscale': 'Phóng Đại',
    'subnav.studio': 'Studio AI',
    'subnav.scripting': 'Kịch Bản',
    'subnav.veo3': 'Veo 3 Pro',

    // Settings Modal
    'settings.title': 'Cài Đặt Lưu Trữ & Hệ Thống',
    'settings.subtitle': 'Cấu hình thư mục lưu ảnh, ngôn ngữ, bộ nhớ IndexedDB và Google Drive',
    'settings.tab.language': 'Ngôn Ngữ (Language)',
    'settings.tab.storage': 'Thư Mục & Lưu Trữ',
    'settings.tab.gallery': 'Bộ Nhớ Gallery',
    'settings.tab.drive': 'Google Drive',
    'settings.tab.antiAi': 'Khử Dấu AI',
    'settings.tab.update': 'Cập Nhật (Updates)',
    
    // Language Section
    'settings.lang.title': 'Tùy Chọn Ngôn Ngữ Hiển Thị',
    'settings.lang.desc': 'Chọn ngôn ngữ giao diện ưa thích cho ứng dụng NKI Imagen. Cài đặt được lưu tự động trên thiết bị của bạn.',
    'settings.lang.active': 'Đang Dùng',
    'settings.lang.switchSuccess': 'Đã chuyển đổi ngôn ngữ thành công!',

    // Common Buttons & Actions
    'common.save': 'Lưu Lại',
    'common.cancel': 'Hủy',
    'common.delete': 'Xóa',
    'common.close': 'Đóng',
    'common.copy': 'Sao Chép',
    'common.download': 'Tải Về',
    'common.selectAll': 'Chọn Tất Cả',
    'common.deselectAll': 'Bỏ Chọn',
    'common.generate': 'Tạo Ảnh',
    'common.processing': 'Đang xử lý...',
    'common.success': 'Thành công!',
    'common.error': 'Lỗi',
    'common.reset': 'Đặt lại',
    'common.back': 'Quay Lại',
    'common.search': 'Tìm kiếm...',
    'common.filter': 'Bộ lọc',

    // Photo Studio Workspace
    'studio.title': 'NKI Photo Studio Pro',
    'studio.badge': '2026 AI Pro',
    'studio.back': 'Quay Lại',
    'studio.undo': 'Hoàn tác',
    'studio.redo': 'Làm lại',
    'studio.zoomFit': 'Vừa Khung',
    'studio.saveGallery': 'Lưu Gallery',
    'studio.download': 'Tải Ảnh',
    'studio.downloadPng': 'Tải định dạng PNG',
    'studio.downloadJpg': 'Tải định dạng JPG',
    'studio.downloadAntiAi': '🛡️ Tải Khử Dấu AI',
    'studio.compareOriginal': 'So Sánh Ảnh Gốc',

    // Studio Tools
    'studio.tool.select': 'Chọn / Di chuyển (V)',
    'studio.tool.brush': 'Cọ Quét Vùng Chọn (B)',
    'studio.tool.eraser': 'Tẩy Nét Cọ (E)',
    'studio.tool.crop': 'Cắt Khung Hình (C)',
    'studio.tool.color': 'Chỉnh Màu Nâng Cao (G)',
    'studio.tool.hand': 'Bàn Tay Di Chuyển (H)',
    'studio.clearMask': 'Xóa vùng quét',

    // Studio Options Bar
    'studio.brushSize': 'Kích thước:',
    'studio.brushHardness': 'Độ mềm:',
    'studio.applyCrop': '✓ Cắt Ảnh',
    'studio.uploadPrompt': 'Tải Ảnh Từ Máy Tính',
    'studio.orSelectGallery': 'Hoặc chọn nhanh từ Gallery',

    // Studio Sidebar Tabs
    'studio.tab.aiMagic': 'AI Magic',
    'studio.tab.colorGrading': 'Chỉnh Màu',
    'studio.tab.transform': 'Biến Đổi',

    // Studio AI Magic
    'studio.ai.zeroApiNote': '0 API Token: Chỉnh màu, xoay lật, crop chạy trực tiếp trên máy. Chỉ tốn API khi gọi các công cụ AI bên dưới.',
    'studio.ai.inpaint': 'Generative Fill',
    'studio.ai.inpaintDesc': 'Vẽ thêm / Đổi đồ vật',
    'studio.ai.eraser': 'Magic Eraser',
    'studio.ai.eraserDesc': 'Xóa người & vật thể',
    'studio.ai.expand': 'Magic Expand',
    'studio.ai.expandDesc': 'Mở rộng khung cảnh',
    'studio.ai.bgReplace': 'Đổi Nền Mới',
    'studio.ai.bgReplaceDesc': 'Tách nền & ghép cảnh',
    'studio.ai.inpaintPromptLabel': 'Mô tả Generative Fill:',
    'studio.ai.hasMask': '✓ Đã chọn vùng',
    'studio.ai.noMask': 'Chưa quét cọ',
    'studio.ai.executeInpaint': 'Tạo Với AI (Generative Fill)',
    'studio.ai.executeEraser': 'Xóa Vật Thể Ngay',
    'studio.ai.executeExpand': 'Mở Rộng Khung Hình',
    'studio.ai.executeBgReplace': 'Thay Nền Mới Bằng AI',
    'studio.ai.engineModel': 'Engine AI',

    // Studio Color Grading & Presets
    'studio.color.presetLib': 'Thư Viện Presets',
    'studio.color.savePreset': 'Lưu Preset',
    'studio.color.saveModalTitle': 'Đặt tên cho Preset mới:',
    'studio.color.saveModalPlaceholder': 'VD: Tone Da Hàn Quốc, Moody Teal...',
    'studio.color.tabAll': 'Tất Cả',
    'studio.color.tabMine': '⭐ Của Tôi',
    'studio.color.tabCinematic': '🎬 LUT Mẫu',
    'studio.color.exportJson': 'Xuất JSON',
    'studio.color.importJson': 'Nhập JSON',
    'studio.color.myPresets': '⭐ Preset Của Tôi:',
    'studio.color.cinematicPresets': '🎬 Presets Điện Ảnh Mẫu:',
    'studio.color.emptyCustom': 'Chưa có preset tự lưu nào. Kéo các thanh trượt bên dưới rồi nhấn "Lưu Preset" để dùng cho ảnh sau!',
    'studio.color.customTag': 'Tùy chỉnh',

    // Studio Sliders
    'studio.slider.light': 'Ánh Sáng (Light & Tone)',
    'studio.slider.exposure': 'Phơi sáng (Exposure)',
    'studio.slider.brightness': 'Độ sáng (Brightness)',
    'studio.slider.contrast': 'Độ tương phản (Contrast)',
    'studio.slider.highlights': 'Vùng sáng (Highlights)',
    'studio.slider.shadows': 'Vùng tối (Shadows)',
    'studio.slider.color': 'Màu Sắc (Color Balance)',
    'studio.slider.temp': 'Nhiệt độ (Temperature)',
    'studio.slider.tempSub': 'Lạnh ↔ Ấm',
    'studio.slider.tint': 'Sắc thái (Tint)',
    'studio.slider.tintSub': 'Lục ↔ Đỏ tía',
    'studio.slider.vibrance': 'Sắc độ thông minh (Vibrance)',
    'studio.slider.saturation': 'Độ bão hòa (Saturation)',
    'studio.slider.details': 'Chi Tiết & Hạt Phim (Texture & FX)',
    'studio.slider.clarity': 'Độ trong & nét (Clarity)',
    'studio.slider.sharpness': 'Độ sắc cạnh (Sharpness)',
    'studio.slider.filmGrain': 'Hạt phim cổ điển (Film Grain)',
    'studio.slider.vignette': 'Làm tối góc (Vignette)',
    'studio.slider.bake': 'Lưu Cố Định Màu',
    'studio.slider.reset': '↺ Reset Màu',

    // Studio Transform
    'studio.trans.title': 'Xoay & Lật (Transform)',
    'studio.trans.rotLeft': 'Xoay -90°',
    'studio.trans.rotRight': 'Xoay +90°',
    'studio.trans.flipH': '↔ Lật Ngang',
    'studio.trans.flipV': '↕ Lật Dọc',
    'studio.trans.cropTitle': 'Cắt Khung Hình (Crop Tool)',
    'studio.trans.enableCrop': 'Bật Vùng Chọn Cắt Ảnh',
    'studio.trans.history': 'Lịch Sử Thao Tác',

    // Gallery & Batch
    'gallery.batchSelect': 'Chọn Hàng Loạt',
    'gallery.selected': 'Đã chọn',
    'gallery.deleteSelected': 'Xóa Đã Chọn',
    'gallery.moveToCollection': 'Gom Vào Bộ Sưu Tập',
    'gallery.syncDrive': 'Đồng Bộ Drive',
    'gallery.cleanDupes': 'Xóa Ảnh Trùng Lặp',
  },

  // ==========================================
  // 2. ENGLISH (en)
  // ==========================================
  en: {
    // Nav & Header
    'nav.complexImagen': 'Complex Imagen',
    'nav.sceneDirector': 'Scene Director',
    'nav.gallery': 'Gallery',
    'nav.history': 'History',
    'nav.studio': 'AI Photo Studio',
    'nav.settings': 'Settings',
    'nav.language': 'Language',
    'nav.queue': 'Queue',
    'nav.apiKey': 'Gemini API',
    'nav.needKey': 'Enter Key',
    'nav.syncVault': 'Sync Vault',
    'nav.syncing': 'Syncing...',

    // Sub Nav
    'subnav.analysis': 'Analysis',
    'subnav.converter': 'Converter',
    'subnav.generator': 'Generator',
    'subnav.pose': 'Pose Variants',
    'subnav.compose': 'Compose',
    'subnav.reference': 'Reference',
    'subnav.upscale': 'Upscale',
    'subnav.studio': 'Studio AI',
    'subnav.scripting': 'Scripting',
    'subnav.veo3': 'Veo 3 Pro',

    // Settings Modal
    'settings.title': 'Storage & System Settings',
    'settings.subtitle': 'Configure save directories, language, IndexedDB storage, and Google Drive',
    'settings.tab.language': 'Language (Ngôn Ngữ)',
    'settings.tab.storage': 'Storage & Folders',
    'settings.tab.gallery': 'Gallery Storage',
    'settings.tab.drive': 'Google Drive',
    'settings.tab.antiAi': 'Anti-AI Camouflage',
    'settings.tab.update': 'Updates',

    // Language Section
    'settings.lang.title': 'Display Language Preferences',
    'settings.lang.desc': 'Choose your preferred interface display language for NKI Imagen. Settings are saved locally on your device.',
    'settings.lang.active': 'Active',
    'settings.lang.switchSuccess': 'Language changed successfully!',

    // Common Buttons & Actions
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.copy': 'Copy',
    'common.download': 'Download',
    'common.selectAll': 'Select All',
    'common.deselectAll': 'Deselect All',
    'common.generate': 'Generate',
    'common.processing': 'Processing...',
    'common.success': 'Success!',
    'common.error': 'Error',
    'common.reset': 'Reset',
    'common.back': 'Back',
    'common.search': 'Search...',
    'common.filter': 'Filter',

    // Photo Studio Workspace
    'studio.title': 'NKI Photo Studio Pro',
    'studio.badge': '2026 AI Pro',
    'studio.back': 'Back',
    'studio.undo': 'Undo',
    'studio.redo': 'Redo',
    'studio.zoomFit': 'Fit Screen',
    'studio.saveGallery': 'Save to Gallery',
    'studio.download': 'Download',
    'studio.downloadPng': 'Download PNG',
    'studio.downloadJpg': 'Download JPG',
    'studio.downloadAntiAi': '🛡️ Download Anti-AI',
    'studio.compareOriginal': 'Compare Original',

    // Studio Tools
    'studio.tool.select': 'Select / Move (V)',
    'studio.tool.brush': 'Brush Mask (B)',
    'studio.tool.eraser': 'Mask Eraser (E)',
    'studio.tool.crop': 'Crop Image (C)',
    'studio.tool.color': 'Color Grading (G)',
    'studio.tool.hand': 'Hand Pan (H)',
    'studio.clearMask': 'Clear Mask',

    // Studio Options Bar
    'studio.brushSize': 'Brush Size:',
    'studio.brushHardness': 'Hardness:',
    'studio.applyCrop': '✓ Apply Crop',
    'studio.uploadPrompt': 'Upload From Computer',
    'studio.orSelectGallery': 'Or select quickly from Gallery',

    // Studio Sidebar Tabs
    'studio.tab.aiMagic': 'AI Magic',
    'studio.tab.colorGrading': 'Color Grading',
    'studio.tab.transform': 'Transform',

    // Studio AI Magic
    'studio.ai.zeroApiNote': '0 API Tokens: Color grading, transform, and crop run locally on your device. API is only called for the AI tools below.',
    'studio.ai.inpaint': 'Generative Fill',
    'studio.ai.inpaintDesc': 'Add or replace objects',
    'studio.ai.eraser': 'Magic Eraser',
    'studio.ai.eraserDesc': 'Remove people & objects',
    'studio.ai.expand': 'Magic Expand',
    'studio.ai.expandDesc': 'Outpaint & extend canvas',
    'studio.ai.bgReplace': 'Replace Background',
    'studio.ai.bgReplaceDesc': 'Isolate subject & swap scene',
    'studio.ai.inpaintPromptLabel': 'Generative Fill Prompt:',
    'studio.ai.hasMask': '✓ Area Selected',
    'studio.ai.noMask': 'No Mask Drawn',
    'studio.ai.executeInpaint': 'Generate with AI (Fill)',
    'studio.ai.executeEraser': 'Erase Objects Now',
    'studio.ai.executeExpand': 'Expand Canvas Now',
    'studio.ai.executeBgReplace': 'Replace Background with AI',
    'studio.ai.engineModel': 'AI Engine Model',

    // Studio Color Grading & Presets
    'studio.color.presetLib': 'Presets Library',
    'studio.color.savePreset': 'Save Preset',
    'studio.color.saveModalTitle': 'Enter Name for New Preset:',
    'studio.color.saveModalPlaceholder': 'e.g. Warm Portrait, Moody Teal...',
    'studio.color.tabAll': 'All',
    'studio.color.tabMine': '⭐ My Presets',
    'studio.color.tabCinematic': '🎬 LUT Presets',
    'studio.color.exportJson': 'Export JSON',
    'studio.color.importJson': 'Import JSON',
    'studio.color.myPresets': '⭐ My Custom Presets:',
    'studio.color.cinematicPresets': '🎬 Cinematic LUT Presets:',
    'studio.color.emptyCustom': 'No custom presets saved yet. Tweak the sliders below and click "Save Preset" to reuse on any photo!',
    'studio.color.customTag': 'Custom',

    // Studio Sliders
    'studio.slider.light': 'Light & Tone',
    'studio.slider.exposure': 'Exposure',
    'studio.slider.brightness': 'Brightness',
    'studio.slider.contrast': 'Contrast',
    'studio.slider.highlights': 'Highlights',
    'studio.slider.shadows': 'Shadows',
    'studio.slider.color': 'Color Balance',
    'studio.slider.temp': 'Temperature',
    'studio.slider.tempSub': 'Cool ↔ Warm',
    'studio.slider.tint': 'Tint',
    'studio.slider.tintSub': 'Green ↔ Magenta',
    'studio.slider.vibrance': 'Vibrance',
    'studio.slider.saturation': 'Saturation',
    'studio.slider.details': 'Texture & Film FX',
    'studio.slider.clarity': 'Clarity',
    'studio.slider.sharpness': 'Sharpness',
    'studio.slider.filmGrain': 'Film Grain',
    'studio.slider.vignette': 'Vignette',
    'studio.slider.bake': 'Bake Color Adjustments',
    'studio.slider.reset': '↺ Reset Color',

    // Studio Transform
    'studio.trans.title': 'Rotate & Flip (Transform)',
    'studio.trans.rotLeft': 'Rotate -90°',
    'studio.trans.rotRight': 'Rotate +90°',
    'studio.trans.flipH': '↔ Flip Horizontal',
    'studio.trans.flipV': '↕ Flip Vertical',
    'studio.trans.cropTitle': 'Crop Tool',
    'studio.trans.enableCrop': 'Enable Crop Box',
    'studio.trans.history': 'Operation History',

    // Gallery & Batch
    'gallery.batchSelect': 'Batch Select',
    'gallery.selected': 'Selected',
    'gallery.deleteSelected': 'Delete Selected',
    'gallery.moveToCollection': 'Move to Collection',
    'gallery.syncDrive': 'Sync to Drive',
    'gallery.cleanDupes': 'Remove Duplicates',
  },

  // ==========================================
  // 3. CHINESE SIMPLIFIED (zh)
  // ==========================================
  zh: {
    'nav.complexImagen': '复杂图像处理',
    'nav.sceneDirector': '场景导演',
    'nav.gallery': '画廊图库',
    'nav.history': '生成历史',
    'nav.studio': 'AI 摄影工坊',
    'nav.settings': '系统设置',
    'nav.language': '语言切换',
    'nav.queue': '生成队列',
    'nav.apiKey': 'Gemini 密钥',
    'nav.needKey': '输入密钥',
    'nav.syncVault': '云端同步',
    'nav.syncing': '正在同步...',

    'subnav.analysis': '图像分析',
    'subnav.converter': '提示词转换',
    'subnav.generator': '画作生成',
    'subnav.pose': '姿势变体',
    'subnav.compose': '画作组合',
    'subnav.reference': '参考重塑',
    'subnav.upscale': '高清放大',
    'subnav.studio': 'AI 工坊',
    'subnav.scripting': '分镜脚本',
    'subnav.veo3': 'Veo 3 Pro',

    'settings.title': '存储与系统设置',
    'settings.subtitle': '配置文件存储目录、系统语言、IndexedDB 缓存和 Google Drive',
    'settings.tab.language': '语言设置 (Language)',
    'settings.tab.storage': '存储与目录',
    'settings.tab.gallery': '图库存储容量',
    'settings.tab.drive': 'Google Drive 云盘',
    'settings.tab.antiAi': '去 AI 痕迹伪装',
    'settings.tab.update': '软件版本更新',

    'settings.lang.title': '界面语言偏好设置',
    'settings.lang.desc': '为 NKI Imagen 选择您的首选显示语言。设置将自动保存在您的本地浏览器中。',
    'settings.lang.active': '当前使用',
    'settings.lang.switchSuccess': '语言切换成功！',

    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.close': '关闭',
    'common.copy': '复制',
    'common.download': '下载',
    'common.selectAll': '全选',
    'common.deselectAll': '取消选择',
    'common.generate': '开始生成',
    'common.processing': '处理中...',
    'common.success': '成功！',
    'common.error': '错误',
    'common.reset': '重置',
    'common.back': '返回',
    'common.search': '搜索...',
    'common.filter': '筛选',

    'studio.title': 'NKI 摄影工坊专业版',
    'studio.badge': '2026 AI 专业版',
    'studio.back': '返回',
    'studio.undo': '撤销',
    'studio.redo': '重做',
    'studio.zoomFit': '适屏显示',
    'studio.saveGallery': '保存至画廊',
    'studio.download': '下载图片',
    'studio.downloadPng': '下载 PNG (无损)',
    'studio.downloadJpg': '下载 JPG (标准)',
    'studio.downloadAntiAi': '🛡️ 下载去AI痕迹版',
    'studio.compareOriginal': '对比原图',

    'studio.tool.select': '选择与移动 (V)',
    'studio.tool.brush': '画笔选区 (B)',
    'studio.tool.eraser': '橡皮擦除 (E)',
    'studio.tool.crop': '裁剪画布 (C)',
    'studio.tool.color': '专业调色 (G)',
    'studio.tool.hand': '抓手平移 (H)',
    'studio.clearMask': '清空选区',

    'studio.brushSize': '画笔大小:',
    'studio.brushHardness': '柔和度:',
    'studio.applyCrop': '✓ 确认裁剪',
    'studio.uploadPrompt': '从电脑上传图片',
    'studio.orSelectGallery': '或从图库快速选取',

    'studio.tab.aiMagic': 'AI 魔法',
    'studio.tab.colorGrading': '专业调色',
    'studio.tab.transform': '画布变换',

    'studio.ai.zeroApiNote': '0 API 消耗：调色、旋转、翻转和裁剪完全在本地执行。仅调用以下 AI 功能时消耗 API。',
    'studio.ai.inpaint': '生成式重绘 (Inpaint)',
    'studio.ai.inpaintDesc': '添加或替换画面元素',
    'studio.ai.eraser': '智能擦除 (Eraser)',
    'studio.ai.eraserDesc': '无痕消除人物与杂物',
    'studio.ai.expand': '智能画幅扩展',
    'studio.ai.expandDesc': '向外扩图补全边缘',
    'studio.ai.bgReplace': '一键换背景',
    'studio.ai.bgReplaceDesc': '抠图并融合全新背景',
    'studio.ai.inpaintPromptLabel': '重绘描述提示词:',
    'studio.ai.hasMask': '✓ 已涂抹选区',
    'studio.ai.noMask': '未涂抹选区',
    'studio.ai.executeInpaint': '开始 AI 局部重绘',
    'studio.ai.executeEraser': '立即无痕消除',
    'studio.ai.executeExpand': '开始画面智能扩展',
    'studio.ai.executeBgReplace': '开始 AI 更换背景',
    'studio.ai.engineModel': 'AI 处理引擎',

    'studio.color.presetLib': '预设调色库',
    'studio.color.savePreset': '保存预设',
    'studio.color.saveModalTitle': '输入新预设名称:',
    'studio.color.saveModalPlaceholder': '例如: 暖调人像、复古电影...',
    'studio.color.tabAll': '全部',
    'studio.color.tabMine': '⭐ 我的预设',
    'studio.color.tabCinematic': '🎬 电影 LUTs',
    'studio.color.exportJson': '导出 JSON',
    'studio.color.importJson': '导入 JSON',
    'studio.color.myPresets': '⭐ 我的个性预设:',
    'studio.color.cinematicPresets': '🎬 经典电影滤镜:',
    'studio.color.emptyCustom': '暂无自定义预设。调节下方滑块并点击“保存预设”，即可在后续随时一键应用！',
    'studio.color.customTag': '自定义',

    'studio.slider.light': '光影与色调',
    'studio.slider.exposure': '曝光度 (Exposure)',
    'studio.slider.brightness': '明亮度 (Brightness)',
    'studio.slider.contrast': '对比度 (Contrast)',
    'studio.slider.highlights': '高光 (Highlights)',
    'studio.slider.shadows': '阴影 (Shadows)',
    'studio.slider.color': '色彩平衡',
    'studio.slider.temp': '色温 (Temperature)',
    'studio.slider.tempSub': '冷蓝 ↔ 暖黄',
    'studio.slider.tint': '色调微调 (Tint)',
    'studio.slider.tintSub': '翠绿 ↔ 洋红',
    'studio.slider.vibrance': '自然饱和度 (Vibrance)',
    'studio.slider.saturation': '色彩饱和度 (Saturation)',
    'studio.slider.details': '纹理质感与电影胶片',
    'studio.slider.clarity': '清晰度 (Clarity)',
    'studio.slider.sharpness': '锐化度 (Sharpness)',
    'studio.slider.filmGrain': '胶片颗粒 (Film Grain)',
    'studio.slider.vignette': '暗角效果 (Vignette)',
    'studio.slider.bake': '固化调色效果到图层',
    'studio.slider.reset': '↺ 重置调色',

    'studio.trans.title': '旋转与翻转',
    'studio.trans.rotLeft': '逆时针 -90°',
    'studio.trans.rotRight': '顺时针 +90°',
    'studio.trans.flipH': '↔ 水平翻转',
    'studio.trans.flipV': '↕ 垂直翻转',
    'studio.trans.cropTitle': '裁剪工具',
    'studio.trans.enableCrop': '开启裁剪框',
    'studio.trans.history': '操作历史',

    'gallery.batchSelect': '批量选择',
    'gallery.selected': '已选择',
    'gallery.deleteSelected': '删除所选项',
    'gallery.moveToCollection': '移至收藏夹',
    'gallery.syncDrive': '同步至云盘',
    'gallery.cleanDupes': '清理重复图片',
  },

  // ==========================================
  // 4. THAI (th)
  // ==========================================
  th: {
    'nav.complexImagen': 'ภาพซับซ้อน',
    'nav.sceneDirector': 'ผู้กำกับฉาก',
    'nav.gallery': 'แกลเลอรี',
    'nav.history': 'ประวัติ',
    'nav.studio': 'สตูดิโอแต่งภาพ AI',
    'nav.settings': 'การตั้งค่า',
    'nav.language': 'ภาษา',
    'nav.queue': 'คิวสร้างภาพ',
    'nav.apiKey': 'Gemini API',
    'nav.needKey': 'ใส่คีย์',
    'nav.syncVault': 'ซิงค์คลาวด์',
    'nav.syncing': 'กำลังซิงค์...',

    'subnav.analysis': 'วิเคราะห์ภาพ',
    'subnav.converter': 'แปลงพร้อมท์',
    'subnav.generator': 'สร้างรูปภาพ',
    'subnav.pose': 'ท่าทางต่างๆ',
    'subnav.compose': 'รวมภาพ',
    'subnav.reference': 'ภาพอ้างอิง',
    'subnav.upscale': 'ขยายความคมชัด',
    'subnav.studio': 'สตูดิโอ AI',
    'subnav.scripting': 'บทภาพยนตร์',
    'subnav.veo3': 'Veo 3 Pro',

    'settings.title': 'การตั้งค่าพื้นที่จัดเก็บและระบบ',
    'settings.subtitle': 'กำหนดค่าโฟลเดอร์บันทึก ภาษา IndexedDB และ Google ไดรฟ์',
    'settings.tab.language': 'ภาษา (Language)',
    'settings.tab.storage': 'พื้นที่จัดเก็บและโฟลเดอร์',
    'settings.tab.gallery': 'ความจุแกลเลอรี',
    'settings.tab.drive': 'Google ไดรฟ์',
    'settings.tab.antiAi': 'ลบลายน้ำ AI',
    'settings.tab.update': 'อัปเดตระบบ',

    'settings.lang.title': 'การตั้งค่าภาษาแสดงผล',
    'settings.lang.desc': 'เลือกภาษาที่คุณต้องการแสดงผลในแอป NKI Imagen การตั้งค่าจะถูกบันทึกไว้ในอุปกรณ์ของคุณโดยอัตโนมัติ',
    'settings.lang.active': 'ใช้งานอยู่',
    'settings.lang.switchSuccess': 'เปลี่ยนภาษาเรียบร้อยแล้ว!',

    'common.save': 'บันทึก',
    'common.cancel': 'ยกเลิก',
    'common.delete': 'ลบ',
    'common.close': 'ปิด',
    'common.copy': 'คัดลอก',
    'common.download': 'ดาวน์โหลด',
    'common.selectAll': 'เลือกทั้งหมด',
    'common.deselectAll': 'ยกเลิกการเลือก',
    'common.generate': 'สร้างภาพ',
    'common.processing': 'กำลังประมวลผล...',
    'common.success': 'สำเร็จ!',
    'common.error': 'ข้อผิดพลาด',
    'common.reset': 'รีเซ็ต',
    'common.back': 'ย้อนกลับ',
    'common.search': 'ค้นหา...',
    'common.filter': 'ตัวกรอง',

    'studio.title': 'NKI สตูดิโอแต่งภาพ AI Pro',
    'studio.badge': '2026 AI Pro',
    'studio.back': 'ย้อนกลับ',
    'studio.undo': 'เลิกทำ',
    'studio.redo': 'ทำซ้ำ',
    'studio.zoomFit': 'พอดีหน้าจอ',
    'studio.saveGallery': 'บันทึกลงแกลเลอรี',
    'studio.download': 'ดาวน์โหลดภาพ',
    'studio.downloadPng': 'ดาวน์โหลดไฟล์ PNG',
    'studio.downloadJpg': 'ดาวน์โหลดไฟล์ JPG',
    'studio.downloadAntiAi': '🛡️ ดาวน์โหลดลบลายน้ำ AI',
    'studio.compareOriginal': 'เปรียบเทียบภาพต้นฉบับ',

    'studio.tool.select': 'เลือก / ย้าย (V)',
    'studio.tool.brush': 'แปรงมาร์กพื้นที่ (B)',
    'studio.tool.eraser': 'ยางลบมาร์ก (E)',
    'studio.tool.crop': 'ครอบตัดภาพ (C)',
    'studio.tool.color': 'ปรับแต่งสีขั้นสูง (G)',
    'studio.tool.hand': 'เครื่องมือเลื่อนภาพ (H)',
    'studio.clearMask': 'ลบพื้นที่มาร์ก',

    'studio.brushSize': 'ขนาดแปรง:',
    'studio.brushHardness': 'ความฟุ้ง:',
    'studio.applyCrop': '✓ ยืนยันครอบตัด',
    'studio.uploadPrompt': 'อัปโหลดภาพจากคอมพิวเตอร์',
    'studio.orSelectGallery': 'หรือเลือกด่วนจากแกลเลอรี',

    'studio.tab.aiMagic': 'เวทมนตร์ AI',
    'studio.tab.colorGrading': 'ปรับแต่งสี',
    'studio.tab.transform': 'แปลงรูปทรง',

    'studio.ai.zeroApiNote': '0 API Token: ปรับแต่งสี หมุน พลิก และครอบตัดทำงานบนเครื่องของคุณโดยตรง ใช้ API เฉพาะเครื่องมือ AI ด้านล่างนี้เท่านั้น',
    'studio.ai.inpaint': 'Generative Fill',
    'studio.ai.inpaintDesc': 'เติมหรือเปลี่ยนวัตถุ',
    'studio.ai.eraser': 'ยางลบวิเศษ',
    'studio.ai.eraserDesc': 'ลบคนและสิ่งของแปลกปลอม',
    'studio.ai.expand': 'ขยายภาพวิเศษ',
    'studio.ai.expandDesc': 'ขยายมุมมองภาพออกไป',
    'studio.ai.bgReplace': 'เปลี่ยนพื้นหลังใหม่',
    'studio.ai.bgReplaceDesc': 'ไดคัทและเปลี่ยนฉากหลัง',
    'studio.ai.inpaintPromptLabel': 'คำอธิบายสิ่งที่จะเติมด้วย AI:',
    'studio.ai.hasMask': '✓ เลือกพื้นที่แล้ว',
    'studio.ai.noMask': 'ยังไม่ได้ทาแปรง',
    'studio.ai.executeInpaint': 'สร้างด้วย AI (Generative Fill)',
    'studio.ai.executeEraser': 'ลบวัตถุทันที',
    'studio.ai.executeExpand': 'เริ่มขยายภาพ',
    'studio.ai.executeBgReplace': 'เปลี่ยนพื้นหลังด้วย AI',
    'studio.ai.engineModel': 'โมเดลประมวลผล AI',

    'studio.color.presetLib': 'คลังพรีเซ็ตสี',
    'studio.color.savePreset': 'บันทึกพรีเซ็ต',
    'studio.color.saveModalTitle': 'ตั้งชื่อพรีเซ็ตใหม่:',
    'studio.color.saveModalPlaceholder': 'เช่น: โทนผิวเกาหลี, มู้ดดี้ ฟิล์ม...',
    'studio.color.tabAll': 'ทั้งหมด',
    'studio.color.tabMine': '⭐ พรีเซ็ตของฉัน',
    'studio.color.tabCinematic': '🎬 LUT ภาพยนตร์',
    'studio.color.exportJson': 'ส่งออก JSON',
    'studio.color.importJson': 'นำเข้า JSON',
    'studio.color.myPresets': '⭐ พรีเซ็ตส่วนตัว:',
    'studio.color.cinematicPresets': '🎬 พรีเซ็ตโทนภาพยนตร์:',
    'studio.color.emptyCustom': 'ยังไม่มีพรีเซ็ตที่บันทึกไว้ เลื่อนแถบสีด้านล่างแล้วกด "บันทึกพรีเซ็ต" เพื่อใช้กับภาพอื่นๆ ได้เลย!',
    'studio.color.customTag': 'กำหนดเอง',

    'studio.slider.light': 'แสงและโทนภาพ',
    'studio.slider.exposure': 'ความสว่าง (Exposure)',
    'studio.slider.brightness': 'ความสว่างรวม (Brightness)',
    'studio.slider.contrast': 'ความต่างระดับสี (Contrast)',
    'studio.slider.highlights': 'ส่วนสว่าง (Highlights)',
    'studio.slider.shadows': 'ส่วนมืด (Shadows)',
    'studio.slider.color': 'สมดุลสี',
    'studio.slider.temp': 'อุณหภูมิสี (Temperature)',
    'studio.slider.tempSub': 'เย็น ↔ อุ่น',
    'studio.slider.tint': 'โทนสีย้อม (Tint)',
    'studio.slider.tintSub': 'เขียว ↔ ม่วงแดง',
    'studio.slider.vibrance': 'ความสดของสีอัจฉริยะ (Vibrance)',
    'studio.slider.saturation': 'ความอิ่มตัวสี (Saturation)',
    'studio.slider.details': 'ความคมชัดและเนื้อฟิล์ม',
    'studio.slider.clarity': 'ความใสของภาพ (Clarity)',
    'studio.slider.sharpness': 'ความคมชัด (Sharpness)',
    'studio.slider.filmGrain': 'เกรนฟิล์มวินเทจ (Film Grain)',
    'studio.slider.vignette': 'ขอบภาพมืด (Vignette)',
    'studio.slider.bake': 'บันทึกสีฝังลงในภาพ',
    'studio.slider.reset': '↺ คืนค่าสีเดิม',

    'studio.trans.title': 'หมุนและกลับด้านภาพ',
    'studio.trans.rotLeft': 'หมุน -90°',
    'studio.trans.rotRight': 'หมุน +90°',
    'studio.trans.flipH': '↔ พลิกแนวนอน',
    'studio.trans.flipV': '↕ พลิกแนวตั้ง',
    'studio.trans.cropTitle': 'เครื่องมือครอบตัด',
    'studio.trans.enableCrop': 'เปิดกรอบครอบตัด',
    'studio.trans.history': 'ประวัติการดำเนินการ',

    'gallery.batchSelect': 'เลือกหลายรายการ',
    'gallery.selected': 'เลือกแล้ว',
    'gallery.deleteSelected': 'ลบที่เลือก',
    'gallery.moveToCollection': 'ย้ายเข้าอัลบั้ม',
    'gallery.syncDrive': 'ซิงค์ลงไดรฟ์',
    'gallery.cleanDupes': 'ลบภาพซ้ำ',
  },

  // ==========================================
  // 5. KOREAN (ko)
  // ==========================================
  ko: {
    'nav.complexImagen': '컴플렉스 이미지',
    'nav.sceneDirector': '장면 디렉터',
    'nav.gallery': '갤러리',
    'nav.history': '작업 기록',
    'nav.studio': 'AI 포토 스튜디오',
    'nav.settings': '환경 설정',
    'nav.language': '언어 설정',
    'nav.queue': '대기열',
    'nav.apiKey': 'Gemini API',
    'nav.needKey': '키 입력',
    'nav.syncVault': '클라우드 동기화',
    'nav.syncing': '동기화 중...',

    'subnav.analysis': '이미지 분석',
    'subnav.converter': '프롬프트 변환',
    'subnav.generator': '이미지 생성',
    'subnav.pose': '포즈 변형',
    'subnav.compose': '이미지 합성',
    'subnav.reference': '참조 생성',
    'subnav.upscale': '고화질 확대',
    'subnav.studio': '스튜디오 AI',
    'subnav.scripting': '각본 분할',
    'subnav.veo3': 'Veo 3 Pro',

    'settings.title': '저장소 및 시스템 설정',
    'settings.subtitle': '저장 폴더, 표시 언어, IndexedDB 용량 및 Google 드라이브 관리',
    'settings.tab.language': '언어 (Language)',
    'settings.tab.storage': '저장소 및 폴더',
    'settings.tab.gallery': '갤러리 저장 용량',
    'settings.tab.drive': 'Google 드라이브',
    'settings.tab.antiAi': 'AI 흔적 위장',
    'settings.tab.update': '소프트웨어 업데이트',

    'settings.lang.title': '화면 표시 언어 설정',
    'settings.lang.desc': 'NKI Imagen 앱의 기본 인터페이스 언어를 선택하세요. 설정은 기기에 즉시 저장됩니다.',
    'settings.lang.active': '현재 사용 중',
    'settings.lang.switchSuccess': '언어가 성공적으로 변경되었습니다!',

    'common.save': '저장',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'common.close': '닫기',
    'common.copy': '복사',
    'common.download': '다운로드',
    'common.selectAll': '전체 선택',
    'common.deselectAll': '선택 해제',
    'common.generate': '생성하기',
    'common.processing': '처리 중...',
    'common.success': '완료!',
    'common.error': '오류',
    'common.reset': '초기화',
    'common.back': '뒤로가기',
    'common.search': '검색...',
    'common.filter': '필터',

    'studio.title': 'NKI 포토 스튜디오 프로',
    'studio.badge': '2026 AI Pro',
    'studio.back': '뒤로가기',
    'studio.undo': '실행 취소',
    'studio.redo': '다시 실행',
    'studio.zoomFit': '화면 맞춤',
    'studio.saveGallery': '갤러리에 저장',
    'studio.download': '이미지 다운로드',
    'studio.downloadPng': 'PNG 다운로드 (무손실)',
    'studio.downloadJpg': 'JPG 다운로드 (표준)',
    'studio.downloadAntiAi': '🛡️ AI 흔적 제거 다운로드',
    'studio.compareOriginal': '원본 비교',

    'studio.tool.select': '선택 및 이동 (V)',
    'studio.tool.brush': '영역 선택 브러시 (B)',
    'studio.tool.eraser': '마스크 지우개 (E)',
    'studio.tool.crop': '이미지 자르기 (C)',
    'studio.tool.color': '고급 색상 보정 (G)',
    'studio.tool.hand': '화면 이동 손도구 (H)',
    'studio.clearMask': '선택 영역 초기화',

    'studio.brushSize': '브러시 크기:',
    'studio.brushHardness': '부드러움:',
    'studio.applyCrop': '✓ 자르기 적용',
    'studio.uploadPrompt': '내 컴퓨터에서 이미지 업로드',
    'studio.orSelectGallery': '또는 갤러리에서 바로 선택',

    'studio.tab.aiMagic': 'AI 매직',
    'studio.tab.colorGrading': '컬러 그레이딩',
    'studio.tab.transform': '변형',

    'studio.ai.zeroApiNote': '0 API 토큰: 색상 보정, 회전, 대칭, 자르기는 기기에서 직접 구동됩니다. 아래 AI 기능을 호출할 때만 API가 사용됩니다.',
    'studio.ai.inpaint': '생성형 채우기 (Generative Fill)',
    'studio.ai.inpaintDesc': '사물 추가 및 변경',
    'studio.ai.eraser': '매직 지우개 (Magic Eraser)',
    'studio.ai.eraserDesc': '인물 및 불필요한 사물 제거',
    'studio.ai.expand': '매직 확장 (Magic Expand)',
    'studio.ai.expandDesc': '캔버스 배경 확장',
    'studio.ai.bgReplace': '배경 교체',
    'studio.ai.bgReplaceDesc': '누끼 추출 후 새 배경 합성',
    'studio.ai.inpaintPromptLabel': '생성형 채우기 설명:',
    'studio.ai.hasMask': '✓ 영역 지정됨',
    'studio.ai.noMask': '브러시 영역 없음',
    'studio.ai.executeInpaint': 'AI로 채우기 실행',
    'studio.ai.executeEraser': '사물 즉시 지우기',
    'studio.ai.executeExpand': '캔버스 확장 실행',
    'studio.ai.executeBgReplace': 'AI로 새 배경 교체',
    'studio.ai.engineModel': 'AI 처리 모델',

    'studio.color.presetLib': '프리셋 라이브러리',
    'studio.color.savePreset': '프리셋 저장',
    'studio.color.saveModalTitle': '새 프리셋 이름 입력:',
    'studio.color.saveModalPlaceholder': '예: 한국형 맑은 톤, 무디 틸...',
    'studio.color.tabAll': '전체',
    'studio.color.tabMine': '⭐ 내 프리셋',
    'studio.color.tabCinematic': '🎬 영화 LUT',
    'studio.color.exportJson': 'JSON 내보내기',
    'studio.color.importJson': 'JSON 가져오기',
    'studio.color.myPresets': '⭐ 내가 저장한 프리셋:',
    'studio.color.cinematicPresets': '🎬 시네마틱 프리셋:',
    'studio.color.emptyCustom': '저장된 커스텀 프리셋이 없습니다. 아래 슬라이더를 조절하고 "프리셋 저장"을 눌러 다른 사진에 활용해 보세요!',
    'studio.color.customTag': '커스텀',

    'studio.slider.light': '빛과 톤 (Light & Tone)',
    'studio.slider.exposure': '노출 (Exposure)',
    'studio.slider.brightness': '밝기 (Brightness)',
    'studio.slider.contrast': '대비 (Contrast)',
    'studio.slider.highlights': '밝은 영역 (Highlights)',
    'studio.slider.shadows': '어두운 영역 (Shadows)',
    'studio.slider.color': '색상 균형 (Color Balance)',
    'studio.slider.temp': '색온도 (Temperature)',
    'studio.slider.tempSub': '차가움 ↔ 따뜻함',
    'studio.slider.tint': '색조 (Tint)',
    'studio.slider.tintSub': '초록 ↔ 마젠타',
    'studio.slider.vibrance': '활기 (Vibrance)',
    'studio.slider.saturation': '채도 (Saturation)',
    'studio.slider.details': '질감 및 필름 효과',
    'studio.slider.clarity': '선명도 (Clarity)',
    'studio.slider.sharpness': '윤곽 샤픈 (Sharpness)',
    'studio.slider.filmGrain': '필름 입자 (Film Grain)',
    'studio.slider.vignette': '비네팅 (Vignette)',
    'studio.slider.bake': '색상 보정 이미지에 확정',
    'studio.slider.reset': '↺ 색상 초기화',

    'studio.trans.title': '회전 및 대칭 (Transform)',
    'studio.trans.rotLeft': '반시계 -90°',
    'studio.trans.rotRight': '시계방향 +90°',
    'studio.trans.flipH': '↔ 좌우 대칭',
    'studio.trans.flipV': '↕ 상하 대칭',
    'studio.trans.cropTitle': '자르기 도구',
    'studio.trans.enableCrop': '자르기 영역 켜기',
    'studio.trans.history': '작업 히스토리',

    'gallery.batchSelect': '다중 선택',
    'gallery.selected': '선택됨',
    'gallery.deleteSelected': '선택 항목 삭제',
    'gallery.moveToCollection': '컬렉션으로 이동',
    'gallery.syncDrive': '드라이브 동기화',
    'gallery.cleanDupes': '중복 이미지 정리',
  },

  // ==========================================
  // 6. SPANISH (es)
  // ==========================================
  es: {
    'nav.complexImagen': 'Imagen Complejo',
    'nav.sceneDirector': 'Director de Escena',
    'nav.gallery': 'Galería',
    'nav.history': 'Historial',
    'nav.studio': 'Estudio de Fotos AI',
    'nav.settings': 'Ajustes',
    'nav.language': 'Idioma',
    'nav.queue': 'Cola de Espera',
    'nav.apiKey': 'Gemini API',
    'nav.needKey': 'Ingresar Clave',
    'nav.syncVault': 'Sincronizar Nube',
    'nav.syncing': 'Sincronizando...',

    'subnav.analysis': 'Análisis',
    'subnav.converter': 'Convertidor',
    'subnav.generator': 'Generador',
    'subnav.pose': 'Variantes de Pose',
    'subnav.compose': 'Componer',
    'subnav.reference': 'Referencia',
    'subnav.upscale': 'Mejorar Resolución',
    'subnav.studio': 'Estudio AI',
    'subnav.scripting': 'Guiones',
    'subnav.veo3': 'Veo 3 Pro',

    'settings.title': 'Ajustes del Sistema y Almacenamiento',
    'settings.subtitle': 'Configuración de carpetas, idioma, almacenamiento IndexedDB y Google Drive',
    'settings.tab.language': 'Idioma (Language)',
    'settings.tab.storage': 'Almacenamiento y Carpetas',
    'settings.tab.gallery': 'Memoria de Galería',
    'settings.tab.drive': 'Google Drive',
    'settings.tab.antiAi': 'Camuflaje Anti-IA',
    'settings.tab.update': 'Actualizaciones',

    'settings.lang.title': 'Preferencias de Idioma de la Interfaz',
    'settings.lang.desc': 'Elige tu idioma preferido para NKI Imagen. La configuración se guarda localmente en tu dispositivo.',
    'settings.lang.active': 'Activo',
    'settings.lang.switchSuccess': '¡Idioma cambiado con éxito!',

    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.close': 'Cerrar',
    'common.copy': 'Copiar',
    'common.download': 'Descargar',
    'common.selectAll': 'Seleccionar Todo',
    'common.deselectAll': 'Deseleccionar',
    'common.generate': 'Generar',
    'common.processing': 'Procesando...',
    'common.success': '¡Éxito!',
    'common.error': 'Error',
    'common.reset': 'Restablecer',
    'common.back': 'Volver',
    'common.search': 'Buscar...',
    'common.filter': 'Filtrar',

    'studio.title': 'NKI Estudio de Fotos AI Pro',
    'studio.badge': '2026 AI Pro',
    'studio.back': 'Volver',
    'studio.undo': 'Deshacer',
    'studio.redo': 'Rehacer',
    'studio.zoomFit': 'Ajustar Pantalla',
    'studio.saveGallery': 'Guardar en Galería',
    'studio.download': 'Descargar Imagen',
    'studio.downloadPng': 'Descargar PNG (Sin pérdidas)',
    'studio.downloadJpg': 'Descargar JPG (Estándar)',
    'studio.downloadAntiAi': '🛡️ Descargar Anti-IA',
    'studio.compareOriginal': 'Comparar con Original',

    'studio.tool.select': 'Seleccionar y Mover (V)',
    'studio.tool.brush': 'Pincel de Máscara (B)',
    'studio.tool.eraser': 'Borrador de Máscara (E)',
    'studio.tool.crop': 'Recortar Imagen (C)',
    'studio.tool.color': 'Gradación de Color (G)',
    'studio.tool.hand': 'Mano de Desplazamiento (H)',
    'studio.clearMask': 'Limpiar Máscara',

    'studio.brushSize': 'Tamaño del Pincel:',
    'studio.brushHardness': 'Dureza:',
    'studio.applyCrop': '✓ Aplicar Recorte',
    'studio.uploadPrompt': 'Subir Imagen desde el Equipo',
    'studio.orSelectGallery': 'O seleccionar desde la Galería',

    'studio.tab.aiMagic': 'Magia IA',
    'studio.tab.colorGrading': 'Gradación de Color',
    'studio.tab.transform': 'Transformar',

    'studio.ai.zeroApiNote': '0 Tokens de API: El ajuste de color, rotación, espejo y recorte se ejecutan localmente en tu equipo. Solo las herramientas de IA a continuación consumen API.',
    'studio.ai.inpaint': 'Relleno Generativo',
    'studio.ai.inpaintDesc': 'Agregar o cambiar elementos',
    'studio.ai.eraser': 'Borrador Mágico',
    'studio.ai.eraserDesc': 'Eliminar personas y objetos',
    'studio.ai.expand': 'Expansión Mágica',
    'studio.ai.expandDesc': 'Ampliar el encuadre exterior',
    'studio.ai.bgReplace': 'Cambiar Fondo',
    'studio.ai.bgReplaceDesc': 'Aislar sujeto y colocar nuevo fondo',
    'studio.ai.inpaintPromptLabel': 'Descripción para Relleno Generativo:',
    'studio.ai.hasMask': '✓ Área Seleccionada',
    'studio.ai.noMask': 'Sin Área Pintada',
    'studio.ai.executeInpaint': 'Generar con IA (Relleno)',
    'studio.ai.executeEraser': 'Eliminar Objetos Ahora',
    'studio.ai.executeExpand': 'Expandir Lienzo Ahora',
    'studio.ai.executeBgReplace': 'Reemplazar Fondo con IA',
    'studio.ai.engineModel': 'Modelo de IA',

    'studio.color.presetLib': 'Biblioteca de Ajustes',
    'studio.color.savePreset': 'Guardar Ajuste',
    'studio.color.saveModalTitle': 'Nombre del Nuevo Ajuste Preestablecido:',
    'studio.color.saveModalPlaceholder': 'Ej: Retrato Cálido, Moody Teal...',
    'studio.color.tabAll': 'Todos',
    'studio.color.tabMine': '⭐ Mis Ajustes',
    'studio.color.tabCinematic': '🎬 LUTs de Cine',
    'studio.color.exportJson': 'Exportar JSON',
    'studio.color.importJson': 'Importar JSON',
    'studio.color.myPresets': '⭐ Mis Ajustes Personalizados:',
    'studio.color.cinematicPresets': '🎬 Ajustes Cinemáticos:',
    'studio.color.emptyCustom': 'Aún no tienes ajustes guardados. ¡Mueve los controles abajo y pulsa "Guardar Ajuste" para reutilizarlo!',
    'studio.color.customTag': 'Personalizado',

    'studio.slider.light': 'Luz y Tono (Light & Tone)',
    'studio.slider.exposure': 'Exposición (Exposure)',
    'studio.slider.brightness': 'Brillo (Brightness)',
    'studio.slider.contrast': 'Contraste (Contrast)',
    'studio.slider.highlights': 'Altas Luces (Highlights)',
    'studio.slider.shadows': 'Sombras (Shadows)',
    'studio.slider.color': 'Balance de Color',
    'studio.slider.temp': 'Temperatura (Temperature)',
    'studio.slider.tempSub': 'Frío ↔ Cálido',
    'studio.slider.tint': 'Matiz (Tint)',
    'studio.slider.tintSub': 'Verde ↔ Magenta',
    'studio.slider.vibrance': 'Intensidad Inteligente (Vibrance)',
    'studio.slider.saturation': 'Saturación (Saturation)',
    'studio.slider.details': 'Textura y Efectos de Película',
    'studio.slider.clarity': 'Claridad (Clarity)',
    'studio.slider.sharpness': 'Enfoque (Sharpness)',
    'studio.slider.filmGrain': 'Grano de Película (Film Grain)',
    'studio.slider.vignette': 'Viñeta (Vignette)',
    'studio.slider.bake': 'Fijar Color en la Imagen',
    'studio.slider.reset': '↺ Restablecer Color',

    'studio.trans.title': 'Rotar y Voltear',
    'studio.trans.rotLeft': 'Rotar -90°',
    'studio.trans.rotRight': 'Rotar +90°',
    'studio.trans.flipH': '↔ Voltear Horizontal',
    'studio.trans.flipV': '↕ Voltear Vertical',
    'studio.trans.cropTitle': 'Herramienta de Recorte',
    'studio.trans.enableCrop': 'Activar Marco de Recorte',
    'studio.trans.history': 'Historial de Operaciones',

    'gallery.batchSelect': 'Selección Múltiple',
    'gallery.selected': 'Seleccionados',
    'gallery.deleteSelected': 'Eliminar Seleccionados',
    'gallery.moveToCollection': 'Mover a Colección',
    'gallery.syncDrive': 'Sincronizar a Drive',
    'gallery.cleanDupes': 'Eliminar Duplicados',
  },

  // ==========================================
  // 7. RUSSIAN (ru)
  // ==========================================
  ru: {
    'nav.complexImagen': 'Сложная генерация',
    'nav.sceneDirector': 'Режиссёр сцен',
    'nav.gallery': 'Галерея',
    'nav.history': 'История',
    'nav.studio': 'AI Фотостудия',
    'nav.settings': 'Настройки',
    'nav.language': 'Язык',
    'nav.queue': 'Очередь',
    'nav.apiKey': 'Gemini API',
    'nav.needKey': 'Ввести ключ',
    'nav.syncVault': 'Синхронизация',
    'nav.syncing': 'Синхронизация...',

    'subnav.analysis': 'Анализ',
    'subnav.converter': 'Конвертер',
    'subnav.generator': 'Генератор',
    'subnav.pose': 'Варианты поз',
    'subnav.compose': 'Композиция',
    'subnav.reference': 'Референс',
    'subnav.upscale': 'Увеличение',
    'subnav.studio': 'Студия AI',
    'subnav.scripting': 'Сценарий',
    'subnav.veo3': 'Veo 3 Pro',

    'settings.title': 'Настройки системы и хранилища',
    'settings.subtitle': 'Папки сохранения, язык интерфейса, память IndexedDB и Google Диск',
    'settings.tab.language': 'Язык (Language)',
    'settings.tab.storage': 'Папки и память',
    'settings.tab.gallery': 'Память галереи',
    'settings.tab.drive': 'Google Диск',
    'settings.tab.antiAi': 'Маскировка от ИИ',
    'settings.tab.update': 'Обновления',

    'settings.lang.title': 'Настройки языка интерфейса',
    'settings.lang.desc': 'Выберите удобный для вас язык приложения NKI Imagen. Настройки сохраняются на вашем устройстве автоматически.',
    'settings.lang.active': 'Используется',
    'settings.lang.switchSuccess': 'Язык успешно изменён!',

    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.close': 'Закрыть',
    'common.copy': 'Копировать',
    'common.download': 'Скачать',
    'common.selectAll': 'Выбрать все',
    'common.deselectAll': 'Снять выбор',
    'common.generate': 'Создать',
    'common.processing': 'Обработка...',
    'common.success': 'Успешно!',
    'common.error': 'Ошибка',
    'common.reset': 'Сбросить',
    'common.back': 'Назад',
    'common.search': 'Поиск...',
    'common.filter': 'Фильтр',

    'studio.title': 'NKI AI Фотостудия Pro',
    'studio.badge': '2026 AI Pro',
    'studio.back': 'Назад',
    'studio.undo': 'Отменить',
    'studio.redo': 'Повторить',
    'studio.zoomFit': 'По размеру',
    'studio.saveGallery': 'В галерею',
    'studio.download': 'Скачать фото',
    'studio.downloadPng': 'Скачать PNG (без потерь)',
    'studio.downloadJpg': 'Скачать JPG (стандарт)',
    'studio.downloadAntiAi': '🛡️ Скачать без следов ИИ',
    'studio.compareOriginal': 'Сравнить с оригиналом',

    'studio.tool.select': 'Выбор и перемещение (V)',
    'studio.tool.brush': 'Кисть выделения (B)',
    'studio.tool.eraser': 'Ластик маски (E)',
    'studio.tool.crop': 'Кадрирование (C)',
    'studio.tool.color': 'Цветокоррекция (G)',
    'studio.tool.hand': 'Рука (панорама) (H)',
    'studio.clearMask': 'Очистить маску',

    'studio.brushSize': 'Размер кисти:',
    'studio.brushHardness': 'Мягкость:',
    'studio.applyCrop': '✓ Применить обрезку',
    'studio.uploadPrompt': 'Загрузить фото с компьютера',
    'studio.orSelectGallery': 'Или выбрать быстро из галереи',

    'studio.tab.aiMagic': 'AI Магия',
    'studio.tab.colorGrading': 'Цветокоррекция',
    'studio.tab.transform': 'Трансформация',

    'studio.ai.zeroApiNote': '0 токенов API: Цветокоррекция, поворот, отражение и обрезка работают локально. API расходуется только для AI-инструментов ниже.',
    'studio.ai.inpaint': 'Генеративная заливка',
    'studio.ai.inpaintDesc': 'Добавить или заменить объект',
    'studio.ai.eraser': 'Волшебный ластик',
    'studio.ai.eraserDesc': 'Удаление людей и лишних предметов',
    'studio.ai.expand': 'Умное расширение',
    'studio.ai.expandDesc': 'Расширить границы кадра',
    'studio.ai.bgReplace': 'Замена фона',
    'studio.ai.bgReplaceDesc': 'Отделение объекта и новый фон',
    'studio.ai.inpaintPromptLabel': 'Описание для генеративной заливки:',
    'studio.ai.hasMask': '✓ Область выбрана',
    'studio.ai.noMask': 'Область не закрашена',
    'studio.ai.executeInpaint': 'Создать с помощью AI',
    'studio.ai.executeEraser': 'Удалить объект сейчас',
    'studio.ai.executeExpand': 'Расширить кадр',
    'studio.ai.executeBgReplace': 'Заменить фон через AI',
    'studio.ai.engineModel': 'AI Движок',

    'studio.color.presetLib': 'Библиотека пресетов',
    'studio.color.savePreset': 'Сохранить пресет',
    'studio.color.saveModalTitle': 'Название нового пресета:',
    'studio.color.saveModalPlaceholder': 'Например: Теплый портрет, Кино-тон...',
    'studio.color.tabAll': 'Все',
    'studio.color.tabMine': '⭐ Мои пресеты',
    'studio.color.tabCinematic': '🎬 Кино-LUTs',
    'studio.color.exportJson': 'Экспорт JSON',
    'studio.color.importJson': 'Импорт JSON',
    'studio.color.myPresets': '⭐ Мои сохранённые пресеты:',
    'studio.color.cinematicPresets': '🎬 Кинематографичные пресеты:',
    'studio.color.emptyCustom': 'Нет сохранённых пресетов. Отрегулируйте ползунки ниже и нажмите "Сохранить пресет"!',
    'studio.color.customTag': 'Свой',

    'studio.slider.light': 'Свет и тон (Light & Tone)',
    'studio.slider.exposure': 'Экспозиция (Exposure)',
    'studio.slider.brightness': 'Яркость (Brightness)',
    'studio.slider.contrast': 'Контрастность (Contrast)',
    'studio.slider.highlights': 'Светлые тона (Highlights)',
    'studio.slider.shadows': 'Тени (Shadows)',
    'studio.slider.color': 'Цветовой баланс',
    'studio.slider.temp': 'Температура (Temperature)',
    'studio.slider.tempSub': 'Холодный ↔ Тёплый',
    'studio.slider.tint': 'Оттенок (Tint)',
    'studio.slider.tintSub': 'Зелёный ↔ Пурпурный',
    'studio.slider.vibrance': 'Красочность (Vibrance)',
    'studio.slider.saturation': 'Насыщенность (Saturation)',
    'studio.slider.details': 'Текстура и эффекты плёнки',
    'studio.slider.clarity': 'Чёткость (Clarity)',
    'studio.slider.sharpness': 'Резкость (Sharpness)',
    'studio.slider.filmGrain': 'Зернистость плёнки (Film Grain)',
    'studio.slider.vignette': 'Виньетка (Vignette)',
    'studio.slider.bake': 'Зафиксировать цвета на фото',
    'studio.slider.reset': '↺ Сброс цвета',

    'studio.trans.title': 'Поворот и отражение',
    'studio.trans.rotLeft': 'Поворот -90°',
    'studio.trans.rotRight': 'Поворот +90°',
    'studio.trans.flipH': '↔ Отразить по горизонтали',
    'studio.trans.flipV': '↕ Отразить по вертикали',
    'studio.trans.cropTitle': 'Кадрирование',
    'studio.trans.enableCrop': 'Включить рамку обрезки',
    'studio.trans.history': 'История действий',

    'gallery.batchSelect': 'Массовый выбор',
    'gallery.selected': 'Выбрано',
    'gallery.deleteSelected': 'Удалить выбранные',
    'gallery.moveToCollection': 'В коллекцию',
    'gallery.syncDrive': 'Синхронизировать с Диском',
    'gallery.cleanDupes': 'Удалить дубликаты',
  }
};

/**
 * Get the currently active application language
 */
export const getAppLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return 'vi';
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage;
  if (saved && ['vi', 'en', 'zh', 'th', 'ko', 'es', 'ru'].includes(saved)) {
    return saved;
  }
  return 'vi'; // Default Vietnamese
};

/**
 * Set and persist the application language, broadcasting the change to all listeners
 */
export const setAppLanguage = (lang: AppLanguage): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language: lang } }));
};

/**
 * Translate a key into the active or specified language
 */
export const t = (key: string, lang?: AppLanguage, fallback?: string): string => {
  const currentLang = lang || getAppLanguage();
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.vi;
  if (dict && dict[key] !== undefined) {
    return dict[key];
  }
  // Fallback to Vietnamese dictionary
  if (TRANSLATIONS.vi && TRANSLATIONS.vi[key] !== undefined) {
    return TRANSLATIONS.vi[key];
  }
  return fallback !== undefined ? fallback : key;
};

/**
 * React Hook for reactive translations
 */
export const useTranslation = () => {
  const [currentLang, setCurrentLang] = useState<AppLanguage>(getAppLanguage);

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ language: AppLanguage }>;
      if (customEvent.detail?.language) {
        setCurrentLang(customEvent.detail.language);
      } else {
        setCurrentLang(getAppLanguage());
      }
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLangChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLangChange);
  }, []);

  const changeLanguage = (lang: AppLanguage) => {
    setAppLanguage(lang);
    setCurrentLang(lang);
  };

  const translate = (key: string, fallback?: string) => {
    return t(key, currentLang, fallback);
  };

  return {
    lang: currentLang,
    setLanguage: changeLanguage,
    t: translate,
    languages: SUPPORTED_LANGUAGES,
    currentLanguageInfo: SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0]
  };
};
