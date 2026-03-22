import { PDFDocument } from '@cantoo/pdf-lib'

export interface FlattenOptions {
  flattenForms:       boolean
  flattenAnnotations: boolean
  stripMetadata:      boolean
  removeJavaScript:   boolean
}

export async function flattenPDF(
  file: File,
  opts: FlattenOptions,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, {
    ignoreEncryption:     true,
    throwOnInvalidObject: false,
  })

  if (opts.flattenForms) {
    const form = doc.getForm()
    try { form.flatten() } catch { /* no form fields */ }
  }

  if (opts.stripMetadata) {
    doc.setTitle('')
    doc.setAuthor('')
    doc.setSubject('')
    doc.setKeywords([])
    doc.setProducer('')
    doc.setCreator('')
  }

  if (opts.removeJavaScript) {
    try { doc.catalog.delete(doc.catalog.context.obj('Names').toString() as any) } catch { /* no JS */ }
    try { doc.catalog.delete(doc.catalog.context.obj('OpenAction').toString() as any) } catch { /* no open action */ }
  }

  return doc.save({ useObjectStreams: true })
}
