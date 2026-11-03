#!/bin/sh
# Usage: run_mixamo.sh <out> <textures dir (recolor.py output)>. TB-212 round 3: the grunt's approved Mixamo recipe (Sword And Shield Walk, Standing Melee Attack
# Downward AS100) plus Mixamo Dying, retargeted onto the Riltariki Bip001 rig (render_orc.py MIXAMO). ORTHO 4.0 (attack 5.0: the overhead wind-up and full-reach head left the 4.0 frame); pack_sprites scales each anim by its own ortho, so scale never jumps.
# Attack gets a 10-frame LEADIN blend from the walk's first pose, and the fist slides 550 units further down the haft (GRIP + GRIPSLIDE) so the head leads the chop. Death: TRACK + GROUND, axe fades as the body lands (output frames 30..40 at STEP 2).
W=C:/Users/DANTE/Documents/GitHub/tide-of-orcs-wt; S=C:/Users/DANTE/Documents/tide-assets/sketchfab/orc/source/FBX/Animations; MX=C:/Users/DANTE/Documents/tide-assets/mixamo; O=$1; T=$2; H=$(cd "$(dirname "$0")" && pwd)
run() { k=$1; shift; for v in game:0 front:90; do env ORTHO=4.0 "$@" CAMROT=${v#*:} bash $W/blender_slot.sh -b --factory-startup --python "$H/render_orc.py" -- "$S/ANM_IDLE.fbx" "$T" "$O/${v%%:*}" "$k" 2>&1 | grep -E "ANCHOR|FRAMES|MIXAMO|Error" | sed "s/^/$k ${v%%:*} /"; done; }
run orc.grunt "MIXAMO=$MX/Sword And Shield Walk.fbx" TRACK=1 LOOP=1
run orc.grunt.attack "MIXAMO=$MX/Standing Melee Attack Downward AS100.fbx" "LEADIN=$MX/Sword And Shield Walk.fbx:10" "GRIP=$S/ANM_ATTACK_CRIT.fbx:1522:21:15" GRIPSLIDE=550 ORTHO=5.0
run orc.grunt.death "MIXAMO=$MX/Dying.fbx" TRACK=1 GROUND=1 STEP=2 AXEFADE=30:40
