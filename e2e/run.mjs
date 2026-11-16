// Test de bout en bout : vrai Chromium, build de production, en-têtes CSP appliqués, API simulée.
// Usage : npm run build && npm run e2e
import chromium from '@sparticuz/chromium'; import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'; import path from 'node:path'
process.argv[2] = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist'); process.argv[3] = '4173'
await import('./serve.mjs'); await new Promise(r => setTimeout(r, 400))
const base = 'http://localhost:4173'
let failed = 0
const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: await chromium.executablePath(), headless: 'shell' })
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 })
const errs = []
page.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 200)) })
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 200)))
page.on('requestfailed', r => errs.push('REQFAIL: ' + r.url().slice(0, 100)))
const step = async (name, fn) => { try { await fn(); console.log('OK  ', name) } catch (e) { console.log('FAIL', name, '-', e.message.split('\n')[0]); failed++ } }
await page.goto(base + '/?lang=fr', { waitUntil: 'networkidle2' })
await step('onboarding visible', () => page.waitForSelector('[aria-label="Bienvenue"]', { timeout: 4000 }))
await step('onboarding passer', async () => { await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Passer').click()); await page.waitForSelector('[aria-label="Bienvenue"]', { hidden: true, timeout: 3000 }) })
await page.screenshot({ path: 'docs/screens/accueil.png' })
await step('envoi message + rendu markdown/code', async () => {
  await page.type('textarea', 'Salut'); await page.keyboard.press('Enter')
  await page.waitForSelector('.prose-obedgpt strong', { timeout: 10000 })
  await page.waitForSelector('.syntax-wrapper, pre', { timeout: 10000 })
  await page.waitForSelector('.katex', { timeout: 10000 })
})
await step('variantes après régénération', async () => {
  await new Promise(r => setTimeout(r, 1200))
  await page.evaluate(() => document.querySelector('[aria-label="Régénérer cette réponse"]').click())
  await page.waitForSelector('.alt-nav', { timeout: 10000 })
})
await step('raccourci Ctrl+/', async () => { await page.keyboard.down('Control'); await page.keyboard.press('/'); await page.keyboard.up('Control'); await page.waitForSelector('[aria-label="Raccourcis clavier"]', { timeout: 3000 }); await page.keyboard.press('Escape') })
await step('palette Ctrl+K', async () => { await page.keyboard.down('Control'); await page.keyboard.press('k'); await page.keyboard.up('Control'); await page.waitForSelector('[aria-label="Palette de commandes"]', { timeout: 3000 }); await page.keyboard.press('Escape') })
await step('navigation Alt+2 (Code)', async () => { await page.keyboard.down('Alt'); await page.keyboard.press('2'); await page.keyboard.up('Alt'); await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Code', { timeout: 5000 }) })
await step('PWA installable (manifest + service worker + icônes)', async () => {
  await page.goto(base + '/?lang=fr', { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), { timeout: 8000 })
  const cdp = await page.createCDPSession()
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  if (installabilityErrors.length) throw new Error('non installable : ' + installabilityErrors.map(e => e.errorId).join(', '))
  const { url, errors } = await cdp.send('Page.getAppManifest')
  if (errors.length) throw new Error('manifest : ' + errors.map(e => e.message).join(' | '))
  const m = await page.evaluate(async () => (await fetch('/manifest.json')).json())
  for (const i of m.icons) { const r = await page.evaluate(async u => (await fetch(u)).status, i.src); if (r !== 200) throw new Error('icône introuvable ' + i.src) }
})
// Pages neuves : le profil du navigateur est partagé entre les pages, on remet l'état à zéro une seule fois par page.
const freshPage = async () => {
  const p = await browser.newPage(); await p.setViewport({ width: 1280, height: 800 })
  await p.evaluateOnNewDocument(() => { localStorage.setItem('obedgpt-onboarded', '1'); if (!sessionStorage.getItem('init')) { localStorage.removeItem('obedgpt-install-dismissed'); sessionStorage.setItem('init', '1') } })
  await p.goto(base + '/?lang=fr', { waitUntil: 'networkidle2' }); return p
}
const fire = (p, outcome) => p.evaluate(o => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__prompted = true }; e.userChoice = Promise.resolve({ outcome: o }); window.dispatchEvent(e) }, outcome)
const clickIn = (p, label) => p.evaluate(l => [...document.querySelectorAll('.install-card button')].find(b => b.textContent.trim().includes(l)).click(), label)

await step('invite d\'installation affichée puis installation', async () => {
  const p = await freshPage(); await fire(p, 'accepted')
  await p.waitForSelector('[aria-label="Installer l\'application"]', { timeout: 9000 })
  await clickIn(p, 'Installer')
  await p.waitForFunction(() => window.__prompted === true, { timeout: 3000 }); await p.close()
})
await step('invite d\'installation : « Plus tard » mémorisé', async () => {
  const p = await freshPage(); await fire(p, 'dismissed')
  await p.waitForSelector('.install-card', { timeout: 9000 })
  await clickIn(p, 'Plus tard')
  await p.reload({ waitUntil: 'networkidle2' }); await fire(p, 'dismissed')
  await new Promise(r => setTimeout(r, 4500))
  const again = !!(await p.$('.install-card')); await p.close()
  if (again) throw new Error('réaffichée malgré « Plus tard »')
})
await step('image demandée en langage naturel (sans /image) + « Répondre par texte »', async () => {
  const p = await freshPage()
  await p.type('textarea', "génère une image d'un lion dans la savane"); await p.keyboard.press('Enter')
  await p.waitForSelector('.gen-image img', { timeout: 9000 })
  await p.evaluate(() => [...document.querySelectorAll('.gen-image button')].find(b => b.textContent.includes('Répondre par texte')).click())
  await p.waitForSelector('.prose-obedgpt strong', { timeout: 10000 })
  if (await p.$('.gen-image img')) throw new Error('image encore affichée après « Répondre par texte »')
  await p.close()
})
await step('question technique : pas d\'image automatique', async () => {
  const p = await freshPage()
  await p.type('textarea', 'comment générer une image docker ?'); await p.keyboard.press('Enter')
  await p.waitForSelector('.prose-obedgpt strong', { timeout: 10000 })
  if (await p.$('.gen-image img')) throw new Error('image générée à tort'); await p.close()
})
await step('page confidentialité', async () => { const r = await page.goto(base + '/privacy.html'); if (r.status() !== 200) throw new Error(r.status()) })
await page.goto(base + '/?lang=fr'); await page.screenshot({ path: 'docs/screens/chat.png' })
const real = [...new Set(errs)].filter(e => !/fonts\.(googleapis|gstatic)|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(e))
console.log('Console/réseau :', real.length ? '\n' + real.join('\n') : 'aucune erreur (hors polices Google)')
if (real.some(e => /Content Security Policy|PAGEERROR/.test(e))) failed++
await browser.close(); process.exit(failed ? 1 : 0)
