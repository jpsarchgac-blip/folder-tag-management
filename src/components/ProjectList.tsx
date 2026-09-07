import type { Project, Tag } from '../types'
import { TagChip } from './TagChip'
import { formatDate } from '../utils/format'
import './ProjectList.css'

interface ProjectListProps {
  projects: Project[]
  tags: Tag[]
  selectedProjectId: string | null
  onSelect: (projectId: string) => void
  sortBy: 'updated' | 'name'
  onSortChange: (sort: 'updated' | 'name') => void
}

export function ProjectList({
  projects,
  tags,
  selectedProjectId,
  onSelect,
  sortBy,
  onSortChange,
}: ProjectListProps) {
  const getTag = (id: string) => tags.find((t) => t.id === id)

  return (
    <section className="project-list-panel">
      <div className="panel-header">
        <h2>プロジェクト ({projects.length})</h2>
        <select value={sortBy} onChange={(e) => onSortChange(e.target.value as 'updated' | 'name')}>
          <option value="updated">更新日順</option>
          <option value="name">名前順</option>
        </select>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>プロジェクトがありません</p>
          <p className="hint">左の「フォルダを追加」から登録してください</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`project-card ${selectedProjectId === project.id ? 'selected' : ''}`}
              onClick={() => onSelect(project.id)}
            >
              <div className="card-top">
                <h3>{project.name}</h3>
                {project.github && (
                  <span className="github-badge" title={project.github.url}>GitHub</span>
                )}
              </div>
              <p className="project-path">{project.path}</p>
              {project.description && (
                <p className="project-desc">{project.description}</p>
              )}
              <div className="card-tags">
                {project.tagIds.map((tagId) => {
                  const tag = getTag(tagId)
                  return tag ? <TagChip key={tagId} tag={tag} small /> : null
                })}
              </div>
              <div className="card-footer">
                <span>更新: {formatDate(project.updatedAt)}</span>
                {project.github && (
                  <span className="repo-name">{project.github.owner}/{project.github.repo}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
