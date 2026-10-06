# HLC Imagen v4.3 - Google Gemini Standalone Studio

Ứng dụng tạo ảnh và phân tích Prompt ảnh chuyên nghiệp sử dụng trực tiếp **Google Gemini API**, hoạt động độc lập không phụ thuộc vào sandbox AI Studio.

---

## 🚀 Khởi chạy nhanh (Quick Start)

### Cách 1: Windows (1-Click)
Nhấp đúp chuột vào tệp:
```text
start-app.bat
```

### Cách 2: Qua dòng lệnh (Terminal)
```bash
# 1. Cài đặt thư viện
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev
```
Sau đó truy cập: **`http://localhost:3000`** trên trình duyệt web.

---

## 🔑 Cài đặt Google Gemini API Key

1. **Trên giao diện Web**: Nhấp vào nút **`🔑 Nhập API Key`** ở thanh điều hướng trên cùng, dán mã API Key của bạn và bấm **Lưu**. Mã được lưu an toàn trong `localStorage` của trình duyệt.
2. **Qua file môi trường**: Điền vào tệp `.env.local`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```

> 💡 Lấy API Key miễn phí tại: [Google AI Studio](https://aistudio.google.com/apikey)

---

## 📖 Hướng dẫn chi tiết

Xem chi tiết hướng dẫn tính năng, mẹo sử dụng và xử lý hạn ngạch API tại: [HUONG_DAN_SU_DUNG.md](./HUONG_DAN_SU_DUNG.md)
