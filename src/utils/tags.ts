import type { Tag } from '../types'

export interface TagTreeNode {
  tag: Tag
  children: TagTreeNode[]
}

export function normalizeTag(tag: Tag): Tag {
  return {
    ...tag,
    parentId: tag.parentId ?? null,
  }
}

export function buildTagTree(tags: Tag[]): TagTreeNode[] {
  const normalized = tags.map(normalizeTag)
  const byParent = new Map<string | null, Tag[]>()

  for (const tag of normalized) {
    const key = tag.parentId ?? null
    const list = byParent.get(key) ?? []
    list.push(tag)
    byParent.set(key, list)
  }

  const sortTags = (list: Tag[]) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  function build(parentId: string | null): TagTreeNode[] {
    return sortTags(byParent.get(parentId) ?? []).map((tag) => ({
      tag,
      children: build(tag.id),
    }))
  }

  return build(null)
}

export function getDescendantIds(tagId: string, tags: Tag[]): string[] {
  const ids = [tagId]
  for (const child of tags.filter((t) => (t.parentId ?? null) === tagId)) {
    ids.push(...getDescendantIds(child.id, tags))
  }
  return ids
}

export function getAssignableParentOptions(
  tags: Tag[],
  excludeTagId?: string,
): Tag[] {
  const excluded = excludeTagId ? new Set(getDescendantIds(excludeTagId, tags)) : new Set<string>()
  return tags
    .filter((t) => !excluded.has(t.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

export function projectMatchesTag(
  projectTagIds: string[],
  selectedTagId: string,
  tags: Tag[],
): boolean {
  const matchIds = new Set(getDescendantIds(selectedTagId, tags))
  return projectTagIds.some((id) => matchIds.has(id))
}

export function getAggregatedProjectCount(
  tagId: string,
  tags: Tag[],
  projects: { tagIds: string[] }[],
): number {
  const matchIds = new Set(getDescendantIds(tagId, tags))
  return projects.filter((p) => p.tagIds.some((id) => matchIds.has(id))).length
}

export function flattenTagTree(nodes: TagTreeNode[]): Tag[] {
  const result: Tag[] = []
  for (const node of nodes) {
    result.push(node.tag)
    result.push(...flattenTagTree(node.children))
  }
  return result
}
