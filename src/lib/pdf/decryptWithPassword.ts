import { PDFDocument } from '@cantoo/pdf-lib'

export type DecryptWithPasswordResult =
  | { ok: true;  bytes: Uint8Array; pageCount: number }
  | { ok: false; reason: 'wrong-password' | 'corrupt' }

export type DecryptProgress = {
  current: number
  total: number
}

/**
 * Opens a user-password encrypted PDF using PDF.js (which implements the full
 * AES-128 / AES-256 / RC4 decryption stack), renders every page to an
 * off-screen canvas, then assembles the canvases into a new pdf-lib document.
 *
 * The output is an image-based PDF — text is not selectable, but the file is
 * fully unlocked and printable. This is the only viable browser-only path for
 * user-password encrypted PDFs without a multi-MB WASM dependency.
 *
 * @param file     - The encrypted PDF File object
 * @param password - The user password to attempt
 * @param scale    - Render scale relative to 72 dpi (2 = 144 dpi, default)
 * @param onProgress - Optional callback invoked after each page renders
 */
export async function decryptWithPassword(
  file: File,
  password: string,
  scale = 2,
  onProgress?: (p: DecryptProgress) => void,
): Promise<DecryptWithPasswordResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())

  // ── Load via PDF.js ──────────────────────────────────────────────────────
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  let pdfDoc: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>
  try {
    pdfDoc = await pdfjsLib.getDocument({
      data: bytes,
      password,
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise
  } catch (err: unknown) {
    // PDF.js throws a PasswordException for both NEED_PASSWORD and
    // INCORRECT_PASSWORD. Any other error means the file is corrupt.
    if (
      err !== null &&
      typeof err === 'object' &&
      'name' in err &&
      err.name === 'PasswordException'
    ) {
      return { ok: false, reason: 'wrong-password' }
    }
    return { ok: false, reason: 'corrupt' }
  }

  const pageCount = pdfDoc.numPages

  // ── Render pages and assemble new PDF ────────────────────────────────────
  const newPdf = await PDFDocument.create()

  for (let i = 1; i <= pageCount; i++) {
    const pdfPage = await pdfDoc.getPage(i)
    const viewport = pdfPage.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (pdfPage.render as any)({ canvasContext: ctx, viewport }).promise

    // PNG → Uint8Array
    const dataUrl  = canvas.toDataURL('image/png')
    const b64      = dataUrl.slice(dataUrl.indexOf(',') + 1)
    const imgBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))

    const embeddedImg = await newPdf.embedPng(imgBytes)
    const newPage     = newPdf.addPage([viewport.width, viewport.height])
    newPage.drawImage(embeddedImg, { x: 0, y: 0, width: viewport.width, height: viewport.height })

    pdfPage.cleanup()
    onProgress?.({ current: i, total: pageCount })
  }

  const resultBytes = await newPdf.save()
  return { ok: true, bytes: resultBytes, pageCount }
}
