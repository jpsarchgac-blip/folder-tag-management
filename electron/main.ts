import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron'
import { join, basename } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import {
  loadData,
  saveProject,
  deleteProject,
  saveTag,
  deleteTag,
  saveComment,
  deleteComment,
  saveGitHubToken,
  clearGitHubToken,
  hasGitHubToken,
  importAppData,
  isValidAppData,
} from './services/store.js'
import { detectGitHubFromPath, getGitRepoStatus, gitCommit, gitPush, gitCommitAndPush } from './services/git.js'
import { fetchRepoStatus, fetchUserRepos } from './services/github.js'
import {
  getProjectFolderStats,
  getCachedAggregateStats,
  ensureProjectStats,
  refreshProjectStats,
  refreshAllProjectStats,
  getAggregateStats,
} from './services/stats.js'
import {
  detectNodeProject,
  startDevServer,
  stopDevServer,
  isDevServerRunning,
} from './services/nodejs-project.js'
import { syncStatsWatchers, stopAllStatsWatchers } from './services/stats-watcher.js'
import type { Project, Tag, Comment, AppData, DataExportBundle } from '../shared/types.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

let mainWindow: BrowserWindow | null = null

function resolveAppIconPath(): string | null {
  const candidates = [
    join(process.cwd(), 'build', 'icon.png'),
    join(process.cwd(), 'app icon.jpg'),
    join(__dirname, '../build/icon.png'),
    join(__dirname, '../app icon.jpg'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function syncWatchersFromStore(): void {
  const data = loadData()
  syncStatsWatchers(data.projects.map((p) => ({ id: p.id, path: p.path })))
}

function createWindow() {
  const iconPath = resolveAppIconPath()
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Folder Tag Manager',
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  }

  if (iconPath) {
    windowOptions.icon = nativeImage.createFromPath(iconPath)
  }

  mainWindow = new BrowserWindow(windowOptions)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpcHandlers() {
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'フォルダを選択',
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('open-folder', async (_event, folderPath: string) => {
    await shell.openPath(folderPath)
  })

  ipcMain.handle('open-url', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('get-data', async () => {
    return loadData()
  })

  ipcMain.handle('save-project', async (_event, project: Project) => {
    const saved = saveProject(project)
    syncWatchersFromStore()
    return saved
  })

  ipcMain.handle('delete-project', async (_event, id: string) => {
    deleteProject(id)
    syncWatchersFromStore()
  })

  ipcMain.handle('save-tag', async (_event, tag: Tag) => {
    return saveTag(tag)
  })

  ipcMain.handle('delete-tag', async (_event, id: string) => {
    deleteTag(id)
  })

  ipcMain.handle('save-comment', async (_event, comment: Comment) => {
    return saveComment(comment)
  })

  ipcMain.handle('delete-comment', async (_event, id: string) => {
    deleteComment(id)
  })

  ipcMain.handle('detect-github', async (_event, folderPath: string) => {
    return detectGitHubFromPath(folderPath)
  })

  ipcMain.handle('fetch-repo-status', async (_event, owner: string, repo: string) => {
    return fetchRepoStatus(owner, repo)
  })

  ipcMain.handle('fetch-user-repos', async () => {
    return fetchUserRepos()
  })

  ipcMain.handle('get-project-folder-stats', async (_event, projectId: string) => {
    return getProjectFolderStats(projectId)
  })

  ipcMain.handle('get-stats-cache', async () => {
    return getCachedAggregateStats()
  })

  ipcMain.handle('ensure-project-stats', async (_event, projectIds?: string[]) => {
    return ensureProjectStats(projectIds)
  })

  ipcMain.handle('refresh-project-stats', async (_event, projectIds: string[]) => {
    return refreshProjectStats(projectIds)
  })

  ipcMain.handle('refresh-all-project-stats', async () => {
    return refreshAllProjectStats()
  })

  ipcMain.handle('get-aggregate-stats', async () => {
    return getAggregateStats()
  })

  ipcMain.handle('set-github-token', async (_event, token: string) => {
    saveGitHubToken(token)
  })

  ipcMain.handle('clear-github-token', async () => {
    clearGitHubToken()
  })

  ipcMain.handle('has-github-token', async () => {
    return hasGitHubToken()
  })

  ipcMain.handle('create-project-from-folder', async (_event, folderPath: string) => {
    const github = detectGitHubFromPath(folderPath)
    const now = new Date().toISOString()
    const project: Project = {
      id: crypto.randomUUID(),
      name: basename(folderPath),
      path: folderPath,
      description: '',
      tagIds: [],
      github: github ?? undefined,
      createdAt: now,
      updatedAt: now,
    }
    const saved = saveProject(project)
    syncWatchersFromStore()
    return saved
  })

  ipcMain.handle('detect-node-project', async (_event, folderPath: string) => {
    return detectNodeProject(folderPath)
  })

  ipcMain.handle('start-dev-server', async (_event, folderPath: string) => {
    return startDevServer(folderPath)
  })

  ipcMain.handle('stop-dev-server', async (_event, folderPath: string) => {
    return stopDevServer(folderPath)
  })

  ipcMain.handle('is-dev-server-running', async (_event, folderPath: string) => {
    return isDevServerRunning(folderPath)
  })

  ipcMain.handle('get-git-repo-status', async (_event, folderPath: string) => {
    return getGitRepoStatus(folderPath)
  })

  ipcMain.handle('git-commit', async (_event, folderPath: string, message: string) => {
    return gitCommit(folderPath, message)
  })

  ipcMain.handle('git-push', async (_event, folderPath: string) => {
    return gitPush(folderPath)
  })

  ipcMain.handle('git-commit-and-push', async (_event, folderPath: string, message: string) => {
    return gitCommitAndPush(folderPath, message)
  })

  ipcMain.handle('sync-stats-watchers', async (_event, projects: { id: string; path: string }[]) => {
    syncStatsWatchers(projects)
  })

  ipcMain.handle('export-data', async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'データをエクスポート',
      defaultPath: `folder-tag-manager-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) {
      return { success: false }
    }

    try {
      const bundle: DataExportBundle = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: loadData(),
      }
      writeFileSync(result.filePath, JSON.stringify(bundle, null, 2), 'utf-8')
      return { success: true, path: result.filePath }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'エクスポートに失敗しました',
      }
    }
  })

  ipcMain.handle('import-data', async (_event, mode: 'merge' | 'replace') => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'データをインポート',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false }
    }

    try {
      const raw = readFileSync(result.filePaths[0], 'utf-8')
      const parsed = JSON.parse(raw) as DataExportBundle | AppData
      const data = 'data' in parsed && parsed.data ? parsed.data : parsed
      if (!isValidAppData(data)) {
        return { success: false, error: 'ファイル形式が正しくありません' }
      }

      const imported = importAppData(data, mode)
      syncWatchersFromStore()
      return {
        success: true,
        data: imported,
        counts: {
          tags: imported.tags.length,
          projects: imported.projects.length,
          comments: imported.comments.length,
        },
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'インポートに失敗しました',
      }
    }
  })
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.folder-tag-management.app')
  }
  registerIpcHandlers()
  createWindow()
  syncWatchersFromStore()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopAllStatsWatchers()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
