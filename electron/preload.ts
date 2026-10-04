import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types.js'

const api: ElectronAPI = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  openUrl: (url: string) => ipcRenderer.invoke('open-url', url),
  getData: () => ipcRenderer.invoke('get-data'),
  saveProject: (project) => ipcRenderer.invoke('save-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  saveTag: (tag) => ipcRenderer.invoke('save-tag', tag),
  deleteTag: (id) => ipcRenderer.invoke('delete-tag', id),
  saveComment: (comment) => ipcRenderer.invoke('save-comment', comment),
  deleteComment: (id) => ipcRenderer.invoke('delete-comment', id),
  detectGitHub: (path) => ipcRenderer.invoke('detect-github', path),
  fetchRepoStatus: (owner, repo) => ipcRenderer.invoke('fetch-repo-status', owner, repo),
  fetchUserRepos: () => ipcRenderer.invoke('fetch-user-repos'),
  getProjectFolderStats: (projectId) => ipcRenderer.invoke('get-project-folder-stats', projectId),
  getStatsCache: () => ipcRenderer.invoke('get-stats-cache'),
  ensureProjectStats: (projectIds) => ipcRenderer.invoke('ensure-project-stats', projectIds),
  refreshProjectStats: (projectIds) => ipcRenderer.invoke('refresh-project-stats', projectIds),
  refreshAllProjectStats: () => ipcRenderer.invoke('refresh-all-project-stats'),
  getAggregateStats: () => ipcRenderer.invoke('get-aggregate-stats'),
  setGitHubToken: (token) => ipcRenderer.invoke('set-github-token', token),
  clearGitHubToken: () => ipcRenderer.invoke('clear-github-token'),
  hasGitHubToken: () => ipcRenderer.invoke('has-github-token'),
  createProjectFromFolder: (folderPath) =>
    ipcRenderer.invoke('create-project-from-folder', folderPath),
  detectNodeProject: (folderPath) => ipcRenderer.invoke('detect-node-project', folderPath),
  startDevServer: (folderPath) => ipcRenderer.invoke('start-dev-server', folderPath),
  stopDevServer: (folderPath) => ipcRenderer.invoke('stop-dev-server', folderPath),
  isDevServerRunning: (folderPath) => ipcRenderer.invoke('is-dev-server-running', folderPath),
  getGitRepoStatus: (folderPath) => ipcRenderer.invoke('get-git-repo-status', folderPath),
  gitCommit: (folderPath, message) => ipcRenderer.invoke('git-commit', folderPath, message),
  gitPush: (folderPath) => ipcRenderer.invoke('git-push', folderPath),
  gitCommitAndPush: (folderPath, message) =>
    ipcRenderer.invoke('git-commit-and-push', folderPath, message),
  syncStatsWatchers: (projects) => ipcRenderer.invoke('sync-stats-watchers', projects),
  onStatsFolderChanged: (callback) => {
    const listener = (_event: unknown, payload: { projectIds: string[] }) => {
      callback(payload)
    }
    ipcRenderer.on('stats-folder-changed', listener)
    return () => {
      ipcRenderer.removeListener('stats-folder-changed', listener)
    }
  },
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (mode) => ipcRenderer.invoke('import-data', mode),
}

contextBridge.exposeInMainWorld('api', api)
