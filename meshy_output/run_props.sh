#!/usr/bin/env bash
# TB-104: Meshy text-to-3D for the loot props; prompts in prompts.json. Usage: run_props.sh preview|refine item...
# Each create is sent once: a *_create.json marker skips it on re-run. Needs the Meshy device login.
set -u
W="$(cd "$(dirname "$0")" && pwd)"; cd "$W/.."
M="npm exec --yes --package=meshy-cli@0.4.0 -- meshy"
J="--output-schema v1 --format json --no-update-check"
STYLE="Soft low-poly toy-board look, flat shading, no outlines, clean simple silhouette"
TEX="Hand-painted flat colours, soft low-poly toy-board game prop, no outlines, no baked shadows."
pp() { python -c "import json,sys;print(json.load(open('meshy_output/prompts.json'))[sys.argv[1]][sys.argv[2]])" "$1" "$2"; }
mode=$1; shift
for it in "$@"; do
  c="meshy_output/${it}_${mode}_create.json"
  if [ -f "$c" ]; then echo "$it $mode: create already sent"; continue; fi
  if [ "$mode" = preview ]; then
    $M text-to-3d create --mode preview --prompt "$(pp $it prompt)" --data @meshy_output/bow_preview_data.json --target-formats glb --async --save-json "$c" --operation-id "tb104-$it-preview-1" $J >/dev/null 2>&1
  else
    pid=$(python -c "import json;print(json.load(open('meshy_output/${it}_preview_create.json'))['result'])")
    $M text-to-3d create --mode refine --preview-task-id "$pid" --enable-pbr false --texture-resolution 2k --remove-lighting true --texture-prompt "$(pp $it texture)" --target-formats glb --async --save-json "$c" --operation-id "tb104-$it-refine-1" $J >/dev/null 2>&1
  fi
  id=$(python -c "import json;print(json.load(open('$c')).get('result') or '')" 2>/dev/null); echo "$it $mode: create id [$id]"
  if [ -z "$id" ]; then echo "$it $mode: CREATE FAILED, marker removed"; cat "$c"; rm -f "$c"; fi
  sleep 2
done
for it in "$@"; do
  c="meshy_output/${it}_${mode}_create.json"; id=$(python -c "import json;print(json.load(open('$c'))['result'])") || continue
  t="meshy_output/task_${it}_${mode}.json"
  $M text-to-3d wait "$id" --timeout 1200 --save-json "$t" --workspace "$W" $J >/dev/null 2>&1
  st=$(python -c "import json;d=json.load(open('$t'));d=d.get('data',d);print(d.get('status'),d.get('consumed_credits'),d.get('task_error'))")
  echo "$it $mode: $st"
  [ "$mode" = preview ] && tag=$it || tag=${it}tex
  $M download --task-json "$t" --asset thumbnail.primary --output "meshy_output/${it}_${mode}.png" --workspace "$W" $J >/dev/null 2>&1
  $M download --task-json "$t" --model-format glb --output "meshy_output/${it}_${mode}.glb" --workspace "$W" $J >/dev/null 2>&1
  ls -l "meshy_output/${it}_${mode}.png" "meshy_output/${it}_${mode}.glb" | awk '{print $5, $9}'
done
echo ALLDONE
