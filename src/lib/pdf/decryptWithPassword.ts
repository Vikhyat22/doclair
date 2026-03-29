import { PDFDocument } from '@cantoo/pdf-lib'

export type DecryptWithPasswordResult =
  | { ok: true;  bytes: Uint8Array; pageCount: number }
  | { ok: false; reason: 'wrong-password' | 'corrupt' }

export type DecryptProgress = {
  current: number
  total: number
}

/**
 * Opens a user-password encrypted PDF directly with the forked pdf-lib build
 * shipped in this project, then saves the unlocked result with the original
 * page content intact.
 *
 * This keeps text searchable/selectable instead of rasterizing pages into an
 * image-based PDF.
 *
 * @param file     - The encrypted PDF File object
 * @param password - The user password to attempt
 */
export async function decryptWithPassword(
  file: File,
  password: string,
  _scale = 2,
  _onProgress?: (p: DecryptProgress) => void,
): Promise<DecryptWithPasswordResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())

  try {
    const pdfDoc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      password,
      throwOnInvalidObject: false,
    })

    const resultBytes = await pdfDoc.save({ rewrite: true, useObjectStreams: false })
    return { ok: true, bytes: resultBytes, pageCount: pdfDoc.getPageCount() }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : ''
    if (message.includes('password incorrect') || message.includes('needs password')) {
      return { ok: false, reason: 'wrong-password' }
    }
    return { ok: false, reason: 'corrupt' }
  }
}
