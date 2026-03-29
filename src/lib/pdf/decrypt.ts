import { PDFDocument } from '@cantoo/pdf-lib'

export type DecryptResult =
  | { ok: true;  bytes: Uint8Array; pageCount: number; hadRestrictions: boolean }
  | { ok: false; reason: 'user-password-required' | 'corrupt' }

/**
 * PDF.js can open AES/RC4 user-password PDFs only when given the correct password.
 * pdf-lib cannot decrypt those streams — it only strips encryption metadata via
 * ignoreEncryption, which produces broken files for true "open password" PDFs.
 *
 * This probes with an empty password: if PDF.js raises PasswordException, the
 * document requires a password to open (typical bank / statement PDFs).
 */
export async function pdfRequiresPasswordToOpen(bytes: Uint8Array): Promise<boolean> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  try {
    await pdfjsLib.getDocument({
      data: bytes,
      password: '',
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise
    return false
  } catch (err: unknown) {
    if (
      err !== null &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name: string }).name === 'PasswordException'
    ) {
      return true
    }
    return false
  }
}

/**
 * Removes owner-password / permissions restrictions from a PDF.
 *
 * If the file requires a password to open (user password), returns
 * user-password-required so the UI can collect the password and use
 * decryptWithPassword (PDF.js render → pdf-lib) instead.
 */
export async function decryptPDF(file: File): Promise<DecryptResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const loadOptions = {
    throwOnInvalidObject: false,
  } as const

  if (await pdfRequiresPasswordToOpen(bytes)) {
    return { ok: false, reason: 'user-password-required' }
  }

  let doc: PDFDocument
  let hadRestrictions = false

  try {
    doc = await PDFDocument.load(bytes, loadOptions)
  } catch {
    try {
      doc = await PDFDocument.load(bytes, { ...loadOptions, ignoreEncryption: true })
      hadRestrictions = true
    } catch {
      return { ok: false, reason: 'corrupt' }
    }
  }

  const saved = await doc.save({ rewrite: true, useObjectStreams: false })
  return { ok: true, bytes: saved, pageCount: doc.getPageCount(), hadRestrictions }
}

export async function isEncrypted(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  try {
    await PDFDocument.load(bytes)
    return false
  } catch {
    return true
  }
}

/**
 * One buffer read: classify the file for the unlock UI.
 *
 * PDF terminology (easy to confuse):
 * - **Document-open / “user” password** — file will not open until this is
 *   entered. We set `needsDocumentOpenPassword` → user must type the password.
 * - **Permissions-only / “owner” restrictions** — file often opens without a
 *   password, but printing or copying may be locked. PDF.js opens with an empty
 *   password; pdf-lib may need `ignoreEncryption`. No password field.
 */
export async function analyzePdfForUnlock(file: File): Promise<{
  encrypted: boolean
  /** True = encrypted so it only opens with the real password (e.g. bank PDFs). */
  needsDocumentOpenPassword: boolean
}> {
  const bytes = new Uint8Array(await file.arrayBuffer())

  if (await pdfRequiresPasswordToOpen(bytes)) {
    return { encrypted: true, needsDocumentOpenPassword: true }
  }

  try {
    await PDFDocument.load(bytes)
    return { encrypted: false, needsDocumentOpenPassword: false }
  } catch {
    return { encrypted: true, needsDocumentOpenPassword: false }
  }
}
