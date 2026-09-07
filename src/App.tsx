import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Project, Tag, Comment } from './types'
import { Sidebar } from './components/Sidebar'
import { ProjectList } from './components/ProjectList'
import { ProjectDetail } from './components/ProjectDetail'
import { SettingsModal } from './components/SettingsModal'
import './App.css'

function App() {
  const [tags, setTags] = useState<Tag[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const project of projects) {
      for (const tagId of project.tagIds) {
        counts[tagId] = (counts[tagId] ?? 0) + 1
      }
    }
    return counts
  }, [projects])

  const filteredProjects = useMemo(() => {
    let result = [...projects]

    if (selectedTagId) {
      result = result.filter((p) => p.tagIds.includes(selectedTagId))
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
        selectedTagId={selectedTagId}
        searchQuery={searchQuery}
        projectCounts={projectCounts}
        onSearchChange={setSearchQuery}
        onTagSelect={setSelectedTagId}
        onTagSave={handleSaveTag}
        onTagDelete={handleDeleteTag}
        onAddFolder={handleAddFolder}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <ProjectList
        projects={filteredProjects}
        tags={tags}
        selectedProjectId={selectedProjectId}
        onSelect={setSelectedProjectId}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      <ProjectDetail
        project={selectedProject}
        tags={tags}
        comments={comments}
        onSaveProject={handleSaveProject}
        onDeleteProject={handleDeleteProject}
        onSaveComment={handleSaveComment}
        onDeleteComment={handleDeleteComment}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default App
