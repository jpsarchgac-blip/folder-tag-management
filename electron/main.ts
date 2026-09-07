import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join, basename } from 'path'
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
} from './services/store.js'
import { detectGitHubFromPath } from './services/git.js'
import { fetchRepoStatus } from './services/github.js'
import type { Project, Tag, Comment } from '../shared/types.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
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
  })

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
    return saveProject(project)
  })

  ipcMain.handle('delete-project', async (_event, id: string) => {
    deleteProject(id)
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
    return saveProject(project)
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
