import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, signJwt, verifyJwt, normEmail, validEmail } from '../api/utils/auth.js'

describe('mot de passe', () => {
  it('accepte le bon, refuse le mauvais', async () => {
    const h = await hashPassword('correct horse', 1000)
    expect(await verifyPassword('correct horse', h)).toBe(true)
    expect(await verifyPassword('mauvais', h)).toBe(false)
  })
  it('sel différent à chaque hachage', async () => {
    const a = await hashPassword('x1234567', 1000), b = await hashPassword('x1234567', 1000)
    expect(a.salt).not.toBe(b.salt)
  })
})

describe('JWT', () => {
  it('signe et vérifie', async () => {
    const t = await signJwt({ sub: 'u1', email: 'a@b.co' }, 'secret')
    expect((await verifyJwt(t, 'secret')).sub).toBe('u1')
  })
  it('refuse un mauvais secret, un jeton altéré et un jeton expiré', async () => {
    const t = await signJwt({ sub: 'u1' }, 'secret')
    expect(await verifyJwt(t, 'autre')).toBeNull()
    const [h, , s] = t.split('.')
    const forged = `${h}.${btoa(JSON.stringify({ sub: 'admin', exp: 9e9 })).replace(/=/g, '')}.${s}`
    expect(await verifyJwt(forged, 'secret')).toBeNull()
    expect(await verifyJwt(await signJwt({ sub: 'u1' }, 'secret', -10), 'secret')).toBeNull()
  })
})

describe('e-mail', () => {
  it('normalise et valide', () => {
    expect(normEmail('  Obed@Mail.COM ')).toBe('obed@mail.com')
    expect(validEmail('a@b.co')).toBe(true)
    expect(validEmail('pas un mail')).toBe(false)
  })
})
