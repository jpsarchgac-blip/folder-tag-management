import { loadData } from './store.js'
import { getFolderSize } from './folder-size.js'
import { analyzeLanguages, mergeLanguageStats, applyLanguageLineCap } from './tokei.js'
import {
  getCachedProjectStats,
  saveProjectStatsCache,
  pruneStatsCache,
  type StatsCacheEntry,
} from './stats-cache-store.js'
import type { AggregateStats, Project, ProjectFolderStats } from '../../shared/types.js'

function entryToStats(entry: StatsCacheEntry): ProjectFolderStats {
  return {
    projectId: entry.projectId,
    name: entry.name,
    path: entry.path,
    sizeBytes: entry.sizeBytes,
    totalLines: entry.totalLines,
    languages: entry.languages,
    excludedLanguages: entry.excludedLanguages,
    error: entry.error,
    tokeiWarning: entry.tokeiWarning,
    cachedAt: entry.cachedAt,
  }
}

function buildAggregateStats(projectStats: ProjectFolderStats[]): AggregateStats {
  const totalSizeBytes = projectStats.reduce((sum, p) => sum + p.sizeBytes, 0)
  const totalLines = projectStats.reduce((sum, p) => sum + p.totalLines, 0)
  const byLanguage = mergeLanguageStats(projectStats.map((p) => p.languages))

  return {
    totalSizeBytes,
    totalLines,
    byLanguage,
    byFolderSize: projectStats
      .map((p) => ({ projectId: p.projectId, name: p.name, sizeBytes: p.sizeBytes }))
      .filter((p) => p.sizeBytes > 0)
      .sort((a, b) => b.sizeBytes - a.sizeBytes),
    byFolderLines: projectStats
      .map((p) => ({ projectId: p.projectId, name: p.name, lines: p.totalLines }))
      .filter((p) => p.lines > 0)
      .sort((a, b) => b.lines - a.lines),
    projects: projectStats,
  }
}

async function computeProjectStats(project: Project): Promise<ProjectFolderStats> {
  try {
    const [sizeBytes, tokeiResult] = await Promise.all([
      getFolderSize(project.path),
      analyzeLanguages(project.path),
    ])
    const { languages, excludedLanguages } = applyLanguageLineCap(tokeiResult.languages)
    const totalLines = languages.reduce((sum, l) => sum + l.lines, 0)
    return {
      projectId: project.id,
      name: project.name,
      path: project.path,
      sizeBytes,
      totalLines,
      languages,
      excludedLanguages: excludedLanguages.length > 0 ? excludedLanguages : undefined,
      tokeiWarning: tokeiResult.tokeiWarning,
    }
  } catch (err) {
    return {
      projectId: project.id,
      name: project.name,
      path: project.path,
      sizeBytes: 0,
      totalLines: 0,
      languages: [],
      error: err instanceof Error ? err.message : '統計の取得に失敗しました',
    }
  }
}

function getCachedStatsForProjects(projects: Project[]): ProjectFolderStats[] {
  const stats: ProjectFolderStats[] = []
  for (const project of projects) {
    const cached = getCachedProjectStats(project.id, project.path)
    if (cached) {
      stats.push(entryToStats(cached))
    }
  }
  return stats
}

export function getCachedAggregateStats(): AggregateStats {
  const data = loadData()
  return buildAggregateStats(getCachedStatsForProjects(data.projects))
}

export async function refreshProjectFolderStats(projectId: string): Promise<ProjectFolderStats | null> {
  const data = loadData()
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return null

  const stats = await computeProjectStats(project)
  const entry = saveProjectStatsCache(stats)
  return entryToStats(entry)
}

export async function ensureProjectStats(projectIds?: string[]): Promise<AggregateStats> {
  const data = loadData()
  const targetProjects = projectIds
    ? data.projects.filter((p) => projectIds.includes(p.id))
    : data.projects

  const byId = new Map<string, ProjectFolderStats>()

  for (const project of data.projects) {
    const cached = getCachedProjectStats(project.id, project.path)
    if (cached) {
      byId.set(project.id, entryToStats(cached))
    }
  }

  for (const project of targetProjects) {
    if (byId.has(project.id)) continue
    const stats = await computeProjectStats(project)
    const entry = saveProjectStatsCache(stats)
    byId.set(project.id, entryToStats(entry))
  }

  pruneStatsCache(data.projects.map((p) => p.id))

  const projectStats = data.projects
    .map((p) => byId.get(p.id))
    .filter((p): p is ProjectFolderStats => p !== undefined)

  return buildAggregateStats(projectStats)
}

export async function refreshProjectStats(projectIds: string[]): Promise<AggregateStats> {
  const data = loadData()
  const byId = new Map<string, ProjectFolderStats>()

  for (const project of data.projects) {
    const cached = getCachedProjectStats(project.id, project.path)
    if (cached) {
      byId.set(project.id, entryToStats(cached))
    }
  }

  for (const projectId of projectIds) {
    const project = data.projects.find((p) => p.id === projectId)
    if (!project) continue
    const stats = await computeProjectStats(project)
    const entry = saveProjectStatsCache(stats)
    byId.set(projectId, entryToStats(entry))
  }

  const projectStats = data.projects
    .map((p) => byId.get(p.id))
    .filter((p): p is ProjectFolderStats => p !== undefined)

  return buildAggregateStats(projectStats)
}

export async function refreshAllProjectStats(): Promise<AggregateStats> {
  const data = loadData()
  const projectStats: ProjectFolderStats[] = []

  for (const project of data.projects) {
    const stats = await computeProjectStats(project)
    const entry = saveProjectStatsCache(stats)
    projectStats.push(entryToStats(entry))
  }

  pruneStatsCache(data.projects.map((p) => p.id))
  return buildAggregateStats(projectStats)
}

/** @deprecated use getCachedAggregateStats / ensureProjectStats */
export async function getProjectFolderStats(projectId: string): Promise<ProjectFolderStats | null> {
  const data = loadData()
  const project = data.projects.find((p) => p.id === projectId)
  if (!project) return null

  const cached = getCachedProjectStats(projectId, project.path)
  if (cached) return entryToStats(cached)

  return refreshProjectFolderStats(projectId)
}

/** @deprecated use refreshAllProjectStats */
export async function getAggregateStats(): Promise<AggregateStats> {
  return refreshAllProjectStats()
}
