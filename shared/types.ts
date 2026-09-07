export interface Tag {
  id: string
  name: string
  color: string
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

export interface AppData {
  tags: Tag[]
  projects: Project[]
  comments: Comment[]
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
  setGitHubToken: (token: string) => Promise<void>
  clearGitHubToken: () => Promise<void>
  hasGitHubToken: () => Promise<boolean>
  createProjectFromFolder: (folderPath: string) => Promise<Project>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
