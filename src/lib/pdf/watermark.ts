import { PDFDocument, StandardFonts, rgb, degrees } from '@cantoo/pdf-lib'

export type WatermarkType     = 'text' | 'image'
export type WatermarkPosition =
  | 'center'
  | 'top-left'    | 'top-center'    | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface WatermarkOptions {
  type:       WatermarkType
  text?:      string
  imageFile?: File
  opacity:    number         // 0.0 – 1.0
  rotation:   number         // degrees, 0–360
  position:   WatermarkPosition
  fontSize?:  number         // text only, default 48
  color?:     string         // text only, hex default '#000000'
  scale?:     number         // image only, 0.1–2.0, default 0.3
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

function getPosition(
  position: WatermarkPosition,
  pageW:    number,
  pageH:    number,
  elemW:    number,
  elemH:    number,
): { x: number; y: number } {
  const margin = 30
  switch (position) {
    case 'top-left':      return { x: margin,               y: pageH - elemH - margin }
    case 'top-center':    return { x: (pageW - elemW) / 2,  y: pageH - elemH - margin }
    case 'top-right':     return { x: pageW - elemW - margin, y: pageH - elemH - margin }
    case 'bottom-left':   return { x: margin,               y: margin }
    case 'bottom-center': return { x: (pageW - elemW) / 2,  y: margin }
    case 'bottom-right':  return { x: pageW - elemW - margin, y: margin }
    default:              return { x: (pageW - elemW) / 2,  y: (pageH - elemH) / 2 }
  }
}

export async function addWatermark(
  file:        File,
  opts:        WatermarkOptions,
  onProgress?: (n: number, total: number) => void,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes)
  const pages = doc.getPages()
  const total = pages.length

  let font: Awaited<ReturnType<typeof doc.embedFont>> | undefined
  if (opts.type === 'text') {
    font = await doc.embedFont(StandardFonts.HelveticaBold)
  }

  let embeddedImg: Awaited<ReturnType<typeof doc.embedPng>> | Awaited<ReturnType<typeof doc.embedJpg>> | undefined
  if (opts.type === 'image' && opts.imageFile) {
    const imgBytes = await opts.imageFile.arrayBuffer()
    const mime     = opts.imageFile.type.toLowerCase()
    if (mime === 'image/jpeg' || mime === 'image/jpg') {
      embeddedImg = await doc.embedJpg(imgBytes)
    } else {
      embeddedImg = await doc.embedPng(imgBytes)
    }
  }

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total)
    const page             = pages[i]
    const { width, height } = page.getSize()

    if (opts.type === 'text' && opts.text && font) {
      const fontSize  = opts.fontSize ?? 48
      const textWidth = font.widthOfTextAtSize(opts.text, fontSize)
      const [r, g, b] = hexToRgb(opts.color ?? '#000000')
      const { x, y }  = getPosition(opts.position, width, height, textWidth, fontSize)

      page.drawText(opts.text, {
        x, y,
        size:    fontSize,
        font,
        color:   rgb(r, g, b),
        opacity: opts.opacity,
        rotate:  degrees(opts.rotation),
      })
    }

    if (opts.type === 'image' && embeddedImg) {
      const scale  = opts.scale ?? 0.3
      const imgW   = embeddedImg.width  * scale
      const imgH   = embeddedImg.height * scale
      const { x, y } = getPosition(opts.position, width, height, imgW, imgH)

      page.drawImage(embeddedImg, {
        x, y,
        width:   imgW,
        height:  imgH,
        opacity: opts.opacity,
        rotate:  degrees(opts.rotation),
      })
    }

    onProgress?.(i + 1, total)
  }

  return doc.save()
}
