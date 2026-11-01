# walk.ps1 <tag> k=v ... : drummer walk = berserker walk v1 recipe (Orc Walk, RMATCH all 8 arm bones, INPLACE, ORTHO 1.4) on drummer_up.blend, thumbs held
param($tag)
foreach ($kv in $args) { $k, $v = $kv.Split("=", 2); Set-Item -Path "env:$k" -Value $v }
$s = "C:\Users\DANTE\Documents\GitHub\tide-of-orcs\.claude\skills\mixamo-animate\scripts"
if (-not $env:BLEND) { $env:BLEND = "C:\Users\DANTE\Documents\tide-assets\drummer\drummer_up.blend" }
$env:REST = "mixamorig:LeftHandThumb1,mixamorig:LeftHandThumb2,mixamorig:LeftHandThumb3,mixamorig:RightHandThumb1,mixamorig:RightHandThumb2,mixamorig:RightHandThumb3"
$env:RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"
$env:INPLACE = "1"; if (-not $env:GAMECAM) { $env:GAMECAM = "20" }; if (-not $env:ORTHO) { $env:ORTHO = "1.4" }
& "$s\hid.ps1" "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python "$s\apply_anim.py" $env:BLEND "C:\Users\DANTE\Documents\tide-assets\mixamo\Orc Walk.fbx" "$PSScriptRoot\$tag" *> "$PSScriptRoot\$tag.log"
