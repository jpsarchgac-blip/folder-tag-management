import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const root = process.cwd()
const scriptDir = dirname(fileURLToPath(import.meta.url))
const psScript = join(scriptDir, 'create-shortcut.ps1')
const packaged = process.argv.includes('--packaged')
const skipPack = process.argv.includes('--skip-pack')

if (process.platform !== 'win32') {
  console.log('Windows 以外ではショートカット作成をスキップします')
  process.exit(0)
}

if (!existsSync(join(root, 'app icon.jpg')) && !existsSync(join(root, 'build', 'icon.png'))) {
  console.error('アイコンが見つかりません。先に npm run prepare-icon を実行してください。')
  process.exit(1)
}

if (packaged && !skipPack) {
  console.log('パッケージ版ショートカット用にアプリをビルドしています...')
  const pack = spawnSync('npm', ['run', 'electron:pack'], {
    cwd: root,
    shell: true,
    stdio: 'inherit',
  })
  if (pack.status !== 0) {
    console.error('ビルドに失敗しました。')
    process.exit(1)
  }
}

const mode = packaged ? 'packaged' : 'dev'
const result = spawnSync(
  'powershell',
  [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    psScript,
    '-ProjectRoot',
    root,
    '-Mode',
    mode,
  ],
  { encoding: 'utf8' },
)

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'ショートカットの作成に失敗しました')
  process.exit(1)
}

console.log(result.stdout.trim())
