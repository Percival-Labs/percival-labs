#!/usr/bin/env python3
"""
process-all.py — Run all post-processing in one command.

Processes tiles (diamond masking) and sprites (chroma-key + trim).
"""

import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent


def run_script(name: str) -> bool:
    """Run a processing script and return success status."""
    script = SCRIPT_DIR / name
    if not script.exists():
        print(f"⚠️  Script not found: {script}")
        return False

    print(f"\n{'═' * 40}")
    print(f"Running: {name}")
    print(f"{'═' * 40}\n")

    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=str(SCRIPT_DIR.parent.parent),
    )
    return result.returncode == 0


def main():
    print("🎨 Agent Village — Full Post-Processing Pipeline\n")

    results = {}

    # Process tiles
    results["tiles"] = run_script("process-tiles.py")

    # Process buildings + decorations
    results["sprites"] = run_script("process-buildings.py")

    # Summary
    print(f"\n{'═' * 40}")
    print("SUMMARY")
    print(f"{'═' * 40}")
    for name, ok in results.items():
        status = "✅" if ok else "❌"
        print(f"  {status} {name}")

    failed = sum(1 for ok in results.values() if not ok)
    if failed:
        print(f"\n⚠️  {failed} step(s) failed")
        sys.exit(1)
    else:
        print("\n✅ All post-processing complete!")


if __name__ == "__main__":
    main()
