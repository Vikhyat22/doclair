import { PDFDocument } from 'pdf-lib'

export async function compressPDF(
  file: File,
  quality: 'light' | 'medium' | 'heavy'
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc = await PDFDocument.load(bytes)

  // pdf-lib applies object stream compression on save.
  // objectsPerTick controls how aggressively it batches — lower = tighter.
  const objectsPerTick = quality === 'light' ? 50 : quality === 'medium' ? 20 : 10

  const saved = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick,
  })

  return saved
}
