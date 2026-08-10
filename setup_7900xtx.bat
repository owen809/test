@echo off
REM ============================================================
REM  setup_7900xtx.bat
REM  One-click setup for AMD Ryzen 9 7950X + RX 7900XTX on Windows
REM
REM  IMPORTANT: ROCm does NOT have full native Windows support yet.
REM  This script sets up WSL2 (Ubuntu) and installs everything inside it.
REM  WSL2 is fast — your GPU works at near-native speed through it.
REM
REM  Run this script ONCE as Administrator, then use setup_7900xtx.sh
REM  inside WSL2 for the Python/model install.
REM ============================================================

echo.
echo ============================================================
echo   2D to 3D Converter - 7900XTX Setup (Windows + WSL2)
echo ============================================================
echo.

REM --- Check for admin rights ---
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run this script as Administrator.
    echo Right-click setup_7900xtx.bat and choose "Run as administrator"
    pause
    exit /b 1
)

REM --- Enable WSL2 if not already on ---
echo [1/4] Enabling WSL2 feature...
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart >nul 2>&1
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart >nul 2>&1

REM --- Install Ubuntu via WSL ---
echo [2/4] Installing Ubuntu 22.04 via WSL (this may take a few minutes)...
wsl --install -d Ubuntu-22.04

echo.
echo [3/4] Setting WSL2 as default...
wsl --set-default-version 2

echo.
echo [4/4] Done! Next steps:
echo.
echo   1. Restart your PC if prompted.
echo   2. Open "Ubuntu 22.04" from the Start Menu and create a username/password.
echo   3. Copy setup_7900xtx.sh into your Ubuntu home folder, then run:
echo         bash setup_7900xtx.sh
echo.
echo   That will install ROCm, Python, PyTorch, TripoSR, and the app.
echo.
pause
