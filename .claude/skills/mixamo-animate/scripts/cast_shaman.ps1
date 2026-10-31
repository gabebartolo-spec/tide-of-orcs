# Orc shaman cast attack (TB-068, 2026-11-01): the director wants a ranged fireball. Clip Standing 1H Magic Attack 01, downloaded
# MIRRORED (Mixamo Mirror on, Arm-Space 100, 70 frames) so the free LEFT hand casts; the staff arm holds the walk v4 pose (REST
# RightArm/ForeArm/Hand, FREEZE RightShoulder: the cut staff is two loose pieces bridged only by the fist, so it can never leave the
# sculpt grip). Left arm, torso and legs copied from the clip (RMATCH left arm). Model shaman_cut2.blend (the walk model).
# The fireball itself is a game VFX, not in the clip. Usage: & cast_shaman.ps1 [version tag, default v1]
$v = if ($args.Count) { $args[0] } else { "v1" }
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\shaman\shaman_cut2.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Standing 1H Magic Attack 01 MIRROR AS100.fbx"
$o = "$env:TEMP\shc"; New-Item -ItemType Directory -Force $o | Out-Null
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftShoulder,LeftArm,LeftForeArm,LeftHand"; $env:REST = "mixamorig:RightArm,mixamorig:RightForeArm,mixamorig:RightHand"; $env:FREEZE = "mixamorig:RightShoulder"
$env:INPLACE = "1"; $env:ORTHO = "2.0"; $env:DIRECT = ""; $env:SWING = ""; $env:MIRR = ""; $env:H1 = ""; $env:MPH = ""; $env:HINGE = ""; $env:ARMSET = ""; $env:ELBOWSET = ""; $env:ARMTWIST = ""
$env:WOFFS = if ($env:SHWOFFS) { $env:SHWOFFS } else { "" }; $env:OFFS = ""; $env:ALIGN = ""; $env:GRIP2 = ""; $env:LHPROBE = ""
$env:CLIP = "1"; $env:CLIPDBG = "34"; $env:FR = "0"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" $m $c "$o\${v}c" | Select-String "^CLIP|^LFIST|ANIM frames|Error|Traceback"
$env:CLIP = ""; $env:CLIPDBG = ""; $env:FR = (0..69 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$o\$v$($k[0])"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" $m $c $p | Select-String "Error|Traceback"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\sheetn.py" $p "$o\${v}_$($k[0])_sheet.png" 70 | Select-String "Error|Traceback" }
"DONE $o"
