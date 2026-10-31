$s = $PSScriptRoot; $o = "$env:TEMP\atk"; New-Item -ItemType Directory -Force $o | Out-Null
$bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$m = "C:\Users\DANTE\Documents\tide-assets\grunt2\grunt2u.blend"; $c = "C:\Users\DANTE\Documents\tide-assets\mixamo\Standing Melee Attack Downward AS100.fbx"
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftArm,LeftForeArm"; $env:ORTHO = "2.2"; $env:REST = ""; $env:CLIPDBG = ""
$env:WOFFS = "mixamorig:RightArm:0,1,0,-45;mixamorig:RightHand:0,1,0,15"
$env:CLIP = "1"; $env:FR = "0"; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$o\c" 2>&1 | Select-String "^CLIP |^LFIST|ANIM frames|Error"
$env:CLIP = ""; $env:FR = (0..68 -join ",")
foreach ($r in "0", "-90") { $env:CAMROT = $r; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$o\v3b_$r" 2>&1 | Select-String "Error" }
