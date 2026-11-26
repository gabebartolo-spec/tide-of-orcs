#!/usr/bin/env bash
# usage: r.sh <clip: attack|walk> <view: g|f> <outprefix> [blend] [res] [extra env via export before]
S='C:\Users\DANTE\Documents\GitHub\tide-of-orcs-wt\tb-186b-drum-fix\.claude\skills\mixamo-animate\scripts'
A='C:\Users\DANTE\Documents\tide-assets'
BL=${4:-"$A\drummer\drummer_raised.blend"}
export RMATCH="LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand" INPLACE=1
export RES=${5:-512} ORTHO=2.0 ANCHOR=1
if [ "$1" = attack ]; then
 CLIPF="$A\mixamo\Playing Drums AS100.fbx"
 export REST=${REST-"mixamorig:Hips,mixamorig:Spine,mixamorig:Spine1,mixamorig:Spine2,mixamorig:Neck,mixamorig:Head,mixamorig:LeftUpLeg,mixamorig:LeftLeg,mixamorig:LeftFoot,mixamorig:LeftToeBase,mixamorig:RightUpLeg,mixamorig:RightLeg,mixamorig:RightFoot,mixamorig:RightToeBase,mixamorig:LeftHandThumb1,mixamorig:LeftHandThumb2,mixamorig:LeftHandThumb3,mixamorig:RightHandThumb1,mixamorig:RightHandThumb2,mixamorig:RightHandThumb3"}
 export FR=${FR-$(seq -s, 18 51)}
else
 CLIPF="$A\mixamo\Orc Walk.fbx"
 export REST=${REST-"mixamorig:LeftHandThumb1,mixamorig:LeftHandThumb2,mixamorig:LeftHandThumb3,mixamorig:RightHandThumb1,mixamorig:RightHandThumb2,mixamorig:RightHandThumb3"}
 export FR=${FR-$(seq -s, 0 35)}
fi
if [ "$2" = f ]; then export CAMROT=90 GAMECAM=0; else export CAMROT=0 GAMECAM=20; fi
bash /c/Users/DANTE/Documents/GitHub/tide-of-orcs-wt/blender_slot.sh -b --factory-startup --python "$S\apply_anim.py" -- "$BL" "$CLIPF" "$3"
