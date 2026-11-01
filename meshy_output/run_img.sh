#!/usr/bin/env bash
# TB-104 bracer image route: run_img.sh image|i23d id... (ids from img_prompts.json, e.g. leather-bracer-i1).
# image = Text-to-Image reference; i23d = Image-to-3D (smart topology, 3000 tris, textured 2K) from that image task.
# Each create is sent once: a *_create.json marker skips it on re-run. Needs the Meshy device login.
set -u
W="$(cd "$(dirname "$0")" && pwd)"; cd "$W/.."
M="npm exec --yes --package=meshy-cli@0.4.0 -- meshy"
J="--output-schema v1 --format json --no-update-check"
ip() { python -c "import json,sys;print(json.load(open('meshy_output/img_prompts.json'))[sys.argv[1]]['image'])" "$1"; }
tp() { python -c "import json,sys;b=json.load(open('meshy_output/img_prompts.json'))[sys.argv[1]]['base'];print(json.load(open('meshy_output/prompts.json'))[b]['texture'])" "$1"; }
mode=$1; shift
for it in "$@"; do
  c="meshy_output/${it}_${mode}_create.json"
  if [ -f "$c" ]; then echo "$it $mode: create already sent"; continue; fi
  if [ "$mode" = image ]; then
    $M text-to-image create --prompt "$(ip $it)" --aspect-ratio 1:1 --async --save-json "$c" --operation-id "tb131-$it-image-1" $J >/dev/null 2>&1
  else
    iid=$(python -c "import json;print(json.load(open('meshy_output/${it}_image_create.json'))['result'])")
    $M image-to-3d create --input-task-id "$iid" --model-type smart-topology --target-polycount 3000 --should-texture true --enable-pbr false --texture-resolution 2k --texture-prompt "$(tp $it)" --data @meshy_output/i23d_data.json --target-formats glb --async --save-json "$c" --operation-id "tb131-$it-i23d-1" $J >/dev/null 2>&1
  fi
  id=$(python -c "import json;print(json.load(open('$c')).get('result') or '')" 2>/dev/null); echo "$it $mode: create id [$id]"
  if [ -z "$id" ]; then echo "$it $mode: CREATE FAILED, marker removed"; cat "$c"; rm -f "$c"; fi
  sleep 2
done
for it in "$@"; do
  c="meshy_output/${it}_${mode}_create.json"; id=$(python -c "import json;print(json.load(open('$c'))['result'])") || continue
  t="meshy_output/task_${it}_${mode}.json"
  if [ "$mode" = image ]; then
    $M text-to-image wait "$id" --timeout 600 --save-json "$t" --workspace "$W" $J >/dev/null 2>&1
  else
    $M image-to-3d wait "$id" --timeout 1200 --save-json "$t" --workspace "$W" $J >/dev/null 2>&1
  fi
  st=$(python -c "import json;d=json.load(open('$t'));d=d.get('data',d);print(d.get('status'),d.get('consumed_credits'),d.get('task_error'))")
  echo "$it $mode: $st"
  if [ "$mode" = image ]; then
    mkdir -p "meshy_output/ref_${it}"
    $M download --task-json "$t" --kind image --output-dir "meshy_output/ref_${it}" --workspace "$W" $J >/dev/null 2>&1
    ls -l "meshy_output/ref_${it}" | awk 'NR>1{print $5, $9}'
  else
    $M download --task-json "$t" --asset thumbnail.primary --output "meshy_output/${it}_i23d.png" --workspace "$W" $J >/dev/null 2>&1
    $M download --task-json "$t" --model-format glb --output "meshy_output/${it}_i23d.glb" --workspace "$W" $J >/dev/null 2>&1
    ls -l "meshy_output/${it}_i23d.png" "meshy_output/${it}_i23d.glb" | awk '{print $5, $9}'
  fi
done
echo ALLDONE
