#!/usr/bin/env bash
# Regenerate the narration clips with ElevenLabs through the official CLI.
# Auth once: `npx @elevenlabs/cli auth login` (OAuth, stored in the keyring) or export ELEVENLABS_API_KEY.
# Voice: pass a voice id as $1, or leave empty to use the first voice in your library.
set -euo pipefail
cd "$(dirname "$0")"
EL="npx --yes @elevenlabs/cli@1.1.0"
VOICE="${1:-}"
MODEL="${ELEVENLABS_MODEL:-eleven_multilingual_v2}"
if [ -z "$VOICE" ]; then
  VOICE=$($EL voices search --format json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('voices',[]); print(v[0]['voice_id'] if v else '')")
fi
[ -n "$VOICE" ] || { echo "no voice id — pass one as the first argument"; exit 1; }
echo "voice $VOICE · model $MODEL"
python3 -c "import json; [print(k, '\t', v) for k, v in json.load(open('narration/lines.json')).items()]" | while IFS=$'\t' read -r key text; do
  key="${key% }"; text="${text# }"
  $EL text-to-speech convert --voice-id "$VOICE" --format raw \
    --text "$text" --model-id "$MODEL" --output-format mp3_44100_128 \
    --voice-settings.stability 0.55 --voice-settings.similarity-boost 0.8 --voice-settings.style 0.15 --voice-settings.speed 0.95 \
    > "narration/$key.mp3"
  ffmpeg -y -loglevel error -i "narration/$key.mp3" -ar 48000 -ac 2 "narration/$key.wav"
  printf '%-10s %ss\n' "$key" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 narration/$key.wav)"
done
echo "done — now: node demo/mix-audio.mjs"
