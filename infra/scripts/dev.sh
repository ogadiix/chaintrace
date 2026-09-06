#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "          ChainTrace — Development Stack Launcher          "
echo "=========================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Ensure .env exists
if [ ! -f .env ]; then
    echo "[!] .env not found. Copying .env.example -> .env"
    cp .env.example .env
fi

# Ensure python environment exists
if [ ! -d ".venv" ]; then
    echo "[*] Creating Python virtual environment in .venv..."
    python3 -m venv .venv
fi

echo "[*] Activating virtual environment..."
source .venv/bin/activate

echo "[*] Installing backend dependencies..."
pip install -q -r apps/api/requirements.txt
pip install -q -e packages/shared/python

echo "[*] Installing frontend dependencies..."
npm install --silent

echo "[*] Building shared packages..."
npm run build:packages

echo "----------------------------------------------------------"
echo "Starting services..."
echo "  Backend API:  http://localhost:8000 (Docs: http://localhost:8000/docs)"
echo "  Frontend Web: http://localhost:5173"
echo "----------------------------------------------------------"

export PYTHONPATH="$PROJECT_ROOT"

# Trap interrupt to cleanly kill all children
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start API
uvicorn apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

# Start Worker
python apps/worker/src/main.py &
WORKER_PID=$!

# Start Frontend Web
npm run dev --workspace=@chaintrace/web &
WEB_PID=$!

wait
