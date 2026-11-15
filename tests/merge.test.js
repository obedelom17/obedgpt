import { describe, it, expect } from 'vitest'
import { mergeHistories } from '../src/lib/merge.js'

const c = (id, t, extra = {}) => ({ id, title: id, messages: [{ role: 'user', content: 'x' }], updatedAt: new Date(t).toISOString(), ...extra })

describe('mergeHistories', () => {
  it('garde la version la plus récente', () => {
    const r = mergeHistories([c('a', 2000, { title: 'local' })], [c('a', 1000, { title: 'remote' })])
    expect(r.conversations).toHaveLength(1)
    expect(r.conversations[0].title).toBe('local')
  })
  it('réunit les conversations des deux côtés, triées', () => {
    const r = mergeHistories([c('a', 1000)], [c('b', 3000)])
    expect(r.conversations.map(x => x.id)).toEqual(['b', 'a'])
  })
  it('propage une suppression locale', () => {
    const r = mergeHistories([], [c('a', 1000)], { a: 5000 }, {})
    expect(r.conversations).toHaveLength(0)
  })
  it('une modification postérieure à la suppression gagne', () => {
    const r = mergeHistories([c('a', 9000)], [], {}, { a: 5000 })
    expect(r.conversations).toHaveLength(1)
  })
  it('ignore les entrées invalides et respecte la limite', () => {
    const many = Array.from({ length: 60 }, (_, i) => c('c' + i, i * 1000))
    const r = mergeHistories([...many, null, { id: 'z' }], [], {}, {}, 50)
    expect(r.conversations).toHaveLength(50)
  })
})
