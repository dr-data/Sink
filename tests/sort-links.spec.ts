import { describe, expect, it } from 'vitest'
import { sortLinks, sortRequiresFullList } from '../shared/utils/sort-links'

function link(slug: string, createdAt?: number) {
  return { slug, createdAt }
}

describe('sortLinks', () => {
  const links = [
    link('zeta', 100),
    link('alpha', 300),
    link('mu', 200),
  ]

  it('sorts by newest createdAt descending', () => {
    expect(sortLinks(links, 'newest').map(item => item.slug)).toEqual(['alpha', 'mu', 'zeta'])
  })

  it('sorts by oldest createdAt ascending', () => {
    expect(sortLinks(links, 'oldest').map(item => item.slug)).toEqual(['zeta', 'mu', 'alpha'])
  })

  it('sorts by slug A-Z', () => {
    expect(sortLinks(links, 'az').map(item => item.slug)).toEqual(['alpha', 'mu', 'zeta'])
  })

  it('sorts by slug Z-A', () => {
    expect(sortLinks(links, 'za').map(item => item.slug)).toEqual(['zeta', 'mu', 'alpha'])
  })

  it('treats missing createdAt as 0 so date sort still works', () => {
    const withMissing = [link('new', 50), link('old')]
    expect(sortLinks(withMissing, 'newest').map(item => item.slug)).toEqual(['new', 'old'])
    expect(sortLinks(withMissing, 'oldest').map(item => item.slug)).toEqual(['old', 'new'])
  })

  it('does not mutate the original array', () => {
    const original = [...links]
    sortLinks(links, 'za')
    expect(links).toEqual(original)
  })
})

describe('sortRequiresFullList', () => {
  it('loads every link when sorting by date or reverse name', () => {
    expect(sortRequiresFullList('newest')).toBe(true)
    expect(sortRequiresFullList('oldest')).toBe(true)
    expect(sortRequiresFullList('za')).toBe(true)
  })

  it('keeps paginated KV order for slug A-Z', () => {
    expect(sortRequiresFullList('az')).toBe(false)
  })
})
