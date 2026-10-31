# Elf hero attack v2 (QUIVER: back quiver + nocked arrow; use hero20_2.blend = cloth inpaint + cloak strip + cut_stretch 2x): Standing Draw Arrow AS100 (32 frames) on hero2_bow.blend (separate bow seated by seat_bow.py in the
# left fist); BOWALIGN keeps the bow upright in the full-draw shot plane, string toward the draw hand
param([string]$model="C:\Users\DANTE\Documents\tide-assets\elf_hero\hero2_bow.blend", [string]$tag="bf")
$B="C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$S="$PSScriptRoot"; $o="C:\Users\DANTE\Documents\tide-assets\elf_hero\r2"
$clip="C:\Users\DANTE\Documents\tide-assets\mixamo\Standing Draw Arrow AS100.fbx"
Remove-Item Env:DIRECT, Env:FR, Env:WOFFS -ErrorAction SilentlyContinue
$env:QUIVER=1; $env:INPLACE=1; $env:ORTHO=1.4; $env:GRIPSIDE="Left"; $env:BOWALIGN=-1; $env:RMATCH="LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm"
foreach($cr in "g0",90){  # g0 = the field camera (GAMECAM=20); 90 = side check view
  if($cr -eq "g0"){ $env:GAMECAM=20; $env:CAMROT=0 } else { Remove-Item Env:GAMECAM -ErrorAction SilentlyContinue; $env:CAMROT=$cr }
  & $B -b --factory-startup --python "$S\apply_anim.py" -- $model $clip "$o\$tag$cr" 2>&1 | Select-String "Error|Traceback"
  Copy-Item "$o\$tag${cr}_0.png" "$o\$tag${cr}_32.png" -Force
  & $B -b --factory-startup --python "$S\sheetn.py" -- "$o\$tag$cr" "$o\sheet_$tag$cr.png" 2>&1 | Select-String "Error|Cannot"
}

