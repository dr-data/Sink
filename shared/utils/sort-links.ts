import type { LinkSortBy } from '../types/link'

export interface SortableLink {
  slug: string
  createdAt?: number
}

export function sortRequiresFullList(sortBy: LinkSortBy): boolean {
  return sortBy !== 'az'
}

export function sortLinks<T extends SortableLink>(links: T[], sortBy: LinkSortBy): T[] {
  const sorted = [...links]
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => createdAtValue(b) - createdAtValue(a))
    case 'oldest':
      return sorted.sort((a, b) => createdAtValue(a) - createdAtValue(b))
    case 'az':
      return sorted.sort((a, b) => a.slug.localeCompare(b.slug))
    case 'za':
      return sorted.sort((a, b) => b.slug.localeCompare(a.slug))
    default:
      return sorted
  }
}

function createdAtValue(link: SortableLink): number {
  return typeof link.createdAt === 'number' && Number.isFinite(link.createdAt)
    ? link.createdAt
    : 0
}
