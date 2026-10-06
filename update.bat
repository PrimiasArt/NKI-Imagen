@echo off
chcp 65001 >nul
title NKI Studio - 1-Click Auto Update
color 0A

echo ========================================================
echo   🚀 NKI IMAGEN STUDIO - AUTO UPDATE 1-CLICK TOOL
echo   Repo: https://github.com/PrimiasArt/NKI-Imagen
echo ========================================================
echo.

echo [1/3] Đang tải mã nguồn mới nhất từ GitHub...
git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [Cảnh báo] Lỗi khi git pull hoặc chưa cấu hình git remote.
    echo Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.
)

echo.
echo [2/3] Đang cập nhật dependencies...
call npm install --no-audit

echo.
echo [3/3] Đang biên dịch bản build tối ưu (PWA Production)...
call npm run build

echo.
echo ========================================================
echo   ✅ CẬP NHẬT HOÀN TẤT!
echo   Mở file start.bat để khởi chạy ứng dụng phiên bản mới.
echo ========================================================
echo.
pause
