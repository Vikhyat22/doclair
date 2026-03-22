import { PDFDocument } from '@cantoo/pdf-lib'

export async function repairPDF(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()

  // Load with maximum tolerance for corrupted files
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption:     true,
    throwOnInvalidObject: false,
    updateMetadata:       false,
  })

  // Re-save reconstructs the PDF structure cleanly
  return doc.save({
    useObjectStreams: true,
    addDefaultPage:  false,
  })
}
