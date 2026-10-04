import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { spawn, type ChildProcess } from 'child_process'
import type { DevServerResult, NodeProjectInfo } from '../../shared/types.js'

const runningServers = new Map<string, ChildProcess>()

export function detectNodeProject(folderPath: string): NodeProjectInfo {
  const pkgPath = join(folderPath, 'package.json')
  if (!existsSync(pkgPath)) {
    return { isNodeProject: false, hasDevScript: false }
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      name?: string
      scripts?: Record<string, string>
    }
    const devScript = pkg.scripts?.dev
    return {
      isNodeProject: true,
      hasDevScript: typeof devScript === 'string' && devScript.length > 0,
      devScript: typeof devScript === 'string' ? devScript : undefined,
      packageName: typeof pkg.name === 'string' ? pkg.name : undefined,
    }
  } catch {
    return { isNodeProject: true, hasDevScript: false }
  }
}

export function isDevServerRunning(folderPath: string): boolean {
  const proc = runningServers.get(folderPath)
  return Boolean(proc && proc.pid && !proc.killed)
}

export function startDevServer(folderPath: string): DevServerResult {
  const info = detectNodeProject(folderPath)
  if (!info.isNodeProject) {
    return { success: false, error: 'package.json が見つかりません' }
  }
  if (!info.hasDevScript) {
    return { success: false, error: 'package.json に dev スクリプトがありません' }
  }

  if (isDevServerRunning(folderPath)) {
    return { success: true, alreadyRunning: true }
  }

  try {
    if (process.platform === 'win32') {
      const child = spawn(
        'cmd.exe',
        ['/c', 'start', 'Dev Server', '/D', folderPath, 'cmd.exe', '/k', 'npm run dev'],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: false,
        },
      )
      child.unref()
      runningServers.set(folderPath, child)
      child.on('exit', () => runningServers.delete(folderPath))
    } else {
      const child = spawn('npm', ['run', 'dev'], {
        cwd: folderPath,
        shell: true,
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      runningServers.set(folderPath, child)
      child.on('exit', () => runningServers.delete(folderPath))
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '開発サーバーの起動に失敗しました',
    }
  }
}

export function stopDevServer(folderPath: string): DevServerResult {
  const proc = runningServers.get(folderPath)
  if (!proc || proc.killed) {
    runningServers.delete(folderPath)
    return { success: false, error: '起動中の開発サーバーが見つかりません' }
  }

  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { shell: true })
    } else {
      proc.kill('SIGTERM')
    }
    runningServers.delete(folderPath)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '開発サーバーの停止に失敗しました',
    }
  }
}
