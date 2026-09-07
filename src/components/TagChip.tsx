import type { CSSProperties } from 'react'
import type { Tag } from '../types'
import './TagChip.css'

interface TagChipProps {
  tag: Tag
  selected?: boolean
  onClick?: () => void
  small?: boolean
}

export function TagChip({ tag, selected, onClick, small }: TagChipProps) {
  return (
    <button
      type="button"
      className={`tag-chip ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      style={{ '--tag-color': tag.color } as CSSProperties}
      onClick={onClick}
    >
      <span className="tag-dot" />
      {tag.name}
    </button>
  )
}
