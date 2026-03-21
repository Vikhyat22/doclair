/**
 * PDF encryption using @cantoo/pdf-lib — a pdf-lib fork that adds native
 * AES-256 encryption support (V=5, R=6, AESV3).
 *
 * AES-256 is selected by setting the PDF header version to 1.7ext3 before
 * calling doc.encrypt(). @cantoo/pdf-lib uses the header version to pick the
 * encryption algorithm: 1.7ext3 → V5/R6/AESV3 (AES-256).
 */
import { PDFDocument } from '@cantoo/pdf-lib'

export interface EncryptOptions {
  userPassword:    string
  ownerPassword?:  string  // if omitted, defaults to a random UUID
  allowPrinting:   boolean
  allowCopying:    boolean
  allowEditing:    boolean
  allowAnnotating: boolean
}

export async function encryptPDF(
  file:    File,
  options: EncryptOptions,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()

  // Load the PDF. ignoreEncryption: false means we won't strip existing
  // encryption, and throwOnInvalidObject: false tolerates minor PDF issues.
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption:    false,
    throwOnInvalidObject: false,
  })

  // Force AES-256 (V=5 R=6 AESV3): @cantoo/pdf-lib selects the encryption
  // algorithm based on the PDF header version string.
  //   1.4 / 1.5  → V=2, RC4-128
  //   1.6 / 1.7  → V=4, AES-128 (AESV2)
  //   1.7ext3    → V=5, AES-256 (AESV3)  ← we want this
  ;(doc as any).context.header.minor = '7ext3'

  doc.encrypt({
    userPassword:  options.userPassword,
    ownerPassword: options.ownerPassword || crypto.randomUUID(),
    permissions: {
      printing:             options.allowPrinting   ? 'highResolution' : false,
      copying:              options.allowCopying,
      modifying:            options.allowEditing,
      annotating:           options.allowAnnotating,
      fillingForms:         options.allowEditing,
      contentAccessibility: true,
      documentAssembly:     false,
    },
  })

  return doc.save()
}

// Returns page count for UI display
export async function getPDFPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.getPageCount()
}
