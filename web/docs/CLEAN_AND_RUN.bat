@echo off
REM Clean build script for Strata docs

echo ============================================
echo Cleaning Strata Documentation Build Cache
echo ============================================

REM Remove directories
if exist .astro rmdir /s /q .astro
if exist dist rmdir /s /q dist
if exist node_modules rmdir /s /q node_modules

echo.
echo ✓ Cleaned .astro
echo ✓ Cleaned dist
echo ✓ Cleaned node_modules

echo.
echo ============================================
echo Installing Dependencies
echo ============================================

call npm install

echo.
echo ✓ Dependencies installed

echo.
echo ============================================
echo Starting Development Server
echo ============================================
echo.
echo Visit: http://localhost:3000
echo.

call npm run dev

pause
