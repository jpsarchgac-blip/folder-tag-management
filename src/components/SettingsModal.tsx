import { useEffect, useState } from 'react'
import './SettingsModal.css'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onDataChanged: () => Promise<void>
}

export function SettingsModal({ open, onClose, onDataChanged }: SettingsModalProps) {
  const [hasToken, setHasToken] = useState(false)
  const [token, setToken] = useState('')
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [dataMessage, setDataMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      window.api.hasGitHubToken().then(setHasToken)
      setToken('')
      setDataMessage(null)
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

  const handleExport = async () => {
    setBusy(true)
    setDataMessage(null)
    try {
      const result = await window.api.exportData()
      if (result.success) {
        setDataMessage(`エクスポートしました: ${result.path}`)
      } else if (result.error) {
        setDataMessage(result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async () => {
    if (importMode === 'replace') {
      const ok = confirm(
        '現在のデータをすべて置き換えます。タグ・プロジェクト・コメントが上書きされます。続行しますか？',
      )
      if (!ok) return
    }

    setBusy(true)
    setDataMessage(null)
    try {
      const result = await window.api.importData(importMode)
      if (result.success && result.counts) {
        await onDataChanged()
        setDataMessage(
          `インポートしました（タグ ${result.counts.tags} / プロジェクト ${result.counts.projects} / コメント ${result.counts.comments}）`,
        )
      } else if (result.error) {
        setDataMessage(result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>設定</h2>
          <button type="button" className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <h3>データのバックアップ</h3>
          <p className="help-text">
            タグ・プロジェクト・コメントを JSON ファイルに保存・復元できます。
          </p>
          <div className="import-mode">
            <label className="import-mode-option">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              マージ（既存データと統合）
            </label>
            <label className="import-mode-option">
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              置換（現在のデータをすべて上書き）
            </label>
          </div>
          <div className="modal-actions data-actions">
            <button type="button" className="btn-primary" onClick={handleExport} disabled={busy}>
              エクスポート
            </button>
            <button type="button" className="btn-small" onClick={handleImport} disabled={busy}>
              インポート
            </button>
          </div>
          {dataMessage && <p className="data-message">{dataMessage}</p>}

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
