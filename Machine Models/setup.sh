#!/bin/bash
echo "============================================"
echo " FakeNewsDetection - Python API Setup"
echo "============================================"
echo

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 is not installed."
    echo "Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
    echo "Fedora:        sudo dnf install python3 python3-pip"
    echo "macOS:         brew install python3"
    exit 1
fi

echo "[OK] Python found: $(python3 --version)"
echo

# Create virtual environment
echo "[1/3] Creating virtual environment..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to create virtual environment."
    echo "Try: sudo apt install python3-venv"
    exit 1
fi
echo "[OK] Virtual environment created."
echo

# Activate and install
echo "[2/3] Installing dependencies (this may take a few minutes)..."
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Dependency installation failed."
    exit 1
fi
echo "[OK] All dependencies installed."
echo

echo "Downloading spaCy language model..."
python3 -m spacy download en_core_web_md
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to download spaCy model."
    exit 1
fi
echo "[OK] spaCy model downloaded."
echo

# Done
echo "[3/3] Setup complete!"
echo
echo "============================================"
echo " To start the API server:"
echo "   1. Run:  source venv/bin/activate"
echo "   2. Run:  python grad.py"
echo "   3. API will be at http://localhost:8000"
echo "============================================"
