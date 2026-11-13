# Builds dist\GOD-OF-BACK2U-Setup.exe with the C# compiler that ships with .NET Framework 4.x (present on every Windows 10/11).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-installer.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
$src = Join-Path $root 'tools\installer'
$work = Join-Path $env:TEMP 'back2u-build'
$stage = Join-Path $work 'stage'
$dist = Join-Path $root 'dist'

if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $stage 'game') | Out-Null
New-Item -ItemType Directory -Force $dist | Out-Null

# 1. game files
Copy-Item (Join-Path $root 'index.html') (Join-Path $stage 'game')
foreach ($d in 'js', 'models', 'fonts', 'assets') { Copy-Item (Join-Path $root $d) (Join-Path $stage 'game') -Recurse }

# 2. launcher
$common = @('/nologo', '/codepage:65001', '/optimize+', '/platform:anycpu', '/target:winexe',
  "/win32icon:$(Join-Path $root 'assets\icon.ico')", "/win32manifest:$(Join-Path $src 'app.manifest')",
  '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll')
& $csc @common "/out:$(Join-Path $stage 'GOD OF BACK2U.exe')" `
  "/resource:$(Join-Path $root 'assets\keyart.jpg'),keyart.jpg" "/resource:$(Join-Path $root 'fonts\RussoOne-Regular.ttf'),font.ttf" "/resource:$(Join-Path $root 'assets\icon.png'),icon.png" `
  (Join-Path $src 'Common.cs') (Join-Path $src 'Launcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'launcher build failed' }

# 3. pack
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = Join-Path $work 'game.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip, [IO.Compression.CompressionLevel]::Optimal, $false)

# 4. installer with the game embedded
$out = Join-Path $dist 'GOD-OF-BACK2U-Setup.exe'
& $csc @common '/r:System.IO.Compression.dll' "/out:$out" `
  "/resource:$zip,game.zip" "/resource:$(Join-Path $root 'fonts\RussoOne-Regular.ttf'),font.ttf" "/resource:$(Join-Path $root 'assets\icon.png'),icon.png" `
  (Join-Path $src 'Common.cs') (Join-Path $src 'Setup.cs')
if ($LASTEXITCODE -ne 0) { throw 'setup build failed' }

'{0}  {1:N1} MB' -f $out, ((Get-Item $out).Length / 1MB)
