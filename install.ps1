$ErrorActionPreference = "Stop"

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE ".dsh" }
$src = Join-Path $PSScriptRoot "presets\sisyphus"
$dest = Join-Path $dshHome ".agent-presets\sisyphus"

if (Test-Path $dest) {
  Write-Error "already installed at $dest; remove it first to reinstall"
}

New-Item -ItemType Directory -Force -Path (Join-Path $dshHome ".agent-presets") | Out-Null
Copy-Item -Recurse $src $dest

Write-Host "installed preset 'sisyphus' at $dest"
Write-Host "restart dsh, then choose Sisyphus for a new session (or set agent-presets.default to sisyphus)"