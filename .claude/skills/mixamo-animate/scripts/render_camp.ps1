# TB-188d: render every Tripo camp building (tide-assets\camp\<id><lv>.glb) into the sprite frames dir as camp.<id>.<lv>_0.png
# with its anchor in anchors.json, then pack_sprites.py packs them into public/sprites/sheet_camp.webp.
# Per-model YAW (the side that shows the trade) lives in tide-assets\camp\yaws.json; width by level = 1.0 / 1.3 / 1.6 m.
param([string[]]$Only = @(), [string]$Frames = "")
$s = $PSScriptRoot; $bl = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"; $a = "C:\Users\DANTE\Documents\tide-assets"
$o = if ($Frames) { $Frames } else { "$a\sprites\frames" }; $c = "$a\camp"; $ORTHO = "2.2"
$yaws = Get-Content "$c\yaws.json" | ConvertFrom-Json; $width = @{ 1 = "1.0"; 2 = "1.3"; 3 = "1.6" }
$anc = @{}; $af = "$o\anchors.json"; if (Test-Path $af) { (Get-Content $af | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $anc[$_.Name] = $_.Value } }
foreach ($id in "bowyer", "forge", "kitchen", "training") {
  foreach ($lv in 1, 2, 3) {
    $n = "$id$lv"; $key = "camp.$id.$lv"
    if (($Only.Count -and $Only -notcontains $n) -or -not (Test-Path "$c\$n.glb")) { continue }
    $env:YAW = "$($yaws.$n)"; $env:WIDTH = $width[$lv]; $env:ORTHO = $ORTHO; $env:RES = "512"
    $out = & "$s\hid.ps1" $bl -b --factory-startup --python "$s\render_camp.py" "$c\$n.glb" "$o\${key}_0.png" | ForEach-Object { "$_" } | Select-String "^ANCHOR|^DIMS|Error"
    "$key $out"
    $m = "$out" -match "ANCHOR (\S+) (\S+)"
    if ($m) { $anc[$key] = @([double]$Matches[1], [double]$Matches[2], [double]$ORTHO) }
  }
}
Remove-Item Env:YAW, Env:WIDTH, Env:ORTHO, Env:RES -ErrorAction SilentlyContinue
$anc | ConvertTo-Json | Set-Content -Encoding utf8 $af
