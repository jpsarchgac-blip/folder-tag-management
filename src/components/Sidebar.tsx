import { useMemo, useState } from 'react'
import type { Tag, MainView } from '../types'
import { TagChip } from './TagChip'
import { generateId } from '../utils/format'
import {
  buildTagTree,
  type TagTreeNode,
} from '../utils/tags'
import { canAssignParent } from '../utils/tag-parent'
import { TagParentSelect, TagMoveSelect } from './TagParentSelect'
import { appIconUrl } from '../utils/app-icon'
import './Sidebar.css'

interface SidebarProps {
  tags: Tag[]
  activeView: MainView
  selectedTagId: string | null
  searchQuery: string
  projectCounts: Record<string, number>
  totalProjects: number
  onViewChange: (view: MainView) => void
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

interface TagTreeItemProps {
  node: TagTreeNode
  depth: number
  tags: Tag[]
  selectedTagId: string | null
  projectCounts: Record<string, number>
  editingTagId: string | null
  editName: string
  editColor: string
  editParentId: string | null
  movingTagId: string | null
  collapsedIds: Set<string>
  onTagSelect: (tagId: string) => void
  onStartEdit: (tag: Tag) => void
  onStartMove: (tag: Tag) => void
  onMove: (tagId: string, parentId: string | null) => void
  onCancelMove: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: (tagId: string) => void
  onAddChild: (parentId: string) => void
  onToggleCollapse: (tagId: string) => void
  setEditName: (v: string) => void
  setEditColor: (v: string) => void
  setEditParentId: (v: string | null) => void
  draggingTagId: string | null
  dropTargetId: string | '__root__' | null
  onDragStart: (tagId: string) => void
  onDragEnd: () => void
  onDragOverTarget: (targetId: string) => void
  onDropOnTarget: (parentId: string | null) => void
}

function TagTreeItem({
  node,
  depth,
  tags,
  selectedTagId,
  projectCounts,
  editingTagId,
  editName,
  editColor,
  editParentId,
  movingTagId,
  collapsedIds,
  onTagSelect,
  onStartEdit,
  onStartMove,
  onMove,
  onCancelMove,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onAddChild,
  onToggleCollapse,
  setEditName,
  setEditColor,
  setEditParentId,
  draggingTagId,
  dropTargetId,
  onDragStart,
  onDragEnd,
  onDragOverTarget,
  onDropOnTarget,
}: TagTreeItemProps) {
  const { tag, children } = node
  const hasChildren = children.length > 0
  const isCollapsed = collapsedIds.has(tag.id)

  if (movingTagId === tag.id) {
    return (
      <li className="tag-list-item" style={{ paddingLeft: depth * 14 }}>
        <TagMoveSelect
          tags={tags}
          tag={tag}
          onMove={(parentId) => onMove(tag.id, parentId)}
          onCancel={onCancelMove}
        />
      </li>
    )
  }

  if (editingTagId === tag.id) {
    return (
      <li className="tag-list-item" style={{ paddingLeft: depth * 14 }}>
        <div className="tag-edit-form">
          <input value={editName} onChange={(e) => setEditName(e.target.value)} />
          <label className="tag-parent-label">親タグ（他の親タグの下にも移動できます）</label>
          <TagParentSelect
            tags={tags}
            value={editParentId}
            excludeTagId={tag.id}
            onChange={setEditParentId}
          />
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
            <button type="button" className="btn-small" onClick={onSaveEdit}>保存</button>
            <button type="button" className="btn-small btn-ghost" onClick={onCancelEdit}>取消</button>
            <button type="button" className="btn-small btn-danger" onClick={() => onDelete(tag.id)}>削除</button>
          </div>
        </div>
      </li>
    )
  }

  const canDropHere =
    draggingTagId !== null &&
    draggingTagId !== tag.id &&
    canAssignParent(draggingTagId, tag.id, tags)

  return (
    <>
      <li className="tag-list-item" style={{ paddingLeft: depth * 14 }}>
        <div
          className={`tag-row ${draggingTagId === tag.id ? 'dragging' : ''} ${dropTargetId === tag.id ? 'drop-target' : ''}`}
          onDragOver={(e) => {
            if (!canDropHere) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            onDragOverTarget(tag.id)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!canDropHere) return
            onDropOnTarget(tag.id)
          }}
        >
          <button
            type="button"
            className="drag-handle"
            draggable={!editingTagId && !movingTagId}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/tag-id', tag.id)
              onDragStart(tag.id)
            }}
            onDragEnd={onDragEnd}
            title="ドラッグして親を変更"
          >
            ⠿
          </button>
          {hasChildren ? (
            <button
              type="button"
              className="collapse-btn"
              onClick={() => onToggleCollapse(tag.id)}
              title={isCollapsed ? '展開' : '折りたたむ'}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span className="collapse-spacer" />
          )}
          <TagChip
            tag={tag}
            selected={selectedTagId === tag.id}
            onClick={() => onTagSelect(tag.id)}
          />
          <span className="count">{projectCounts[tag.id] ?? 0}</span>
          <button type="button" className="icon-btn" onClick={() => onAddChild(tag.id)} title="子タグを追加">+</button>
          <button type="button" className="icon-btn" onClick={() => onStartMove(tag)} title="親タグを変更">⇢</button>
          <button type="button" className="icon-btn" onClick={() => onStartEdit(tag)} title="編集">✎</button>
        </div>
      </li>
      {hasChildren && !isCollapsed && children.map((child) => (
        <TagTreeItem
          key={child.tag.id}
          node={child}
          depth={depth + 1}
          tags={tags}
          selectedTagId={selectedTagId}
          projectCounts={projectCounts}
          editingTagId={editingTagId}
          editName={editName}
          editColor={editColor}
          editParentId={editParentId}
          movingTagId={movingTagId}
          collapsedIds={collapsedIds}
          onTagSelect={onTagSelect}
          onStartEdit={onStartEdit}
          onStartMove={onStartMove}
          onMove={onMove}
          onCancelMove={onCancelMove}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          onToggleCollapse={onToggleCollapse}
          setEditName={setEditName}
          setEditColor={setEditColor}
          setEditParentId={setEditParentId}
          draggingTagId={draggingTagId}
          dropTargetId={dropTargetId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOverTarget={onDragOverTarget}
          onDropOnTarget={onDropOnTarget}
        />
      ))}
    </>
  )
}

