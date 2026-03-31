$root  = 'C:\Code\Grok-it'
$stage = 'C:\Code\Grok-it\_stage'
$zipPath = Join-Path $root 'Grok-it-store.zip'

If (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory $stage | Out-Null
New-Item -ItemType Directory (Join-Path $stage 'Icons') | Out-Null

# Flat extension files
$flat = @('manifest.json','background.js','popup.html','popup.js','options.html','options.js','constants.js','history.js','theme.js','icon.png')
foreach ($f in $flat) {
    Copy-Item (Join-Path $root $f) $stage
}

# Icons into Icons\ subfolder
$icons = @('icon16.png','icon48.png','icon128.png')
foreach ($i in $icons) {
    Copy-Item (Join-Path $root 'Icons' | Join-Path -ChildPath $i) (Join-Path $stage 'Icons')
}

# Build zip from staging folder
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath -Force

# Remove staging folder
Remove-Item $stage -Recurse -Force

# Verify contents
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$zip.Entries | Select-Object FullName, @{N='KB';E={[math]::Round($_.Length/1KB,1)}} | Format-Table -AutoSize
$zip.Dispose()

Write-Host ('Total zip size: ' + [math]::Round((Get-Item $zipPath).Length/1KB,1) + ' KB')
