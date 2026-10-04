import { useCallback, useEffect, useRef, useState } from 'react'
import type { AggregateStats, ProjectFolderStats } from '../types'

function isComplete(stats: AggregateStats | null, projectIds: string[]): boolean {
  if (!stats || projectIds.length === 0) return projectIds.length === 0
  const cachedIds = new Set(stats.projects.map((p) => p.projectId))
  return projectIds.every((id) => cachedIds.has(id))
}

export function useStatsCache() {
  const [stats, setStats] = useState<AggregateStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const refreshInFlight = useRef<Promise<void> | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api
      .getStatsCache()
      .then((cached) => {
        if (!cancelled) {
          setStats(cached)
          setIsLoaded(true)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '統計の読み込みに失敗しました')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshStats = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      const silent = options?.silent ?? false
      const force = options?.force ?? false

      if (!silent) {
        setLoading(true)
        setError(null)
      } else {
        setRefreshing(true)
      }

      try {
        const result = force
          ? await window.api.refreshAllProjectStats()
          : await window.api.ensureProjectStats()
        setStats(result)
        setIsLoaded(true)
        if (silent) setError(null)
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : '統計の取得に失敗しました')
        }
      } finally {
        if (!silent) setLoading(false)
        else setRefreshing(false)
      }
    },
    [],
  )

  const refreshChangedProjects = useCallback(async (projectIds: string[], silent = true) => {
    if (projectIds.length === 0) return

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const result = await window.api.refreshProjectStats(projectIds)
      setStats(result)
      setIsLoaded(true)
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : '統計の更新に失敗しました')
      }
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  const ensureStatsForProjects = useCallback(
    async (projectIds: string[]) => {
      if (projectIds.length === 0) return
      if (isComplete(stats, projectIds)) return

      if (refreshInFlight.current) {
        await refreshInFlight.current
        return
      }

      const task = (async () => {
        setRefreshing(true)
        try {
          const result = await window.api.ensureProjectStats(projectIds)
          setStats(result)
          setIsLoaded(true)
          setError(null)
        } catch (err) {
          setError(err instanceof Error ? err.message : '統計の取得に失敗しました')
        } finally {
          setRefreshing(false)
        }
      })()

      refreshInFlight.current = task
      try {
        await task
      } finally {
        refreshInFlight.current = null
      }
    },
    [stats],
  )

  const invalidateStats = useCallback(() => {
    void window.api.getStatsCache().then((cached) => {
      setStats(cached)
      setIsLoaded(true)
    })
  }, [])

  const getProjectStats = useCallback(
    (projectId: string): ProjectFolderStats | null => {
      return stats?.projects.find((p) => p.projectId === projectId) ?? null
    },
    [stats],
  )

  const statsMap = stats
    ? Object.fromEntries(stats.projects.map((p) => [p.projectId, p]))
    : {}

  const isStatsComplete = useCallback(
    (projectIds: string[]) => isComplete(stats, projectIds),
    [stats],
  )

  return {
    stats,
    statsMap,
    loading,
    refreshing,
    error,
    refreshStats,
    refreshChangedProjects,
    ensureStatsForProjects,
    invalidateStats,
    getProjectStats,
    isLoaded,
    isStatsComplete,
  }
}
