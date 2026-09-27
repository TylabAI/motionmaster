$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$node = (Get-Command node -ErrorAction Stop).Source
$config = [ordered]@{
  mcpServers = [ordered]@{
    'motion-studio' = [ordered]@{
      command = $node
      args = @(
        (Join-Path $root 'node_modules\tsx\dist\cli.mjs'),
        (Join-Path $root 'packages\motion-mcp\src\server.ts')
      )
      cwd = $root
    }
  }
}
$outDir = Join-Path $root 'generated'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$outFile = Join-Path $outDir 'motion-studio.mcp.json'
$config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outFile -Encoding utf8
Write-Output $outFile