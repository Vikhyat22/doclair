import { PDFDocument } from '@cantoo/pdf-lib'

export type PageSize    = 'fit' | 'a4' | 'letter' | 'legal' | 'a3'
export type Orientation = 'portrait' | 'landscape'

const PAGE_DIMS: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4:     [595.28, 841.89],
  letter: [612,    792],
  legal:  [612,    1008],
  a3:     [841.89, 1190.55],
}

export interface ImageItem {
  id:       string
  file:     File
  name:     string
  size:     number
  thumbUrl: string          // caller generates + revokes on reset
  rotation: 0 | 90 | 180 | 270
}

function isHeicLike(file: File, mime: string, nameLc: string) {
  return (
    mime === 'image/heic'
    || mime === 'image/heif'
    || nameLc.endsWith('.heic')
    || nameLc.endsWith('.heif')
  )
}

async function decodeHeicToJpegBlob(bytes: ArrayBuffer, mime: string) {
  const heic2any = (await import('heic2any')).default
  return await heic2any({
    blob: new Blob([bytes], { type: mime || 'image/heic' }),
    toType: 'image/jpeg',
    quality: 0.92,
  }) as Blob
}

export async function imagesToPDF(
  items:       ImageItem[],
  pageSize:    PageSize,
  orientation: Orientation
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  for (const item of items) {
    const bytes    = await item.file.arrayBuffer()
    const mime     = item.file.type.toLowerCase()
    const nameLc   = item.file.name.toLowerCase()

    let embedded

    if (mime === 'image/jpeg' || mime === 'image/jpg') {
      if (item.rotation === 0) {
        embedded = await doc.embedJpg(bytes)
      } else {
        embedded = await doc.embedPng(
          await rotateImageBytes(item.file, item.rotation)
        )
      }
    } else if (mime === 'image/png') {
      if (item.rotation === 0) {
        embedded = await doc.embedPng(bytes)
      } else {
        embedded = await doc.embedPng(
          await rotateImageBytes(item.file, item.rotation)
        )
      }
    } else if (isHeicLike(item.file, mime, nameLc)) {
      // Convert HEIC → JPEG via heic2any (iPhone photos)
      const converted = await decodeHeicToJpegBlob(bytes, mime)
      const jpgBytes = await converted.arrayBuffer()
      if (item.rotation === 0) {
        embedded = await doc.embedJpg(jpgBytes)
      } else {
        embedded = await doc.embedPng(
          await rotateImageBytesFromBuffer(jpgBytes, item.rotation)
        )
      }
    } else {
      // GIF, WebP, BMP, TIFF, SVG → canvas decode to PNG
      embedded = await doc.embedPng(
        await decodeViaCanvas(item.file, bytes, item.rotation)
      )
    }

    const imgW = embedded.width
    const imgH = embedded.height

    let pageW: number
    let pageH: number

    if (pageSize === 'fit') {
      pageW = imgW
      pageH = imgH
    } else {
      const [dw, dh] = PAGE_DIMS[pageSize]
      if (orientation === 'landscape') {
        pageW = dh; pageH = dw
      } else {
        pageW = dw; pageH = dh
      }
    }

    const page  = doc.addPage([pageW, pageH])
    const scale = Math.min(pageW / imgW, pageH / imgH)
    const drawW = imgW * scale
    const drawH = imgH * scale
    const x     = (pageW - drawW) / 2
    const y     = (pageH - drawH) / 2
    page.drawImage(embedded, { x, y, width: drawW, height: drawH })
  }

  return doc.save()
}

// ── Canvas helpers ─────────────────────────────────────────────────────

async function rotateImageBytes(file: File, rotation: number): Promise<ArrayBuffer> {
  const url    = URL.createObjectURL(file)
  const result = await rotateUrl(url, rotation)
  URL.revokeObjectURL(url)
  return result
}

async function rotateImageBytesFromBuffer(bytes: ArrayBuffer, rotation: number): Promise<ArrayBuffer> {
  const blob = new Blob([bytes], { type: 'image/jpeg' })
  const url  = URL.createObjectURL(blob)
  const result = await rotateUrl(url, rotation)
  URL.revokeObjectURL(url)
  return result
}

async function rotateUrl(url: string, rotation: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const swap    = rotation === 90 || rotation === 270
      const canvas  = document.createElement('canvas')
      canvas.width  = swap ? img.naturalHeight : img.naturalWidth
      canvas.height = swap ? img.naturalWidth  : img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      canvas.toBlob(b => {
        canvas.width = 0; canvas.height = 0
        if (!b) return reject(new Error('toBlob failed'))
        b.arrayBuffer().then(resolve).catch(reject)
      }, 'image/png')
    }
    img.onerror = reject
    img.src = url
  })
}

async function decodeViaCanvas(file: File, bytes: ArrayBuffer, rotation: number): Promise<ArrayBuffer> {
  const blob = new Blob([bytes], { type: file.type })
  const url  = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const swap    = rotation === 90 || rotation === 270
      const canvas  = document.createElement('canvas')
      canvas.width  = swap ? img.naturalHeight : img.naturalWidth
      canvas.height = swap ? img.naturalWidth  : img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      canvas.toBlob(b => {
        URL.revokeObjectURL(url)
        canvas.width = 0; canvas.height = 0
        if (!b) return reject(new Error('toBlob failed'))
        b.arrayBuffer().then(resolve).catch(reject)
      }, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

/** Generate a thumbnail object URL (caller must revoke on cleanup) */
export function generateThumb(file: File, maxSize = 180): Promise<string> {
  return (async () => {
    const bytes = await file.arrayBuffer()
    const mime = file.type.toLowerCase()
    const nameLc = file.name.toLowerCase()

    const sourceBlob = isHeicLike(file, mime, nameLc)
      ? await decodeHeicToJpegBlob(bytes, mime)
      : new Blob([bytes], { type: file.type || 'application/octet-stream' })

    return await new Promise<string>((resolve, reject) => {
      const url = URL.createObjectURL(sourceBlob)
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.floor(img.width * scale))
        canvas.height = Math.max(1, Math.floor(img.height * scale))
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        canvas.toBlob(b => {
          canvas.width = 0
          canvas.height = 0
          if (b) {
            resolve(URL.createObjectURL(b))
          } else {
            reject(new Error('thumb failed'))
          }
        }, 'image/jpeg', 0.8)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('load failed'))
      }
      img.src = url
    })
  })()
}
