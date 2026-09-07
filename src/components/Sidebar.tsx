import { useState } from 'react'
import type { Tag } from '../types'
import { TagChip } from './TagChip'
import { generateId } from '../utils/format'
import './Sidebar.css'

interface SidebarProps {
  tags: Tag[]
  selectedTagId: string | null
  searchQuery: string
  projectCounts: Record<string, number>
  onSearchChange: (query: string) => void
  onTagSelect: (tagId: string | null) => void
  onTagSave: (tag: Tag) => void
  onTagDelete: (tagId: string) => void
  onAddFolder: () => void
  onOpenSettings: () => void
}

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280',
]

export function Sidebar({
  tags,
  selectedTagId,
  searchQuery,
  projectCounts,
  onSearchChange,
  onTagSelect,
  onTagSave,
  onTagDelete,
  onAddFolder,
  onOpenSettings,
}: SidebarProps) {
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleAddTag = () => {
    const name = newTagName.trim()
    if (!name) return
    onTagSave({
      id: generateId(),
      name,
      color: newTagColor,
    })
    setNewTagName('')
  }

  const startEdit = (tag: Tag) => {
    setEditingTagId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  const saveEdit = () => {
    if (!editingTagId) return
    const name = editName.trim()
    if (!name) return
    onTagSave({ id: editingTagId, name, color: editColor })
    setEditingTagId(null)
  }

  const totalProjects = Object.values(projectCounts).reduce((a, b) => a + b, 0)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Folder Tag Manager</h1>
        <p>プロジェクトフォルダ管理</p>
      </div>

      <button type="button" className="btn-primary add-folder-btn" onClick={onAddFolder}>
        + フォルダを追加
      </button>

      <div className="search-box">
        <input
          type="search"
          placeholder="プロジェクトを検索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="sidebar-section">
        <h2>タグ</h2>
        <button
          type="button"
          className={`filter-all ${selectedTagId === null ? 'active' : ''}`}
          onClick={() => onTagSelect(null)}
        >
          すべて
          <span className="count">{totalProjects}</span>
        </button>

        <ul className="tag-list">
          {tags.map((tag) => (
            <li key={tag.id} className="tag-list-item">
              {editingTagId === tag.id ? (
                <div className="tag-edit-form">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <div className="color-picker">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-swatch ${editColor === c ? 'selected' : ''}`}
                        style={{ background: c }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                  <div className="tag-edit-actions">
                    <button type="button" className="btn-small" onClick={saveEdit}>保存</button>
                    <button type="button" className="btn-small btn-ghost" onClick={() => setEditingTagId(null)}>取消</button>
                    <button type="button" className="btn-small btn-danger" onClick={() => { onTagDelete(tag.id); setEditingTagId(null) }}>削除</button>
                  </div>
                </div>
              ) : (
                <div className="tag-row">
                  <TagChip
                    tag={tag}
                    selected={selectedTagId === tag.id}
                    onClick={() => onTagSelect(tag.id)}
                  />
                  <span className="count">{projectCounts[tag.id] ?? 0}</span>
                  <button type="button" className="icon-btn" onClick={() => startEdit(tag)} title="編集">✎</button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="new-tag-form">
          <input
            placeholder="新しいタグ名"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <div className="color-picker">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${newTagColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setNewTagColor(c)}
              />
            ))}
          </div>
          <button type="button" className="btn-small" onClick={handleAddTag}>タグを追加</button>
        </div>
      </div>

      <div className="sidebar-footer">
        <button type="button" className="btn-ghost settings-btn" onClick={onOpenSettings}>
          ⚙ 設定
        </button>
      </div>
    </aside>
  )
}
