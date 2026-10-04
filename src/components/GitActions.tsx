import { useCallback, useEffect, useState } from 'react'
import type { GitRepoState } from '../types'
import './GitActions.css'

interface GitActionsProps {
  folderPath: string
}

export function GitActions({ folderPath }: GitActionsProps) {
  const [status, setStatus] = useState<GitRepoState | null>(null)
  const [loading, setLoading] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const refreshStatus = useCallback(async () => {
    setLoading(true)
    try {
      const next = await window.api.getGitRepoStatus(folderPath)
      setStatus(next)
    } finally {
      setLoading(false)
    }
  }, [folderPath])

  useEffect(() => {
    setStatus(null)
    setFeedback(null)
    refreshStatus()
  }, [folderPath, refreshStatus])

  const runAction = async (action: 'commit' | 'push' | 'commitAndPush') => {
    setWorking(true)
    setFeedback(null)
    try {
      let result
      if (action === 'commit') {
        result = await window.api.gitCommit(folderPath, commitMessage)
      } else if (action === 'push') {
        result = await window.api.gitPush(folderPath)
      } else {
        result = await window.api.gitCommitAndPush(folderPath, commitMessage)
      }

      if (result.success) {
        setFeedback({
          type: 'success',
          text: result.output || '完了しました',
        })
        if (action !== 'push') {
          setCommitMessage('')
        }
        await refreshStatus()
      } else {
        setFeedback({
          type: 'error',
          text: result.error || '操作に失敗しました',
        })
      }
    } finally {
      setWorking(false)
    }
  }

  if (!status) {
    return <p className="status-hint">Git 状態を確認中...</p>
  }

  if (!status.isRepo) {
    return <p className="status-hint">このフォルダは Git リポジトリではありません</p>
  }

  const canCommit = status.hasChanges && commitMessage.trim().length > 0

  return (
    <div className="git-actions">
      <div className="git-status-summary">
        <div className="status-row">
          <span>ブランチ</span>
          <span className="git-branch">{status.branch ?? '—'}</span>
        </div>
        {status.hasRemote && (
          <div className="status-row">
            <span>リモートとの差分</span>
            <span>
              {status.ahead > 0 && `↑${status.ahead}`}
              {status.ahead > 0 && status.behind > 0 && ' '}
              {status.behind > 0 && `↓${status.behind}`}
              {status.ahead === 0 && status.behind === 0 && '同期済み'}
            </span>
          </div>
        )}
        <div className="status-row">
          <span>変更ファイル</span>
          <span>{status.changedFiles.length} 件</span>
        </div>
      </div>

      {status.changedFiles.length > 0 && (
        <ul className="git-file-list">
          {status.changedFiles.slice(0, 8).map((file) => (
            <li key={file.path}>
              <span className="git-file-status">{file.status}</span>
              <span className="git-file-path">{file.path}</span>
            </li>
          ))}
          {status.changedFiles.length > 8 && (
            <li className="git-file-more">他 {status.changedFiles.length - 8} 件</li>
          )}
        </ul>
      )}

      <textarea
        className="git-commit-input"
        rows={3}
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="コミットメッセージ"
        disabled={working}
      />

      <div className="git-action-buttons">
        <button
          type="button"
          className="btn-primary git-main-btn"
          onClick={() => runAction('commitAndPush')}
          disabled={working || !canCommit}
          title={!canCommit ? '変更とメッセージが必要です' : undefined}
        >
          {working ? '実行中...' : 'コミットしてプッシュ'}
        </button>
        <div className="git-secondary-buttons">
          <button
            type="button"
            className="btn-small"
            onClick={() => runAction('commit')}
            disabled={working || !canCommit}
          >
            コミットのみ
          </button>
          <button
            type="button"
            className="btn-small btn-ghost"
            onClick={() => runAction('push')}
            disabled={working || !status.hasRemote || status.ahead === 0}
          >
            プッシュのみ
          </button>
          <button
            type="button"
            className="btn-small btn-ghost"
            onClick={refreshStatus}
            disabled={working || loading}
          >
            更新
          </button>
        </div>
      </div>

      {!status.hasRemote && (
        <p className="status-hint">リモートが未設定のためプッシュはできません</p>
      )}

      {feedback && (
        <p className={feedback.type === 'success' ? 'git-feedback-success' : 'status-error'}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}
