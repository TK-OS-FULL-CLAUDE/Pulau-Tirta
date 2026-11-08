param([switch]$After)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$mapPath = Join-Path $projectRoot 'public/maps/pulau-tirta-v3.json'
$map = Get-Content -LiteralPath $mapPath -Raw | ConvertFrom-Json
$images = @{}
$frames = @{}
foreach ($set in $map.tilesets) {
  $imagePath = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $mapPath) $set.image))
  $images[$set.name] = [System.Drawing.Image]::FromFile($imagePath)
  for ($frame = 0; $frame -lt $set.tilecount; $frame++) {
    $frames[[int]($set.firstgid + $frame)] = @{ image = $images[$set.name]; sx = [int](($frame % $set.columns) * 16); sy = [int]([math]::Floor($frame / $set.columns) * 16) }
  }
}
$bitmap = New-Object System.Drawing.Bitmap ([int]($map.width * 16)),([int]($map.height * 16))
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$graphics.Clear([System.Drawing.Color]::FromArgb(132,222,237))
$tileLayers = $map.layers | Where-Object { $_.type -eq 'tilelayer' -and ($_.visible -or ($After -and $_.name.StartsWith('Recovery_'))) } | Sort-Object { ($_.properties | Where-Object name -eq 'renderDepth').value }
foreach ($layer in $tileLayers) {
  for ($tileIndex = 0; $tileIndex -lt $layer.data.Count; $tileIndex++) {
    $gid = [int]$layer.data[$tileIndex]
    if ($gid -eq 0) { continue }
    $frameInfo = $frames[$gid]
    $dest = New-Object System.Drawing.Rectangle ([int](($tileIndex % $map.width) * 16)),([int]([math]::Floor($tileIndex / $map.width) * 16)),16,16
    $graphics.DrawImage($frameInfo.image, $dest, $frameInfo.sx, $frameInfo.sy,16,16,[System.Drawing.GraphicsUnit]::Pixel)
  }
}
$outputDir = Join-Path $projectRoot 'world/previews'
[System.IO.Directory]::CreateDirectory($outputDir) | Out-Null
$stateName = if ($After) { 'after' } else { 'before' }
$bitmap.Save((Join-Path $outputDir ('world-v3-' + $stateName + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
foreach ($image in $images.Values) { $image.Dispose() }
Write-Output ('Preview tersimpan: world/previews/world-v3-' + $stateName + '.png')
