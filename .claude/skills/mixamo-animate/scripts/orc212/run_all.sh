#!/bin/sh
# Render the TB-212 grunt clips at the field camera (and the front, CAMROT 90) into $1/game and $1/front, through the render slot.
W=C:/Users/DANTE/Documents/GitHub/tide-of-orcs-wt; S=C:/Users/DANTE/Documents/tide-assets/sketchfab/orc; O=$1; H=$(cd "$(dirname "$0")" && pwd)
for spec in "orc.grunt:ANM_WALK:1:" "orc.grunt.attack:ANM_ORC_LIGHT_ATTACK:1:" "orc.grunt.death:ANM_DEATH::1"; do
  IFS=: read k c l t <<E
$spec
E
  for v in game:0 front:90; do
    LOOP=$l TRACK=$t CAMROT=${v#*:} bash $W/blender_slot.sh -b --factory-startup --python "$H/render_orc.py" -- "$S/source/FBX/Animations/$c.fbx" "$S/textures" "$O/${v%%:*}" "$k" 2>&1 | grep -E "ANCHOR|FRAMES|Error" | sed "s/^/$k ${v%%:*} /"
  done
done
