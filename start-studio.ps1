$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$existing = Get-NetTCPConnection -LocalPort 4180 -State Listen -ErrorAction SilentlyContinue
if (-not $existing) {
  $node = (Get-Command node -ErrorAction Stop).Source
  if (-not (Test-Path 'node_modules\tsx\dist\cli.mjs')) {
    Write-Host '首次启动：正在安装 Node.js 依赖...'
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'Node.js 依赖安装失败。' }
  }
  if (-not (Test-Path 'apps\studio-web\dist\index.html')) {
    Write-Host '首次启动：正在构建编辑台...'
    npm run build
    if ($LASTEXITCODE -ne 0) { throw '编辑台构建失败。' }
  }
  & $node 'scripts/bootstrap-asr.mjs'
  $process = Start-Process -FilePath $node -ArgumentList @('node_modules/tsx/dist/cli.mjs','packages/motion-api/src/server.ts') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.studio.out.log' -RedirectStandardError '.studio.err.log'
  $process.Id | Set-Content -LiteralPath '.studio.pid'
}
for ($attempt = 0; $attempt -lt 80; $attempt += 1) {
  Start-Sleep -Milliseconds 250
  try { Invoke-RestMethod 'http://127.0.0.1:4180/api/system' | Out-Null; Start-Process 'http://127.0.0.1:4180'; Write-Host 'Motion Studio started: http://127.0.0.1:4180'; exit 0 } catch {}
}
Get-Content '.studio.err.log' -ErrorAction SilentlyContinue
throw 'Motion Studio failed to start.'
