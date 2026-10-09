/**
 * Photo Studio Comprehensive Instruction & Workflow Knowledge Base
 * Structured guidelines for all tools, AI features, shortcuts, and best practices.
 */

export interface InstructionItem {
  id: string;
  category: 'quickstart' | 'anti_ai' | 'photoshop' | 'ai_magic' | 'portrait_lighting' | 'character_env' | 'shortcuts';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  summary: string;
  steps: string[];
  tips?: string[];
  recommendedTool?: string; // e.g. 'curves', 'hsl', 'liquify', 'dodge_burn', 'clone_stamp', 'brush'
  recommendedTab?: string;  // e.g. 'curves', 'hsl', 'liquify', 'retouch_brushes', 'beauty_retouch', 'optical_bokeh'
  shortcut?: string;
}

export const INSTRUCTION_CATEGORIES = [
  { id: 'all', label: 'Tất Cả', icon: 'M4 6h16M4 12h16M4 18h7' },
  { id: 'quickstart', label: 'Bắt Đầu', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { id: 'anti_ai', label: 'Khử Dấu AI', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'photoshop', label: 'Photoshop Pro', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  { id: 'ai_magic', label: 'AI Magic', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { id: 'portrait_lighting', label: 'Chân Dung & Đèn', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'shortcuts', label: 'Bảng Phím Tắt', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
] as const;

export const INSTRUCTIONS_DATA: InstructionItem[] = [
  // 0. ANTI-AI STEALTH GUIDE
  {
    id: 'anti_ai_hive_bypass',
    category: 'anti_ai',
    title: 'Bí Quyết Xuất Ảnh Khử Dấu AI & Bypass Hive Detect (0% AI)',
    subtitle: 'Triệt hạ mã gemini3 và xóa bỏ hoàn toàn thủy ấn SynthID của Google Imagen 3',
    badge: 'Mới v4.3',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    summary: 'Hive Detect và các công cụ kiểm tra AI nhận diện ảnh qua 3 dấu vết: Thủy ấn vi mô SynthID, lưới điểm ảnh tuần hoàn VAE và làn da sáp siêu mịn. Hệ thống Khử Dấu AI Pro áp dụng 5 lớp quang học vật lý để biến ảnh AI thành ảnh chụp máy ảnh thực 100%.',
    steps: [
      'Bước 1 - Kích hoạt Khiên Khử Dấu AI: Nhìn lên thanh công cụ góc trên bên phải, bấm vào nút "Khử Dấu AI".',
      'Bước 2 - Chọn Cấp độ "Tối Thượng (Ultra Stealth)": Đây là cấu hình đặc trị dành riêng cho Hive Detect, tự động kích hoạt vi biến dạng đàn hồi Sub-pixel và dither dải tần trung SynthID.',
      'Bước 3 - Chọn Hồ sơ Máy ảnh thực tế: Chọn Sony Alpha 7 IV (FE 50mm f/1.2 GM) hoặc Leica M11 để cấy mã cảm biến, ống kính và firmware chuẩn.',
      'Bước 4 - Xuất ảnh: Bấm "Tải Khử Dấu AI Tối Thượng" (hoặc chọn trong menu Xuất Ảnh). File tải về sẽ mang đuôi _stealth_cam.jpg với đầy đủ EXIF máy ảnh.',
      'Bước 5 - Kiểm chứng trên Hive Detect: Tải file vừa xuất lên Hive Moderation (hivemoderation.com/ai-generated-content-detection). Thang điểm AI sẽ rơi tự do từ 99.9% xuống dưới 5% (Natural Human Photo).'
    ],
    tips: [
      'Nếu ảnh có vùng da mặt hoặc cánh tay lớn, công nghệ Dermis Micro-Pore sẽ tự động cấy vi hạt lỗ chân lông tự nhiên để xóa sạch biểu hiện da sáp búp bê.',
      'Vi biến dạng Sub-Pixel (Elastic Phase Warp) dịch chuyển toạ độ dưới 0.6 pixel nên mắt thường hoàn toàn không thấy khác biệt, nhưng khiến mạng nơ-ron nhận diện mất đồng pha hoàn toàn.'
    ]
  },

  // 1. QUICKSTART
  {
    id: 'qs_standard_workflow',
    category: 'quickstart',
    title: 'Quy Trình 5 Bước Biên Tập Ảnh Chuẩn Studio',
    subtitle: 'Lộ trình tối ưu từ ảnh gốc đến kiệt tác nghệ thuật',
    badge: 'Khuyên Dùng',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    summary: 'Áp dụng quy trình chuẩn giúp tiết kiệm thời gian và đảm bảo chất lượng chi tiết ảnh ở mức cao nhất.',
    steps: [
      'Bước 1 - Khung hình & Tỉ lệ: Dùng công cụ Crop (Phím C) để loại bỏ góc thừa và căn góc bố cục 1/3 chuẩn thị giác.',
      'Bước 2 - Xóa khuyết điểm & Nắn dáng: Dùng Clone Stamp (Phím S) xóa mụn/rác, sau đó mở Liquify (Phím W) để nắn thon gọn cằm và tỉ lệ khuôn mặt.',
      'Bước 3 - Mịn da tách tần số: Mở tab Mịn Da để lọc sạch đốm da mà vẫn giữ nguyên 100% vân lỗ chân lông tự nhiên.',
      'Bước 4 - Cân chỉnh khối & Màu sắc: Dùng Dodge & Burn (Phím O) tạo khối sống mũi và gò má; dùng Curves (Phím M) và HSL 8-Kênh (Phím J) để phối màu điện ảnh.',
      'Bước 5 - Ánh sáng & Xuất ảnh: Giả lập khẩu độ xóa phông (tab Khẩu Độ) hoặc setup đèn studio 3D ảo, sau đó bấm Lưu / Tải Về.'
    ],
    tips: [
      'Mọi thao tác cọ vẽ, nắn hình và chỉnh màu đều hỗ trợ hoàn tác Undo (Ctrl+Z) và Redo (Ctrl+Y).',
      'Giữ phím Space (hoặc bấm phím H) để kéo rê bức ảnh mọi lúc mà không làm mất công cụ đang chọn.'
    ]
  },

  // 2. PHOTOSHOP PRO: CURVES & LEVELS
  {
    id: 'ps_curves_levels',
    category: 'photoshop',
    title: 'Đồ Thị Curves & Levels 4 Kênh Chuyên Nghiệp',
    subtitle: 'Điều chỉnh độ tương phản, dải sắc độ và màu sắc chính xác (0 API)',
    badge: 'Phím M',
    badgeColor: 'bg-white/10 text-white border-white/20',
    summary: 'Đồ thị Curves cung cấp khả năng can thiệp vào từng dải sáng (Shadows, Midtones, Highlights) trên kênh tổng hợp RGB hoặc từng kênh màu riêng biệt Đỏ, Lục, Lam.',
    steps: [
      '1. Mở bảng Curves: Bấm phím M trên bàn phím hoặc nhấn tab "Curves" ở sidebar bên phải.',
      '2. Chọn kênh màu: Nhấp vào tab RGB (chỉnh sáng tối tổng thể), R (Đỏ/Lục lam), G (Lục/Tím), hoặc B (Lam/Vàng).',
      '3. Thêm điểm điều khiển: Nhấp chuột vào bất kỳ điểm nào trên đường cong spline để tạo điểm nút mới.',
      '4. Kéo nút tạo dáng S-Curve: Kéo nhẹ điểm vùng sáng (1/4 trên bên phải) lên trên, và kéo điểm vùng tối (1/4 dưới bên trái) xuống dưới để tăng độ tương phản trong trẻo.',
      '5. Cân bằng Levels: Kéo thanh trượt Shadow (đen), Midtone Gamma (xám trung tính) và Highlight (trắng) để khử sương mờ.',
      '6. Bấm "Áp Dụng Vào Ảnh" để nướng các thông số trực tiếp vào Canvas và lưu vào lịch sử hoàn tác.'
    ],
    tips: [
      'Để xóa một điểm điều khiển trên Curves, nhấp chọn điểm đó rồi bấm nút "Xóa Điểm Đang Chọn".',
      'Xem biểu đồ phân bố quang phổ (Histogram) màu xám mờ phía sau lưới đồ thị để biết vùng ảnh của bạn đang thừa sáng hay thiếu sáng.'
    ],
    recommendedTool: 'curves',
    recommendedTab: 'curves',
    shortcut: 'M'
  },

  // 3. PHOTOSHOP PRO: 8-CHANNEL HSL
  {
    id: 'ps_hsl_mixer',
    category: 'photoshop',
    title: 'Bộ Trộn Màu Chọn Lọc 8 Kênh HSL Mixer',
    subtitle: 'Kiểm soát màu sắc độc lập như Adobe Camera Raw & Lightroom',
    badge: 'Phím J',
    badgeColor: 'bg-white/10 text-white border-white/20',
    summary: 'Cho phép can thiệp sắc độ (Hue), độ bão hòa (Saturation) và độ sáng (Luminance) của 8 dải màu riêng biệt mà không làm biến dạng các màu sắc khác.',
    steps: [
      '1. Kích hoạt: Nhấn phím J hoặc chọn tab "HSL 8-Kênh" ở sidebar bên phải.',
      '2. Chọn dải màu cần chỉnh: Nhấp vào viên thuốc màu tương ứng (ví dụ: Cam cho da người, Xanh lá cho cây cối, Xanh dương cho bầu trời).',
      '3. Chỉnh tông da tự nhiên: Chọn dải "Cam (Oranges)", tăng nhẹ Luminance (+15) để nâng tông sáng mịn da, hạ nhẹ Saturation (-5) để da thanh thoát không bị ám vàng.',
      '4. Phối màu Teal & Orange điện ảnh: Kéo Cyans / Blues về màu Teal (Hue -20) và tăng nhẹ Oranges.',
      '5. Bấm "Áp Dụng HSL Vào Ảnh" để lưu cố định.'
    ],
    tips: [
      'Sử dụng các preset có sẵn như "Porcelain Skin Glow" hoặc "Hollywood Teal & Orange" để lên màu cực nhanh chỉ với 1 cú click.'
    ],
    recommendedTool: 'hsl',
    recommendedTab: 'hsl',
    shortcut: 'J'
  },

  // 4. PHOTOSHOP PRO: LIQUIFY
  {
    id: 'ps_liquify_warp',
    category: 'photoshop',
    title: 'Bộ Nắn Khuôn Mặt & Thon Gọn Liquify Warp',
    subtitle: 'Nắn cằm V-line, nâng mũi, làm đầy môi và bóp eo chuẩn thẩm mỹ',
    badge: 'Phím W',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    summary: 'Sử dụng thuật toán nội suy Bilinear Sub-Pixel giúp các biến dạng mượt mà, giữ trọn vẹn độ nét của da và đường viền áo mà không bị vỡ ảnh.',
    steps: [
      '1. Kích hoạt công cụ: Bấm phím W hoặc chọn biểu tượng Liquify trên thanh công cụ bên trái.',
      '2. Chọn chế độ nắn mong muốn:',
      '   • Nắn Đẩy (Push): Đặt tâm cọ lên cạnh hàm hoặc vòng eo, kéo nhẹ vào trong để tạo nét thon gọn.',
      '   • Phóng To (Bloat): Đặt tâm cọ vào tròng mắt hoặc cánh môi, click giữ chuột để phóng to nhẹ nhàng tự nhiên.',
      '   • Thu Nhỏ (Pinch): Đặt tâm cọ vào cánh mũi hoặc bọng mắt để thu gọn kích thước.',
      '   • Khôi Phục (Reconstruct): Quét cọ lên những vùng vừa nắn để phục hồi từng phần về ảnh gốc ban đầu.',
      '3. Điều chỉnh Cỡ cọ (Size) lớn hơn chi tiết cần nắn một chút để lực biến dạng phân bổ đều mượt mà.'
    ],
    tips: [
      'Nếu lỡ nắn quá tay, bạn có thể bấm nút "Khôi phục gốc (Reconstruct All)" trên thanh capsule nổi trên đầu ảnh hoặc bấm Ctrl+Z để hoàn tác từng nét vẽ.',
      'Nên để Áp lực (Pressure) khoảng 30% - 50% để nắn từ tốn, tự nhiên nhất.'
    ],
    recommendedTool: 'liquify',
    recommendedTab: 'liquify',
    shortcut: 'W'
  },

  // 5. PHOTOSHOP PRO: CLONE STAMP & HEALING
  {
    id: 'ps_clone_stamp',
    category: 'photoshop',
    title: 'Đóng Dấu Clone Stamp & Xóa Khuyết Điểm (Spot Healer)',
    subtitle: 'Lấy mẫu da sạch đắp lên vùng mụn, tàn nhang, nếp nhăn và rác',
    badge: 'Phím S',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    summary: 'Chế độ Healing Texture Mode giữ nguyên khối sáng tự nhiên của vùng đích, chỉ ghép vân da sắc nét từ điểm nguồn mẫu.',
    steps: [
      '1. Chọn công cụ: Bấm phím S trên bàn phím hoặc nhấp biểu tượng Stamp ở thanh công cụ bên trái.',
      '2. Lấy mẫu nguồn (Quan trọng): Giữ phím ALT trên bàn phím, đồng thời CLICK CHUỘT TRÁI vào một vùng da sạch, láng mịn gần khuyết điểm.',
      '3. Thả phím ALT: Bạn sẽ thấy tâm ngắm màu xanh ngọc hiển thị rõ chữ "SOURCE (ALT)" tại tọa độ vừa lấy mẫu.',
      '4. Chấm lên khuyết điểm: Di chuyển chuột đến nốt mụn hoặc vết sẹo cần xóa và click nhẹ chuột để đóng dấu thay thế.',
      '5. Đổi điểm mẫu: Bất kỳ lúc nào bạn cũng có thể giữ ALT + Click vào vùng da mới để cập nhật mẫu nguồn phù hợp với tone sáng tại chỗ.'
    ],
    tips: [
      'Bật tính năng "Hòa Trộn Vân Da (Texture Healing Mode)" trong bảng Retouch để màu da không bị loang lổ hay lệch ánh sáng.',
      'Điều chỉnh Độ Mềm Cọ (Hardness) về khoảng 30% để rìa nét vẽ hòa quyện tự nhiên không để lại viền sắc.'
    ],
    recommendedTool: 'clone_stamp',
    recommendedTab: 'retouch_brushes',
    shortcut: 'S'
  },

  // 6. PHOTOSHOP PRO: DODGE & BURN
  {
    id: 'ps_dodge_burn',
    category: 'photoshop',
    title: 'Cọ Tạo Khối Sáng Tối Dodge & Burn',
    subtitle: 'Nâng sống mũi cao, làm sáng mắt, tạo khối gò má và mắt sâu hút hồn',
    badge: 'Phím O',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    summary: 'Mô phỏng kỹ thuật phòng tối cổ điển: Dodge làm sáng vùng đón sáng, Burn làm sâu các vùng đổ bóng để tạo chiều sâu 3D cho gương mặt.',
    steps: [
      '1. Kích hoạt: Bấm phím O hoặc chọn tab Retouch -> chọn Dodge & Burn.',
      '2. Chọn chế độ:',
      '   • Làm Sáng (Dodge): Quét dọc sống mũi, gò má, nhân trung và trán để bắt sáng căng bóng.',
      '   • Làm Tối (Burn): Quét 2 bên cánh mũi, viền cằm dưới và hốc mắt để tạo góc cạnh thon gọn.',
      '3. Chọn dải ánh sáng mục tiêu (Tonal Range):',
      '   • Shadows: Chỉ tác động lên vùng tối sâu.',
      '   • Midtones: Tác động lên da và sắc độ trung tính (khuyên dùng cho chân dung).',
      '   • Highlights: Chỉ tác động lên vùng phản chiếu ánh sáng lấp lánh.'
    ],
    tips: [
      'Nên đặt Exposure ở mức nhẹ từ 15% - 25% và quét nhiều đường nhẹ để sắc độ hòa tan tự nhiên.',
      'Có thể dùng phím Ctrl+Z để quay lại nếu nét vẽ quá sáng hoặc quá tối.'
    ],
    recommendedTool: 'dodge_burn',
    recommendedTab: 'retouch_brushes',
    shortcut: 'O'
  },

  // 7. AI MAGIC: GENERATIVE FILL & ERASER
  {
    id: 'ai_generative_fill',
    category: 'ai_magic',
    title: 'Generative Fill AI & Magic Inpaint',
    subtitle: 'Vẽ thêm vật thể, đổi trang phục, đổi phụ kiện theo trí tưởng tượng',
    badge: 'Gemini AI',
    badgeColor: 'bg-white text-black font-bold',
    summary: 'Tận dụng các mô hình Gemini 3.1 & Imagen tiên tiến nhất để phân tích ngữ cảnh ảnh và tạo nội dung mới liền mạch.',
    steps: [
      '1. Chọn cọ Mask: Bấm phím B hoặc nhấp biểu tượng Cọ Mask.',
      '2. Quét chọn vùng cần thay đổi: Dùng cọ vẽ bao phủ lên chi tiết muốn thay thế (vùng chọn màu đỏ mờ).',
      '3. Nhập câu lệnh (Prompt): Nhập mô tả chi tiết bằng tiếng Việt hoặc tiếng Anh (ví dụ: "chiếc vòng cổ kim cương lấp lánh", "kính râm retro thời trang").',
      '4. Bấm "Tạo Bằng AI": Hệ thống sẽ gửi vùng chọn và ảnh sang mô hình AI để render kết quả chân thực nhất.',
      '5. Nếu muốn xóa vật thể thừa không cần prompt, chuyển sang tab "Magic Eraser" rồi bấm Xóa.'
    ],
    tips: [
      'Bạn có thể dùng công cụ SAM 2 Smart Segment ở viên nang nổi phía dưới để khoanh vùng tự động vật thể chỉ trong 1 click.',
      'Dùng phím E để chuyển nhanh sang Cục Tẩy nếu quét cọ lấn ra ngoài.'
    ],
    recommendedTool: 'brush',
    recommendedTab: 'ai_magic',
    shortcut: 'B'
  },

  // 8. AI MAGIC: EXPAND & BG REPLACE
  {
    id: 'ai_expand_bg',
    category: 'ai_magic',
    title: 'Magic Expand (Mở Rộng Ảnh) & Background Replace (Đổi Nền)',
    subtitle: 'Mở rộng góc nhìn 16:9 điện ảnh và thay đổi toàn bộ không gian bối cảnh',
    badge: 'Outpaint AI',
    badgeColor: 'bg-white/10 text-white border-white/20',
    summary: 'Biến ảnh chụp chân dung dọc thành ảnh ngang góc rộng hoặc đưa người mẫu vào các studio sang trọng quốc tế.',
    steps: [
      '1. Mở rộng khung hình (Magic Expand): Chọn tỉ lệ mong muốn (16:9, 9:16, 4:3), nhập mô tả môi trường mở rộng thêm và bấm "Mở Rộng Khung Cảnh".',
      '2. Đổi phông nền (Background Replace): Nhập mô tả bối cảnh mới (ví dụ: "studio phong cách tối giản Bắc Âu, ánh sáng cửa sổ tự nhiên"), AI sẽ tự động bóc tách chủ thể và ghép vào phối cảnh mới chuẩn sáng.'
    ],
    tips: [
      'Sau khi mở rộng hoặc đổi nền, bạn có thể dùng thêm Color Grading hoặc Optical Bokeh để đồng bộ màu sắc và chiều sâu trường ảnh.'
    ],
    recommendedTab: 'ai_magic'
  },

  // 9. PORTRAIT: BEAUTY RETOUCH & OPTICAL BOKEH
  {
    id: 'portrait_beauty_bokeh',
    category: 'portrait_lighting',
    title: 'Mịn Da Tách Tần Số & Xóa Phông Khẩu Độ Quang Học',
    subtitle: '100% Xử lý Client-Side tốc độ cao, không tốn API token',
    badge: '0 API Token',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    summary: 'Bộ xử lý quang học cao cấp mô phỏng ống kính máy ảnh khẩu lớn f/1.2 và quy trình Frequency Separation của các nhiếp ảnh gia hàng đầu.',
    steps: [
      '1. Mịn da chuyên nghiệp (Beauty Retouch): Mở tab "Mịn Da", kéo thanh bán kính làm mịn để loại bỏ đốm sần. Tăng thanh "Độ Nét Vân Da" để giữ lại toàn bộ chi tiết biểu bì thật.',
      '2. Xóa phông quang học (Optical Bokeh): Mở tab "Khẩu Độ", nhấp nút "Chọn Điểm Nét (Focus Picker)" và click vào mắt người mẫu trên ảnh.',
      '3. Chọn khẩu độ: Trượt thanh trượt khẩu độ về f/1.2 hoặc f/1.8 để làm mờ phông nền mềm mượt, nổi bật chủ thể.'
    ],
    tips: [
      'Tâm ngắm điểm nét (FOCUS CROSSHAIR) màu xanh lơ hiển thị trực tiếp trên ảnh giúp bạn biết chính xác mặt phẳng nét đang nằm ở đâu.'
    ],
    recommendedTab: 'beauty_retouch'
  },

  // 10. STUDIO LIGHTING 3D & GOBO
  {
    id: 'lighting_3d_gobo',
    category: 'portrait_lighting',
    title: 'Phòng Đèn Studio 3D & Hắt Bóng Gobo Điện Ảnh',
    subtitle: 'Bố trí nguồn sáng Key Light, Rim Light và đổ bóng lá cây/cửa sổ',
    badge: '3D Simulation',
    badgeColor: 'bg-white/10 text-white border-white/20',
    summary: 'Chiếu sáng đa hướng mô phỏng nguồn sáng đèn studio chuyên nghiệp và bóng râm quang học thể tích.',
    steps: [
      '1. Setup đèn 3D: Mở tab "Đèn 3D", kéo quả cầu ánh sáng trong không gian để xác định hướng chiếu nguồn sáng chính.',
      '2. Chỉnh màu đèn & Công suất: Lựa chọn màu đèn ấm vàng hoàng hôn, neon cyberpunk hoặc ánh sáng trắng ban ngày.',
      '3. Chiếu bóng Gobo: Mở tab "Gobo 3D", chọn mẫu bóng râm (như lá cọ nhiệt đới, rèm cửa sổ Venice, nan chớp) để tạo chiều sâu ấn tượng cho ảnh chân dung.'
    ],
    tips: [
      'Bảng điều khiển đèn có chế độ xem trước trực tiếp trên Canvas trước khi áp dụng.'
    ],
    recommendedTab: 'studio_lighting'
  },

  // 11. SHORTCUTS CHEAT SHEET
  {
    id: 'shortcuts_cheat_sheet',
    category: 'shortcuts',
    title: 'Bảng Tổng Hợp Phím Tắt Thao Tác Nhanh',
    subtitle: 'Ghi nhớ phím tắt để tăng tốc độ làm việc như Photoshop chuyên nghiệp',
    badge: 'Toàn Diện',
    badgeColor: 'bg-white text-black font-bold',
    summary: 'Hệ thống phím tắt một chạm chuẩn hóa tương đồng hoàn toàn với Adobe Photoshop.',
    steps: [
      '• M : Mở nhanh đồ thị Curves & Levels',
      '• J : Mở nhanh bộ trộn màu 8-Kênh HSL Mixer',
      '• W : Kích hoạt cọ nắn dáng Liquify Warp',
      '• O : Kích hoạt cọ sáng/tối Dodge & Burn',
      '• S : Kích hoạt cọ đóng dấu xóa khuyết điểm Clone Stamp',
      '• Alt + Click : Lấy tọa độ mẫu nguồn cho Clone Stamp',
      '• B / E : Cọ quét vùng chọn AI / Cục tẩy nét vẽ',
      '• V / H : Công cụ Di chuyển (Select) / Bàn tay Pan di chuyển',
      '• C / G : Cắt khung hình (Crop) / Chỉnh màu nâng cao LUT',
      '• Giữ Space : Kéo rê khung hình tức thì (Quick Pan)',
      '• Ctrl + Z : Hoàn tác bước trước đó (Undo)',
      '• Ctrl + Y (hoặc Ctrl+Shift+Z) : Làm lại thao tác vừa hoàn tác (Redo)',
      '• Ctrl + D hoặc Esc : Hủy bỏ vùng chọn cọ (Deselect)'
    ],
    tips: [
      'Khi dùng cọ vẽ, bạn có thể chỉnh nhanh bán kính cọ trên thanh capsule ngang phía trên đầu ảnh.'
    ]
  }
];
