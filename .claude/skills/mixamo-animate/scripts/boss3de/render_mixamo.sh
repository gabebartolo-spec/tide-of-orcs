#!/usr/bin/env bash
# TB-214 v3 boss renders: Mixamo walk / axe chop / dying on boss_axe.blend. Usage: render_mixamo.sh <absolute outdir> [front]. Death grip: wrist yawed -90 about world Z (CLIP 0 vs 21 frames unyawed).
O=$1; mkdir -p $O; cd "$(dirname "$0")"
S=..
B=C:/Users/DANTE/Documents/tide-assets/sketchfab/orc_boss_3de/work/boss_axe.blend; M=C:/Users/DANTE/Documents/tide-assets/mixamo
CR=0; [ "$2" = front ] && CR=90
export WYAW="mixamorig:Neck,mixamorig:Head>mixamorig:Spine2" RMATCH="Spine,LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand" GAMECAM=20 CAMROT=$CR RES=512 ANCHOR=1
r() { echo "== $1"; bash ${SLOT:-C:/Users/DANTE/Documents/GitHub/tide-of-orcs-wt/blender_slot.sh} -b --factory-startup --python $S/apply_anim.py -- $B "$2" $O/$1 2>&1 | grep -E "^ANCHOR|^CLIP|Error|rror:" | cut -c1-200; }
FR=${WFR:-$(seq -s, 0 35)} INPLACE=1 ORTHO=2.6 CLIP=$CLIPW r orc.boss "$M/Orc Walk.fbx"
FR=${AFR:-$(seq -s, 0 68)} INPLACE=1 ORTHO=${AORTHO:-4.6} WOFFS="mixamorig:RightArm:0,1,0,-25;mixamorig:RightHand:1,0,0,40" r orc.boss.attack "$M/Standing Melee Attack Downward AS100.fbx"
FR=${DFR:-$(seq -s, 0 2 132)} ORTHO=3.4 WOFFS="mixamorig:RightHand:0,0,1,-90" r orc.boss.death "$M/Dying.fbx"
echo ALLDONE
