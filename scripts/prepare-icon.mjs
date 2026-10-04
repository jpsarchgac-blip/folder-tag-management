import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { spawnSync } from 'child_process'

const root = process.cwd()
const src = join(root, 'app icon.jpg')
const buildDir = join(root, 'build')
const pngOut = join(buildDir, 'icon.png')
const icoOut = join(buildDir, 'icon.ico')
const publicDir = join(root, 'public')
const publicIcon = join(publicDir, 'app-icon.jpg')

if (!existsSync(src)) {
  console.error('app icon.jpg が見つかりません。プロジェクトルートに配置してください。')
  process.exit(1)
}

mkdirSync(buildDir, { recursive: true })
mkdirSync(publicDir, { recursive: true })
copyFileSync(src, publicIcon)

if (process.platform === 'win32') {
  const ps = `
Add-Type -AssemblyName System.Drawing
$src = '${src.replace(/'/g, "''")}'
$out = '${pngOut.replace(/'/g, "''")}'
$img = [System.Drawing.Image]::FromFile($src)
$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $size, $size)
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$ico = '${icoOut.replace(/'/g, "''")}'
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$stream = [System.IO.File]::Create($ico)
$icon.Save($stream)
$stream.Close()
$icon.Dispose()
$g.Dispose()
$bmp.Dispose()
$img.Dispose()
`
  const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf-8' })
  if (result.status !== 0) {
    console.error(result.stderr || 'アイコンの変換に失敗しました')
    process.exit(1)
  }
} else {
  copyFileSync(src, pngOut)
}

console.log('アイコンを準備しました:', pngOut, icoOut)
