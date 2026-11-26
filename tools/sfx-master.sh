#!/usr/bin/env bash
# Master one raw ElevenLabs take into the game's SFX format (ART-STYLE §Asset pipeline, TB-280):
# trim leading/trailing silence, two-pass loudnorm to -16 LUFS with peaks held at -1 dBTP, 44.1 kHz stereo,
# then OGG Vorbis 160 kb/s + MP3 128 kb/s fallback. Usage: tools/sfx-master.sh raw.mp3 public/audio/orcDeath2
set -euo pipefail
in="$1"; out="$2"
trim="silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,afade=t=out:st=0:d=0"
# pass 1: measure
m=$(ffmpeg -hide_banner -nostats -i "$in" -af "$trim,loudnorm=I=-16:TP=-1:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$m" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ln="loudnorm=I=-16:TP=-1:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true"
tmp=$(mktemp --suffix=.wav)
ffmpeg -hide_banner -loglevel error -y -i "$in" -af "$trim,$ln,alimiter=limit=0.89:attack=1:release=50,aresample=44100" -ac 2 "$tmp"
ffmpeg -hide_banner -loglevel error -y -i "$tmp" -c:a libvorbis -b:a 160k "$out.ogg"
ffmpeg -hide_banner -loglevel error -y -i "$tmp" -c:a libmp3lame -b:a 128k "$out.mp3"
rm -f "$tmp"
ffmpeg -hide_banner -nostats -i "$out.mp3" -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input Integrated|Input True Peak" | tr -s ' ' | paste -sd' ' | sed "s|^|$out: |"
