import { useEffect, useState } from 'react'
import type { GitHubInfo, Project, Tag, Comment, RepoStatus, ProjectFolderStats, NodeProjectInfo } from '../types'
import { TagTreePicker } from './TagTreePicker'
import { PieChartView } from './PieChartView'
import { GitHubRepoPicker } from './GitHubRepoPicker'
import { GitActions } from './GitActions'
import { ExcludedLanguageNotes } from './ExcludedLanguageNotes'
import { formatDate, formatBytes, formatLines, generateId } from '../utils/format'
import './ProjectDetail.css'

interface ProjectDetailProps {
  project: Project | null
  tags: Tag[]
  comments: Comment[]
  folderStats: ProjectFolderStats | null
  statsLoading: boolean
  onEnsureStats: () => void
  onSaveProject: (project: Project) => void
  onDeleteProject: (id: string) => void
  onSaveComment: (comment: Comment) => void
  onDeleteComment: (id: string) => void
  onOpenSettings: () => void
}

export function ProjectDetail({
  project,
  tags,
  comments,
  folderStats,
  statsLoading,
  onEnsureStats,
  onSaveProject,
  onDeleteProject,
  onSaveComment,
  onDeleteComment,
  onOpenSettings,
}: ProjectDetailProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [repoStatus, setRepoStatus] = useState<RepoStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [nodeInfo, setNodeInfo] = useState<NodeProjectInfo | null>(null)
  const [startingDev, setStartingDev] = useState(false)
  const [devMessage, setDevMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!project) {
      setName('')
      setDescription('')
      setRepoStatus(null)
      setDevMessage(null)
      return
    }
    setName(project.name)
    setDescription(project.description)
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

  useEffect(() => {
    if (!project) {
      setNodeInfo(null)
      return
    }
    let cancelled = false
    window.api.detectNodeProject(project.path).then((info) => {
      if (!cancelled) setNodeInfo(info)
    })
    return () => {
      cancelled = true
    }
  }, [project?.id, project?.path])

  useEffect(() => {
    if (!project || folderStats) return
    onEnsureStats()
  }, [project?.id, folderStats, onEnsureStats])

  const isLoadingStats = statsLoading && !folderStats

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
    } else {
      alert('GitHub リモートが見つかりませんでした')
    }
  }

  const handleGitHubChange = (github: GitHubInfo | undefined) => {
    onSaveProject({ ...project, github })
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

  const handleStartDev = async () => {
    setStartingDev(true)
    setDevMessage(null)
    try {
      const result = await window.api.startDevServer(project.path)
      if (result.success) {
        setDevMessage(
          result.alreadyRunning
            ? '開発サーバーは既に起動している可能性があります'
            : '開発サーバーを起動しました（新しいターミナルで npm run dev を実行中）',
        )
      } else {
        setDevMessage(result.error ?? '起動に失敗しました')
      }
    } finally {
      setStartingDev(false)
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

      {nodeInfo?.hasDevScript && (
        <div className="detail-section dev-server-section">
          <label>Node.js 開発サーバー</label>
          {nodeInfo.packageName && (
            <p className="dev-package-name">{nodeInfo.packageName}</p>
          )}
          <p className="dev-script-hint">npm run dev</p>
          <button
            type="button"
            className="btn-primary dev-start-btn"
            onClick={handleStartDev}
            disabled={startingDev}
          >
            {startingDev ? '起動中...' : 'アプリを起動'}
          </button>
          {devMessage && <p className="status-hint">{devMessage}</p>}
        </div>
      )}

      <div className="detail-section">
        <label>フォルダ統計</label>
        {isLoadingStats && <p className="status-hint">tokei で集計中...</p>}
        {folderStats && (
          <>
            <div className="folder-stats-summary">
              <div className="status-row">
                <span>容量</span>
                <span title="エクスプローラーの「サイズ」と同じ基準">{formatBytes(folderStats.sizeBytes)}</span>
              </div>
              <div className="status-row">
                <span>コード行数</span>
                <span>{formatLines(folderStats.totalLines)}</span>
              </div>
            </div>
            {folderStats.error && <p className="status-error">{folderStats.error}</p>}
            {folderStats.tokeiWarning && <p className="status-error">{folderStats.tokeiWarning}</p>}
            {!folderStats.tokeiWarning &&
              folderStats.languages.length === 0 &&
              folderStats.totalLines === 0 &&
              !folderStats.excludedLanguages?.length && (
                <p className="status-hint">コードファイルが見つかりませんでした</p>
              )}
            {folderStats.languages.length > 0 && (
              <PieChartView
                title="言語別コード量"
                data={folderStats.languages.map((l) => ({ name: l.language, value: l.lines }))}
                valueFormatter={(v) => `${formatLines(v)} 行`}
              />
            )}
            {folderStats.excludedLanguages && folderStats.excludedLanguages.length > 0 && (
              <ExcludedLanguageNotes
                items={folderStats.excludedLanguages}
                projectName={project.name}
              />
            )}
          </>
        )}
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
        <TagTreePicker
          tags={tags}
          selectedIds={project.tagIds}
          onToggle={toggleTag}
        />
      </div>

      <div className="detail-section">
        <label>Git</label>
        <GitActions folderPath={project.path} />
      </div>

      <div className="detail-section github-section">
        <label>GitHub リポジトリ</label>
        <GitHubRepoPicker
          value={project.github}
          onChange={handleGitHubChange}
          onOpenSettings={onOpenSettings}
        />
        <div className="github-actions">
          <button type="button" className="btn-small btn-ghost" onClick={handleDetectGitHub}>
            git remote から自動設定
          </button>
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