export function Sidebar({
  tags,
  activeView,
  selectedTagId,
  searchQuery,
  projectCounts,
  totalProjects,
  onViewChange,
  onSearchChange,
  onTagSelect,
  onTagSave,
  onTagDelete,
  onAddFolder,
  onOpenSettings,
}: SidebarProps) {
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
  const [newTagParentId, setNewTagParentId] = useState<string | null>(null)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editParentId, setEditParentId] = useState<string | null>(null)
  const [movingTagId, setMovingTagId] = useState<string | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | '__root__' | null>(null)

  const tagTree = useMemo(() => buildTagTree(tags), [tags])

  const handleAddTag = (parentId: string | null = newTagParentId) => {
    const name = newTagName.trim()
    if (!name) return
    onTagSave({
      id: generateId(),
      name,
      color: newTagColor,
      parentId,
    })
    setNewTagName('')
    setNewTagParentId(null)
    if (parentId) {
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        next.delete(parentId)
        return next
      })
    }
  }

  const startAddChild = (parentId: string) => {
    const parent = tags.find((t) => t.id === parentId)
    setNewTagParentId(parentId)
    setNewTagColor(parent?.color ?? PRESET_COLORS[0])
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      next.delete(parentId)
      return next
    })
  }

  const startEdit = (tag: Tag) => {
    setMovingTagId(null)
    setEditingTagId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
    setEditParentId(tag.parentId ?? null)
  }

  const startMove = (tag: Tag) => {
    setEditingTagId(null)
    setMovingTagId(tag.id)
  }

  const handleMove = (tagId: string, parentId: string | null) => {
    const tag = tags.find((t) => t.id === tagId)
    if (!tag) return
    if (!canAssignParent(tagId, parentId, tags)) {
      alert('この親タグには移動できません（自分自身または子タグの下には置けません）')
      return
    }
    onTagSave({ ...tag, parentId })
    setMovingTagId(null)
    if (parentId) {
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        next.delete(parentId)
        return next
      })
    }
  }

  const saveEdit = () => {
    if (!editingTagId) return
    const name = editName.trim()
    if (!name) return
    if (editParentId && !canAssignParent(editingTagId, editParentId, tags)) {
      alert('この親タグには移動できません（自分自身または子タグの下には置けません）')
      return
    }
    onTagSave({
      id: editingTagId,
      name,
      color: editColor,
      parentId: editParentId,
    })
    setEditingTagId(null)
  }

  const toggleCollapse = (tagId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  const handleDragStart = (tagId: string) => {
    setEditingTagId(null)
    setMovingTagId(null)
    setDraggingTagId(tagId)
  }

  const handleDragEnd = () => {
    setDraggingTagId(null)
    setDropTargetId(null)
  }

  const handleDropOnTarget = (parentId: string | null) => {
    if (!draggingTagId) return
    const tag = tags.find((t) => t.id === draggingTagId)
    if (!tag) {
      handleDragEnd()
      return
    }
    if ((tag.parentId ?? null) === parentId) {
      handleDragEnd()
      return
    }
    if (!canAssignParent(draggingTagId, parentId, tags)) {
      alert('この親タグには移動できません（自分自身または子タグの下には置けません）')
      handleDragEnd()
      return
    }
    onTagSave({ ...tag, parentId })
    if (parentId) {
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        next.delete(parentId)
        return next
      })
    }
    handleDragEnd()
  }

  const canDropOnRoot =
    draggingTagId !== null && canAssignParent(draggingTagId, null, tags)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={appIconUrl} alt="" className="sidebar-app-icon" />
        <div>
          <h1>Folder Tag Manager</h1>
          <p>プロジェクトフォルダ管理</p>
        </div>
      </div>

      <button type="button" className="btn-primary add-folder-btn" onClick={onAddFolder}>
        + フォルダを追加
      </button>

      <nav className="view-nav">
        <button
          type="button"
          className={`view-nav-btn ${activeView === 'folders' ? 'active' : ''}`}
          onClick={() => onViewChange('folders')}
        >
          フォルダ一覧
        </button>
        <button
          type="button"
          className={`view-nav-btn ${activeView === 'github' ? 'active' : ''}`}
          onClick={() => onViewChange('github')}
        >
          GitHub
        </button>
        <button
          type="button"
          className={`view-nav-btn ${activeView === 'stats' ? 'active' : ''}`}
          onClick={() => onViewChange('stats')}
        >
          統計
        </button>
      </nav>

      {activeView !== 'stats' && (
        <div className="search-box">
          <input
            type="search"
            placeholder={activeView === 'github' ? 'リポジトリを検索...' : 'プロジェクトを検索...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {activeView === 'folders' && (
        <div className="sidebar-section">
          <h2>タグ</h2>
          <p className="tag-drag-hint">⠿ をドラッグして親タグを変更</p>
          <button
            type="button"
            className={`filter-all ${selectedTagId === null ? 'active' : ''} ${dropTargetId === '__root__' ? 'drop-target-root' : ''}`}
            onClick={() => onTagSelect(null)}
            onDragOver={(e) => {
              if (!canDropOnRoot) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDropTargetId('__root__')
            }}
            onDragLeave={() => setDropTargetId(null)}
            onDrop={(e) => {
              e.preventDefault()
              if (!canDropOnRoot) return
              handleDropOnTarget(null)
            }}
          >
            すべて
            <span className="count">{totalProjects}</span>
          </button>

          <ul className="tag-list">
            {tagTree.map((node) => (
              <TagTreeItem
                key={node.tag.id}
                node={node}
                depth={0}
                tags={tags}
                selectedTagId={selectedTagId}
                projectCounts={projectCounts}
                editingTagId={editingTagId}
                editName={editName}
                editColor={editColor}
                editParentId={editParentId}
                movingTagId={movingTagId}
                collapsedIds={collapsedIds}
                onTagSelect={onTagSelect}
                onStartEdit={startEdit}
                onStartMove={startMove}
                onMove={handleMove}
                onCancelMove={() => setMovingTagId(null)}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingTagId(null)}
                onDelete={(id) => { onTagDelete(id); setEditingTagId(null) }}
                onAddChild={startAddChild}
                onToggleCollapse={toggleCollapse}
                setEditName={setEditName}
                setEditColor={setEditColor}
                setEditParentId={setEditParentId}
                draggingTagId={draggingTagId}
                dropTargetId={dropTargetId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOverTarget={setDropTargetId}
                onDropOnTarget={handleDropOnTarget}
              />
            ))}
          </ul>

          <div className="new-tag-form">
            <input
              placeholder={newTagParentId ? '子タグ名' : '新しいタグ名'}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <label className="tag-parent-label">親タグ</label>
            <TagParentSelect
              tags={tags}
              value={newTagParentId}
              onChange={setNewTagParentId}
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
            <button type="button" className="btn-small" onClick={() => handleAddTag()}>
              {newTagParentId ? '子タグを追加' : 'タグを追加'}
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <button type="button" className="btn-ghost settings-btn" onClick={onOpenSettings}>
          ⚙ 設定
        </button>
      </div>
    </aside>
  )
}
