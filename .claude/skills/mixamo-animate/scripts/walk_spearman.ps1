$s = $PSScriptRoot; $o = "$env:TEMP\spwalk"; New-Item -ItemType Directory -Force $o | Out-Null
$bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$d = "C:\Users\DANTE\Documents\tide-assets\elf_spearman"; $m = "$d\spearman_2h_g0.25s.blend"; $c = "C:\Users\DANTE\Documents\tide-assets\mixamo\Walk With Rifle AS100.fbx"
# spearman_2h_g0.25s.blend = spear_setup.py (GF 0.25, CL=0.1684,-0.0352,0.3429) on spearman_rigged.blend, then seam_patch.py ; v12 = pike charge (right wrist at hip, left fist rides the haft via SPEARIK)
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftShoulder,LeftArm,LeftForeArm,LeftHand"; $env:DIRECT = ""; $env:INPLACE = "1"
$env:ALIGN = "Left:-0.607,-0.5,0.618;Right:0.012,-0.004,1.0"; $env:GRIP2 = "1"; $env:POSEIN = ""; $env:HANDIK = "Right:0.15,0.1,0.5;Left:0.9,0.55,0"; $env:SPEARIK = "0.2,-20,-10"; $env:HAFT = ""; $env:HPROBE = ""; $env:ORTHO = "2.4"; $env:OFFS = ""; $env:WOFFS = ""; $env:CLIPDBG = ""; $env:LHPROBE = ""
$env:CLIP = "1"; $env:FR = "0"; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$o\c" 2>&1 | Select-String "^CLIP |^LFIST|ANIM frames|Error"
$env:CLIP = ""; $env:FR = (0..32 -join ",")
foreach ($k in "field", "front") { if ($k -eq "field") { $env:GAMECAM = "20"; $env:CAMROT = "0" } else { $env:GAMECAM = ""; $env:CAMROT = "-90" }; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$o\v12$k" 2>&1 | Select-String "Error" }



