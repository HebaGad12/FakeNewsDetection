#!/usr/bin/env python3
"""
FakeNewsDetection - Service Runner
Usage:
  python run.py           # Apply DB migrations, then start all services
  python run.py --install # Install all requirements first, then do the above
"""

import subprocess
import sys
import time
import signal
import argparse
from pathlib import Path

# ── Resolve project root (folder containing this script) ──────────────────────
ROOT = Path(__file__).parent.resolve()

FRONTEND_DIR = ROOT / "FrontEnd"
BACKEND_DIR  = ROOT / "BackEnd" / "FakeNewsDetection.web"
MACHINE_DIR  = ROOT / "Machine Models"

# ── Colors for terminal output ─────────────────────────────────────────────────
class C:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    RED     = "\033[91m"
    GREEN   = "\033[92m"
    YELLOW  = "\033[93m"
    CYAN    = "\033[96m"
    MAGENTA = "\033[95m"

def log(label: str, color: str, msg: str):
    print(f"{color}{C.BOLD}[{label}]{C.RESET} {msg}")

# ── Validate directories exist before doing anything ──────────────────────────
def validate_dirs():
    missing = []
    for name, path in [("FrontEnd", FRONTEND_DIR), ("BackEnd", BACKEND_DIR), ("Machine Models", MACHINE_DIR)]:
        if not path.exists():
            missing.append(f"  • {name}: {path}")
    if missing:
        print(f"{C.RED}{C.BOLD}[ERROR]{C.RESET} The following directories were not found:")
        print("\n".join(missing))
        print("\nMake sure run.py is in the project root (next to FrontEnd/, BackEnd/, and 'Machine Models/').")
        sys.exit(1)

# ── Install all requirements ───────────────────────────────────────────────────
def install():
    log("INSTALL", C.YELLOW, "Installing all requirements...\n")

    # Frontend
    log("FrontEnd", C.CYAN, "Running npm install...")
    result = subprocess.run(["npm", "install"], cwd=FRONTEND_DIR)
    if result.returncode != 0:
        log("FrontEnd", C.RED, "npm install failed.")
        sys.exit(1)
    log("FrontEnd", C.GREEN, "npm install complete.")

    # Machine Models - pip
    log("Machine", C.YELLOW, "Running pip install -r requirements.txt...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
        cwd=MACHINE_DIR
    )
    if result.returncode != 0:
        log("Machine", C.RED, "pip install failed.")
        sys.exit(1)
    log("Machine", C.GREEN, "pip install complete.")

    # Machine Models - spacy model
    log("Machine", C.YELLOW, "Downloading spacy model en_core_web_md...")
    result = subprocess.run(
        [sys.executable, "-m", "spacy", "download", "en_core_web_md", "-q"],
        cwd=MACHINE_DIR
    )
    if result.returncode != 0:
        log("Machine", C.RED, "spacy model download failed.")
        sys.exit(1)
    log("Machine", C.GREEN, "spacy model download complete.")

    print(f"\n{C.GREEN}{C.BOLD}All requirements installed successfully!{C.RESET}\n")

# ── Apply EF Core database migrations ─────────────────────────────────────────
def migrate_database():
    log("Database", C.MAGENTA, "Applying EF Core migrations (dotnet ef database update)...")

    persistence_project = ROOT / "BackEnd" / "Infrastructure" / "Persistence"

    result = subprocess.run(
        [
            "dotnet", "ef", "database", "update",
            "--project",         str(persistence_project),
            "--startup-project", str(BACKEND_DIR),
        ],
        cwd=BACKEND_DIR,
    )

    if result.returncode != 0:
        log("Database", C.RED, "Migration failed — check the output above.")
        log("Database", C.YELLOW, "Tip: install the EF tool if missing:  dotnet tool install -g dotnet-ef")
        sys.exit(1)

    log("Database", C.GREEN, "Database is up to date.\n")

# ── Start all services ─────────────────────────────────────────────────────────
def start_services():
    processes = []

    def launch(label, color, cmd, cwd):
        log(label, color, f"Starting -> {' '.join(str(c) for c in cmd)}")
        proc = subprocess.Popen(cmd, cwd=cwd, stdout=sys.stdout, stderr=sys.stderr)
        processes.append((label, proc))
        return proc

    # Windows uses npm.cmd; Mac/Linux uses npm
    npm_cmd     = ["npm.cmd", "run", "dev"] if sys.platform == "win32" else ["npm", "run", "dev"]
    dotnet_cmd  = ["dotnet", "run"]
    uvicorn_cmd = ["uvicorn", "grad:app", "--reload"]

    print(f"\n{'─' * 50}")
    print(f"  Starting FakeNewsDetection Services")
    print(f"{'─' * 50}\n")

    # BackEnd and Machine start first; FrontEnd last (it's the user-facing gate)
    launch("BackEnd",  C.GREEN,  dotnet_cmd,  BACKEND_DIR)
    time.sleep(1)
    launch("Machine",  C.YELLOW, uvicorn_cmd, MACHINE_DIR)
    time.sleep(1)
    launch("FrontEnd", C.CYAN,   npm_cmd,     FRONTEND_DIR)

    print(f"\n{C.GREEN}{C.BOLD}All services started!{C.RESET}")
    print(f"  {C.GREEN}BackEnd   {C.RESET}->  http://localhost:5263/swagger/index.html")
    print(f"  {C.YELLOW}Machine   {C.RESET}->  http://localhost:8000")
    print(f"  {C.CYAN}FrontEnd  {C.RESET}->  http://localhost:5173  {C.CYAN}<- open this in your browser{C.RESET}")
    print(f"\nPress Ctrl+C to stop all services.\n")

    # ── Graceful shutdown on Ctrl+C ────────────────────────────────────────────
    def shutdown(sig, frame):
        print(f"\n\n{C.YELLOW}{C.BOLD}Shutting down all services...{C.RESET}")
        for label, proc in processes:
            if proc.poll() is None:
                log(label, C.YELLOW, "Stopping...")
                proc.terminate()
        for label, proc in processes:
            try:
                proc.wait(timeout=5)
                log(label, C.GREEN, "Stopped.")
            except subprocess.TimeoutExpired:
                log(label, C.RED, "Force killing...")
                proc.kill()
        print(f"\n{C.GREEN}{C.BOLD}All services stopped. Goodbye!{C.RESET}\n")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Keep the script alive; warn if any service crashes
    while True:
        for label, proc in processes:
            if proc.poll() is not None:
                log(label, C.RED, f"Service exited unexpectedly with code {proc.returncode}.")
        time.sleep(2)


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FakeNewsDetection service runner")
    parser.add_argument(
        "--install",
        action="store_true",
        help="Install all requirements before starting services"
    )
    args = parser.parse_args()

    validate_dirs()

    if args.install:
        install()

    migrate_database()
    start_services()