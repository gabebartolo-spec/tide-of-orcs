# Berserker attack v1: Standing Melee Attack Downward AS100 (the grunt v3 chop) copied exactly onto the Tripo rig
# (berserker_split.blend: body + wpn_L/wpn_R cut by cut_axes.py). RMATCH both arms (no DIRECT on a Tripo rig), INPLACE, GRIP2.
# The bind grip (haft perpendicular to the forearm) is a natural chopping grip, so no WOFFS: CLIP 0 / LFIST 0 over all 69 frames
# with no offsets at all (2026-11-01). Clip has 69 unique frames (ANIM frames 1 69), GIF 0-68.
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\berserker\berserker_split.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Standing Melee Attack Downward AS100.fbx"
$env:RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; $env:INPLACE = "1"; $env:ORTHO = "1.8"; $env:GRIP2 = "1"; $env:WOFFS = ""
$env:CLIP = "1"; $env:FR = "0"; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$env:TEMP\bz\bac" 2>&1 | Select-String "^CLIP |^LFIST"
$env:CLIP = ""; $env:FR = (0..68 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$env:TEMP\bz\ba$($k[0])"
  & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c $p 2>&1 | Select-String "Error"
  python "$s\gifn.py" $p "$mx\berserker_attack_v1_$($k[0]).gif" 33 ((0..68) -join ",") }
