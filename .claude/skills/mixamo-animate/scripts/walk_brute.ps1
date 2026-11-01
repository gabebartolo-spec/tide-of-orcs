# Brute walk v1: Orc Walk copied exactly onto the Tripo rig (brute_split.blend: body + wpn_R axe / wpn_L bone club cut by cut_flood.py
# with capsule seeds along each haft). RMATCH spine + arms, WYAW head (no DIRECT on a Tripo rig), INPLACE, GRIP2. Knobs: $env:BW_RMATCH, $env:BW_WOFFS, $env:PROBE.
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\brute\brute_split.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Orc Walk.fbx"; $t = "$env:TEMP\orcs"
$arms = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"
if ($env:BW_RMATCH) { $env:RMATCH = $env:BW_RMATCH } else { $env:RMATCH = "Spine,$arms" }
$env:WYAW = "mixamorig:Neck,mixamorig:Head>mixamorig:Spine2"; $env:REST = ""; $env:WLEVEL = ""  # head: upright + rigid, turned by the chest heading (runner fix)
$env:INPLACE = "1"; $env:ORTHO = "1.5"; $env:GRIP2 = "1"; $env:WOFFS = "$env:BW_WOFFS"
$env:CLIP = "1"; $env:FR = "0"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$t\bwc$env:BW_TAG" | Select-String "^CLIP|^LFIST|^WYAW|Error"
if ($env:PROBE) { return }
$env:CLIP = ""; $env:FR = (0..36 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$t\bw_$($k[0])"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c $p | Select-String "Error"
  python "$s\gifn.py" $p "$mx\brute_walk_v1_$($k[0]).gif" 33 ((0..35) -join ",") }
