# Orc shaman attack (TB-068, 2026-11-01). v2 = two-hand skull-staff thrust: spearman attack v1 recipe (Bayonet Stab AS100) on
# shaman_2h_g0.08.blend = staff_setup.py (GF 0.08, CR/CL = fist holes from fist_hole_s.py) on shaman_cut2.blend. RMATCH both arms,
# INPLACE, ALIGN both fist holes, GRIP2. v1 (staff smash, Standing Melee Attack Downward / Sword And Shield Slash / Downward Slash on
# the sculpt grip) swept the 0.5 m butt below the fist through the back and cape: CLIP 41-59 frames, not fixable with WOFFS.
# Usage: & attack_shaman.ps1 [version tag, default v2]
$v = if ($args.Count) { $args[0] } else { "v2" }
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\shaman\shaman_2h_g0.08.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Bayonet Stab AS100.fbx"
$o = "$env:TEMP\sha"; New-Item -ItemType Directory -Force $o | Out-Null
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftShoulder,LeftArm,LeftForeArm,LeftHand"; $env:DIRECT = ""; $env:INPLACE = "1"
$env:ALIGN = "Left:0.696,-0.234,0.679;Right:-0.088,-0.231,0.969"; $env:GRIP2 = "1"; $env:ORTHO = "2.0"; $env:OFFS = ""; $env:WOFFS = ""; $env:LHPROBE = ""
$env:REST = ""; $env:SWING = ""; $env:MIRR = ""; $env:FREEZE = ""; $env:H1 = ""; $env:MPH = ""; $env:HINGE = ""; $env:ARMSET = ""; $env:ELBOWSET = ""; $env:ARMTWIST = ""
$env:CLIP = "1"; $env:CLIPDBG = "40"; $env:HAFT = "10"; $env:FR = "0"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" $m $c "$o\${v}c" | Select-String "^CLIP|^LFIST|^HAFT|ANIM frames|Error|Traceback"
$env:CLIP = ""; $env:CLIPDBG = ""; $env:HAFT = ""; $env:FR = (0..98 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$o\$v$($k[0])"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" $m $c $p | Select-String "Error|Traceback"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\sheetn.py" $p "$o\${v}_$($k[0])_sheet.png" 99 | Select-String "Error|Traceback" }
"DONE $o"
