@echo off
setlocal

cd /d "%~dp0.."

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo npm command was not found.
  echo Install Node.js LTS from https://nodejs.org/ then close and reopen Windows Terminal.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting web and API servers...
npm run dev
pause
