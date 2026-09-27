"""Download and verify a faster-whisper CTranslate2 model in a stable local directory."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from faster_whisper.utils import download_model

DEFAULT_MODEL = "large-v3-turbo"
REQUIRED_FILES = ("config.json", "model.bin", "tokenizer.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("legacy_output_dir", nargs="?", help="Compatibility with the old positional output directory")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--output-dir")
    parser.add_argument("--cache-dir")
    parser.add_argument("--verify-only", action="store_true")
    return parser.parse_args()


def verify(directory: Path) -> dict[str, object]:
    missing = [name for name in REQUIRED_FILES if not (directory / name).is_file()]
    model_file = directory / "model.bin"
    if model_file.is_file() and model_file.stat().st_size < 100_000_000:
        missing.append("model.bin(incomplete)")
    return {
        "ready": not missing,
        "directory": str(directory.resolve()),
        "missing": missing,
        "bytes": sum(item.stat().st_size for item in directory.rglob("*") if item.is_file()) if directory.exists() else 0,
    }


args = parse_args()
output_dir = Path(args.output_dir or args.legacy_output_dir or f"runtime/models/faster-whisper-{args.model}")
status = verify(output_dir)
if not status["ready"] and not args.verify_only:
    output_dir.mkdir(parents=True, exist_ok=True)
    print(json.dumps({"event": "download-start", "model": args.model, "directory": str(output_dir)}, ensure_ascii=False), flush=True)
    download_model(args.model, output_dir=str(output_dir), cache_dir=args.cache_dir)
    status = verify(output_dir)
if not status["ready"]:
    raise SystemExit("ASR model verification failed: " + json.dumps(status, ensure_ascii=False))
print(json.dumps({"event": "ready", "model": args.model, **status}, ensure_ascii=False), flush=True)
