import type { Tag } from '../types'
import { TagChip } from './TagChip'
import { buildTagTree, type TagTreeNode } from '../utils/tags'
import './TagTreePicker.css'

interface TagTreePickerProps {
  tags: Tag[]
  selectedIds: string[]
  onToggle: (tagId: string) => void
}

interface TagPickerItemProps {
  node: TagTreeNode
  depth: number
  selectedIds: string[]
  onToggle: (tagId: string) => void
}

function TagPickerItem({ node, depth, selectedIds, onToggle }: TagPickerItemProps) {
  const { tag, children } = node
  return (
    <div className="tag-picker-branch">
      <div className="tag-picker-row" style={{ paddingLeft: depth * 12 }}>
        <TagChip
          tag={tag}
          selected={selectedIds.includes(tag.id)}
          onClick={() => onToggle(tag.id)}
          small
        />
      </div>
      {children.map((child) => (
        <TagPickerItem
          key={child.tag.id}
          node={child}
          depth={depth + 1}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

export function TagTreePicker({ tags, selectedIds, onToggle }: TagTreePickerProps) {
  const tree = buildTagTree(tags)

  if (tree.length === 0) {
    return <p className="tag-picker-empty">タグがありません。サイドバーから追加できます。</p>
  }

  return (
    <div className="tag-tree-picker">
      {tree.map((node) => (
        <TagPickerItem
          key={node.tag.id}
          node={node}
          depth={0}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
