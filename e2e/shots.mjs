// Captures pour la boîte d'installation du navigateur (manifest.screenshots) : npm run build && npm run shots
import chromium from '@sparticuz/chromium'; import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'node:url'; import path from 'node:path'
const dir = path.dirname(fileURLToPath(import.meta.url))
process.argv[2] = path.resolve(dir, '../dist'); process.argv[3] = '4173'
await import('./serve.mjs'); await new Promise(r => setTimeout(r, 400))
const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox'], executablePath: await chromium.executablePath(), headless: 'shell' })
for (const [name, w, h, mobile] of [['wide', 1280, 720, false], ['narrow', 540, 960, true]]) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  await page.evaluateOnNewDocument(() => { localStorage.setItem('obedgpt-onboarded', '1'); localStorage.setItem('obedgpt-install-dismissed', String(Date.now())); localStorage.removeItem('obedgpt-chat-history') })
  await page.goto('http://localhost:4173/?lang=fr', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1200))
  await page.screenshot({ path: path.resolve(dir, `../public/screenshots/${name}.png`) })
  await page.close()
}
await browser.close(); process.exit(0)
