import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app, safeStorage } from 'electron'
import type { AppData, Tag, Project, Comment } from '../../shared/types.js'
import { removeProjectStatsCache } from './stats-cache-store.js'

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
    tags: [],
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
    if (!parsed.tags) {
      parsed.tags = []
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
  removeProjectStatsCache(id)
}

function collectDescendantIds(id: string, tags: Tag[]): string[] {
  const ids = [id]
  for (const child of tags.filter((t) => (t.parentId ?? null) === id)) {
    ids.push(...collectDescendantIds(child.id, tags))
  }
  return ids
}

function wouldCreateCycle(tagId: string, parentId: string | null, tags: Tag[]): boolean {
  if (!parentId) return false
  if (parentId === tagId) return true
  return collectDescendantIds(tagId, tags).includes(parentId)
}

export function saveTag(tag: Tag): Tag {
  const data = loadData()
  const normalized: Tag = { ...tag, parentId: tag.parentId ?? null }

  if (normalized.parentId === normalized.id) {
    normalized.parentId = null
  }

  if (normalized.parentId && wouldCreateCycle(normalized.id, normalized.parentId, data.tags)) {
    const existing = data.tags.find((t) => t.id === normalized.id)
    normalized.parentId = existing?.parentId ?? null
  }

  const index = data.tags.findIndex((t) => t.id === normalized.id)
  if (index >= 0) {
    data.tags[index] = normalized
  } else {
    data.tags.push(normalized)
  }
  saveData(data)
  return normalized
}

export function deleteTag(id: string): void {
  const data = loadData()
  const toDelete = new Set(collectDescendantIds(id, data.tags))
  data.tags = data.tags.filter((t) => !toDelete.has(t.id))
  data.projects = data.projects.map((p) => ({
    ...p,
    tagIds: p.tagIds.filter((tid) => !toDelete.has(tid)),
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

function normalizeAppData(data: AppData): AppData {
  return {
    tags: data.tags.map((t) => ({ ...t, parentId: t.parentId ?? null })),
    projects: data.projects,
    comments: data.comments,
  }
}

export function isValidAppData(data: unknown): data is AppData {
  if (!data || typeof data !== 'object') return false
  const candidate = data as AppData
  return (
    Array.isArray(candidate.tags) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.comments)
  )
}

export function importAppData(incoming: AppData, mode: 'merge' | 'replace'): AppData {
  const normalizedIncoming = normalizeAppData(incoming)

  if (mode === 'replace') {
    saveData(normalizedIncoming)
    return normalizedIncoming
  }

  const current = loadData()
  const tagMap = new Map(current.tags.map((t) => [t.id, t]))
  for (const tag of normalizedIncoming.tags) {
    tagMap.set(tag.id, tag)
  }

  const projectMap = new Map(current.projects.map((p) => [p.id, p]))
  for (const project of normalizedIncoming.projects) {
    projectMap.set(project.id, project)
  }

  const commentMap = new Map(current.comments.map((c) => [c.id, c]))
  for (const comment of normalizedIncoming.comments) {
    commentMap.set(comment.id, comment)
  }

  const merged: AppData = {
    tags: Array.from(tagMap.values()),
    projects: Array.from(projectMap.values()),
    comments: Array.from(commentMap.values()),
  }
  saveData(merged)
  return merged
}
