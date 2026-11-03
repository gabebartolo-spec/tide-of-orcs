# Companion archer (TB-203): the approved elf recipes copied exactly (idle v1 = idle_hero.ps1, attack v5 = attack_hero.ps1) on
# archer.blend = hero27.blend with the teal cloak recoloured to archerCloak (recolor_cloak.py). Same rig, weights, bow and quiver spot.
# -clip idle|attack, -view game (GAMECAM=20 CAMROT=0) | front (GAMECAM=20 CAMROT=90). Runs through hid.ps1 (never the screen).
param([ValidateSet("idle","attack")][string]$clip="attack", [ValidateSet("game","front")][string]$view="game",
      [string]$model="C:\Users\DANTE\Documents\tide-assets\archer\archer.blend", [string]$tag="v1", [switch]$dbg)
$Bl="C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $S="$PSScriptRoot"; $o="C:\Users\DANTE\Documents\tide-assets\archer\r"
New-Item -ItemType Directory -Force $o | Out-Null
Remove-Item Env:DIRECT, Env:FR, Env:ARROWPATH, Env:ARROWDBG, Env:RESTUP, Env:ARROWL, Env:WOFFS, Env:QPOSE -ErrorAction SilentlyContinue
$env:QUIVER=1; $env:INPLACE=1; $env:ORTHO=1.4; $env:GRIPSIDE="Left"
$env:RMATCH="LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm"
$env:QFLOAT="0,0,0"; $env:QLEN=0.38; $env:QBOB=0.04
if ($clip -eq "attack") {
  $fbx="C:\Users\DANTE\Documents\tide-assets\mixamo\Standing Draw Arrow AS100.fbx"; $env:BOWALIGN=-1
  $env:ARROWPATH=1; $env:ARROWDBG=1; $env:RESTUP=0.03; $env:ARROWL=0.5; $env:ARROWF=6
  $env:WOFFS="mixamorig:RightArm:0,1,0,-35;mixamorig:RightForeArm:0,1,0,-25;mixamorig:LeftArm:0,0,1,-25"
} else {
  $fbx="C:\Users\DANTE\Documents\tide-assets\mixamo\Standing Idle 03 Examine.fbx"; $env:BOWALIGN="up"; $env:ARROWF=999
  $env:QPOSE="-0.049,0.412,0.518,-0.18,-0.64,0.74"
}
Remove-Item Env:ANGDBG -ErrorAction SilentlyContinue
if ($dbg) { $env:ANGDBG="LeftArm,LeftForeArm,LeftHand,RightArm,RightForeArm,RightHand" }  # jitter probe only (no render): JIT line = worst per-bone twitch
$env:GAMECAM=20; $env:CAMROT = if ($view -eq "game") { 0 } else { 90 }
& "$S\hid.ps1" $Bl -b --factory-startup --python "$S\apply_anim.py" -- $model $fbx "$o\${clip}_${tag}_$view" | Select-String "Error|Traceback|ANIM frames|ARROW \d+ |HIT|JIT|ANGDBG"
