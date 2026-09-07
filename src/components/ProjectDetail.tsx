import { useEffect, useState } from 'react'
import type { Project, Tag, Comment, RepoStatus } from '../types'
import { TagChip } from './TagChip'
import { formatDate, generateId } from '../utils/format'
import './ProjectDetail.css'

interface ProjectDetailProps {
  project: Project | null
  tags: Tag[]
  comments: Comment[]
  onSaveProject: (project: Project) => void
  onDeleteProject: (id: string) => void
  onSaveComment: (comment: Comment) => void
  onDeleteComment: (id: string) => void
}

export function ProjectDetail({
  project,
  tags,
  comments,
  onSaveProject,
  onDeleteProject,
  onSaveComment,
  onDeleteComment,
}: ProjectDetailProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [repoStatus, setRepoStatus] = useState<RepoStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  useEffect(() => {
    if (!project) {
      setName('')
      setDescription('')
      setGithubUrl('')
      setRepoStatus(null)
      return
    }
    setName(project.name)
    setDescription(project.description)
    setGithubUrl(project.github?.url ?? '')
  }, [project])

  useEffect(() => {
    if (!project?.github) {
      setRepoStatus(null)
      return
    }
    let cancelled = false
    setLoadingStatus(true)
    window.api
      .fetchRepoStatus(project.github.owner, project.github.repo)
      .then((status) => {
        if (!cancelled) setRepoStatus(status)
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false)
      })
    return () => {
      cancelled = true
    }
  }, [project?.id, project?.github?.owner, project?.github?.repo])

  if (!project) {
    return (
      <aside className="project-detail empty">
        <p>プロジェクトを選択してください</p>
      </aside>
    )
  }

  const projectComments = comments
    .filter((c) => c.projectId === project.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const toggleTag = (tagId: string) => {
    const tagIds = project.tagIds.includes(tagId)
      ? project.tagIds.filter((id) => id !== tagId)
      : [...project.tagIds, tagId]
    onSaveProject({ ...project, tagIds })
  }

  const handleSave = () => {
    onSaveProject({
      ...project,
      name: name.trim() || project.name,
      description,
    })
  }

  const handleDetectGitHub = async () => {
    const detected = await window.api.detectGitHub(project.path)
    if (detected) {
      onSaveProject({ ...project, github: detected })
      setGithubUrl(detected.url)
    } else {
      alert('GitHub リモートが見つかりませんでした')
    }
  }

  const handleSaveGitHubUrl = () => {
    const trimmed = githubUrl.trim()
    if (!trimmed) {
      onSaveProject({ ...project, github: undefined })
      return
    }
    const match = trimmed.match(/github\.com[/:]([^/]+)\/([^/.]+)/i)
    if (!match) {
      alert('有効な GitHub URL を入力してください')
      return
    }
    const owner = match[1]
    const repo = match[2]
    onSaveProject({
      ...project,
      github: {
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`,
      },
    })
  }

  const handleAddComment = () => {
    const body = commentBody.trim()
    if (!body) return
    onSaveComment({
      id: generateId(),
      projectId: project.id,
      body,
      createdAt: new Date().toISOString(),
    })
    setCommentBody('')
  }

  const handleDelete = () => {
    if (confirm(`「${project.name}」を削除しますか？`)) {
      onDeleteProject(project.id)
    }
  }

  return (
    <aside className="project-detail">
      <div className="detail-header">
        <h2>詳細</h2>
        <button type="button" className="btn-danger btn-small" onClick={handleDelete}>
          削除
        </button>
      </div>

      <div className="detail-section">
        <label>名前</label>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSave} />
      </div>

      <div className="detail-section">
        <label>パス</label>
        <p className="path-display">{project.path}</p>
        <button type="button" className="btn-secondary" onClick={() => window.api.openFolder(project.path)}>
          フォルダを開く
        </button>
      </div>

      <div className="detail-section">
        <label>説明</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleSave}
          placeholder="プロジェクトの説明を入力..."
        />
      </div>

      <div className="detail-section">
        <label>タグ</label>
        <div className="tag-toggle-list">
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              selected={project.tagIds.includes(tag.id)}
              onClick={() => toggleTag(tag.id)}
            />
          ))}
        </div>
      </div>

      <div className="detail-section">
        <label>GitHub</label>
        <input
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
        />
        <div className="github-actions">
          <button type="button" className="btn-small" onClick={handleSaveGitHubUrl}>URLを保存</button>
          <button type="button" className="btn-small btn-ghost" onClick={handleDetectGitHub}>remote再検知</button>
          {project.github && (
            <button type="button" className="btn-small btn-ghost" onClick={() => window.api.openUrl(project.github!.url)}>
              GitHubを開く
            </button>
          )}
        </div>

        {loadingStatus && <p className="status-hint">GitHub情報を取得中...</p>}

        {repoStatus && !loadingStatus && (
          <div className="repo-status">
            {repoStatus.error ? (
              <p className="status-error">{repoStatus.error}</p>
            ) : (
              <>
                <div className="status-row">
                  <span>公開状態</span>
                  <span>{repoStatus.private ? '非公開' : '公開'}</span>
                </div>
                <div className="status-row">
                  <span>言語</span>
                  <span>{repoStatus.language ?? '—'}</span>
                </div>
                <div className="status-row">
                  <span>スター</span>
                  <span>{repoStatus.stargazersCount}</span>
                </div>
                <div className="status-row">
                  <span>デフォルトブランチ</span>
                  <span>{repoStatus.defaultBranch}</span>
                </div>
                <div className="status-row">
                  <span>最終更新</span>
                  <span>{formatDate(repoStatus.updatedAt)}</span>
                </div>
                {repoStatus.description && (
                  <p className="repo-description">{repoStatus.description}</p>
                )}
              </>
            )}
            {repoStatus.needsToken && (
              <p className="status-hint">設定で GitHub トークンを登録すると詳細情報を取得できます</p>
            )}
          </div>
        )}
      </div>

      <div className="detail-section comments-section">
        <label>コメント</label>
        <div className="comment-form">
          <textarea
            rows={3}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="メモやコメントを追加..."
          />
          <button type="button" className="btn-small" onClick={handleAddComment}>追加</button>
        </div>
        <ul className="comment-list">
          {projectComments.map((comment) => (
            <li key={comment.id} className="comment-item">
              <div className="comment-meta">
                <span>{formatDate(comment.createdAt)}</span>
                <button type="button" className="icon-btn" onClick={() => onDeleteComment(comment.id)}>×</button>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
          {projectComments.length === 0 && (
            <li className="no-comments">コメントはまだありません</li>
          )}
        </ul>
      </div>
    </aside>
  )
}
