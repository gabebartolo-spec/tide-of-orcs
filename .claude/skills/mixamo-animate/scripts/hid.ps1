# Run an exe with no window on the director's screen (never launch blender.exe / python.exe directly): hidden window,
# stdout+stderr captured and printed back. Env vars set in the caller are inherited.
# Usage: & hid.ps1 <exe> <args...>   (PowerShell swallows a bare `--` when calling a script, so for Blender the `--`
# after `--python <script>` is put back here)
$exe = $args[0]; $a = [Collections.Generic.List[string]]($args[1..($args.Count - 1)] | ForEach-Object { "$_" })
$i = $a.IndexOf("--python"); if ($i -ge 0 -and ($i + 2 -ge $a.Count -or $a[$i + 2] -ne "--")) { $a.Insert($i + 2, "--") }
$rest = $a | ForEach-Object { '"' + $_ + '"' }
$log = [IO.Path]::GetTempFileName()
Start-Process -FilePath $exe -ArgumentList $rest -WindowStyle Hidden -Wait -RedirectStandardOutput $log -RedirectStandardError "$log.err"
Get-Content $log, "$log.err"; Remove-Item $log, "$log.err" -ErrorAction SilentlyContinue
