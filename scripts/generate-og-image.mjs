import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const W = 1200
const H = 630

// Tool cards — icon replaced with colored circle + letter
const cards = [
  { x: 750, y: 80,  bg: '#FFF0DC', letter: 'M', name: 'Merge PDF',     desc: 'Combine multiple PDFs' },
  { x: 968, y: 80,  bg: '#FFF0DC', letter: 'C', name: 'Compress PDF',  desc: 'Reduce file size' },
  { x: 750, y: 168, bg: '#DBEAFE', letter: 'E', name: 'Edit PDF',       desc: 'Add text + signatures' },
  { x: 968, y: 168, bg: '#EDE9FE', letter: 'O', name: 'OCR PDF',        desc: 'Make text searchable' },
  { x: 750, y: 256, bg: '#D1FAE5', letter: 'J', name: 'JPG to PDF',     desc: 'Convert images to PDF' },
  { x: 968, y: 256, bg: '#FEE2E2', letter: 'S', name: 'Split PDF',      desc: 'Extract pages by range' },
  { x: 750, y: 344, bg: '#D1FAE5', letter: 'W', name: 'Watermark',      desc: 'Stamp text over PDF' },
  { x: 968, y: 344, bg: '#EDE9FE', letter: 'A', name: 'AI Summarizer',  desc: 'Get key points instantly' },
]

const cardsSVG = cards.map(c => `
  <rect x="${c.x}" y="${c.y}" width="200" height="72" rx="14"
        fill="#FFFFFF" fill-opacity="0.04"
        stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="1"/>
  <rect x="${c.x + 18}" y="${c.y + 18}" width="36" height="36" rx="8" fill="${c.bg}"/>
  <text x="${c.x + 36}" y="${c.y + 42}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="16" font-weight="700"
        fill="#1A1612" text-anchor="middle">${c.letter}</text>
  <text x="${c.x + 66}" y="${c.y + 34}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="13" font-weight="600" fill="#FFFFFF">${c.name}</text>
  <text x="${c.x + 66}" y="${c.y + 52}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="11" fill="#FFFFFF" opacity="0.45">${c.desc}</text>
`).join('')

// Grid dots
const dots = Array.from({ length: 11 }, (_, row) =>
  Array.from({ length: 19 }, (_, col) =>
    `<circle cx="${col * 65 + 30}" cy="${row * 58 + 30}" r="1.2" fill="#F59E0B" opacity="0.09"/>`
  ).join('')
).join('')

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1A1612"/>
      <stop offset="100%" stop-color="#0F0D0A"/>
    </linearGradient>
    <radialGradient id="glow1" cx="12%" cy="88%" r="55%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="88%" cy="12%" r="40%">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>

  <!-- Dot grid -->
  ${dots}

  <!-- Top amber border -->
  <rect x="0" y="0" width="${W}" height="3" fill="#F59E0B" opacity="0.7"/>

  <!-- Logo box -->
  <rect x="72" y="62" width="52" height="52" rx="14" fill="#F59E0B"/>
  <text x="98" y="100"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="34" font-weight="700"
        fill="#1A1612" text-anchor="middle">D</text>

  <!-- Wordmark -->
  <text x="142" y="100"
        font-family="Arial, Helvetica, sans-serif"
        font-size="30" font-weight="700" letter-spacing="0.5"
        fill="#FFFFFF">Doclair</text>

  <!-- Mono label -->
  <text x="72" y="192"
        font-family="'Courier New', Courier, monospace"
        font-size="13" fill="#F59E0B" letter-spacing="3" opacity="0.9">// 55+ FREE BROWSER-BASED TOOLS</text>

  <!-- Headline line 1 -->
  <text x="72" y="268"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="62" font-weight="900" fill="#FFFFFF">PDF, Image &amp;</text>

  <!-- Headline line 2 -->
  <text x="72" y="344"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="62" font-weight="900" fill="#FFFFFF">Document Tools</text>

  <!-- Amber underline accent -->
  <rect x="72" y="360" width="310" height="4" rx="2" fill="#F59E0B"/>

  <!-- Subtext -->
  <text x="72" y="416"
        font-family="Arial, Helvetica, sans-serif"
        font-size="21" fill="#FFFFFF" opacity="0.55">No upload · No watermark · No sign-up · Free forever</text>

  <!-- Feature pills -->
  <rect x="72"  y="450" width="170" height="38" rx="19"
        fill="#F59E0B" fill-opacity="0.10"
        stroke="#F59E0B" stroke-width="1" stroke-opacity="0.35"/>
  <text x="157" y="474"
        font-family="Arial, Helvetica, sans-serif"
        font-size="13" fill="#F59E0B" text-anchor="middle">Files stay on device</text>

  <rect x="254" y="450" width="140" height="38" rx="19"
        fill="#F59E0B" fill-opacity="0.10"
        stroke="#F59E0B" stroke-width="1" stroke-opacity="0.35"/>
  <text x="324" y="474"
        font-family="Arial, Helvetica, sans-serif"
        font-size="13" fill="#F59E0B" text-anchor="middle">Instant results</text>

  <rect x="406" y="450" width="140" height="38" rx="19"
        fill="#F59E0B" fill-opacity="0.10"
        stroke="#F59E0B" stroke-width="1" stroke-opacity="0.35"/>
  <text x="476" y="474"
        font-family="Arial, Helvetica, sans-serif"
        font-size="13" fill="#F59E0B" text-anchor="middle">Works offline</text>

  <!-- Right side tool cards -->
  ${cardsSVG}

  <!-- Bottom CTA card spanning both columns -->
  <rect x="750" y="432" width="418" height="72" rx="14"
        fill="#F59E0B" fill-opacity="0.10"
        stroke="#F59E0B" stroke-opacity="0.30" stroke-width="1"/>
  <text x="959" y="463"
        font-family="Arial, Helvetica, sans-serif"
        font-size="14" fill="#F59E0B" text-anchor="middle" font-weight="700"
        letter-spacing="0.3">+ 47 more free tools</text>
  <text x="959" y="485"
        font-family="Arial, Helvetica, sans-serif"
        font-size="12" fill="#FFFFFF" text-anchor="middle" opacity="0.40">100% browser-based · Zero server upload</text>

  <!-- Domain watermark -->
  <text x="72" y="592"
        font-family="'Courier New', Courier, monospace"
        font-size="15" fill="#F59E0B" opacity="0.45" letter-spacing="2">doclair.in</text>
</svg>
`

const outputPath = join(__dirname, '../public/og-image.png')

await sharp(Buffer.from(svg))
  .png({ quality: 95 })
  .toFile(outputPath)

console.log(`og-image.png generated at public/og-image.png`)
