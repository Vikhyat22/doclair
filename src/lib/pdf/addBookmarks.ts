import { PDFDocument, PDFName, PDFArray, PDFNumber, PDFString } from '@cantoo/pdf-lib'

export interface Bookmark {
  id:    string
  title: string
  page:  number   // 1-based
  level: 0 | 1 | 2 | 3
}

export async function addBookmarksToPDF(
  file: File,
  bookmarks: Bookmark[],
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, {
    throwOnInvalidObject: false,
  })
  const pages = doc.getPages()
  const total = pages.length
  const context = doc.context

  const validBookmarks = bookmarks.filter(b => b.page >= 1 && b.page <= total)

  if (validBookmarks.length === 0) {
    return doc.save()
  }

  // Create outline items
  const outlineItems = validBookmarks.map(b => {
    const page = pages[b.page - 1]
    const destArray = PDFArray.withContext(context)
    destArray.push(page.ref)
    destArray.push(PDFName.of('XYZ'))
    destArray.push(PDFNumber.of(0))
    destArray.push(PDFNumber.of(page.getSize().height))
    destArray.push(PDFNumber.of(0))
    return context.obj({
      Title: PDFString.of(b.title),
      Dest:  destArray,
    })
  })

  const refs = outlineItems.map(item => context.register(item))

  // Build outline root
  const outlineRoot = context.obj({
    Type:  PDFName.of('Outlines'),
    First: refs[0],
    Last:  refs[refs.length - 1],
    Count: PDFNumber.of(refs.length),
  })
  const outlineRef = context.register(outlineRoot)

  // Link each item
  refs.forEach((ref, i) => {
    const item = outlineItems[i]
    item.set(PDFName.of('Parent'), outlineRef)
    if (i > 0)               item.set(PDFName.of('Prev'), refs[i - 1])
    if (i < refs.length - 1) item.set(PDFName.of('Next'), refs[i + 1])
  })

  // Attach to document catalog
  doc.catalog.set(PDFName.of('Outlines'), outlineRef)
  doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'))

  return doc.save()
}
