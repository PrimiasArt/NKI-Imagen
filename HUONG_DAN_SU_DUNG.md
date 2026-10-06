# Hướng Dẫn Sử Dụng & Triển Khai Ứng Dụng Độc Lập HLC Imagen v4.3

Ứng dụng **HLC Imagen v4.3** đã được chuyển đổi thành **App độc lập (Standalone Application)**, chạy trực tiếp trên máy tính của bạn và gọi API Google Gemini mà không phụ thuộc vào sandbox AI Studio hay nền tảng thứ ba.

---

## 🚀 1. Khởi động nhanh bằng 1 cú nhấp chuột (Khuyến nghị trên Windows)

Chỉ cần **nhấp đúp** vào tệp:
```text
start-app.bat
```
Tệp này sẽ tự động:
- Kiểm tra môi trường Node.js.
- Cài đặt thư viện phụ thuộc (`npm install`) nếu chưa có.
- Khởi chạy web server nội bộ tại địa chỉ `http://localhost:3000`.
- Tự động mở trình duyệt web mặc định để bạn sử dụng ngay.

---

## 💻 2. Khởi động bằng dòng lệnh (Terminal / PowerShell)

1. Cài đặt các gói phụ thuộc (chỉ cần chạy lần đầu):
   ```bash
   npm install
   ```
2. Khởi chạy máy chủ phát triển (Dev server):
   ```bash
   npm run dev
   ```
   Sau đó mở trình duyệt và truy cập: **`http://localhost:3000`**

3. Đóng gói ứng dụng thành phẩm (Production Build):
   ```bash
   npm run build
   npm run preview
   ```

---

## 🔑 3. Cấu hình Google Gemini API Key

Bạn có thể cung cấp API Key theo 2 cách cực kỳ tiện lợi:

### Cách A: Nhập trực tiếp trên Giao diện Web (Tiện lợi nhất)
1. Khi mở ứng dụng lần đầu, cửa sổ **Cài đặt Google Gemini API Key** sẽ tự động hiển thị (hoặc bấm vào nút **🔑 Nhập API Key** trên thanh menu trên cùng).
2. Dán mã API Key của bạn vào ô nhập liệu.
3. Bấm **Kiểm tra kết nối** để kiểm tra API Key với máy chủ Google Gemini.
4. Bấm **Lưu API Key** — Key sẽ được lưu an toàn trong trình duyệt (`localStorage`) của bạn, không bao giờ gửi đi đâu khác. Lần sau mở lại app bạn không cần nhập lại.

### Cách B: Cấu hình qua tệp `.env.local`
1. Mở tệp `.env.local` trong thư mục gốc dự án.
2. Điền khóa API của bạn vào:
   ```env
   GEMINI_API_KEY=AIzaSy...chuoi_khoa_cua_ban...
   ```
3. Khởi động lại ứng dụng.

### 💡 Cách lấy Google Gemini API Key miễn phí:
1. Truy cập [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Đăng nhập tài khoản Google.
3. Bấm nút **Create API key** (chọn Create API key in new project).
4. Sao chép chuỗi ký tự API Key (bắt đầu bằng `AIzaSy...`).

---

## 🌟 4. Các tính năng chính trong ứng dụng

1. **Phân tích ảnh sang JSON (Image to JSON - Analysis)**:
   - Tải lên một bức ảnh bất kỳ.
   - AI đóng vai trò Đạo diễn hình ảnh (Director of Photography - DoP) phân tích chi tiết: Trang phục, nhân vật, chất liệu, ánh sáng, góc máy, tiêu cự lens, bảng màu, bố cục thành cấu trúc JSON chuẩn.

2. **Chuyển văn bản sang JSON (Converter)**:
   - Nhập mô tả ý tưởng bằng văn bản tự nhiên, AI sẽ biến thành cấu trúc JSON chuyên nghiệp.

3. **Tạo ảnh từ JSON (Generator)**:
   - Sinh ảnh từ cấu trúc JSON đã tinh chỉnh.
   - Hỗ trợ giữ nhận diện khuôn mặt nhân vật qua ảnh tham chiếu (Identity Reference), giữ kiểu tóc hoặc cho phép tạo nhân vật nam / nữ riêng biệt.
   - Lựa chọn tỷ lệ khung hình: `1:1`, `3:4`, `4:3`, `9:16`, `16:9`, v.v.

4. **Tạo biến thể tư thế (Pose Engine)**:
   - Giữ nguyên trang phục, kiểu tóc, khuôn mặt và bối cảnh của nhân vật nhưng thay đổi tư thế, góc chụp mới.

5. **Ghép ảnh nâng cao (Neural Compose)**:
   - Kết hợp các chi tiết từ nhiều hình ảnh tham chiếu lại với nhau.

6. **Ghép nhân vật & trang phục (Reference Creation)**:
   - Đưa nhân vật ở Ảnh 1 mặc bộ trang phục ở Ảnh 2 mà vẫn giữ nguyên tư thế và thần thái.

7. **Nâng cấp độ phân giải (Super-Resolution Upscale 2K / 4K)**:
   - Tái tạo chi tiết sắc nét, khử mờ, khử nhiễu và upscale ảnh lên chuẩn 2K / 4K.

8. **Scenario Director & Veo 3 Video Prompt**:
   - Phân rã ý tưởng phim thành các phân cảnh kịch bản chi tiết.
   - Tự động sinh Prompt tối ưu cho mô hình video AI Veo 3 từ ảnh đầu và ảnh cuối.

9. **Thư viện ảnh (Gallery) & Lưu trữ cá nhân (Presets)**:
   - Lưu trữ các prompt mẫu theo phong cách, nhân vật yêu thích.
   - Xuất file ZIP chứa đầy đủ ảnh và file metadata JSON.
   - Hỗ trợ đồng bộ hóa với Google Drive nếu muốn.

10. **Hệ thống hàng đợi thông minh & Synaptic Cooling**:
    - Tự động theo dõi RPM (Requests Per Minute) và TPM (Tokens Per Minute) theo thời gian thực.
    - Tự động kích hoạt cơ chế đếm ngược làm mát khi chạm giới hạn hạn ngạch (429 Quota Exceeded) để bảo vệ API key và tránh bị Google khóa tạm thời.

---

## 🛠️ 5. Cấu trúc thư mục dự án

```text
├── components/                 # Các component giao diện React
│   ├── ApiKeyModal.tsx         # Modal cài đặt & kiểm tra Gemini API Key
│   ├── GenerationQueueDrawer.tsx
│   ├── JsonPromptEditor.tsx
│   ├── PersonalPresetManagerModal.tsx
│   ├── RealtimeRateLimitBar.tsx
│   ├── SavePresetModal.tsx
│   ├── SynapticChart.tsx
│   └── SynapticCoolingBanner.tsx
├── services/                   # Các dịch vụ xử lý logic & kết nối API
│   ├── geminiService.ts        # Xử lý toàn bộ lệnh gọi Google Gemini API
│   ├── googleService.ts        # Tích hợp Google Drive tùy chọn
│   ├── generationQueueService.ts
│   ├── rateLimitService.ts     # Đo lường & kiểm soát RPM / TPM
│   └── presetService.ts
├── .env.example                # Mẫu cấu hình biến môi trường
├── .env.local                  # Tệp lưu API Key cục bộ (không chia sẻ)
├── start-app.bat               # Trình khởi chạy 1-click cho Windows
├── App.tsx                     # Giao diện chính của ứng dụng
├── types.ts                    # Định nghĩa kiểu dữ liệu TypeScript
└── vite.config.ts              # Cấu hình máy chủ Vite
```
