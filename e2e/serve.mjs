import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const root = process.argv[2], port = +process.argv[3] || 4173
const hdr = fs.readFileSync(path.join(root, '_headers'), 'utf8').split(/\n\n/)[0].split('\n').slice(1).map(l => l.trim().split(/:\s(.+)/).slice(0, 2))
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x')
  for (const [k, v] of hdr) res.setHeader(k, v)
  if (u.pathname === '/api/models') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ models: [{ id: 'openai/gpt-oss-120b', kind: 'chat' }], live: true })) }
  if (u.pathname === '/api/chat') {
    res.setHeader('content-type', 'application/x-ndjson')
    const txt = 'Bonjour **monde**\n\nVoici du code :\n\n```js\nconsole.log(1)\n```\n\n$x^2$'
    res.write(JSON.stringify({ t: 'meta', v: { model: 'openai/gpt-oss-120b' } }) + '\n')
    let i = 0; const t = setInterval(() => { if (i >= txt.length) { clearInterval(t); return res.end() } res.write(JSON.stringify({ t: 'c', v: txt.slice(i, i + 12) }) + '\n'); i += 12 }, 30); return
  }
  if (u.pathname === '/api/image') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', prompt: 'a lion' })) }
  if (u.pathname.startsWith('/api/')) { res.statusCode = 404; return res.end('{}') }
  let f = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html')
  res.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res)
}).listen(port, () => console.log('ok', port))
