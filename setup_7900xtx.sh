#!/usr/bin/env bash
# ============================================================
#  setup_7900xtx.sh
#  Full install script for AMD RX 7900XTX on Ubuntu 22.04 / WSL2
#
#  Run this inside Ubuntu (WSL2 or native Linux):
#      bash setup_7900xtx.sh
#
#  What this does:
#    1. Installs ROCm 6.x (AMD GPU driver stack for AI workloads)
#    2. Installs Python 3.11 + pip
#    3. Creates a virtual environment
#    4. Installs PyTorch with ROCm 6.0 support
#    5. Installs TripoSR + all other Python deps
#    6. Installs Node.js 20 for the Next.js app
#    7. Installs npm dependencies
#    8. Runs check_hardware.py to confirm everything works
# ============================================================

set -e  # exit on any error

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${CYAN}[$1]${NC} $2"; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo ""
echo "============================================================"
echo "  2D→3D Converter — RX 7900XTX Setup"
echo "============================================================"

# --- System packages ---
step "1/8" "Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y wget curl git python3.11 python3.11-venv python3.11-dev python3-pip build-essential

# --- ROCm 6.x ---
step "2/8" "Installing ROCm 6.x (AMD GPU stack)..."
# Add ROCm apt repo
wget -q -O /tmp/amdgpu-install.deb \
    https://repo.radeon.com/amdgpu-install/6.1.3/ubuntu/jammy/amdgpu-install_6.1.60103-1_all.deb
sudo apt-get install -y /tmp/amdgpu-install.deb
sudo amdgpu-install -y --usecase=rocm --no-dkms

# Add current user to render and video groups (required for GPU access)
sudo usermod -aG render,video "$USER"
ok "ROCm installed. (You may need to log out and back in if running natively on Linux)"

# --- Python virtual environment ---
step "3/8" "Creating Python virtual environment..."
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
ok "Virtual environment ready at $REPO_DIR/venv"

# --- PyTorch with ROCm 6.0 ---
step "4/8" "Installing PyTorch with ROCm 6.0 support (~2 GB download)..."
pip install torch torchvision \
    --index-url https://download.pytorch.org/whl/rocm6.0
ok "PyTorch + ROCm installed"

# --- Python deps ---
step "5/8" "Installing Python dependencies (Pillow, trimesh, etc.)..."
pip install Pillow trimesh scipy numpy
ok "Python deps installed"

# --- TripoSR ---
step "6/8" "Installing TripoSR (AI model library)..."
pip install "git+https://github.com/VAST-AI-Research/TripoSR.git"
ok "TripoSR installed"

# --- Node.js 20 ---
step "7/8" "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
ok "Node.js $(node --version) installed"

# --- Next.js app deps ---
step "8/8" "Installing Next.js app dependencies..."
cd "$REPO_DIR/app"
npm install
ok "Node modules installed"

# --- Final check ---
echo ""
echo "============================================================"
echo "  Running hardware check..."
echo "============================================================"
cd "$REPO_DIR"
python check_hardware.py

echo ""
echo "============================================================"
echo "  Setup complete! ✅"
echo "============================================================"
echo ""
echo "To start the app:"
echo "  1. Copy app/.env.local.example to app/.env.local and fill in your values"
echo "  2. Run:  source venv/bin/activate && cd app && npm run dev"
echo "  3. Open: http://localhost:3000"
echo ""
echo "To test a single image conversion:"
echo "  source venv/bin/activate"
echo "  python check_hardware.py some_photo.jpg"
echo ""
