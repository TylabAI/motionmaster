"""Local, measured word timestamps. No credentials or generation services."""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--audio', required=True)
parser.add_argument('--model', required=True)
parser.add_argument('--download-root', default='')
parser.add_argument('--output', required=True)
parser.add_argument('--device', default='cpu')
parser.add_argument('--compute-type', default='int8')
parser.add_argument('--language', default='zh')
parser.add_argument('--initial-prompt', default='')
args = parser.parse_args()
from faster_whisper import WhisperModel
model_path = Path(args.model)
model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type,
                     download_root=args.download_root or None, local_files_only=model_path.exists())
segments, info = model.transcribe(args.audio, word_timestamps=True, vad_filter=True, beam_size=5,
                                  language=args.language or None, initial_prompt=args.initial_prompt or None)
result = {'language': info.language, 'segments': []}
for segment in segments:
    result['segments'].append({'start': segment.start, 'end': segment.end, 'text': segment.text,
                              'words': [{'start': w.start, 'end': w.end, 'word': w.word, 'probability': w.probability}
                                        for w in segment.words or []]})
Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
