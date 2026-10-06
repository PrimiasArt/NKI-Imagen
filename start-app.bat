@echo off
chcp 65001 >nul
title HLC Imagen v4.3 - Google Gemini Standalone Studio
echo =====================================================================
echo       HLC IMAGEN v4.3 - GOOGLE GEMINI STANDALONE STUDIO
echo =====================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Không tìm thấy Node.js trên máy tính của bạn!
    echo Vui lòng tải và cài đặt Node.js từ https://nodejs.org/ trước khi chạy ứng dụng.
    echo.
    pause
    exit /b 1
)

:: Check node_modules
if not exist "node_modules\" (
    echo [THÔNG BÁO] Đang cài đặt thư viện phụ thuộc (npm install)...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [LỖI] Cài đặt thư viện thất bại!
        pause
        exit /b 1
    )
)

echo [THÔNG BÁO] Đang khởi động ứng dụng độc lập tại http://localhost:3000...
echo Ứng dụng sẽ tự động mở trong trình duyệt của bạn sau vài giây.
echo.
echo Bạn có thể nhập Gemini API Key trực tiếp trên giao diện web hoặc điền vào file .env.local
echo.

:: Open browser after a slight delay in background
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: Start Vite Dev Server
call npm.cmd run dev -- --host 0.0.0.0 --port 3000

pause
