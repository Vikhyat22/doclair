import { PDFDocument } from '@cantoo/pdf-lib'

export interface PDFMetadata {
  title:        string
  author:       string
  subject:      string
  keywords:     string
  creator:      string
  producer:     string
  creationDate: string
  modDate:      string
}

export async function readMetadata(file: File): Promise<PDFMetadata> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
  return {
    title:        doc.getTitle()             ?? '',
    author:       doc.getAuthor()            ?? '',
    subject:      doc.getSubject()           ?? '',
    keywords:     doc.getKeywords()          ?? '',
    creator:      doc.getCreator()           ?? '',
    producer:     doc.getProducer()          ?? '',
    creationDate: doc.getCreationDate()?.toISOString().slice(0,16) ?? '',
    modDate:      doc.getModificationDate()?.toISOString().slice(0,16) ?? '',
  }
}

export async function writeMetadata(file: File, meta: PDFMetadata): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
  if (meta.title)        doc.setTitle(meta.title)
  if (meta.author)       doc.setAuthor(meta.author)
  if (meta.subject)      doc.setSubject(meta.subject)
  if (meta.keywords)     doc.setKeywords([meta.keywords])
  if (meta.creator)      doc.setCreator(meta.creator)
  if (meta.producer)     doc.setProducer(meta.producer)
  if (meta.creationDate) doc.setCreationDate(new Date(meta.creationDate))
  if (meta.modDate)      doc.setModificationDate(new Date(meta.modDate))
  return doc.save()
}

export async function deleteAllMetadata(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { throwOnInvalidObject: false })
  doc.setTitle(''); doc.setAuthor(''); doc.setSubject(''); doc.setKeywords([])
  doc.setCreator(''); doc.setProducer('')
  return doc.save()
}
