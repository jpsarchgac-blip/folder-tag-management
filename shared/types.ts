export interface Tag {
  id: string
  name: string
  color: string
  parentId?: string | null
}

export interface GitHubInfo {
  owner: string
  repo: string
  url: string
}

export interface Project {
  id: string
  name: string
  path: string
  description: string
  tagIds: string[]
  github?: GitHubInfo
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  projectId: string
  body: string
  createdAt: string
}

export interface RepoStatus {
  name: string
  fullName: string
  description: string | null
  private: boolean
  language: string | null
  stargazersCount: number
  updatedAt: string
  defaultBranch: string
  htmlUrl: string
  error?: string
  needsToken?: boolean
}

export interface GitHubRepoSummary {
  id: number
  name: string
  fullName: string
  description: string | null
  private: boolean
  language: string | null
  stargazersCount: number
  updatedAt: string
  htmlUrl: string
  defaultBranch: string
}

export interface LanguageStat {
  language: string
  lines: number
}

/** 1プロジェクト・1言語あたりの行数上限（超過分は集計除外・参考値表示） */
export const LARGE_LANGUAGE_LINE_THRESHOLD = 1_000_000

export interface ExcludedLanguageStat {
  language: string
  lines: number
}

export interface ProjectFolderStats {
  projectId: string
  name: string
  path: string
  sizeBytes: number
  totalLines: number
  languages: LanguageStat[]
  excludedLanguages?: ExcludedLanguageStat[]
  error?: string
  tokeiWarning?: string
  cachedAt?: string
}

export interface AggregateStats {
  totalSizeBytes: number
  totalLines: number
  byLanguage: LanguageStat[]
  byFolderSize: { projectId: string; name: string; sizeBytes: number }[]
  byFolderLines: { projectId: string; name: string; lines: number }[]
  projects: ProjectFolderStats[]
}

export interface AppData {
  tags: Tag[]
  projects: Project[]
  comments: Comment[]
}

export interface DataExportBundle {
  version: 1
  exportedAt: string
  data: AppData
}

export interface DataFileResult {
  success: boolean
  error?: string
  path?: string
}

export interface DataImportResult {
  success: boolean
  error?: string
  data?: AppData
  counts?: { tags: number; projects: number; comments: number }
}

export type MainView = 'folders' | 'github' | 'stats'

export interface NodeProjectInfo {
  isNodeProject: boolean
  hasDevScript: boolean
  devScript?: string
  packageName?: string
}

export interface DevServerResult {
  success: boolean
  error?: string
  alreadyRunning?: boolean
}

export interface GitFileChange {
  path: string
  status: string
}

export interface GitRepoState {
  isRepo: boolean
  branch: string | null
  hasRemote: boolean
  ahead: number
  behind: number
  changedFiles: GitFileChange[]
  hasChanges: boolean
}

export interface GitOperationResult {
  success: boolean
  error?: string
  output?: string
}

export interface ElectronAPI {
  selectFolder: () => Promise<string | null>
  openFolder: (path: string) => Promise<void>
  openUrl: (url: string) => Promise<void>
  getData: () => Promise<AppData>
  saveProject: (project: Project) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  saveTag: (tag: Tag) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
  saveComment: (comment: Comment) => Promise<Comment>
  deleteComment: (id: string) => Promise<void>
  detectGitHub: (path: string) => Promise<GitHubInfo | null>
  fetchRepoStatus: (owner: string, repo: string) => Promise<RepoStatus>
  fetchUserRepos: () => Promise<GitHubRepoSummary[]>
  getProjectFolderStats: (projectId: string) => Promise<ProjectFolderStats | null>
  getStatsCache: () => Promise<AggregateStats>
  ensureProjectStats: (projectIds?: string[]) => Promise<AggregateStats>
  refreshProjectStats: (projectIds: string[]) => Promise<AggregateStats>
  refreshAllProjectStats: () => Promise<AggregateStats>
  getAggregateStats: () => Promise<AggregateStats>
  setGitHubToken: (token: string) => Promise<void>
  clearGitHubToken: () => Promise<void>
  hasGitHubToken: () => Promise<boolean>
  createProjectFromFolder: (folderPath: string) => Promise<Project>
  detectNodeProject: (folderPath: string) => Promise<NodeProjectInfo>
  startDevServer: (folderPath: string) => Promise<DevServerResult>
  stopDevServer: (folderPath: string) => Promise<DevServerResult>
  isDevServerRunning: (folderPath: string) => Promise<boolean>
  getGitRepoStatus: (folderPath: string) => Promise<GitRepoState>
  gitCommit: (folderPath: string, message: string) => Promise<GitOperationResult>
  gitPush: (folderPath: string) => Promise<GitOperationResult>
  gitCommitAndPush: (folderPath: string, message: string) => Promise<GitOperationResult>
  syncStatsWatchers: (projects: { id: string; path: string }[]) => Promise<void>
  onStatsFolderChanged: (callback: (payload: { projectIds: string[] }) => void) => () => void
  exportData: () => Promise<DataFileResult>
  importData: (mode: 'merge' | 'replace') => Promise<DataImportResult>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
