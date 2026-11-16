import { describe, it, expect, beforeEach } from 'vitest'

const mem = new Map()
globalThis.__CF_ENV = { STORE_KV: { get: async k => mem.get(k) ?? null, put: async (k, v) => { mem.set(k, v) }, delete: async k => { mem.delete(k) } } }


function call(handler, { method = 'POST', body, headers = {} } = {}) {
  return new Promise(resolve => {
    const res = { headersSent: false, h: {}, status(s) { this.code = s; return this }, setHeader(k, v) { this.h[k] = v }, end() { resolve({ code: this.code }) }, json(o) { resolve({ code: this.code, body: o }); return this } }
    handler({ method, headers: { origin: '', ...headers }, body, query: {}, url: '/', socket: { remoteAddress: '1.1.1.' + Math.floor(Math.random() * 250) } }, res)
  })
}

describe('API image', () => {
  it('503 sans binding, 200 avec un faux AI, 400 prompt trop court', async () => {
    const { default: image } = await import('../api/image.js')
    const saved = globalThis.__CF_ENV
    globalThis.__CF_ENV = { STORE_KV: saved.STORE_KV }
    expect((await call(image, { body: { prompt: 'un chat' } })).code).toBe(503)
    globalThis.__CF_ENV = { ...saved, AI: { run: async () => ({ image: 'QUJD' }) } }
    const ok = await call(image, { body: { prompt: 'un chat sur un toit' } })
    expect(ok.code).toBe(200); expect(ok.body.image).toMatch(/^data:image\/jpeg;base64,/)
    expect((await call(image, { body: { prompt: 'a' } })).code).toBe(400)
    globalThis.__CF_ENV = saved
  })
})

describe('API health', () => {
  it('503 sans clé Groq', async () => {
    delete process.env.GROQ_API_KEYS; delete process.env.GROQ_API_KEY
    const { default: health } = await import('../api/health.js')
    const r = await call(health, { method: 'GET' })
    expect(r.code).toBe(503); expect(r.body.ok).toBe(false)
  })
})
