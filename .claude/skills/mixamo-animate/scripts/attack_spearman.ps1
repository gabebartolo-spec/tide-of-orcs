$s = $PSScriptRoot; $o = "$env:TEMP\spatk"; New-Item -ItemType Directory -Force $o | Out-Null
$bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$d = "C:\Users\DANTE\Documents\tide-assets\elf_spearman"; $m = "$d\spearman_2h_g0.08.blend"; $c = "C:\Users\DANTE\Documents\tide-assets\mixamo\Bayonet Stab AS100.fbx"
# spearman_2h_g0.08.blend = spear_setup.py (GF 0.08, CL = left fist hole) on spearman_rigged.blend (Tripo's own rig)
$env:RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftShoulder,LeftArm,LeftForeArm,LeftHand"; $env:DIRECT = ""; $env:INPLACE = "1"
$env:ALIGN = "Left:-0.607,-0.5,0.618;Right:0.012,-0.004,1.0"; $env:GRIP2 = "1"; $env:ORTHO = "2.0"; $env:OFFS = ""; $env:WOFFS = ""; $env:CLIPDBG = ""; $env:LHPROBE = ""
$env:CLIP = "1"; $env:FR = "0"; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$o\c" 2>&1 | Select-String "^CLIP |^LFIST|ANIM frames|Error"
$env:CLIP = ""; $env:FR = (0..98 -join ",")
foreach ($r in "0", "90") { $env:CAMROT = $r; & $bl -b --factory-startup --python "$s\apply_anim.py" -- $m $c "$o\v1_$r" 2>&1 | Select-String "Error" }
