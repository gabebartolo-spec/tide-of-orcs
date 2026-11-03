#!/bin/sh
# Usage: run_all.sh <out> [textures dir; recolor.py output for the green skin]. Spec = key:clip:loop:track(death: TRACK GROUND AXEFADE=2:6):ortho:camy:armfrom.
# Render the TB-212 grunt clips at the field camera (and the front, CAMROT 90) into $1/game and $1/front, through the render slot.
# Walk: ANM_WALK legs/torso with both arms + axe from the model's own ANM_IDLE (low two-hand carry; critic: the walk's own level carry read as a rifle).
# Front attack renders at ORTHO 4.6: at 3.8 the overhead axe left the top edge in 4 frames (TB-212).
W=C:/Users/DANTE/Documents/GitHub/tide-of-orcs-wt; S=C:/Users/DANTE/Documents/tide-assets/sketchfab/orc; A=$S/source/FBX/Animations; O=$1; T=${2:-$S/textures}; H=$(cd "$(dirname "$0")" && pwd)
for spec in "orc.grunt:ANM_WALK:1::3.0:0:ANM_IDLE" "orc.grunt.attack:ANM_ATTACK_CRIT:1::3.8:-0.3:" "orc.grunt.death:ANM_DEATH::1:3.0:0:"; do
  IFS=: read k c l t o y f <<E
$spec
E
  for v in game:0 front:90; do
    ARMFROM=${f:+$A/$f.fbx} ORTHO=$( [ "${v#*:}" = 90 ] && [ "$c" = ANM_ATTACK_CRIT ] && echo 4.6 || echo $o ) CAMY=$y LOOP=$l TRACK=$t GROUND=$t AXEFADE=${t:+2:6} CAMROT=${v#*:} bash $W/blender_slot.sh -b --factory-startup --python "$H/render_orc.py" -- "$A/$c.fbx" "$T" "$O/${v%%:*}" "$k" 2>&1 | grep -E "ANCHOR|FRAMES|LO |Error" | sed "s/^/$k ${v%%:*} /"
  done
done
