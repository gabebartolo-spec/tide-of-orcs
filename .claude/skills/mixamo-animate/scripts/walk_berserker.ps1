# Berserker walk v1: Orc Walk copied exactly onto the Tripo rig (berserker_split.blend: body + wpn_L/wpn_R cut by cut_axes.py).
# RMATCH both arms (no DIRECT on a Tripo rig), INPLACE, GRIP2 (two grip hands). The bind grip holds each haft perpendicular to the
# forearm, so the hands get a world-Z twist (axes trail behind) plus a 20 deg droop; forward/up carries clipped the legs or hip.
# CLIP 0 / LFIST 0 over all 37 frames (2026-11-01).
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\berserker\berserker_split.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Orc Walk.fbx"
$env:RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; $env:INPLACE = "1"; $env:ORTHO = "1.4"; $env:GRIP2 = "1"
$env:WOFFS = "mixamorig:LeftHand:0,0,1,90;mixamorig:RightHand:0,0,1,-90;mixamorig:LeftHand:1,0,0,-20;mixamorig:RightHand:1,0,0,-20"
$env:CLIP = "1"; $env:FR = "0"; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$env:TEMP\bz\bwc" 2>&1 | Select-String "^CLIP |^LFIST"
$env:CLIP = ""; $env:FR = (0..36 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$env:TEMP\bz\bw$($k[0])"
  & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c $p 2>&1 | Select-String "Error"
  python "$s\gifn.py" $p "$mx\berserker_walk_v1_$($k[0]).gif" 33 ((0..35) -join ",") }
