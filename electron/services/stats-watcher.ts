import { watch, existsSync, type FSWatcher } from 'fs'
import { BrowserWindow } from 'electron'

interface WatchedProject {
  id: string
  path: string
}

const watchers = new Map<string, FSWatcher>()
const watchedPaths = new Map<string, string>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const pendingProjectIds = new Set<string>()

const DEBOUNCE_MS = 3000
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-electron',
  'release',
  '.cache',
  'coverage',
  'build',
  '.vite',
])

function shouldIgnore(filename: string | Buffer | null): boolean {
  if (!filename) return false
  const normalized = filename.toString().replace(/\\/g, '/')
  return normalized.split('/').some((part) => IGNORED_DIRS.has(part))
}

function notifyChange(projectId: string): void {
  pendingProjectIds.add(projectId)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    const projectIds = [...pendingProjectIds]
    pendingProjectIds.clear()
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) {
      win.webContents.send('stats-folder-changed', { projectIds })
    }
  }, DEBOUNCE_MS)
}

function stopWatcher(id: string): void {
  const watcher = watchers.get(id)
  if (watcher) {
    watcher.close()
    watchers.delete(id)
  }
  watchedPaths.delete(id)
}

function startWatcher(project: WatchedProject): void {
  if (!existsSync(project.path)) return

  try {
    const watcher = watch(project.path, { recursive: true }, (_event, filename) => {
      if (shouldIgnore(filename)) return
      notifyChange(project.id)
    })
    watcher.on('error', () => {
      stopWatcher(project.id)
    })
    watchers.set(project.id, watcher)
    watchedPaths.set(project.id, project.path)
  } catch {
    // 監視できないパスはスキップ
  }
}

export function syncStatsWatchers(projects: WatchedProject[]): void {
  const nextIds = new Set(projects.map((p) => p.id))

  for (const id of watchers.keys()) {
    if (!nextIds.has(id)) {
      stopWatcher(id)
    }
  }

  for (const project of projects) {
    const currentPath = watchedPaths.get(project.id)
    if (currentPath === project.path && watchers.has(project.id)) {
      continue
    }
    if (watchers.has(project.id)) {
      stopWatcher(project.id)
    }
    startWatcher(project)
  }
}

export function stopAllStatsWatchers(): void {
  for (const id of [...watchers.keys()]) {
    stopWatcher(id)
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}
