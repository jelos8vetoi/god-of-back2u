@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to start the game.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8080/ in your browser.
echo Keep this window open while playing.
node "%~dp0serve.cjs" 8080
if errorlevel 1 pause
