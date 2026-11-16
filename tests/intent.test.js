import { describe, it, expect, vi } from 'vitest'
process.env.GROQ_API_KEYS = 'gsk_test'
const { default: intent } = await import('../api/intent.js')
const { maybeImageRequest } = await import('../src/lib/imageIntent.js')

const call = body => new Promise(resolve => {
  const res = { h: {}, status(s) { this.code = s; return this }, setHeader() {}, end() { resolve({ code: this.code }) }, json(o) { resolve({ code: this.code, body: o }); return this } }
  intent({ method: 'POST', headers: { origin: '' }, body, query: {}, url: '/', socket: { remoteAddress: '9.9.9.' + Math.floor(Math.random() * 250) } }, res)
})
const groq = content => vi.stubGlobal('fetch', vi.fn(async url => String(url).endsWith('/models')
  ? new Response(JSON.stringify({ data: [{ id: 'openai/gpt-oss-20b' }, { id: 'openai/gpt-oss-120b' }] }), { status: 200 })
  : new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { 'content-type': 'application/json' } })))

describe('/api/intent', () => {
  it('image=true renvoie le prompt', async () => {
    groq('{"image":true,"prompt":"un lion majestueux dans la savane"}')
    const r = await call({ text: "j'aimerais bien voir à quoi ressemble un lion" })
    expect(r.body).toEqual({ image: true, prompt: 'un lion majestueux dans la savane' })
  })
  it('image=false pour une question de connaissance', async () => {
    groq('{"image":false,"prompt":""}')
    expect((await call({ text: 'montre la différence entre un lion et un tigre' })).body.image).toBe(false)
  })
  it('JSON invalide : pas d\'image', async () => {
    groq('désolé, je ne sais pas')
    expect((await call({ text: 'fais-moi voir un lion' })).body.image).toBe(false)
  })
  it('texte vide : 400', async () => { expect((await call({ text: '' })).code).toBe(400) })
})

describe('maybeImageRequest (préfiltre)', () => {
  it('laisse passer les formulations libres', () => {
    expect(maybeImageRequest("j'aimerais bien voir à quoi ressemble un lion")).toBe(true)
    expect(maybeImageRequest('fais-en une version en noir et blanc', { afterImage: true })).toBe(true)
  })
  it('ignore les messages sans indice visuel, techniques ou trop longs', () => {
    expect(maybeImageRequest('bonjour, comment vas-tu ?')).toBe(false)
    expect(maybeImageRequest('crée une image docker')).toBe(false)
    expect(maybeImageRequest('fais-en une version en noir et blanc')).toBe(false)
    expect(maybeImageRequest('voir '.repeat(100))).toBe(false)
  })
})
