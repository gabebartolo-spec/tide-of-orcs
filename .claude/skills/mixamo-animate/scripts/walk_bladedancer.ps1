# Bladedancer walk v4: Mixamo "Walking" (exported on X Bot; no Arm-Space param; the copy exported on her own rig, Walking AS100.fbx, has hands above the head in the clip data itself), RMATCH arms only so wrists match the clip.
# v1 REJECTED (wrists 90-105 deg, no RMATCH); v3 REJECTED (Female Walk: leans back 8-10 deg, twitchy heel/toe snaps baked in the clip).
# Walking measured before rendering: 38 frames, torso lean -2..-5 deg, toe snap 12 deg (Female Walk 13), feet 4 deg (FW 6.5).
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $a = "C:\Users\DANTE\Documents\tide-assets"; $mx = "$a\mixamo"
$m = "$a\elf_bladedancer\bladedancer_dagger.blend"; $c = "$mx\Walking XBot.fbx"; $t = "$env:TEMP\bdw"
$env:INPLACE = "1"; $env:ORTHO = "2.6"; $env:RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"
# Daggers: closed thumb/index from the approved attack (FINGSRC frame 1); blades turned to lie back along the forearm by forearm pronation (MALLETFORE), not a wrist twist. Back = CLIP 193 baseline (thumb on own grip); forward pointed the blades up (CLIP 400-670), down-forward stabbed the legs (500-1080).
$env:FMATCH = "Left,Right"; $fb = (@("Thumb1","Thumb2","Thumb3","Index1","Index2","Index3") | ForEach-Object { "mixamorig:LeftHand$_,mixamorig:RightHand$_" }) -join ","
$env:FINGSRC = "$mx\Dual Weapon Combo AS100.fbx|1|$fb"; $env:MPROBE = "Left:-19.26,-16.07,-1.19;Right:20.13,-15.04,-0.88"
$env:MALLETAXIS = "fore"; $env:MALLETMAX = "0"; $env:MALLETFORE = "1"; $env:MALLETSET = "Left:0,1,0;Right:0,1,0"
$env:CLIP = "1"; $env:FR = "0"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$t\bwc" | Select-String "^CLIP |^LFIST|Error"
$env:CLIP = ""; $env:FR = (0..37 -join ",")
foreach ($k in @(@("game", "20", "0"), @("front", "20", "90"))) {
  $env:GAMECAM = $k[1]; $env:CAMROT = $k[2]
  Remove-Item "$t\bw_$($k[0])_*.png" -ErrorAction SilentlyContinue
  & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$t\bw_$($k[0])" | Select-String "Error"
  python "$s\gifn.py" "$t\bw_$($k[0])" "$mx\bladedancer_walk_v5_$($k[0]).gif" 33 ((0..36) -join ",")
}
foreach ($v in "FMATCH","FINGSRC","MPROBE","MALLETAXIS","MALLETMAX","MALLETFORE","MALLETSET","GAMECAM","CAMROT","FR","CLIP") { Remove-Item "env:$v" -ErrorAction SilentlyContinue }
