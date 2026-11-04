# Render every approved clip from the field camera (GAMECAM 20, CAMROT 0) into tide-assets\sprites\frames\<key>_N.png,
# then pack_sprites.py builds public/sprites/sheet_orcs.webp + sheet_elf.webp + atlas.json. Each entry repeats its approved recipe's env exactly;
# only the camera, ORTHO (one per actor so walk and attack share a pixel scale), RES and frames differ.
param([string[]]$Only = @(), [string]$Frames = "", [switch]$Missing)  # -Frames: render into another frames dir; -Missing: only frames with no png yet (TB-194)
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $a = "C:\Users\DANTE\Documents\tide-assets"; $mx = "$a\mixamo"
$o = if ($Frames) { $Frames } else { "$a\sprites\frames" }; New-Item -ItemType Directory -Force $o | Out-Null
$vars = "WYAW", "RMATCH", "SWING", "MIRR", "H1", "MPH", "HINGE", "FREEZE", "WOFFS", "OFFS", "REST", "ARMSET", "ELBOWSET", "ARMTWIST", "DIRECT", "INPLACE", "ALIGN", "GRIP2", "CLIP", "CLIPDBG", "ELBOW", "HPROBE", "LHPROBE", "AMP", "DAMP", "ABD", "HIDE", "FOCUS",
  "QUIVER", "QFLOAT", "QPOSE", "QLEN", "QBOB", "ARROWF", "ARROWL", "RESTUP", "BOWALIGN", "GRIPSIDE", "ARROWPATH", "ARROWDBG",  # elf hero (bow + floating quiver)
  "FMATCH", "FINGSRC", "MPROBE", "MALLETAXIS", "MALLETMAX", "MALLETFORE", "MALLETSET",  # bladedancer daggers
  "FINGCOPY", "POSEDUMP", "IDLEPOSE", "BOWALIGNF", "NOCKFING", "STRDRAW", "LIMBBEND", "STRNEAR", "STRTURN", "RETIME", "STABLESH", "HANDSMOOTH", "DRAWRAMP", "RELEASE", "TAIL"  # companion archer (TB-203)
