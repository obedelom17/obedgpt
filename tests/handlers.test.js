import { describe, it, expect, beforeEach } from 'vitest'

const mem = new Map()
globalThis.__CF_ENV = { AUTH_KV: { get: async k => mem.get(k) ?? null, put: async (k, v) => { mem.set(k, v) }, delete: async k => { mem.delete(k) } } }
process.env.JWT_SECRET = 'test-secret'
process.env.PBKDF2_ITERATIONS = '1000'

const { default: auth } = await import('../api/auth.js')
const { default: sync } = await import('../api/sync.js')

function call(handler, { method = 'POST', body, headers = {} } = {}) {
  return new Promise(resolve => {
    const res = { headersSent: false, h: {}, status(s) { this.code = s; return this }, setHeader(k, v) { this.h[k] = v }, end() { resolve({ code: this.code }) }, json(o) { resolve({ code: this.code, body: o }); return this } }
    handler({ method, headers: { origin: '', ...headers }, body, query: {}, url: '/', socket: { remoteAddress: '1.1.1.' + Math.floor(Math.random() * 250) } }, res)
  })
}

describe('API comptes', () => {
  beforeEach(() => mem.clear())
  it('inscription puis connexion', async () => {
    const r = await call(auth, { body: { action: 'register', email: 'a@b.co', password: 'motdepasse' } })
    expect(r.code).toBe(200); expect(r.body.token).toBeTruthy()
    const l = await call(auth, { body: { action: 'login', email: 'A@B.co', password: 'motdepasse' } })
    expect(l.code).toBe(200)
  })
  it('refuse un doublon et un mauvais mot de passe', async () => {
    await call(auth, { body: { action: 'register', email: 'a@b.co', password: 'motdepasse' } })
    expect((await call(auth, { body: { action: 'register', email: 'a@b.co', password: 'motdepasse' } })).code).toBe(409)
    expect((await call(auth, { body: { action: 'login', email: 'a@b.co', password: 'faux-faux-faux' } })).code).toBe(401)
  })
  it('refuse un mot de passe trop court', async () => {
    expect((await call(auth, { body: { action: 'register', email: 'a@b.co', password: 'court' } })).code).toBe(400)
  })
  it('sync : exige un jeton, stocke et relit', async () => {
    expect((await call(sync, { method: 'GET' })).code).toBe(401)
    const { body } = await call(auth, { body: { action: 'register', email: 'c@d.co', password: 'motdepasse' } })
    const h = { authorization: `Bearer ${body.token}` }
    const put = await call(sync, { method: 'PUT', headers: h, body: { conversations: [{ id: '1', messages: [] }], deleted: {} } })
    expect(put.code).toBe(200)
    const get = await call(sync, { method: 'GET', headers: h })
    expect(get.body.conversations).toHaveLength(1)
  })
})

describe('API image', () => {
  it('503 sans binding, 200 avec un faux AI, 400 prompt trop court', async () => {
    const { default: image } = await import('../api/image.js')
    const saved = globalThis.__CF_ENV
    globalThis.__CF_ENV = { AUTH_KV: saved.AUTH_KV }
    expect((await call(image, { body: { prompt: 'un chat' } })).code).toBe(503)
    globalThis.__CF_ENV = { ...saved, AI: { run: async () => ({ image: 'QUJD' }) } }
    const ok = await call(image, { body: { prompt: 'un chat sur un toit' } })
    expect(ok.code).toBe(200); expect(ok.body.image).toMatch(/^data:image\/jpeg;base64,/)
    expect((await call(image, { body: { prompt: 'a' } })).code).toBe(400)
    globalThis.__CF_ENV = saved
  })
})
