param([switch]$SkipSkillInstall, [string]$SkillRoot)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required.' }
Write-Host 'Installing Motion Studio dependencies...'
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Building Motion Studio...'
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Preparing the default local ASR model (large-v3-turbo)...'
npm run bootstrap:asr
if ($LASTEXITCODE -ne 0) { Write-Warning 'ASR preparation did not finish. Run npm run bootstrap:asr after checking Python and the network.' }
npm run doctor
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $PSScriptRoot 'scripts\generate-mcp-config.ps1') | Out-Host
if (-not $SkipSkillInstall) {
  $skillsDirectory = if ($SkillRoot) { $SkillRoot } elseif ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'skills' } else { Join-Path $env:APPDATA 'pipclaw\codex-home\skills' }
  New-Item -ItemType Directory -Path $skillsDirectory -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'skills\video-motion-master') -Destination $skillsDirectory -Recurse -Force
  Write-Host "Installed video-motion-master skill to $skillsDirectory"
}
Write-Host 'Setup complete. Run start.bat, then add generated\motion-studio.mcp.json to PipClaw MCP settings.'
