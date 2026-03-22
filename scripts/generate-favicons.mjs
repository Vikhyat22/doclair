import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

// SVG source — drawn with sharp's SVG renderer (no font needed, uses path)
// We draw the D as a geometric shape so no font dependency
const svgIcon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.1875)}" fill="#1A1612"/>
  <text
    x="${size / 2}" y="${Math.round(size * 0.695)}"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${Math.round(size * 0.594)}"
    text-anchor="middle"
    fill="#E8820C">D</text>
</svg>`

const sizes = [16, 32, 48, 96, 180, 192, 512]

for (const size of sizes) {
  const svg = Buffer.from(svgIcon(size))
  const outPath = path.join(publicDir, `icon-${size}.png`)
  await sharp(svg).png().toFile(outPath)
  console.log(`✅ icon-${size}.png`)
}

// favicon.ico = 32×32 PNG (browsers accept PNG named .ico via <link>)
fs.copyFileSync(path.join(publicDir, 'icon-32.png'), path.join(publicDir, 'favicon.ico'))
console.log('✅ favicon.ico (32px)')

// Apple touch icon
fs.copyFileSync(path.join(publicDir, 'icon-180.png'), path.join(publicDir, 'apple-touch-icon.png'))
console.log('✅ apple-touch-icon.png (180px)')

console.log('\n🎉 All favicons generated!')
