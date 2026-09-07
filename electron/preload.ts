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
  setGitHubToken: (token) => ipcRenderer.invoke('set-github-token', token),
  clearGitHubToken: () => ipcRenderer.invoke('clear-github-token'),
  hasGitHubToken: () => ipcRenderer.invoke('has-github-token'),
  createProjectFromFolder: (folderPath) =>
    ipcRenderer.invoke('create-project-from-folder', folderPath),
}

contextBridge.exposeInMainWorld('api', api)
