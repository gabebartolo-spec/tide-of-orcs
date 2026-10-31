# v4: neck + head held upright as one rigid piece (WYAW), turned only by the chest's heading, so the head faces where he faces, never tilts, never warps.
# Runner attack v1: Standing Melee Attack Downward AS100 (the approved grunt/berserker chop) copied exactly onto runner_split.blend.
# Same knobs as walk_runner.ps1 (RMATCH spine/neck/head + all eight arm bones, INPLACE, GRIP2, RightHand world Z -60 so the grip
# matches the walk). CLIP 0, LFIST 0 over all 69 frames. Dual Weapon Combo AS100 rejected on CLIP: knives into the body on
# frames 9-11 and 69-71 (up to 208 faces) and the left fist 1 cm into the torso on 11-14, with or without the wrist turn.
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\runner\runner_split.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Standing Melee Attack Downward AS100.fbx"; $t = "$env:TEMP\orcs"
$env:REST = ""; $env:WLEVEL = ""; $env:WYAW = "mixamorig:Neck,mixamorig:Head>mixamorig:Spine2"; $env:RMATCH = "Spine,LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; $env:INPLACE = "1"; $env:ORTHO = "1.8"; $env:GRIP2 = "1"
if ($null -eq $env:RA_WOFFS) { $env:WOFFS = "mixamorig:RightHand:0,0,1,-60" } else { $env:WOFFS = $env:RA_WOFFS }
$env:CLIP = "1"; $env:FR = "0"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$t\rac" | Select-String "^CLIP |^LFIST|^WYAW|Error"
if ($env:PROBE) { return }
$env:CLIP = ""; $env:FR = (0..68 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$t\ra_$($k[0])"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c $p | Select-String "Error"
  python "$s\gifn.py" $p "$mx\runner_attack_v4_$($k[0]).gif" 33 ((0..68) -join ",") }
