@echo off
setlocal
cd /d "%~dp0\.."

echo.
echo  PickleGrounds - one-time install
echo  ==============================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Install Node 20+ from https://nodejs.org
  pause
  exit /b 1
)

echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 goto failed

if not exist .env (
  echo [2/4] Creating .env from .env.example...
  copy /Y .env.example .env >nul
) else (
  echo [2/4] .env already exists - keeping it.
)

echo [3/4] Setting up database...
call npm run db:migrate
if errorlevel 1 goto failed

echo [4/4] Building for production...
call npm run build
if errorlevel 1 goto failed

echo.
echo  Install complete.
echo.
echo  Next steps:
echo    - Double-click scripts\start-picklegrounds.bat to run the app
echo    - Admin:   http://localhost:3000/admin
echo    - Display: http://localhost:3000/display
echo.
echo  See docs\RUNBOOK.md for facility staff instructions.
echo.
pause
exit /b 0

:failed
echo.
echo  Install failed. Check the messages above.
pause
exit /b 1
