#!/bin/sh
# Usage: run_all.sh <out> [textures dir; recolor.py output for the green skin]. Spec = key:clip:loop:track(death: TRACK GROUND AXEHIDE=3):ortho:camy.
# Render the TB-212 grunt clips at the field camera (and the front, CAMROT 90) into $1/game and $1/front, through the render slot.
W=C:/Users/DANTE/Documents/GitHub/tide-of-orcs-wt; S=C:/Users/DANTE/Documents/tide-assets/sketchfab/orc; O=$1; T=${2:-$S/textures}; H=$(cd "$(dirname "$0")" && pwd)
for spec in "orc.grunt:ANM_WALK:1::3.0:0" "orc.grunt.attack:ANM_ATTACK_CRIT:1::3.8:-0.3" "orc.grunt.death:ANM_DEATH::1:3.0:0"; do
  IFS=: read k c l t o y <<E
$spec
E
  for v in game:0 front:90; do
    ORTHO=$o CAMY=$y LOOP=$l TRACK=$t GROUND=$t AXEHIDE=${t:+3} CAMROT=${v#*:} bash $W/blender_slot.sh -b --factory-startup --python "$H/render_orc.py" -- "$S/source/FBX/Animations/$c.fbx" "$T" "$O/${v%%:*}" "$k" 2>&1 | grep -E "ANCHOR|FRAMES|Error" | sed "s/^/$k ${v%%:*} /"
  done
done
