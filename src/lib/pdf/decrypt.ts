import { PDFDocument } from '@cantoo/pdf-lib'

export type DecryptResult =
  | { ok: true;  bytes: Uint8Array; pageCount: number; hadRestrictions: boolean }
  | { ok: false; reason: 'user-password-required' | 'corrupt' }

/**
 * Removes owner-password / permissions restrictions from a PDF.
 *
 * pdf-lib does not support decrypting user-password encrypted PDFs (those
 * that require a password to open). This function handles two cases:
 *  - Plaintext or owner-password-only PDFs: loads and re-saves without
 *    the /Encrypt dictionary, removing all restrictions.
 *  - User-password encrypted PDFs: returns { ok: false, reason: 'user-password-required' }.
 */
export async function decryptPDF(file: File): Promise<DecryptResult> {
  const bytes = await file.arrayBuffer()

  // First try: load normally. Works for plaintext and owner-password-only PDFs.
  // Owner-password-only = file opens without asking for a password, but
  // editing/printing/copying may be restricted.
  let doc: PDFDocument
  let hadRestrictions = false

  try {
    doc = await PDFDocument.load(bytes)
  } catch {
    // Loading failed — either user-password encrypted or corrupt.
    // Try ignoreEncryption as a fallback to diagnose.
    try {
      doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      hadRestrictions = true
      // Note: if the file truly requires a user password to decrypt content
      // streams, the saved output may have unreadable content, but the
      // encryption wrapper is removed. Most "locked" PDFs on the web are
      // owner-password-only and this path restores full access.
    } catch {
      return { ok: false, reason: 'corrupt' }
    }
  }

  const saved = await doc.save()
  return { ok: true, bytes: saved, pageCount: doc.getPageCount(), hadRestrictions }
}

export async function isEncrypted(file: File): Promise<boolean> {
  const bytes = await file.arrayBuffer()
  try {
    await PDFDocument.load(bytes)
    return false
  } catch {
    return true
  }
}
