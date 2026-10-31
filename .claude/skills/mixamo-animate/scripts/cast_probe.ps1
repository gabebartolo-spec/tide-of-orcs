# CLIP/LFIST probe only for the shaman cast: & cast_probe.ps1 "<WOFFS spec>" <tag>
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $m = "C:\Users\DANTE\Documents\tide-assets\shaman\shaman_cut2.blend"; $c = "C:\Users\DANTE\Documents\tide-assets\mixamo\Standing 1H Magic Attack 01 MIRROR AS100.fbx"
$o = "$env:TEMP\shc"; New-Item -ItemType Directory -Force $o | Out-Null
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftShoulder,LeftArm,LeftForeArm,LeftHand"; $env:REST = "mixamorig:RightArm,mixamorig:RightForeArm,mixamorig:RightHand"; $env:FREEZE = "mixamorig:RightShoulder"
$env:INPLACE = "1"; $env:ORTHO = "2.0"; $env:DIRECT = ""; $env:SWING = ""; $env:MIRR = ""; $env:H1 = ""; $env:MPH = ""; $env:HINGE = ""; $env:ARMSET = ""; $env:ELBOWSET = ""; $env:ARMTWIST = ""
$env:WOFFS = $args[0]; $env:OFFS = ""; $env:ALIGN = ""; $env:GRIP2 = ""; $env:LHPROBE = ""; $env:GAMECAM = ""; $env:CAMROT = ""
$env:CLIP = "1"; $env:CLIPDBG = "2"; $env:FR = "0"; "WOFFS $($args[0])"; & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" $m $c "$o\p$($args[1])" | Select-String "^CLIP|^LFIST|Error|Traceback"
