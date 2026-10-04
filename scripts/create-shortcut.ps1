param(
  [string]$ProjectRoot,
  [string]$ProductName = "Folder Tag Manager",
  [ValidateSet('dev', 'packaged')]
  [string]$Mode = 'dev'
)

$ErrorActionPreference = "Stop"

function New-AppShortcut {
  param(
    [string]$ShortcutPath,
    [string]$TargetPath,
    [string]$Arguments,
    [string]$WorkingDirectory,
    [string]$IconLocation
  )

  $dir = Split-Path -Parent $ShortcutPath
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  $WshShell = New-Object -ComObject WScript.Shell
  $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $TargetPath
  $Shortcut.Arguments = $Arguments
  $Shortcut.WorkingDirectory = $WorkingDirectory
  $Shortcut.IconLocation = $IconLocation
  $Shortcut.Description = $ProductName
  $Shortcut.Save()
}

function Get-IconPath {
  $iconPng = Join-Path $ProjectRoot "build\icon.png"
  $iconIco = Join-Path $ProjectRoot "build\icon.ico"
  $iconJpg = Join-Path $ProjectRoot "app icon.jpg"
  if (Test-Path $iconIco) { return $iconIco }
  if (Test-Path $iconPng) { return $iconPng }
  if (Test-Path $iconJpg) { return $iconJpg }
  throw "Icon not found. Run: npm run prepare-icon"
}

function Find-BuiltExe {
  $releaseDir = Join-Path $ProjectRoot "release"
  $builtExe = Join-Path $releaseDir "win-unpacked\$ProductName.exe"
  if (Test-Path $builtExe) { return $builtExe }

  $match = Get-ChildItem -Path $releaseDir -Recurse -Filter "$ProductName.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($match) { return $match.FullName }
  return $null
}

$iconPath = Get-IconPath
$desktopDir = [Environment]::GetFolderPath("Desktop")
$startMenuDir = [Environment]::GetFolderPath("Programs")
$desktopShortcut = Join-Path $desktopDir "$ProductName.lnk"
$startMenuShortcut = Join-Path $startMenuDir "$ProductName.lnk"

if ($Mode -eq 'packaged') {
  $builtExe = Find-BuiltExe
  if (-not $builtExe) {
    throw "Built exe not found. Run: npm run electron:pack"
  }

  $workDir = Split-Path $builtExe -Parent
  $icon = "$builtExe,0"
  New-AppShortcut -ShortcutPath $desktopShortcut -TargetPath $builtExe -Arguments "" -WorkingDirectory $workDir -IconLocation $icon
  New-AppShortcut -ShortcutPath $startMenuShortcut -TargetPath $builtExe -Arguments "" -WorkingDirectory $workDir -IconLocation $icon
  Write-Output "Created PACKAGED shortcuts (release build)"
  Write-Output "Note: Re-run npm run setup-shortcut after code changes to update this build."
} else {
  $npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if (-not $npmCmd) {
    $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source
  }
  if (-not $npmCmd) {
    throw "npm not found"
  }

  New-AppShortcut -ShortcutPath $desktopShortcut -TargetPath $npmCmd -Arguments "run dev" -WorkingDirectory $ProjectRoot -IconLocation $iconPath
  New-AppShortcut -ShortcutPath $startMenuShortcut -TargetPath $npmCmd -Arguments "run dev" -WorkingDirectory $ProjectRoot -IconLocation $iconPath
  Write-Output "Created DEV shortcuts (npm run dev - always latest code)"
}

Write-Output $desktopShortcut
Write-Output $startMenuShortcut
