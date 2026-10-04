import type { Tag } from '../types'
import { buildTagTree, getDescendantIds, type TagTreeNode } from './tags'

export interface ParentOption {
  id: string
  label: string
  depth: number
}

function buildParentOptions(
  nodes: TagTreeNode[],
  depth: number,
  excludedIds: Set<string>,
  result: ParentOption[],
): void {
  for (const node of nodes) {
    if (!excludedIds.has(node.tag.id)) {
      const prefix = depth > 0 ? `${'　'.repeat(depth)}└ ` : ''
      result.push({
        id: node.tag.id,
        label: `${prefix}${node.tag.name}`,
        depth,
      })
    }
    buildParentOptions(node.children, depth + 1, excludedIds, result)
  }
}

export function getParentOptions(tags: Tag[], excludeTagId?: string): ParentOption[] {
  const excluded = excludeTagId ? new Set(getDescendantIds(excludeTagId, tags)) : new Set<string>()
  const tree = buildTagTree(tags)
  const options: ParentOption[] = []
  buildParentOptions(tree, 0, excluded, options)
  return options
}

export function canAssignParent(tagId: string, parentId: string | null, tags: Tag[]): boolean {
  if (!parentId) return true
  if (parentId === tagId) return false
  const descendants = new Set(getDescendantIds(tagId, tags))
  return !descendants.has(parentId)
}

export function moveTagParent(tags: Tag[], tagId: string, newParentId: string | null): Tag | null {
  const tag = tags.find((t) => t.id === tagId)
  if (!tag) return null
  if (!canAssignParent(tagId, newParentId, tags)) return null
  return { ...tag, parentId: newParentId }
}
