# Elf hero idle v1: Standing Idle 03 Examine (154 frames, loops) on hero27.blend, the same model as the approved attack v5.
# Same magic floating quiver, pinned to the attack's measured world spot with QPOSE (mouth + axis) so it hangs in the same
# place in every clip of the unit; it bobs QBOB m once per loop. BOWALIGN=up stands the bow upright in the bow fist (no draw
# line in an idle). ARROWF=999 keeps the nocked arrow hidden on every frame (an idle never draws). Field camera GAMECAM=20.
# Everything runs through hid.ps1 (never the screen).
param([string]$model="C:\Users\DANTE\Documents\tide-assets\elf_hero\hero27.blend", [string]$tag="idle", [switch]$side)
$Bl="C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$S="$PSScriptRoot"; $o="C:\Users\DANTE\Documents\tide-assets\elf_hero\r2"
$clip="C:\Users\DANTE\Documents\tide-assets\mixamo\Standing Idle 03 Examine.fbx"
Remove-Item Env:DIRECT, Env:FR, Env:ARROWPATH, Env:ARROWDBG, Env:RESTUP, Env:ARROWL, Env:WOFFS -ErrorAction SilentlyContinue
$env:QUIVER=1; $env:INPLACE=1; $env:ORTHO=1.4; $env:GRIPSIDE="Left"; $env:BOWALIGN="up"
$env:RMATCH="LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm"
$env:QFLOAT="0,0,0"; $env:QPOSE="-0.049,0.412,0.518,-0.18,-0.64,0.74"; $env:QLEN=0.32; $env:QBOB=0.015
$env:ARROWF=999
$views = @("g0"); if($side){ $views += 90 }
foreach($cr in $views){  # g0 = the field camera (GAMECAM=20); 90 = side check view
  if($cr -eq "g0"){ $env:GAMECAM=20; $env:CAMROT=0 } else { Remove-Item Env:GAMECAM -ErrorAction SilentlyContinue; $env:CAMROT=$cr }
  & "$S\hid.ps1" $Bl -b --factory-startup --python "$S\apply_anim.py" -- $model $clip "$o\$tag$cr" | Select-String "Error|Traceback|ANIM frames|QFLOAT"
}
# GIF (unique frames only; check whether the last frame repeats frame 0 first): python gifn.py "$o\${tag}g0" "...\mixamo\elf_idle_v1_field.gif" 33 ((0..152) -join ",")
