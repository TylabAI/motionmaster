$ErrorActionPreference = 'Stop'
$source = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$parent = Split-Path $source -Parent
$destination = Join-Path $parent 'MotionMaster-v1.7.0-win'
$zip = Join-Path $parent 'MotionMaster-v1.7.0-win.zip'
$resolvedParent = [IO.Path]::GetFullPath($parent).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$resolvedDestination = [IO.Path]::GetFullPath($destination)
if (-not $resolvedDestination.StartsWith($resolvedParent, [StringComparison]::OrdinalIgnoreCase)) { throw 'Release destination escaped the expected parent directory.' }
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
$skipNames = @('node_modules', 'dist', 'projects', 'renders', 'tmp', 'generated', '.git', '.vite', '.studio.pid', '.studio.out.log', '.studio.err.log')
function Copy-ReleaseTree([string]$from, [string]$to) {
  New-Item -ItemType Directory -Path $to -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $from -Force) {
    if ($skipNames -contains $item.Name) { continue }
    $target = Join-Path $to $item.Name
    if ($item.PSIsContainer) { Copy-ReleaseTree $item.FullName $target } else { Copy-Item -LiteralPath $item.FullName -Destination $target -Force }
  }
}
Copy-ReleaseTree $source $destination
$files = Get-ChildItem -LiteralPath $destination -File -Recurse | Where-Object { $_.Name -ne 'SHA256SUMS.txt' } | Sort-Object FullName
$checksums = foreach ($file in $files) { $relative = $file.FullName.Substring($destination.Length + 1); $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant(); "$hash  $relative" }
$checksums | Set-Content -LiteralPath (Join-Path $destination 'SHA256SUMS.txt') -Encoding utf8
Compress-Archive -LiteralPath $destination -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Release folder: $destination"
Write-Host "Release archive: $zip"
