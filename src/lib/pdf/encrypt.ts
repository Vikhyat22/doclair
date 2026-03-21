import { PDFDocument } from 'pdf-lib'
import type { EncryptWorkerMessage, EncryptWorkerResult } from '@/types'

export interface EncryptOptions {
  userPassword:    string
  ownerPassword?:  string  // if omitted, uses a random UUID
  allowPrinting:   boolean
  allowCopying:    boolean
  allowEditing:    boolean
  allowAnnotating: boolean
}

/**
 * Computes the GhostScript -dPermissions integer from boolean options.
 *
 * PDF permission bits (0-indexed in a 32-bit int):
 *  0, 1   → must be 0 (reserved)
 *  2      → print (lower quality)
 *  3      → modify document
 *  4      → copy / extract content
 *  5      → add/modify annotations
 *  6, 7   → must be 1 for R3+ (GS sets these)
 *  8      → fill in form fields
 *  9      → extract content for accessibility
 *  10     → document assembly
 *  11     → print high quality
 *  12-31  → must be 1
 *
 * Base "deny all optional permissions" = -3904 (bits 6,7 + 12-31 set; all permission bits 0)
 */
function buildPermissions(opts: EncryptOptions): number {
  let perm = -3904  // deny-all base
  if (opts.allowPrinting)   perm += 4 + 2048    // bits 2 + 11
  if (opts.allowEditing)    perm += 8 + 256 + 1024  // bits 3 + 8 + 10
  if (opts.allowCopying)    perm += 16 + 512    // bits 4 + 9
  if (opts.allowAnnotating) perm += 32          // bit 5
  return perm
}

export async function encryptPDF(
  file:        File,
  options:     EncryptOptions,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const ownerPassword = options.ownerPassword ?? crypto.randomUUID()
  const permissions   = buildPermissions(options)

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./encrypt.worker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent<EncryptWorkerResult>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        onProgress?.(msg.pct)
      } else if (msg.type === 'done') {
        resolve(new Uint8Array(msg.bytes))
        worker.terminate()
      } else if (msg.type === 'error') {
        reject(new Error(msg.message))
        worker.terminate()
      }
    }

    worker.onerror = (err) => {
      reject(new Error(err.message))
      worker.terminate()
    }

    file.arrayBuffer().then(fileBytes => {
      const msg: EncryptWorkerMessage = {
        fileBytes,
        userPassword:  options.userPassword,
        ownerPassword,
        permissions,
      }
      worker.postMessage(msg, [fileBytes])
    }).catch(reject)
  })
}

// Returns page count for UI display
export async function getPDFPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.getPageCount()
}
