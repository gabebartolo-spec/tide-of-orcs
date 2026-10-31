# v2: neck + head held upright as one rigid piece (WYAW, turned only by the chest heading), the director's runner attack v4 head fix; v1 copied the clip's head and looked up.
# Runner walk v1: Orc Walk copied exactly onto the Tripo rig (runner_split.blend: body + wpn_L/wpn_R knives cut by cut_flood.py).
# Same recipe as the approved berserker walk: RMATCH both arms (no DIRECT on a Tripo rig), INPLACE, GRIP2.
# RMATCH also takes Spine/Neck/Head: the sculpt is already hunched, so without it Orc Walk stacks its hunch on top and buries the head.
# The down-pointing right knife stabbed the right thigh on frames 15-36 (CLIP 23); RightHand world Z -60 trails it clear: CLIP 0, LFIST 0.
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\runner\runner_split.blend"; $mx = "C:\Users\DANTE\Documents\tide-assets\mixamo"; $c = "$mx\Orc Walk.fbx"; $t = "$env:TEMP\orcs"
$env:WYAW = "mixamorig:Neck,mixamorig:Head>mixamorig:Spine2"; $env:RMATCH = "Spine,LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; $env:INPLACE = "1"; $env:ORTHO = "1.4"; $env:GRIP2 = "1"
if ($null -eq $env:RW_WOFFS) { $env:WOFFS = "mixamorig:RightHand:0,0,1,-60" } else { $env:WOFFS = $env:RW_WOFFS }
$env:CLIP = "1"; $env:FR = "0"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$t\rwc" | Select-String "^CLIP |^LFIST|^WYAW|Error"
if ($env:PROBE) { return }
$env:CLIP = ""; $env:FR = (0..36 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) { $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]; $p = "$t\rw_$($k[0])"
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c $p | Select-String "Error"
  python "$s\gifn.py" $p "$mx\runner_walk_v2_$($k[0]).gif" 33 ((0..35) -join ",") }
