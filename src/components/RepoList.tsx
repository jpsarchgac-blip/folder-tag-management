import { useEffect, useMemo, useState } from 'react'
import type { GitHubRepoSummary, Project } from '../types'
import { formatDate } from '../utils/format'
import './RepoList.css'

interface RepoListProps {
  projects: Project[]
  searchQuery: string
  onSelectProject: (projectId: string) => void
  onOpenSettings: () => void
}

export function RepoList({
  projects,
  searchQuery,
  onSelectProject,
  onOpenSettings,
}: RepoListProps) {
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([window.api.hasGitHubToken(), window.api.fetchUserRepos()])
      .then(([tokenSet, userRepos]) => {
        if (cancelled) return
        setHasToken(tokenSet)
        setRepos(userRepos)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const linkedRepos = useMemo(() => {
    return projects
      .filter((p) => p.github)
      .map((p) => ({
        projectId: p.id,
        projectName: p.name,
        path: p.path,
        owner: p.github!.owner,
        repo: p.github!.repo,
        url: p.github!.url,
      }))
  }, [projects])

  const filteredApiRepos = useMemo(() => {
    if (!searchQuery.trim()) return repos
    const q = searchQuery.toLowerCase()
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    )
  }, [repos, searchQuery])

  const filteredLinked = useMemo(() => {
    if (!searchQuery.trim()) return linkedRepos
    const q = searchQuery.toLowerCase()
    return linkedRepos.filter(
      (r) =>
        r.repo.toLowerCase().includes(q) ||
        r.projectName.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q),
    )
  }, [linkedRepos, searchQuery])

  const isLinked = (fullName: string) =>
    linkedRepos.some((r) => `${r.owner}/${r.repo}`.toLowerCase() === fullName.toLowerCase())

  const findProjectByRepo = (fullName: string) => {
    const [owner, repo] = fullName.split('/')
    const project = projects.find(
      (p) => p.github?.owner.toLowerCase() === owner.toLowerCase() &&
        p.github?.repo.toLowerCase() === repo.toLowerCase(),
    )
    return project?.id ?? null
  }

  return (
    <section className="repo-list-panel">
      <div className="panel-header">
        <h2>GitHub リポジトリ</h2>
      </div>

      <div className="repo-sections">
        <div className="repo-section">
          <h3>登録フォルダと連携済み ({filteredLinked.length})</h3>
          {filteredLinked.length === 0 ? (
            <p className="repo-hint">GitHub と連携したフォルダがありません</p>
          ) : (
            <div className="repo-grid">
              {filteredLinked.map((item) => (
                <button
                  key={item.projectId}
                  type="button"
                  className="repo-card linked"
                  onClick={() => onSelectProject(item.projectId)}
                >
                  <div className="repo-card-top">
                    <strong>{item.owner}/{item.repo}</strong>
                    <span className="linked-badge">連携済み</span>
                  </div>
                  <p className="repo-project-name">{item.projectName}</p>
                  <p className="repo-path">{item.path}</p>
                  <button
                    type="button"
                    className="btn-small btn-ghost repo-open-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.api.openUrl(item.url)
                    }}
                  >
                    GitHubを開く
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="repo-section">
          <h3>
            {hasToken ? `アカウントのリポジトリ (${filteredApiRepos.length})` : 'アカウントのリポジトリ'}
          </h3>
          {!hasToken && (
            <div className="repo-token-notice">
              <p>GitHub トークンを設定すると、あなたのリポジトリ一覧を表示できます。</p>
              <button type="button" className="btn-small" onClick={onOpenSettings}>設定を開く</button>
            </div>
          )}
          {hasToken && loading && <p className="repo-hint">読み込み中...</p>}
          {hasToken && !loading && filteredApiRepos.length === 0 && (
            <p className="repo-hint">リポジトリが見つかりません</p>
          )}
          {hasToken && !loading && filteredApiRepos.length > 0 && (
            <div className="repo-grid">
              {filteredApiRepos.map((repo) => {
                const linked = isLinked(repo.fullName)
                const projectId = findProjectByRepo(repo.fullName)
                return (
                  <div key={repo.id} className={`repo-card ${linked ? 'linked' : ''}`}>
                    <div className="repo-card-top">
                      <strong>{repo.fullName}</strong>
                      <span className={`visibility-badge ${repo.private ? 'private' : 'public'}`}>
                        {repo.private ? '非公開' : '公開'}
                      </span>
                    </div>
                    {repo.description && <p className="repo-desc">{repo.description}</p>}
                    <div className="repo-meta">
                      <span>{repo.language ?? '—'}</span>
                      <span>★ {repo.stargazersCount}</span>
                      <span>{formatDate(repo.updatedAt)}</span>
                    </div>
                    <div className="repo-actions">
                      <button
                        type="button"
                        className="btn-small btn-ghost"
                        onClick={() => window.api.openUrl(repo.htmlUrl)}
                      >
                        GitHubを開く
                      </button>
                      {linked && projectId && (
                        <button
                          type="button"
                          className="btn-small"
                          onClick={() => onSelectProject(projectId)}
                        >
                          フォルダを表示
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
