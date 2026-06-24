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

set PORT=3000
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if /I "%%A"=="PORT" set PORT=%%B
)

netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo.
  echo  ERROR: Port %PORT% is already in use.
  echo.
  echo  Another PickleGrounds window may already be open, or "npm run dev"
  echo  is still running in a terminal. Close those first, then try again.
  echo.
  pause
  exit /b 1
)

echo.
echo  Starting PickleGrounds...
echo  Admin:   http://localhost:%PORT%/admin
echo  Display: http://localhost:%PORT%/display
echo.
echo  Leave this window open while the facility is open.
echo  Press Ctrl+C to stop.
echo.

set NODE_ENV=production
node dist/server/index.js
set EXIT_CODE=%ERRORLEVEL%

if not %EXIT_CODE%==0 (
  echo.
  echo  PickleGrounds exited with an error.
  echo  If port %PORT% was in use, close "npm run dev" or another server window.
  echo.
  pause
  exit /b %EXIT_CODE%
)
