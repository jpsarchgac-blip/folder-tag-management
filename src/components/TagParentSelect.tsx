import type { Tag } from '../types'
import { getParentOptions } from '../utils/tag-parent'
import './TagParentSelect.css'

interface TagParentSelectProps {
  tags: Tag[]
  value: string | null
  excludeTagId?: string
  onChange: (parentId: string | null) => void
  allowRoot?: boolean
}

export function TagParentSelect({
  tags,
  value,
  excludeTagId,
  onChange,
  allowRoot = true,
}: TagParentSelectProps) {
  const options = getParentOptions(tags, excludeTagId)

  return (
    <select
      className="tag-parent-select"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {allowRoot && <option value="">（ルート）</option>}
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>{opt.label}</option>
      ))}
    </select>
  )
}

interface TagMoveSelectProps {
  tags: Tag[]
  tag: Tag
  onMove: (parentId: string | null) => void
  onCancel: () => void
}

export function TagMoveSelect({ tags, tag, onMove, onCancel }: TagMoveSelectProps) {
  return (
    <div className="tag-move-select">
      <label className="tag-parent-label">「{tag.name}」の移動先</label>
      <TagParentSelect
        tags={tags}
        value={tag.parentId ?? null}
        excludeTagId={tag.id}
        onChange={onMove}
      />
      <div className="tag-edit-actions">
        <button type="button" className="btn-small btn-ghost" onClick={onCancel}>閉じる</button>
      </div>
    </div>
  )
}