$all = { param($n) (0..($n - 1)) -join "," }  # TB-194: every clip frame (attacks were even frames only, 15 fps)
$jobs = @(
  @{ key = "orc.grunt"; m = "$a\grunt2\grunt2u.blend"; c = "$mx\Sword And Shield Walk.fbx"; ortho = "2.4"; fr = (0..32 -join ","); env = @{  # walk_grunt.ps1 (v19)
      RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand"; SWING = "mixamorig:LeftArm:1;mixamorig:LeftForeArm:1"; H1 = "1"; MPH = "2"; HINGE = "world"; FREEZE = "mixamorig:RightShoulder,mixamorig:RightHand"
      MIRR = "mixamorig:LeftArm>mixamorig:RightArm:2.8;mixamorig:LeftForeArm>mixamorig:RightForeArm:1"
      WOFFS = "mixamorig:LeftArm:1,0,0,-25;mixamorig:RightArm:1,0,0,-17;mixamorig:RightForeArm:1,0,0,18;mixamorig:RightHand:1,0,0,20" } },
  @{ key = "orc.grunt.attack"; m = "$a\grunt2\grunt2u.blend"; c = "$mx\Standing Melee Attack Downward AS100.fbx"; ortho = "2.4"; fr = (& $all 69); env = @{  # attack_grunt.ps1 (v3)
      RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftArm,LeftForeArm"; WOFFS = "mixamorig:RightArm:0,1,0,-45;mixamorig:RightHand:0,1,0,15" } },
  @{ key = "van.spear"; m = "$a\elf_spearman\spearman_1h_mid.blend"; c = "$mx\Sword And Shield Walk.fbx"; ortho = "2.6"; fr = (0..32 -join ","); env = @{  # walk_spearman_1h.ps1 (v16)
      RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand"; SWING = "mixamorig:LeftArm:1;mixamorig:LeftForeArm:0"; H1 = "1"; MPH = "2"; HINGE = "world"; FREEZE = "mixamorig:RightShoulder,mixamorig:RightHand"
      MIRR = "mixamorig:LeftArm>mixamorig:RightArm:2.0;mixamorig:LeftForeArm>mixamorig:RightForeArm:1"
      WOFFS = "mixamorig:RightArm:1,0,0,-5;mixamorig:RightForeArm:1,0,0,10;mixamorig:RightHand:1,0,0,40;mixamorig:RightHand:0,0,1,130"
      ARMSET = "Left:18.6,-15.6"; ELBOWSET = "Left:37"; ARMTWIST = "Left:17.1,22.7" } },
  @{ key = "van.spear.attack"; m = "$a\elf_spearman\spearman_2h_g0.08.blend"; c = "$mx\Bayonet Stab AS100.fbx"; ortho = "2.6"; fr = (& $all 99); env = @{  # attack_spearman.ps1 (v1)
      RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftShoulder,LeftArm,LeftForeArm,LeftHand"; INPLACE = "1"; ALIGN = "Left:-0.607,-0.5,0.618;Right:0.012,-0.004,1.0"; GRIP2 = "1" } },
  @{ key = "orc.boss"; m = "$a\fantasy_orc\fo_thin.blend"; c = "$mx\Orc Walk.fbx"; ortho = "1.6"; fr = (0..35 -join ","); env = @{  # TB-229 walk v3 (director 5 Nov): berserker walk minus GRIP2
      RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"
      WOFFS = "mixamorig:RightHand:1,0,0,60;mixamorig:RightHand:0,1,0,20" } },
  @{ key = "orc.boss.attack"; m = "$a\fantasy_orc\fo_thin.blend"; c = "$mx\Standing Melee Attack Downward AS100.fbx"; ortho = "3.2"; fr = (& $all 69); env = @{  # TB-229 attack v1 (director 5 Nov), no WOFFS; ortho 3.2 (1.8 clips the overhead club)
      RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1" } },
  @{ key = "orc.berserker"; m = "$a\berserker\berserker_split.blend"; c = "$mx\Orc Walk.fbx"; ortho = "2.0"; fr = (0..35 -join ","); env = @{  # walk_berserker.ps1 (v1)
      RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"; GRIP2 = "1"
      WOFFS = "mixamorig:LeftHand:0,0,1,90;mixamorig:RightHand:0,0,1,-90;mixamorig:LeftHand:1,0,0,-20;mixamorig:RightHand:1,0,0,-20" } },
  @{ key = "orc.berserker.attack"; m = "$a\berserker\berserker_split.blend"; c = "$mx\Standing Melee Attack Downward AS100.fbx"; ortho = "2.0"; fr = (& $all 69); env = @{  # attack_berserker.ps1 (v1)
      RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"; GRIP2 = "1" } },
  @{ key = "orc.drummer"; m = "$a\drummer\drummer_raised.blend"; c = "$mx\Orc Walk.fbx"; ortho = "2.0"; fr = (0..35 -join ","); env = @{  # walk_drummer.ps1 (v2) on the raised chest drum (TB-186: one drum height for walk and drum clip)
      RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"
      REST = "mixamorig:LeftHandThumb1,mixamorig:LeftHandThumb2,mixamorig:LeftHandThumb3,mixamorig:RightHandThumb1,mixamorig:RightHandThumb2,mixamorig:RightHandThumb3" } },
  # TB-186 drum clip v6: the exact Playing Drums AS100 loop (frames 18-51), no invented motion. Arms retargeted as the clip has them; the body (hips, spine, legs, thumbs) holds the bind pose; the drum is raised to where the clip's mallets strike.
  @{ key = "orc.drummer.attack"; m = "$a\drummer\drummer_raised.blend"; c = "$mx\Playing Drums AS100.fbx"; ortho = "2.0"; fr = (18..51 -join ","); env = @{
      RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"
      REST = "mixamorig:Hips,mixamorig:Spine,mixamorig:Spine1,mixamorig:Spine2,mixamorig:Neck,mixamorig:Head,mixamorig:LeftUpLeg,mixamorig:LeftLeg,mixamorig:LeftFoot,mixamorig:LeftToeBase,mixamorig:RightUpLeg,mixamorig:RightLeg,mixamorig:RightFoot,mixamorig:RightToeBase,mixamorig:LeftHandThumb1,mixamorig:LeftHandThumb2,mixamorig:LeftHandThumb3,mixamorig:RightHandThumb1,mixamorig:RightHandThumb2,mixamorig:RightHandThumb3" } },
  @{ key = "orc.shaman"; m = "$a\shaman\shaman_cut2.blend"; c = "$mx\Sword And Shield Walk.fbx"; ortho = "2.0"; fr = (0..32 -join ","); env = @{  # walk_shaman.ps1 (v4)
      RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand"; SWING = "mixamorig:LeftArm:1;mixamorig:LeftForeArm:0"; H1 = "1"; MPH = "2"; HINGE = "world"; FREEZE = "mixamorig:RightShoulder"
      MIRR = "mixamorig:LeftArm>mixamorig:RightArm:1.0;mixamorig:LeftForeArm>mixamorig:RightForeArm:0.5"; REST = "mixamorig:RightArm,mixamorig:RightForeArm,mixamorig:RightHand" } },
  @{ key = "orc.shaman.attack"; m = "$a\shaman\shaman_cut2.blend"; c = "$mx\Standing 1H Magic Attack 01 MIRROR AS100.fbx"; ortho = "2.0"; fr = (& $all 69); env = @{  # cast_shaman.ps1 (v2)
      RMATCH = "RightShoulder,RightArm,RightForeArm,RightHand,LeftShoulder,LeftArm,LeftForeArm,LeftHand"; REST = "mixamorig:RightArm,mixamorig:RightForeArm,mixamorig:RightHand"; FREEZE = "mixamorig:RightShoulder"
      INPLACE = "1"; WOFFS = "mixamorig:RightArm:1,0,0,-15" } },
  @{ key = "orc.runner"; m = "$a/runner/runner_split.blend"; c = "$mx/Orc Walk.fbx"; ortho = "1.8"; fr = (0..35 -join ","); env = @{  # walk_runner.ps1 (v2); ORTHO 1.8 = the attack's, so both share a pixel scale
      WYAW = "mixamorig:Neck,mixamorig:Head>mixamorig:Spine2"; RMATCH = "Spine,LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"; GRIP2 = "1"; WOFFS = "mixamorig:RightHand:0,0,1,-60" } },
  @{ key = "orc.runner.attack"; m = "$a/runner/runner_split.blend"; c = "$mx/Standing Melee Attack Downward AS100.fbx"; ortho = "1.8"; fr = (& $all 69); env = @{  # attack_runner.ps1 (v4)
      WYAW = "mixamorig:Neck,mixamorig:Head>mixamorig:Spine2"; RMATCH = "Spine,LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"; GRIP2 = "1"; WOFFS = "mixamorig:RightHand:0,0,1,-60" } },
  @{ key = "orc.brute"; m = "$a/brute/brute_split.blend"; c = "$mx/Orc Walk.fbx"; ortho = "2.3"; fr = (0..35 -join ","); env = @{  # walk_brute.ps1 (v1); ORTHO 2.3 = the attack's, so both share a pixel scale
      WYAW = "mixamorig:Neck,mixamorig:Head>mixamorig:Spine2"; RMATCH = "Spine,LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"; GRIP2 = "1"; WOFFS = "mixamorig:LeftHand:0,0,1,90;mixamorig:LeftHand:0,1,0,30;mixamorig:LeftHand:1,0,0,15" } },
  @{ key = "orc.brute.attack"; m = "$a/brute/brute_split.blend"; c = "$mx/Standing Melee Attack Downward AS100.fbx"; ortho = "2.3"; fr = (& $all 69); env = @{  # attack_brute.ps1 (v1)  (LeftHand WOFFS = club off the left arm)
      WYAW = "mixamorig:Neck,mixamorig:Head>mixamorig:Spine2"; RMATCH = "Spine,LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"; GRIP2 = "1"; WOFFS = "mixamorig:LeftHand:0,0,1,90;mixamorig:LeftHand:0,1,0,30;mixamorig:LeftHand:1,0,0,15" } },
  @{ key = "van.blade"; m = "$a\elf_bladedancer\bladedancer_dagger.blend"; c = "$mx\Walking XBot.fbx"; ortho = "2.6"; fr = (0..36 -join ","); env = @{  # walk_bladedancer.ps1 (v5); frame 37 = frame 0
      RMATCH = "LeftShoulder,LeftArm,LeftForeArm,LeftHand,RightShoulder,RightArm,RightForeArm,RightHand"; INPLACE = "1"; FMATCH = "Left,Right"
      FINGSRC = "$mx\Dual Weapon Combo AS100.fbx|1|" + ((@("Thumb1", "Thumb2", "Thumb3", "Index1", "Index2", "Index3") | ForEach-Object { "mixamorig:LeftHand$_,mixamorig:RightHand$_" }) -join ",")
      MPROBE = "Left:-19.26,-16.07,-1.19;Right:20.13,-15.04,-0.88"; MALLETAXIS = "fore"; MALLETMAX = "0"; MALLETFORE = "1"; MALLETSET = "Left:0,1,0;Right:0,1,0" } },
  @{ key = "van.blade.attack"; m = "$a\elf_bladedancer\bladedancer_dagger.blend"; c = "$mx\Dual Weapon Combo AS100.fbx"; ortho = "2.6"; fr = (& $all 110); env = @{ DIRECT = "1"; INPLACE = "1" } },  # SKILL.md bladedancer attack v1
  # Elf hero: `elf` is the idle loop (the elf never walks). Standing Idle 03 Examine is 153 unique frames (153 = frame 0), slow motion,
  # every frame at 30 fps (TB-144; was every 3rd at 10 fps), ~1.7 MB sheet. Quiver pinned with QPOSE to the attack's measured spot.
  @{ key = "elf"; m = "$a\elf_hero\hero27.blend"; c = "$mx\Standing Idle 03 Examine.fbx"; ortho = "1.6"; fr = (0..152 -join ","); env = @{  # idle_hero.ps1 (v1)
      QUIVER = "1"; INPLACE = "1"; GRIPSIDE = "Left"; BOWALIGN = "up"; RMATCH = "LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm"
      QFLOAT = "0,0,0"; QPOSE = "-0.049,0.412,0.518,-0.18,-0.64,0.74"; QLEN = "0.38"; QBOB = "0.04"; ARROWF = "999" } },
  @{ key = "elf.attack"; m = "$a\elf_hero\hero27.blend"; c = "$mx\Standing Draw Arrow AS100.fbx"; ortho = "1.6"; fr = (0..31 -join ","); env = @{  # attack_hero.ps1 (v5); frame 32 = frame 0; every frame (TB-144)
      QUIVER = "1"; INPLACE = "1"; GRIPSIDE = "Left"; BOWALIGN = "-1"; RMATCH = "LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm"
      RESTUP = "0.03"; ARROWL = "0.5"; ARROWF = "6"; QFLOAT = "0,0,0"; QLEN = "0.38"; QBOB = "0.04"
      WOFFS = "mixamorig:RightArm:0,1,0,-35;mixamorig:RightForeArm:0,1,0,-25;mixamorig:LeftArm:0,0,1,-25" } },
  # Companion archer (TB-203 v7, director 3 Nov "good enough"): archer.ps1 + the v7 env, every frame of the 5%-slower resample (RETIME 1.05:
  # idle 162 frames, attack 44 = 32 draw + 10-frame tail + release). fr = "" renders every resampled frame. The idle job writes the pose the
  # attack blends in from (POSEDUMP -> IDLEPOSE), so run "archer" before "archer.attack".
  @{ key = "archer"; m = "$a\archer\v3\archer3.blend"; c = "$mx\Standing Idle 03 Examine.fbx"; ortho = "1.6"; fr = ""; env = @{  # archer.ps1 -clip idle (v7)
      QUIVER = "1"; INPLACE = "1"; GRIPSIDE = "Left"; BOWALIGN = "up"; ARROWF = "999"; RMATCH = "LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm"
      QFLOAT = "0.25,0,0"; QPOSE = "0.201,0.412,0.518,-0.18,-0.64,0.74"; QLEN = "0.38"; QBOB = "0.04"
      NOCKFING = "1"; STRDRAW = "1"; LIMBBEND = "0.08"; STRNEAR = "0.16,0.40"; STRTURN = "0.03"; RETIME = "1.05"; STABLESH = "1"; HANDSMOOTH = "7,18,12"; DRAWRAMP = "5"; RELEASE = "5"; TAIL = "10"
      POSEDUMP = "$a\archer\v3\idle0.json"; FINGCOPY = "Left:Index>Middle,Ring,Pinky"
      FINGSRC = "$mx\Standing Draw Arrow AS100.fbx|28|mixamorig:LeftHandIndex1,mixamorig:LeftHandIndex2,mixamorig:LeftHandIndex3,mixamorig:LeftHandThumb1,mixamorig:LeftHandThumb2,mixamorig:LeftHandThumb3" } },
  @{ key = "archer.attack"; m = "$a\archer\v3\archer3.blend"; c = "$mx\Standing Draw Arrow AS100.fbx"; ortho = "1.6"; fr = ""; env = @{  # archer.ps1 -clip attack (v7)
      QUIVER = "1"; INPLACE = "1"; GRIPSIDE = "Left"; BOWALIGN = "-1"; RMATCH = "LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm"
      ARROWPATH = "1"; RESTUP = "0.03"; ARROWL = "0.5"; ARROWF = "6"; QFLOAT = "0.25,0,0"; QLEN = "0.38"; QBOB = "0.04"
      WOFFS = "mixamorig:RightArm:0,1,0,-35;mixamorig:RightForeArm:0,1,0,-25;mixamorig:LeftArm:0,0,1,-25"
      NOCKFING = "1"; STRDRAW = "1"; LIMBBEND = "0.08"; STRNEAR = "0.16,0.40"; STRTURN = "0.03"; RETIME = "1.05"; STABLESH = "1"; HANDSMOOTH = "7,18,12"; DRAWRAMP = "5"; RELEASE = "5"; TAIL = "10"
      IDLEPOSE = "$a\archer\v3\idle0.json"; BOWALIGNF = "8,15"; FINGCOPY = "Right:Index>Middle,Ring,Pinky;Left:Index>Middle,Ring,Pinky" } }
)
# orc.wolfrider.attack is NOT an apply_anim job: the wolf rider is a Tripo "Other" rig driven by Quaternius Wolf "Attack" (no Mixamo skeleton).
# Its 20 frames + anchor come from wolfrider\render_wr_sheet.py (same field camera, ORTHO 1.4, RES 512, mirrored to face screen-right):
#   $env:ORTHO = "1.4"; & $bl -b --python "$s\wolfrider\render_wr_sheet.py" -- "$a\wolf_rider\wolfrider_anim6.blend" $o orc.wolfrider.attack
# then put its ANCHOR line into anchors.json as [ax, ay, 1.4] by hand (SKILL.md step 6); pack_sprites.py below picks the frames up like any key.
$anc = @{}; $af = "$o\anchors.json"; if (Test-Path $af) { (Get-Content $af | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $anc[$_.Name] = $_.Value } }
foreach ($j in $jobs) {
  if ($Only.Count -and $Only -notcontains $j.key) { continue }
  foreach ($v in $vars) { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }
  foreach ($k in $j.env.Keys) { Set-Item "Env:$k" $j.env[$k] }
  $fr = $j.fr; if ($Missing -and $fr) { $fr = ($fr -split "," | Where-Object { -not (Test-Path "$o\$($j.key)_$_.png") }) -join ","; if (-not $fr) { "$($j.key) complete"; continue } }
  $env:GAMECAM = "20"; $env:CAMROT = "0"; $env:ORTHO = $j.ortho; $env:RES = "512"; $env:ANCHOR = "1"; if ($fr) { $env:FR = $fr } else { Remove-Item Env:FR -ErrorAction SilentlyContinue }
  $out = & "$s\hid.ps1" $bl -b --factory-startup --python "$s\apply_anim.py" $j.m $j.c "$o\$($j.key)" | Select-String "^ANCHOR|Error"  # hid.ps1: no Blender window on the screen
  "$($j.key) $out"
  # stringify: a MatchInfo piped into Select-String passes through unmatched (empty groups -> 0,0 anchors). Numeric groups only: the elf's
  # arrow probe also prints "ANCHOR <frame> nock-headc/hz ..." lines, which must not be taken for the foot anchor.
  $m = $out | ForEach-Object { "$_" } | Select-String "^ANCHOR (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)\s*$" | Select-Object -First 1
  if ($m) { $anc[$j.key] = @([double]$m.Matches[0].Groups[1].Value, [double]$m.Matches[0].Groups[2].Value, [double]$j.ortho) }
}
$anc | ConvertTo-Json | Set-Content -Encoding utf8 $af
python "$s\pack_sprites.py" $o (Join-Path $s "..\..\..\..\public\sprites")
