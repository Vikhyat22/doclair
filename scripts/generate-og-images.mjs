import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-wasm'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FONTS_DIR = join(__dirname, 'fonts')
const EMOJI_DIR = join(__dirname, 'emoji-cache')
const OUT_DIR = join(ROOT, 'public', 'og')

mkdirSync(FONTS_DIR, { recursive: true })
mkdirSync(EMOJI_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

// ── Font downloader ──────────────────────────────────────────────────────────
async function fetchFont(name, url) {
  const dest = join(FONTS_DIR, name)
  if (existsSync(dest)) return readFileSync(dest)
  console.log(`  Downloading font: ${name}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Font fetch failed: ${url} (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf
}

async function loadFonts() {
  const [syne800, dmMono400, dmSans300] = await Promise.all([
    fetchFont('Syne-ExtraBold.ttf',
      'https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ.ttf'),
    fetchFont('DMMono-Regular.ttf',
      'https://fonts.gstatic.com/s/dmmono/v14/aFTR7PB1QTsUX8KYvrGyIYSnbKX9Rlk.ttf'),
    fetchFont('DMSans-Light.ttf',
      'https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8Cmcqbu6-K6z9mXgjU0.ttf'),
  ])
  return [
    { name: 'Syne',    data: syne800,   weight: 800, style: 'normal' },
    { name: 'DM Mono', data: dmMono400, weight: 400, style: 'normal' },
    { name: 'DM Sans', data: dmSans300, weight: 300, style: 'normal' },
  ]
}

// ── Emoji loader (Twemoji CDN, cached locally) ───────────────────────────────
function emojiToCodepoint(emoji) {
  return [...emoji]
    .map(c => c.codePointAt(0).toString(16).padStart(4, '0'))
    .filter(cp => cp !== 'fe0f')
    .join('-')
}

async function loadEmoji(emoji) {
  if (!emoji || emoji.length > 6) return null
  const cp = emojiToCodepoint(emoji)
  if (!cp) return null
  const dest = join(EMOJI_DIR, `${cp}.svg`)
  if (existsSync(dest)) return readFileSync(dest, 'utf8')
  const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cp}.svg`
  const res = await fetch(url)
  if (!res.ok) return null
  const svg = await res.text()
  writeFileSync(dest, svg)
  return svg
}

// ── OG image renderer ────────────────────────────────────────────────────────
function isTextIcon(icon) {
  return icon.length <= 3 && !/\p{Emoji_Presentation}/u.test(icon)
}

async function renderToolSvg(tool, fonts) {
  const textIcon = isTextIcon(tool.icon)

  return satori(
    {
      type: 'div',
      props: {
        style: {
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: '#1A1612',
          fontFamily: 'DM Sans',
        },
        children: [
          // Main content area
          {
            type: 'div',
            props: {
              style: {
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                padding: '70px 80px',
                gap: '56px',
              },
              children: [
                // Icon box
                {
                  type: 'div',
                  props: {
                    style: {
                      width: 160,
                      height: 160,
                      borderRadius: 28,
                      background: '#E8820C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: textIcon ? 52 : 80,
                      fontFamily: textIcon ? 'DM Mono' : 'DM Sans',
                      fontWeight: 400,
                      color: '#1A1612',
                      flexShrink: 0,
                    },
                    children: tool.icon,
                  },
                },
                // Text stack
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                      flex: 1,
                      minWidth: 0,
                    },
                    children: [
                      // Category pill
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            width: 'fit-content',
                            padding: '7px 18px',
                            borderRadius: 100,
                            background: 'rgba(232,130,12,0.12)',
                            border: '1px solid rgba(232,130,12,0.25)',
                            color: '#E8820C',
                            fontSize: 17,
                            fontFamily: 'DM Mono',
                            fontWeight: 400,
                            letterSpacing: '0.08em',
                          },
                          children: tool.category.toUpperCase(),
                        },
                      },
                      // Tool name
                      {
                        type: 'div',
                        props: {
                          style: {
                            color: '#FFFFFF',
                            fontSize: 76,
                            fontWeight: 800,
                            fontFamily: 'Syne',
                            letterSpacing: '-2px',
                            lineHeight: 1.0,
                          },
                          children: tool.name,
                        },
                      },
                      // Description
                      {
                        type: 'div',
                        props: {
                          style: {
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 28,
                            fontFamily: 'DM Sans',
                            fontWeight: 300,
                            letterSpacing: '-0.3px',
                          },
                          children: tool.desc,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Bottom bar
          {
            type: 'div',
            props: {
              style: {
                height: 68,
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 80px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#E8820C',
                      fontSize: 18,
                      fontFamily: 'DM Mono',
                      fontWeight: 400,
                      letterSpacing: '0.03em',
                    },
                    children: 'doclair.in — Free Online PDF & Document Tools',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      color: 'rgba(255,255,255,0.25)',
                      fontSize: 16,
                      fontFamily: 'DM Mono',
                      fontWeight: 400,
                      letterSpacing: '0.03em',
                    },
                    children: 'Free · No Upload · No Watermark',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts,
      loadAdditionalAsset: async (languageCode, segment) => {
        if (languageCode === 'emoji') {
          const svg = await loadEmoji(segment)
          if (svg) return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
        }
        return segment
      },
    }
  )
}

// ── SVG → PNG ─────────────────────────────────────────────────────────────────
async function svgToPng(svg) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  })
  return resvg.render().asPng()
}

// ── Tools list ────────────────────────────────────────────────────────────────
const TOOLS = [
  // Essentials
  { name: 'Merge PDF', icon: '🔀', category: 'Essentials', desc: 'Combine multiple PDFs into one', slug: 'merge-pdf' },
  { name: 'Split PDF', icon: '✂️', category: 'Essentials', desc: 'Extract pages or split by range', slug: 'split-pdf' },
  { name: 'Compress PDF', icon: '📦', category: 'Essentials', desc: 'Reduce file size without quality loss', slug: 'compress-pdf' },
  { name: 'PDF → Images', icon: '🖼️', category: 'Essentials', desc: 'Convert PDF pages to JPG or PNG', slug: 'pdf-to-jpg' },
  { name: 'JPG → PDF', icon: '🖼️', category: 'Essentials', desc: 'Convert images to PDF format', slug: 'jpg-to-pdf' },
  { name: 'Word → PDF', icon: '📄', category: 'Essentials', desc: 'Secure Word to PDF conversion', slug: 'word-to-pdf' },
  { name: 'PDF → Word', icon: '📝', category: 'Essentials', desc: 'Convert PDF back to editable Word', slug: 'pdf-to-word' },
  { name: 'Rotate PDF', icon: '🔄', category: 'Essentials', desc: 'Rotate pages individually or all', slug: 'rotate-pdf' },
  { name: 'Organize Pages', icon: '📋', category: 'Essentials', desc: 'Reorder, delete or rotate pages', slug: 'organize-pages' },
  { name: 'Crop PDF', icon: '✂️', category: 'Essentials', desc: 'Crop margins from PDF pages', slug: 'crop-pdf' },
  { name: 'Create PDF', icon: '🆕', category: 'Essentials', desc: 'Create a PDF from scratch', slug: 'create-pdf' },
  // Edit & Organize
  { name: 'Sign PDF', icon: '✍️', category: 'Edit & Organize', desc: 'Draw, type or upload your signature', slug: 'sign-pdf' },
  { name: 'Edit PDF + Sign', icon: '✍️', category: 'Edit & Organize', desc: 'Add text, shapes and signatures', slug: 'edit-pdf' },
  { name: 'Annotate PDF', icon: '💬', category: 'Edit & Organize', desc: 'Highlight and comment on PDFs', slug: 'annotate-pdf' },
  { name: 'Add Watermark', icon: '💧', category: 'Edit & Organize', desc: 'Stamp text or image over PDF', slug: 'add-watermark' },
  { name: 'Page Numbers', icon: '🔢', category: 'Edit & Organize', desc: 'Insert numbers with custom style', slug: 'add-page-numbers' },
  { name: 'Header & Footer', icon: '📰', category: 'Edit & Organize', desc: 'Add custom headers and footers', slug: 'add-header-footer' },
  { name: 'Add Bookmarks', icon: '🔖', category: 'Edit & Organize', desc: 'Create navigation bookmarks', slug: 'add-bookmarks' },
  { name: 'Redact PDF', icon: '⬛', category: 'Edit & Organize', desc: 'Permanently hide sensitive info', slug: 'redact-pdf' },
  { name: 'Flatten PDF', icon: '📐', category: 'Edit & Organize', desc: 'Remove forms and annotations', slug: 'flatten-pdf' },
  { name: 'Cut PDF', icon: '🔪', category: 'Edit & Organize', desc: 'Cut pages in half — H or V', slug: 'cut-pdf' },
  { name: 'Remove Pages', icon: '🗑️', category: 'Edit & Organize', desc: 'Delete specific pages from PDF', slug: 'remove-pages-from-pdf' },
  { name: 'Add Blank Page', icon: '📄', category: 'Edit & Organize', desc: 'Insert blank pages anywhere', slug: 'add-blank-page' },
  { name: 'Add Pages', icon: '➕', category: 'Edit & Organize', desc: 'Insert pages from another PDF', slug: 'add-pages-to-pdf' },
  { name: 'Edit Metadata', icon: '🏷️', category: 'Edit & Organize', desc: 'Edit title, author, keywords', slug: 'edit-pdf-metadata' },
  { name: 'Remove Blank Pages', icon: '🧹', category: 'Edit & Organize', desc: 'Auto-detect and remove blanks', slug: 'remove-blank-pages' },
  { name: 'Invert PDF', icon: '🌗', category: 'Edit & Organize', desc: 'Dark mode — invert all colors', slug: 'invert-pdf' },
  // Security
  { name: 'Encrypt PDF', icon: '🔐', category: 'Security', desc: 'Protect with strong password', slug: 'encrypt-pdf' },
  { name: 'Remove Password', icon: '🔓', category: 'Security', desc: 'Unlock password-protected PDFs', slug: 'remove-password' },
  { name: 'Privacy Scanner', icon: '🔍', category: 'Security', desc: 'Find hidden metadata and text', slug: 'privacy-scanner' },
  { name: 'Fingerprint PDF', icon: '🪪', category: 'Security', desc: 'Embed invisible tracking info', slug: 'fingerprint-pdf' },
  // Convert
  { name: 'HTML → PDF', icon: '🌐', category: 'Convert', desc: 'Webpages to document format', slug: 'html-to-pdf' },
  { name: 'Markdown → PDF', icon: 'Md', category: 'Convert', desc: 'Convert Markdown to polished PDF', slug: 'markdown-to-pdf' },
  { name: 'Excel → PDF', icon: '📊', category: 'Convert', desc: 'Spreadsheets to readable PDFs', slug: 'excel-to-pdf' },
  { name: 'CSV → PDF', icon: '📋', category: 'Convert', desc: 'Convert CSV data to PDF table', slug: 'csv-to-pdf' },
  { name: 'Text → PDF', icon: '📃', category: 'Convert', desc: 'Convert plain text to PDF', slug: 'text-to-pdf' },
  { name: 'PDF → ePub', icon: '📚', category: 'Convert', desc: 'Convert PDF to eBook format', slug: 'pdf-to-epub' },
  { name: 'PDF → Audio', icon: '🔊', category: 'Convert', desc: 'Text-to-speech from PDF', slug: 'pdf-to-audio' },
  { name: 'PDF → JSON', icon: '{}', category: 'Convert', desc: 'Extract structured data for devs', slug: 'pdf-to-json' },
  { name: 'PDF → Markdown', icon: 'Md', category: 'Convert', desc: 'Convert PDF to Markdown format', slug: 'pdf-to-markdown' },
  { name: 'PDF → Text', icon: '📝', category: 'Convert', desc: 'Extract all text from PDF', slug: 'pdf-to-text' },
  { name: 'PDFs to ZIP', icon: '🗜️', category: 'Convert', desc: 'Bundle multiple PDFs into ZIP', slug: 'pdfs-to-zip' },
  { name: 'PDF Imposition', icon: '🖨️', category: 'Convert', desc: 'N-up printing layout for PDFs', slug: 'pdf-imposition' },
  { name: 'PDF to Booklet', icon: '📓', category: 'Convert', desc: 'Arrange pages for booklet print', slug: 'pdf-to-booklet' },
  { name: 'PDF to Grayscale', icon: '◑', category: 'Convert', desc: 'Convert colour PDF to B&W', slug: 'pdf-to-grayscale' },
  { name: 'Image → PDF', icon: '🖼️', category: 'Convert', desc: 'Convert any image to PDF', slug: 'image-to-pdf' },
  { name: 'PNG → PDF', icon: '🖼️', category: 'Convert', desc: 'Convert PNG images to PDF', slug: 'png-to-pdf' },
  { name: 'PDF → PNG', icon: '🖼️', category: 'Convert', desc: 'Export PDF pages as PNG', slug: 'pdf-to-png' },
  { name: 'PDF → WebP', icon: '🖼️', category: 'Convert', desc: 'Export PDF pages as WebP', slug: 'pdf-to-webp' },
  { name: 'PDF → TIFF', icon: '🖼️', category: 'Convert', desc: 'Export PDF pages as TIFF', slug: 'pdf-to-tiff' },
  { name: 'SVG → PDF', icon: '🎨', category: 'Convert', desc: 'Convert SVG vector files to PDF', slug: 'svg-to-pdf' },
  { name: 'WebP → PDF', icon: '🖼️', category: 'Convert', desc: 'Convert WebP images to PDF', slug: 'webp-to-pdf' },
  { name: 'HEIF → PDF', icon: '📷', category: 'Convert', desc: 'Convert HEIC/HEIF photos to PDF', slug: 'heif-to-pdf' },
  { name: 'TIFF → PDF', icon: '🖼️', category: 'Convert', desc: 'Convert TIFF/TIF images to PDF', slug: 'tiff-to-pdf' },
  { name: 'PowerPoint → PDF', icon: '📊', category: 'Convert', desc: 'Convert PPTX slides to PDF', slug: 'ppt-to-pdf' },
  { name: 'PDF → PowerPoint', icon: '📊', category: 'Convert', desc: 'Convert PDF pages to PPTX slides', slug: 'pdf-to-ppt' },
  { name: 'Scan to PDF', icon: '📷', category: 'Convert', desc: 'Use your camera to scan documents to PDF', slug: 'scan-to-pdf' },
  { name: 'Extract Images', icon: '🖼️', category: 'Convert', desc: 'Extract all images from a PDF file', slug: 'extract-images-pdf' },
  // AI Tools
  { name: 'OCR PDF', icon: '👁️', category: 'AI Tools', desc: 'Make scanned text searchable', slug: 'ocr-pdf' },
  { name: 'Chat with PDF', icon: '💬', category: 'AI Tools', desc: 'Ask questions about your doc', slug: 'chat-with-pdf' },
  { name: 'AI Summarizer', icon: '🤖', category: 'AI Tools', desc: 'Get key points instantly', slug: 'ai-summarizer' },
  { name: 'Translate PDF', icon: '🌐', category: 'AI Tools', desc: 'Translate to any language with AI', slug: 'translate-pdf' },
  { name: 'Compare PDFs', icon: '⚖️', category: 'AI Tools', desc: 'Page-by-page diff of two PDFs', slug: 'compare-pdfs' },
  { name: 'Remove BG', icon: '🎨', category: 'AI Tools', desc: 'Clear image backgrounds instantly', slug: 'remove-background' },
  { name: 'Repair PDF', icon: '🔧', category: 'AI Tools', desc: 'Fix corrupted PDF files', slug: 'repair-pdf' },
  // Utilities
  { name: 'PDF Viewer', icon: '👓', category: 'Utilities', desc: 'View PDFs with search and zoom', slug: 'pdf-viewer' },
  { name: 'Word Counter', icon: '🔢', category: 'Utilities', desc: 'Count words in any PDF', slug: 'pdf-word-counter' },
  { name: 'Compress Image', icon: '🗜️', category: 'Utilities', desc: 'Reduce image file size', slug: 'compress-image' },
  { name: 'GST Invoice', icon: '🧾', category: 'Utilities', desc: 'Generate compliant invoices', slug: 'gst-invoice' },
  { name: 'POS Billing', icon: '🖨️', category: 'Utilities', desc: 'Quick thermal print receipts', slug: 'pos-billing' },
]

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Loading fonts…')
  const fonts = await loadFonts()
  console.log('Fonts ready.\n')

  let ok = 0, fail = 0
  for (const tool of TOOLS) {
    const out = join(OUT_DIR, `${tool.slug}.png`)
    try {
      const svg = await renderToolSvg(tool, fonts)
      const png = await svgToPng(svg)
      writeFileSync(out, png)
      console.log(`  ✓ ${tool.slug}.png`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${tool.slug}: ${err.message}`)
      fail++
    }
  }
  console.log(`\nDone: ${ok} generated, ${fail} failed.`)
  if (fail > 0) process.exit(1)
}

main()
