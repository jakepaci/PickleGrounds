@echo off
setlocal
cd /d "%~dp0\.."

if not exist dist\server\index.js (
  echo.
  echo  PickleGrounds is not built yet.
  echo  Run scripts\install-once.bat first.
  echo.
  pause
  exit /b 1
)

if not exist .env (
  echo Creating .env from .env.example...
  copy /Y .env.example .env >nul
)

echo.
echo  PickleGrounds is running.
echo  Admin:   http://localhost:3000/admin
echo  Display: http://localhost:3000/display
echo.
echo  Leave this window open. Press Ctrl+C to stop.
echo.

set NODE_ENV=production
node dist/server/index.js
