@echo off
REM Complete nuclear clean for Strata docs - removes ALL cache

echo.
echo ============================================================
echo NUCLEAR CLEAN - Removing ALL caches and build artifacts
echo ============================================================
echo.

REM Remove all astro/build artifacts
if exist .astro (
    echo Removing .astro...
    rmdir /s /q .astro
)

if exist .next (
    echo Removing .next...
    rmdir /s /q .next
)

if exist dist (
    echo Removing dist...
    rmdir /s /q dist
)

if exist build (
    echo Removing build...
    rmdir /s /q build
)

REM Remove node_modules completely
if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules
)

REM Clear npm cache
echo Clearing npm cache...
call npm cache clean --force

REM Remove lock files to force fresh install
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo.
echo ============================================================
echo All caches cleared. Now reinstalling...
echo ============================================================
echo.

REM Fresh install
call npm install

echo.
echo ============================================================
echo Installation complete. Starting dev server...
echo ============================================================
echo.
echo Expected output:
echo   ✓ build complete
echo   Local: http://localhost:3000
echo.

call npm run dev

pause
