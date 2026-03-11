@echo off
echo ============================================
echo  FakeNewsDetection - Python API Setup
echo ============================================
echo.

:: Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [OK] Python found:
python --version
echo.

:: Create virtual environment
echo [1/3] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b 1
)
echo [OK] Virtual environment created.
echo.

:: Activate and install
echo [2/3] Installing dependencies (this may take a few minutes)...
call venv\Scripts\activate.bat
pip install --upgrade pip --quiet
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
)
echo [OK] All dependencies installed.
echo.
echo Downloading spaCy language model...
python -m spacy download en_core_web_md
if errorlevel 1 (
    echo [ERROR] Failed to download spaCy model.
    pause
    exit /b 1
)
echo [OK] spaCy model downloaded.
echo.

:: Done
echo [3/3] Setup complete!
echo.
echo ============================================
echo  To start the API server:
echo    1. Run:  venv\Scripts\activate
echo    2. Run:  python grad.py
echo    3. API will be available at http://localhost:8000
echo ============================================
echo.
pause
