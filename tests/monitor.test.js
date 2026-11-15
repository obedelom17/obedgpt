import { describe, it, expect } from 'vitest'
import { parseDsn } from '../src/lib/monitor.js'

describe('parseDsn', () => {
  it('lit un DSN Sentry', () => {
    expect(parseDsn('https://abc123@o1.ingest.sentry.io/42')).toMatchObject({ key: 'abc123', host: 'o1.ingest.sentry.io', project: '42' })
  })
  it('refuse un DSN invalide', () => { expect(parseDsn('n\'importe quoi')).toBeNull(); expect(parseDsn(undefined)).toBeNull() })
})
