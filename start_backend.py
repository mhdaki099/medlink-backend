#!/usr/bin/env python3
"""MedLink Backend Startup Script"""
import subprocess
import sys
import os

def main():
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    print("Starting MedLink Backend on http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("Press Ctrl+C to stop\n")
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir
    )

if __name__ == "__main__":
    main()
