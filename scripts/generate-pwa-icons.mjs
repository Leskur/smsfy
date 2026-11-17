import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'public', 'favicon.svg')
const outDir = path.join(root, 'public')

await mkdir(outDir, { recursive: true })

const lightBg = { r: 243, g: 247, b: 252, alpha: 1 }

async function writePng(size, fileName) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: lightBg })
    .png()
    .toFile(path.join(outDir, fileName))
}

async function writeMaskable(size, fileName) {
  const pad = Math.round(size * 0.12)
  const inner = size - pad * 2
  const icon = await sharp(src)
    .resize(inner, inner, {
      fit: 'contain',
      background: lightBg,
    })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: lightBg,
    },
  })
    .composite([{ input: icon, left: pad, top: pad }])
    .png()
    .toFile(path.join(outDir, fileName))
}

await writePng(180, 'apple-touch-icon.png')
await writePng(192, 'icon-192.png')
await writePng(512, 'icon-512.png')
await writeMaskable(512, 'icon-512-maskable.png')

await writeFile(
  path.join(outDir, '.pwa-icons-generated'),
  `generated ${new Date().toISOString()}\n`,
)

console.log('PWA icons written to public/')
