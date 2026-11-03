#!/bin/sh
# Usage: run_mixamo.sh <out> <textures dir (recolor.py output)>. TB-212 round 3: the grunt's approved Mixamo recipe (Sword And Shield Walk, Standing Melee Attack
# Downward AS100) plus Mixamo Dying, retargeted onto the Riltariki Bip001 rig (render_orc.py MIXAMO). ORTHO 4.0 (attack 5.0: the overhead wind-up and full-reach head left the 4.0 frame); pack_sprites scales each anim by its own ortho, so scale never jumps.
# Attack: a 10-frame LEADIN blend from the walk's first pose and a 41-frame LEADOUT from just after the impact back to it, so the attack starts and ends in the walk carry.
# The fist sits 550 units further down the haft than the idle grip (GRIP + GRIPSLIDE) in every frame; the walk straightens the elbow 55 deg and aims the haft forward and low (CARRY, CARRYAIM). Death: TRACK + GROUND, axe fades as the body lands (output frames 30..40 at STEP 2).
W=C:/Users/DANTE/Documents/GitHub/tide-of-orcs-wt; S=C:/Users/DANTE/Documents/tide-assets/sketchfab/orc/source/FBX/Animations; MX=C:/Users/DANTE/Documents/tide-assets/mixamo; O=$1; T=$2; H=$(cd "$(dirname "$0")" && pwd)
run() { k=$1; shift; for v in game:0 front:90; do env ORTHO=4.0 "$@" CAMROT=${v#*:} bash $W/blender_slot.sh -b --factory-startup --python "$H/render_orc.py" -- "$S/ANM_IDLE.fbx" "$T" "$O/${v%%:*}" "$k" 2>&1 | grep -E "ANCHOR|FRAMES|MIXAMO|Error" | sed "s/^/$k ${v%%:*} /"; done; }
C="GRIP=$S/ANM_ATTACK_CRIT.fbx:1522:0:0 GRIPSLIDE=550 CARRY=55,0 CARRYAIM=0,-0.95,-0.3"  # round 4: walk and attack share the slid chop grip; the walk carries it head forward and low
run orc.grunt "MIXAMO=$MX/Sword And Shield Walk.fbx" TRACK=1 LOOP=1 $C
run orc.grunt.attack "MIXAMO=$MX/Standing Melee Attack Downward AS100.fbx" "LEADIN=$MX/Sword And Shield Walk.fbx:10" LEADOUT=41 $C ORTHO=5.0
run orc.grunt.death "MIXAMO=$MX/Dying.fbx" TRACK=1 GROUND=1 STEP=2 AXEFADE=30:40
