import { PDFDocument, PDFName, PDFRawStream, PDFNumber, PDFRef } from 'pdf-lib'

const QUALITY_MAP = {
  light:  0.85,
  medium: 0.65,
  heavy:  0.40,
}

export async function compressPDF(
  file: File,
  quality: 'light' | 'medium' | 'heavy',
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  const originalBytes = await file.arrayBuffer()
  onProgress?.(10)

  // ── LAYER 1: Load ────────────────────────────────────────────────
  const doc = await PDFDocument.load(originalBytes, {
    ignoreEncryption: false,
    throwOnInvalidObject: false,
  })
  onProgress?.(20)

  // ── LAYER 2: Strip bloat from catalog ────────────────────────────
  const catalog = doc.catalog
  try { catalog.delete(PDFName.of('Thumbnails')) } catch { /* ignore */ }
  try { catalog.delete(PDFName.of('Names'))      } catch { /* ignore */ }
  if (quality !== 'light') {
    try { catalog.delete(PDFName.of('AcroForm')) } catch { /* ignore */ }
  }
  onProgress?.(30)

  // ── LAYER 3: Recompress embedded JPEG images ─────────────────────
  // Only DCTDecode (JPEG) XObject images are targeted — text, fonts,
  // vectors and non-JPEG images are completely untouched.
  const jpegQuality = QUALITY_MAP[quality]

  try {
    // Collect all image XObjects that are JPEG and large enough to matter
    const imageRefs: Array<[PDFRef, PDFRawStream]> = []

    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFRawStream)) continue

      const subtype = obj.dict.lookupMaybe(PDFName.of('Subtype'), PDFName)
      if (subtype?.asString() !== '/Image') continue

      const filter = obj.dict.lookupMaybe(PDFName.of('Filter'), PDFName)
      if (filter?.asString() !== '/DCTDecode') continue

      const w = obj.dict.lookupMaybe(PDFName.of('Width'),  PDFNumber)
      const h = obj.dict.lookupMaybe(PDFName.of('Height'), PDFNumber)
      if (!w || !h || w.asNumber() < 50 || h.asNumber() < 50) continue

      imageRefs.push([ref as PDFRef, obj])
    }

    const total = imageRefs.length

    for (let idx = 0; idx < total; idx++) {
      const [ref, xObj] = imageRefs[idx]
      try {
        // For DCTDecode streams the raw contents ARE valid JPEG bytes
        const jpegBytes = xObj.contents

        // Decode JPEG via browser Image element
        const srcBlob = new Blob([jpegBytes as BlobPart], { type: 'image/jpeg' })
        const srcUrl  = URL.createObjectURL(srcBlob)

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload  = () => resolve(el)
          el.onerror = () => reject(new Error('img decode failed'))
          el.src     = srcUrl
        })
        URL.revokeObjectURL(srcUrl)

        // Re-encode at target quality
        const canvas = document.createElement('canvas')
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d')!.drawImage(img, 0, 0)

        const newBlob  = await new Promise<Blob>(resolve =>
          canvas.toBlob(b => resolve(b!), 'image/jpeg', jpegQuality)
        )
        const newBytes = new Uint8Array(await newBlob.arrayBuffer())

        // Only replace if we actually made it smaller
        if (newBytes.length < jpegBytes.length) {
          const newDict = xObj.dict.clone(doc.context)
          newDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'))
          newDict.set(PDFName.of('Length'), doc.context.obj(newBytes.length))
          doc.context.assign(ref, PDFRawStream.of(newDict, newBytes))
        }
      } catch {
        // One image failed — skip it, continue with the rest
      }

      onProgress?.(30 + Math.round(((idx + 1) / Math.max(total, 1)) * 55))
    }

    // If no images found, jump progress to 85 so the bar moves
    if (total === 0) onProgress?.(85)
  } catch {
    // Image layer failed entirely — fall back to structure compression only
    onProgress?.(85)
  }

  // ── LAYER 4: Re-save with structural compression ─────────────────
  onProgress?.(88)
  const compressed = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  })
  onProgress?.(100)

  return compressed
}
