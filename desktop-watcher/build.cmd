@echo off
REM Build ChessStream-Watcher.exe using Node's built-in SEA (Single Executable
REM Application). Requires Node >= 20 on PATH. Works offline — no downloads.
setlocal enabledelayedexpansion
cd /d "%~dp0"

for /f "delims=" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
if not defined NODE_EXE (
  echo node.exe not found on PATH. Install Node.js ^>= 20 from https://nodejs.org
  exit /b 1
)

echo [1/4] Creating SEA blob from watcher.js...
node --experimental-sea-config sea-config.json
if errorlevel 1 goto :fail

echo [2/4] Copying node.exe as ChessStream-Watcher.exe...
if exist ChessStream-Watcher.exe del ChessStream-Watcher.exe
copy /y "!NODE_EXE!" ChessStream-Watcher.exe >nul
if not exist ChessStream-Watcher.exe (
  echo Could not copy "!NODE_EXE!".
  goto :fail
)

echo [3/4] Injecting the application blob...
call npx -y postject ChessStream-Watcher.exe NODE_SEA_BLOB sea-prep.blob --overwrite --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if errorlevel 1 goto :fail

echo [4/4] Verifying...
ChessStream-Watcher.exe --version | findstr /c:"ChessStream folder watcher" >nul
if errorlevel 1 (
  echo Verification run did not print the expected banner.
  goto :fail
)

echo.
echo SUCCESS: ChessStream-Watcher.exe built in this folder.
echo Double-click it to configure (it asks for the broadcast URL and folder),
REM or run: ChessStream-Watcher.exe --url https://.../broadcast/xxxx --dir C:\path\to\pgns
exit /b 0

:fail
echo.
echo BUILD FAILED.
exit /b 1
