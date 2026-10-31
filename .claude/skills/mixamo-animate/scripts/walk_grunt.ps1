$s = $PSScriptRoot
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand"
$env:SWING = "mixamorig:LeftArm:1;mixamorig:LeftForeArm:1"
$env:ORTHO = "1.5"; $env:H1 = "1"; $env:MPH = "2"; $env:HINGE = "world"; $env:FREEZE = "mixamorig:RightShoulder,mixamorig:RightHand"; $env:HPROBE = "1"
$env:MIRR = "mixamorig:LeftArm>mixamorig:RightArm:2.8;mixamorig:LeftForeArm>mixamorig:RightForeArm:1"
$env:WOFFS = "mixamorig:LeftArm:1,0,0,-25;mixamorig:RightArm:1,0,0,-17;mixamorig:RightForeArm:1,0,0,18;mixamorig:RightHand:1,0,0,20"
$env:FR = (0..32 -join ",")
foreach ($c in @("0", "-90")) {
  $env:CAMROT = $c
  & "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python "$s\apply_anim.py" -- C:\Users\DANTE\Documents\tide-assets\grunt2\grunt2u.blend "C:\Users\DANTE\Documents\tide-assets\mixamo\Sword And Shield Walk.fbx" "$env:TEMP\v19_$c" 2>&1 | Select-String "ANIM wrote|Error|HP"
}
$env:CLIP = "1"; $env:FR = "0"
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python "$s\apply_anim.py" -- C:\Users\DANTE\Documents\tide-assets\grunt2\grunt2u.blend "C:\Users\DANTE\Documents\tide-assets\mixamo\Sword And Shield Walk.fbx" "$env:TEMP\v19c" 2>&1 | Select-String "CLIP"
