# Brute attack v1: Standing Melee Attack Downward AS100 (the approved grunt/berserker/runner chop) copied exactly onto the Tripo rig
# (brute_split.blend: body + wpn_R axe / wpn_L bone club cut by cut_flood.py with capsule seeds). RMATCH spine + arms, WYAW head, INPLACE, GRIP2.
# Knobs: $env:BA_RMATCH, $env:BA_WOFFS, $env:BA_TAG, $env:PROBE. Clip has 69 unique frames, GIF 0-68.
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\brute\brute_split.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Standing Melee Attack Downward AS100.fbx"; $t = "$env:TEMP\orcs"
$arms = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"
if ($env:BA_RMATCH) { $env:RMATCH = $env:BA_RMATCH } else { $env:RMATCH = "Spine,$arms" }
$env:WYAW = "mixamorig:Neck,mixamorig:Head>mixamorig:Spine2"; $env:REST = ""; $env:WLEVEL = ""  # head: upright + rigid, turned by the chest heading (runner fix)
$env:INPLACE = "1"; $env:ORTHO = "2.3"; $env:GRIP2 = "1"; $env:WOFFS = "$env:BA_WOFFS"
$env:CLIP = "1"; $env:FR = "0"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$t\bac$env:BA_TAG" | Select-String "^CLIP|^LFIST|^WYAW|Error"
if ($env:PROBE) { return }
$env:CLIP = ""; $env:FR = (0..68 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$t\ba_$($k[0])"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c $p | Select-String "Error"
  python "$s\gifn.py" $p "$mx\brute_attack_v1_$($k[0]).gif" 33 ((0..68) -join ",") }
