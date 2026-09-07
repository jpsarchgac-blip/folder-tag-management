import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app, safeStorage } from 'electron'
import type { AppData, Tag, Project, Comment } from '../../shared/types.js'

const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-work', name: '仕事', color: '#3b82f6' },
  { id: 'tag-personal', name: '個人', color: '#22c55e' },
  { id: 'tag-learning', name: '学習', color: '#f59e0b' },
  { id: 'tag-archive', name: 'アーカイブ', color: '#6b7280' },
]

function getDataDir(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getDataPath(): string {
  return join(getDataDir(), 'appdata.json')
}

function getTokenPath(): string {
  return join(getDataDir(), 'github-token.enc')
}

function createDefaultData(): AppData {
  return {
    tags: DEFAULT_TAGS,
    projects: [],
    comments: [],
  }
}

export function loadData(): AppData {
  const path = getDataPath()
  if (!existsSync(path)) {
    const data = createDefaultData()
    saveData(data)
    return data
  }
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as AppData
    if (!parsed.tags?.length) {
      parsed.tags = DEFAULT_TAGS
    }
    return parsed
  } catch {
    const data = createDefaultData()
    saveData(data)
    return data
  }
}

export function saveData(data: AppData): void {
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function saveProject(project: Project): Project {
  const data = loadData()
  const index = data.projects.findIndex((p) => p.id === project.id)
  const updated = { ...project, updatedAt: new Date().toISOString() }
  if (index >= 0) {
    data.projects[index] = updated
  } else {
    data.projects.push(updated)
  }
  saveData(data)
  return updated
}

export function deleteProject(id: string): void {
  const data = loadData()
  data.projects = data.projects.filter((p) => p.id !== id)
  data.comments = data.comments.filter((c) => c.projectId !== id)
  saveData(data)
}

export function saveTag(tag: Tag): Tag {
  const data = loadData()
  const index = data.tags.findIndex((t) => t.id === tag.id)
  if (index >= 0) {
    data.tags[index] = tag
  } else {
    data.tags.push(tag)
  }
  saveData(data)
  return tag
}

export function deleteTag(id: string): void {
  const data = loadData()
  data.tags = data.tags.filter((t) => t.id !== id)
  data.projects = data.projects.map((p) => ({
    ...p,
    tagIds: p.tagIds.filter((tid) => tid !== id),
  }))
  saveData(data)
}

export function saveComment(comment: Comment): Comment {
  const data = loadData()
  const index = data.comments.findIndex((c) => c.id === comment.id)
  if (index >= 0) {
    data.comments[index] = comment
  } else {
    data.comments.push(comment)
  }
  saveData(data)
  return comment
}

export function deleteComment(id: string): void {
  const data = loadData()
  data.comments = data.comments.filter((c) => c.id !== id)
  saveData(data)
}

export function saveGitHubToken(token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    writeFileSync(getTokenPath(), token, 'utf-8')
    return
  }
  const encrypted = safeStorage.encryptString(token)
  writeFileSync(getTokenPath(), encrypted)
}

export function loadGitHubToken(): string | null {
  const path = getTokenPath()
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path)
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(content)
    }
    return content.toString('utf-8')
  } catch {
    return null
  }
}

export function clearGitHubToken(): void {
  const path = getTokenPath()
  if (existsSync(path)) {
    writeFileSync(path, '')
  }
}

export function hasGitHubToken(): boolean {
  const token = loadGitHubToken()
  return Boolean(token && token.trim().length > 0)
}
