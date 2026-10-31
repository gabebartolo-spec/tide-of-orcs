# Elf hero attack v5 (APPROVED 2026-11-01): Standing Draw Arrow AS100 (32 frames) on hero27.blend (hero18 weights + 2x stretch cut + body_plug).
# Magic floating quiver (QFLOAT) placed where the draw hand reaches at frame 6, bobbing QBOB m; the arrow is pulled out, swung to the bow and
# nocked from frame 14. WOFFS on BOTH arms (combo B) + RESTUP keep the shot line clear of the head (0 body hits f13-31; f8-10 hits = the fist).
# Renders the field camera (GAMECAM=20) first; pass -side to add the CAMROT=90 check view. Everything runs through hid.ps1 (never the screen).
param([string]$model="C:\Users\DANTE\Documents\tide-assets\elf_hero\hero27.blend", [string]$tag="v5", [switch]$side)
$Bl="C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$S="$PSScriptRoot"; $o="C:\Users\DANTE\Documents\tide-assets\elf_hero\r2"
$clip="C:\Users\DANTE\Documents\tide-assets\mixamo\Standing Draw Arrow AS100.fbx"
Remove-Item Env:DIRECT, Env:FR -ErrorAction SilentlyContinue
$env:QUIVER=1; $env:INPLACE=1; $env:ORTHO=1.4; $env:GRIPSIDE="Left"; $env:BOWALIGN=-1
$env:RMATCH="LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm"
$env:ARROWPATH=1; $env:ARROWDBG=1; $env:RESTUP=0.03; $env:ARROWL=0.5; $env:ARROWF=6
$env:QFLOAT="0,0,0"; $env:QLEN=0.32; $env:QBOB=0.015
$env:WOFFS="mixamorig:RightArm:0,1,0,-35;mixamorig:RightForeArm:0,1,0,-25;mixamorig:LeftArm:0,0,1,-25"
$views = @("g0"); if($side){ $views += 90 }
foreach($cr in $views){  # g0 = the field camera (GAMECAM=20); 90 = side check view
  if($cr -eq "g0"){ $env:GAMECAM=20; $env:CAMROT=0 } else { Remove-Item Env:GAMECAM -ErrorAction SilentlyContinue; $env:CAMROT=$cr }
  & "$S\hid.ps1" $Bl -b --factory-startup --python "$S\apply_anim.py" -- $model $clip "$o\$tag$cr" | Select-String "Error|Traceback|ARROW \d+ "
  Copy-Item "$o\$tag${cr}_0.png" "$o\$tag${cr}_32.png" -Force
}
# GIF: python gifn.py "$o\${tag}g0" "...\mixamo\elf_attack_${tag}_field.gif" 33 ((0..32) -join ",")
