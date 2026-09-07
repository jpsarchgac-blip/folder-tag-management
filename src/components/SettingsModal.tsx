import { useEffect, useState } from 'react'
import './SettingsModal.css'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [hasToken, setHasToken] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    if (open) {
      window.api.hasGitHubToken().then(setHasToken)
      setToken('')
    }
  }, [open])

  if (!open) return null

  const handleSave = async () => {
    const trimmed = token.trim()
    if (!trimmed) return
    await window.api.setGitHubToken(trimmed)
    setHasToken(true)
    setToken('')
    alert('GitHub トークンを保存しました')
  }

  const handleClear = async () => {
    if (!confirm('GitHub トークンを削除しますか？')) return
    await window.api.clearGitHubToken()
    setHasToken(false)
    setToken('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>設定</h2>
          <button type="button" className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <h3>GitHub Personal Access Token</h3>
          <p className="help-text">
            プライベートリポジトリの情報を取得するにはトークンが必要です。
            GitHub の Settings → Developer settings → Personal access tokens から作成できます。
          </p>
          <ul className="help-list">
            <li>Classic token: <code>repo</code> スコープ</li>
            <li>Fine-grained token: Repository access + Contents (Read)</li>
          </ul>

          <p className="token-status">
            状態: {hasToken ? '✓ 登録済み' : '未登録'}
          </p>

          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />

          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={handleSave}>保存</button>
            {hasToken && (
              <button type="button" className="btn-danger btn-small" onClick={handleClear}>
                トークンを削除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
