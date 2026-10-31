# Orc shaman walk v1 (TB-068, 2026-11-01): spearman_1h v16 recipe on the Tripo rig cut model (shaman_cut.blend, staff in the RIGHT hand).
# Right arm: rest pose (RMATCH) + the clip's swing mirrored from the left arm, hand and shoulder frozen so the staff stays upright.
# Left arm (free): shield clip swing about the Orc Walk mean (ARMSET/ELBOWSET/ARMTWIST numbers measured 2026-11-01).
# v2: REST on RightArm/RightForeArm (bind pose = staff upright) + mirrored swing 1.0/0.5. v1 (clip mean, MIRR 2.0/1) dropped the arm ~43 deg back: staff dragged diagonally through the robe, CLIP 34. v3: RightHand in REST too (FREEZE held the sword clip's wrist mean: staff turned 90 deg to a horizontal lance). v4: left arm = sculpt bind pose + clip swing (no ARMSET/ELBOWSET/ARMTWIST): the Orc Walk numbers (forearm 23 fwd) put the fist 14 cm into the flared skirt on the back-swing (LFIST 4 frames); widening the upper arm made it worse. Usage: & walk_shaman.ps1 [version tag, default v1]
$v = if ($args.Count) { $args[0] } else { "v1" }
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\shaman\shaman_cut2.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Sword And Shield Walk.fbx"
$o = "$env:TEMP\shw"; New-Item -ItemType Directory -Force $o | Out-Null
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand"; $env:SWING = "mixamorig:LeftArm:1;mixamorig:LeftForeArm:0"; $env:ORTHO = "1.5"; $env:H1 = "1"; $env:MPH = "2"; $env:HINGE = "world"; $env:FREEZE = "mixamorig:RightShoulder"
$env:MIRR = "mixamorig:LeftArm>mixamorig:RightArm:1.0;mixamorig:LeftForeArm>mixamorig:RightForeArm:0.5"
$env:WOFFS = if ($env:SHWOFFS) { $env:SHWOFFS } else { "" }
$env:ARMSET = ""; $env:ELBOWSET = ""; $env:ARMTWIST = ""; $env:REST = "mixamorig:RightArm,mixamorig:RightForeArm,mixamorig:RightHand"; $env:DIRECT = ""; $env:INPLACE = ""
$env:CLIP = "1"; $env:ELBOW = "1"; $env:CLIPDBG = "16"; $env:FR = "0"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" $m $c "$o\${v}c" | Select-String "^CLIP|^LFIST|^ELBOW tgt|Error|Traceback"
$env:CLIP = ""; $env:ELBOW = ""; $env:CLIPDBG = ""; $env:FR = (0..32 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$o\$v$($k[0])"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" $m $c $p | Select-String "Error|Traceback"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\sheetn.py" $p "$o\${v}_$($k[0])_sheet.png" 33 | Select-String "Error|Traceback" }
"DONE $o"
