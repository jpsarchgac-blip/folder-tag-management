import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Project, Tag, Comment, MainView } from './types'
import { Sidebar } from './components/Sidebar'
import { ProjectList } from './components/ProjectList'
import { ProjectDetail } from './components/ProjectDetail'
import { RepoList } from './components/RepoList'
import { StatsDashboard } from './components/StatsDashboard'
import { SettingsModal } from './components/SettingsModal'
import { useStatsCache } from './hooks/useStatsCache'
import { getAggregatedProjectCount, projectMatchesTag } from './utils/tags'
import './App.css'

function App() {
  const [tags, setTags] = useState<Tag[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [activeView, setActiveView] = useState<MainView>('folders')
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const {
    stats,
    statsMap,
    loading: statsLoading,
    refreshing: statsRefreshing,
    error: statsError,
    refreshStats,
    refreshChangedProjects,
    ensureStatsForProjects,
    invalidateStats,
    getProjectStats,
    isStatsComplete,
    isLoaded: statsLoaded,
  } = useStatsCache()

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects])

  const ensureAllStats = useCallback(() => {
    ensureStatsForProjects(projectIds)
  }, [ensureStatsForProjects, projectIds])

  const loadData = useCallback(async () => {
    const data = await window.api.getData()
    setTags(data.tags)
    setProjects(data.projects)
    setComments(data.comments)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (loading) return
    window.api.syncStatsWatchers(projects.map((p) => ({ id: p.id, path: p.path })))
  }, [loading, projects])

  useEffect(() => {
    const unsubscribe = window.api.onStatsFolderChanged(({ projectIds }) => {
      refreshChangedProjects(projectIds, true)
    })
    return unsubscribe
  }, [refreshChangedProjects])

  useEffect(() => {
    if (loading || !statsLoaded || projectIds.length === 0) return
    if (!isStatsComplete(projectIds) && !statsLoading) {
      ensureStatsForProjects(projectIds)
    }
  }, [loading, statsLoaded, projectIds, isStatsComplete, statsLoading, ensureStatsForProjects])

  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tag of tags) {
      counts[tag.id] = getAggregatedProjectCount(tag.id, tags, projects)
    }
    return counts
  }, [tags, projects])

  const filteredProjects = useMemo(() => {
    let result = [...projects]

    if (selectedTagId) {
      result = result.filter((p) => projectMatchesTag(p.tagIds, selectedTagId, tags))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.path.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.github?.repo.toLowerCase().includes(q),
      )
    }

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ja')
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return result
  }, [projects, selectedTagId, searchQuery, sortBy])

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null

  const handleAddFolder = async () => {
    const folderPath = await window.api.selectFolder()
    if (!folderPath) return

    const exists = projects.some((p) => p.path === folderPath)
    if (exists) {
      alert('このフォルダは既に登録されています')
      return
    }

    const project = await window.api.createProjectFromFolder(folderPath)
    setProjects((prev) => [...prev, project])
    setSelectedProjectId(project.id)
    setActiveView('folders')
    invalidateStats()
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setActiveView('folders')
  }

  const handleSaveProject = async (project: Project) => {
    const saved = await window.api.saveProject(project)
    setProjects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
  }

  const handleDeleteProject = async (id: string) => {
    await window.api.deleteProject(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setComments((prev) => prev.filter((c) => c.projectId !== id))
    if (selectedProjectId === id) {
      setSelectedProjectId(null)
    }
    invalidateStats()
  }

  const handleSaveTag = async (tag: Tag) => {
    const saved = await window.api.saveTag(tag)
    setTags((prev) => {
      const exists = prev.some((t) => t.id === saved.id)
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]
    })
  }

  const handleDeleteTag = async (id: string) => {
    await window.api.deleteTag(id)
    setTags((prev) => prev.filter((t) => t.id !== id))
    setProjects((prev) =>
      prev.map((p) => ({ ...p, tagIds: p.tagIds.filter((tid) => tid !== id) })),
    )
    if (selectedTagId === id) {
      setSelectedTagId(null)
    }
  }

  const handleSaveComment = async (comment: Comment) => {
    const saved = await window.api.saveComment(comment)
    setComments((prev) => [...prev, saved])
  }

  const handleDeleteComment = async (id: string) => {
    await window.api.deleteComment(id)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) {
    return <div className="app-loading">読み込み中...</div>
  }

  return (
    <div className="app">
      <Sidebar
        tags={tags}
        activeView={activeView}
        selectedTagId={selectedTagId}
        searchQuery={searchQuery}
        projectCounts={projectCounts}
        totalProjects={projects.length}
        onViewChange={setActiveView}
        onSearchChange={setSearchQuery}
        onTagSelect={setSelectedTagId}
        onTagSave={handleSaveTag}
        onTagDelete={handleDeleteTag}
        onAddFolder={handleAddFolder}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {activeView === 'folders' && (
        <ProjectList
          projects={filteredProjects}
          tags={tags}
          statsMap={statsMap}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      {activeView === 'github' && (
        <RepoList
          projects={projects}
          searchQuery={searchQuery}
          onSelectProject={handleSelectProject}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {activeView === 'stats' && (
        <StatsDashboard
          stats={stats}
          loading={statsLoading}
          refreshing={statsRefreshing}
          error={statsError}
          projectIds={projectIds}
          isStatsComplete={isStatsComplete(projectIds)}
          onEnsureStats={ensureStatsForProjects}
          onRefresh={() => refreshStats({ force: true })}
        />
      )}

      {activeView !== 'stats' && (
        <ProjectDetail
          project={selectedProject}
          tags={tags}
          comments={comments}
          folderStats={selectedProject ? getProjectStats(selectedProject.id) : null}
          statsLoading={statsLoading}
          onEnsureStats={ensureAllStats}
          onSaveProject={handleSaveProject}
          onDeleteProject={handleDeleteProject}
          onSaveComment={handleSaveComment}
          onDeleteComment={handleDeleteComment}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDataChanged={async () => {
          await loadData()
          invalidateStats()
          const data = await window.api.getData()
          await ensureStatsForProjects(data.projects.map((p) => p.id))
        }}
      />
    </div>
  )
}

export default App
