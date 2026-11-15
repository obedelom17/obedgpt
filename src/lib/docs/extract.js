// Extraction de texte 100 % dans le navigateur : le fichier n'est jamais envoyé
// à un serveur. Les bibliothèques lourdes sont chargées à la demande.
export const MAX_FILE = 40 * 1024 * 1024
export const MAX_PAGES = 300
export const DOC_ACCEPT = '.pdf,.docx,.xlsx,.xls,.csv,.pptx,.txt,.md,.json,.html,.htm,.xml,.log,.rtf,image/*'

const ext = name => (/\.([a-z0-9]+)$/i.exec(name)?.[1] || '').toLowerCase()
const clean = t => t.replace(/\u0000/g, '').replace(/[ \t\f\v]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

// Découpe un long texte en « pages » d'environ `size` caractères, à une fin de paragraphe.
function paginate(text, size = 3000, label = 'section') {
  const paras = text.split(/\n{2,}|\r\n\r\n/); const pages = []; let cur = ''
  const flush = () => { if (cur.trim()) pages.push({ n: pages.length + 1, label: `${label} ${pages.length + 1}`, text: cur.trim() }); cur = '' }
  for (let p of paras) {
    while (p.length > size * 1.5) { cur += (cur ? '\n\n' : '') + p.slice(0, size); flush(); p = p.slice(size) }
    if (cur.length + p.length > size) flush()
    cur += (cur ? '\n\n' : '') + p
  }
  flush(); return pages
}

async function pdfLib() {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

async function extractPdf(file, onProgress) {
  const pdfjs = await pdfLib()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const total = Math.min(pdf.numPages, MAX_PAGES); const pages = []; let chars = 0
  for (let i = 1; i <= total; i++) {
    onProgress?.(`Lecture du PDF : page ${i}/${total}`)
    const tc = await (await pdf.getPage(i)).getTextContent()
    // Césures de fin de ligne : « informa-⏎tion » → « information » ; « 4821-⏎TOGO » → « 4821-TOGO »
    const raw = tc.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join('')
      .replace(/([A-Za-zÀ-ÿ])- ?\n ?([a-zà-ÿ])/g, '$1$2').replace(/- ?\n ?(?=\S)/g, '-')
    const text = clean(raw)
    chars += text.length; pages.push({ n: i, text })
  }
  const scanned = chars < 25 * total   // quasi aucun texte : PDF scanné
  return { pages, scanned, truncated: pdf.numPages > MAX_PAGES, totalPages: pdf.numPages }
}

// Rend des pages de PDF en images JPEG (pour l'OCR par le modèle vision).
export async function renderPdfPages(file, pageNumbers, scale = 1.5) {
  const pdfjs = await pdfLib()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const out = []
  for (const n of pageNumbers) {
    const page = await pdf.getPage(n); const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas'); canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    out.push(canvas.toDataURL('image/jpeg', 0.72))
  }
  return out
}

async function extractDocx(file) {
  const mammoth = (await import('mammoth')).default || (await import('mammoth'))
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return { pages: paginate(clean(value), 3000, 'section') }
}

async function extractSheet(file) {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' }); const pages = []
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_csv(wb.Sheets[name]).split('\n').filter(r => r.replace(/,/g, '').trim())
    for (let i = 0; i < rows.length; i += 80) pages.push({ n: pages.length + 1, label: `${name} (lignes ${i + 1}-${Math.min(i + 80, rows.length)})`, text: (i ? rows[0] + '\n' : '') + rows.slice(i, i + 80).join('\n') })
  }
  return { pages }
}

async function extractPptx(file) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/(\d+)\.xml/)[1]) - parseInt(b.match(/(\d+)\.xml/)[1]))
  const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
  const pages = []
  for (const n of names) {
    const xml = await zip.files[n].async('string')
    const text = clean([...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(m => dec(m[1])).join(' '))
    pages.push({ n: pages.length + 1, label: `diapo ${pages.length + 1}`, text })
  }
  return { pages }
}

function extractHtml(text) { const d = new DOMParser().parseFromString(text, 'text/html'); d.querySelectorAll('script,style,noscript').forEach(e => e.remove()); return d.body?.textContent || '' }

export const isImageFile = f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name)

// Retourne { name, kind, pages:[{n,label?,text}], scanned?, truncated? }
export async function extractFile(file, onProgress) {
  if (file.size > MAX_FILE) throw new Error(`« ${file.name} » est trop volumineux (40 Mo maximum).`)
  const e = ext(file.name); onProgress?.(`Lecture de ${file.name}…`)
  let r
  if (isImageFile(file)) r = { pages: [{ n: 1, label: 'image', text: '' }], scanned: true, image: true }
  else if (e === 'pdf') r = await extractPdf(file, onProgress)
  else if (e === 'docx') r = await extractDocx(file)
  else if (['xlsx', 'xls'].includes(e)) r = await extractSheet(file)
  else if (e === 'pptx') r = await extractPptx(file)
  else if (e === 'doc' || e === 'ppt') throw new Error('Les anciens formats .doc et .ppt ne sont pas pris en charge : enregistre en .docx / .pptx ou en PDF.')
  else {
    let text = await file.text()
    if (['html', 'htm', 'xml'].includes(e)) text = extractHtml(text)
    if (e === 'rtf') text = text.replace(/\\par[d]?/g, '\n').replace(/\{\\[^{}]*\}|\\[a-z]+-?\d* ?|[{}]/g, '')
    r = { pages: paginate(clean(text), 3000, e === 'csv' ? 'bloc' : 'section') }
  }
  const chars = r.pages.reduce((n, p) => n + p.text.length, 0)
  if (!r.scanned && chars < 20) throw new Error(`Aucun texte trouvé dans « ${file.name} ».`)
  return { name: file.name, kind: e || 'txt', size: file.size, ...r, chars }
}
