@echo off
chcp 65001 >nul
title NKI Studio v4.3 - Standalone Launcher
color 0B

echo ========================================================
echo   🚀 ĐANG KHỞI CHẠY NKI IMAGEN STUDIO (PWA STANDALONE)
echo ========================================================
echo.

echo Đang khởi động máy chủ ứng dụng...
start /b cmd /c "npm run dev -- --host 0.0.0.0 --port 3000" >nul 2>&1

timeout /t 2 /nobreak >nul

echo Đang mở cửa sổ ứng dụng Desktop độc lập...
start msedge --app=http://localhost:3000 2>nul || start chrome --app=http://localhost:3000 2>nul || start http://localhost:3000

echo.
echo Ứng dụng đang chạy tại http://localhost:3000
echo Bạn có thể thu nhỏ cửa sổ này lại.
