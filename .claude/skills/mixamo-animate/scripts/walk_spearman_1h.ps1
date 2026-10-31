# Spearman walk v16: v15 spear-forward carry, held mid-shaft (spearman_1h_mid.blend), and a free left arm copied from Orc Walk (v15 "gimpy left arm" rejected 2026-11-01)
# Left arm: the shield clip's swing (x1) about the Orc Walk's mean pose, measured with ELBOW=1: upper arm 18.6 out / -15.6 fwd, forearm 17.1 out / 22.7 fwd, elbow 37
# SWING LeftForeArm:0 (not REST): REST runs before MIRR and would zero the forearm swing that the spear arm mirrors
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\elf_spearman\spearman_1h_mid.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Sword And Shield Walk.fbx"
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand"; $env:SWING = "mixamorig:LeftArm:1;mixamorig:LeftForeArm:0"; $env:ORTHO = "2.4"; $env:H1 = "1"; $env:MPH = "2"; $env:HINGE = "world"; $env:FREEZE = "mixamorig:RightShoulder,mixamorig:RightHand"
$env:MIRR = "mixamorig:LeftArm>mixamorig:RightArm:2.0;mixamorig:LeftForeArm>mixamorig:RightForeArm:1"
$env:WOFFS = "mixamorig:RightArm:1,0,0,-5;mixamorig:RightForeArm:1,0,0,10;mixamorig:RightHand:1,0,0,40;mixamorig:RightHand:0,0,1,130"
$env:ARMSET = "Left:18.6,-15.6"; $env:ELBOWSET = "Left:37"; $env:ARMTWIST = "Left:17.1,22.7"
$env:CLIP = "1"; $env:ELBOW = "1"; $env:FR = "0"; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$env:TEMP\v16c" 2>&1 | Select-String "^CLIP |^LFIST|^ELBOW tgt"
$env:CLIP = ""; $env:ELBOW = ""; $env:FR = (0..32 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$env:TEMP\v16$($k[0])"
  & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c $p 2>&1 | Select-String "Error"
  python "$s\gifn.py" $p "$mx\spearman_walk_v16_$($k[0]).gif" 33 ((0..32) -join ",") }
