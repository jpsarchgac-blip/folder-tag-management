import { useEffect, useMemo, useRef, useState } from 'react'
import type { GitHubInfo, GitHubRepoSummary } from '../types'
import './GitHubRepoPicker.css'

interface GitHubRepoPickerProps {
  value: GitHubInfo | undefined
  onChange: (github: GitHubInfo | undefined) => void
  onOpenSettings: () => void
}

export function GitHubRepoPicker({ value, onChange, onOpenSettings }: GitHubRepoPickerProps) {
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [hasToken, setHasToken] = useState(false)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadRepos = () => {
    setLoading(true)
    Promise.all([window.api.hasGitHubToken(), window.api.fetchUserRepos()])
      .then(([tokenSet, userRepos]) => {
        setHasToken(tokenSet)
        setRepos(userRepos)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRepos()
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos
    const q = search.toLowerCase()
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    )
  }, [repos, search])

  const handleSelect = (repo: GitHubRepoSummary) => {
    const [owner, repoName] = repo.fullName.split('/')
    onChange({
      owner,
      repo: repoName,
      url: repo.htmlUrl,
    })
    setOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange(undefined)
    setOpen(false)
  }

  const displayValue = value ? `${value.owner}/${value.repo}` : 'リポジトリを選択...'

  return (
    <div className="github-repo-picker" ref={containerRef}>
      <div className="picker-current">
        <button
          type="button"
          className="picker-toggle"
          onClick={() => setOpen((v) => !v)}
          disabled={!hasToken || loading}
        >
          <span className="picker-value">{displayValue}</span>
          <span className="picker-chevron">{open ? '▲' : '▼'}</span>
        </button>
        {value && (
          <button type="button" className="btn-small btn-ghost" onClick={handleClear}>
            解除
          </button>
        )}
      </div>

      {!hasToken && (
        <div className="picker-notice">
          <p>GitHub トークンを設定すると、リポジトリを一覧から選べます。</p>
          <button type="button" className="btn-small" onClick={onOpenSettings}>設定を開く</button>
        </div>
      )}

      {hasToken && loading && <p className="picker-hint">リポジトリ一覧を読み込み中...</p>}

      {open && hasToken && !loading && (
        <div className="picker-dropdown">
          <div className="picker-dropdown-header">
            <input
              type="search"
              placeholder="リポジトリを検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <button type="button" className="btn-small btn-ghost" onClick={loadRepos} title="再読み込み">
              ↻
            </button>
          </div>
          <ul className="picker-list">
            {filteredRepos.length === 0 && (
              <li className="picker-empty">該当するリポジトリがありません</li>
            )}
            {filteredRepos.map((repo) => {
              const selected =
                value?.owner.toLowerCase() === repo.fullName.split('/')[0].toLowerCase() &&
                value?.repo.toLowerCase() === repo.name.toLowerCase()
              return (
                <li key={repo.id}>
                  <button
                    type="button"
                    className={`picker-item ${selected ? 'selected' : ''}`}
                    onClick={() => handleSelect(repo)}
                  >
                    <span className="picker-item-name">{repo.fullName}</span>
                    <span className={`picker-item-badge ${repo.private ? 'private' : 'public'}`}>
                      {repo.private ? '非公開' : '公開'}
                    </span>
                    {repo.language && <span className="picker-item-lang">{repo.language}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
