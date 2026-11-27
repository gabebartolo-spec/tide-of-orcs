#!/usr/bin/env bash
# Master one raw ElevenLabs take into the game's SFX format (ART-STYLE §Asset pipeline, TB-280):
# trim leading/trailing silence, measure integrated loudness with ebur128 (works on sub-3 s clips, where loudnorm
# falls back to dynamic mode and leaves short grunts near -35 LUFS), apply one linear gain to -16 LUFS, hold peaks
# at -1 dBFS with a limiter, 44.1 kHz stereo, then OGG Vorbis 160 kb/s + MP3 128 kb/s fallback.
# Usage: tools/sfx-master.sh raw.mp3 public/audio/orcDeath2
set -euo pipefail
in="$1"; out="$2"; target=-16
trim="silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,afade=t=in:d=0.015,areverse"
lufs() { ffmpeg -hide_banner -nostats -i "$1" -af "${2:+$2,}ebur128" -f null - 2>&1 | awk '/^ +I:/{v=$2} END{print v}'; }
tmp=$(mktemp -d)
ffmpeg -hide_banner -loglevel error -y -i "$in" -af "$trim,aresample=44100" -ac 2 "$tmp/trim.wav"
gain=$(python3 -c "print(round($target - ($(lufs "$tmp/trim.wav")), 2))")
ffmpeg -hide_banner -loglevel error -y -i "$tmp/trim.wav" -af "volume=${gain}dB,alimiter=limit=0.89:attack=1:release=50:level=false" "$tmp/m.wav"
ffmpeg -hide_banner -loglevel error -y -i "$tmp/m.wav" -c:a libvorbis -b:a 160k "$out.ogg"
ffmpeg -hide_banner -loglevel error -y -i "$tmp/m.wav" -c:a libmp3lame -b:a 128k "$out.mp3"
rm -rf "$tmp"
echo "$out: gain ${gain} dB, $(lufs "$out.ogg") LUFS, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out.ogg") s"
