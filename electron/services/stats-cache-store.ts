import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { ProjectFolderStats } from '../../shared/types.js'

export interface StatsCacheEntry extends ProjectFolderStats {
  cachedAt: string
}

interface StatsCacheFile {
  version: 1
  projects: Record<string, StatsCacheEntry>
}

function getCachePath(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, 'stats-cache.json')
}

function createEmptyCache(): StatsCacheFile {
  return { version: 1, projects: {} }
}

export function loadStatsCacheFile(): StatsCacheFile {
  const path = getCachePath()
  if (!existsSync(path)) {
    return createEmptyCache()
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as StatsCacheFile
    if (!parsed.projects) {
      return createEmptyCache()
    }
    return parsed
  } catch {
    return createEmptyCache()
  }
}

function saveStatsCacheFile(cache: StatsCacheFile): void {
  writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), 'utf-8')
}

export function getCachedProjectStats(
  projectId: string,
  expectedPath?: string,
): StatsCacheEntry | null {
  const entry = loadStatsCacheFile().projects[projectId]
  if (!entry) return null
  if (expectedPath && entry.path !== expectedPath) return null
  return entry
}

export function saveProjectStatsCache(stats: ProjectFolderStats): StatsCacheEntry {
  const cache = loadStatsCacheFile()
  const entry: StatsCacheEntry = {
    ...stats,
    cachedAt: new Date().toISOString(),
  }
  cache.projects[stats.projectId] = entry
  saveStatsCacheFile(cache)
  return entry
}

export function removeProjectStatsCache(projectId: string): void {
  const cache = loadStatsCacheFile()
  if (!cache.projects[projectId]) return
  delete cache.projects[projectId]
  saveStatsCacheFile(cache)
}

export function pruneStatsCache(validProjectIds: string[]): void {
  const cache = loadStatsCacheFile()
  const valid = new Set(validProjectIds)
  let changed = false
  for (const id of Object.keys(cache.projects)) {
    if (!valid.has(id)) {
      delete cache.projects[id]
      changed = true
    }
  }
  if (changed) {
    saveStatsCacheFile(cache)
  }
}
