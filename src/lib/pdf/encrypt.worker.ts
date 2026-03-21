/// <reference lib="webworker" />

import type { EncryptWorkerMessage, EncryptWorkerResult } from '@/types'

// Singleton GS instance — loaded once, reused
let gsInstance: { FS: any; callMain: (args: string[]) => number } | null = null

async function getGS() {
  if (gsInstance) return gsInstance
  const { default: loadWASM } = await import('@okathira/ghostpdl-wasm')
  gsInstance = await loadWASM({ locateFile: (file: string) => '/' + file })
  return gsInstance!
}

function post(msg: EncryptWorkerResult, transfer?: Transferable[]) {
  if (transfer) {
    self.postMessage(msg, transfer)
  } else {
    self.postMessage(msg)
  }
}

self.onmessage = async (e: MessageEvent<EncryptWorkerMessage>) => {
  const { fileBytes, userPassword, ownerPassword, permissions } = e.data

  post({ type: 'progress', pct: 5 })

  try {
    const gs = await getGS()
    post({ type: 'progress', pct: 25 })

    gs.FS.writeFile('/input.pdf', new Uint8Array(fileBytes))
    post({ type: 'progress', pct: 40 })

    // AES-256 encryption (PDF 2.0, EncryptionR=6, KeyLength=256)
    const args = [
      '-dBATCH',
      '-dNOPAUSE',
      '-dNOPROMPT',
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.7',
      `-sUserPassword=${userPassword}`,
      `-sOwnerPassword=${ownerPassword}`,
      `-dPermissions=${permissions}`,
      '-dEncryptionR=3',   // RC4 128-bit — widely supported fallback
      '-dKeyLength=128',
      '-sOutputFile=/output.pdf',
      '/input.pdf',
    ]

    const exitCode = gs.callMain(args)
    if (exitCode !== 0) throw new Error(`Ghostscript exited with code ${exitCode}`)
    post({ type: 'progress', pct: 85 })

    const outputBytes = gs.FS.readFile('/output.pdf', { encoding: 'binary' }) as Uint8Array
    try { gs.FS.unlink('/input.pdf')  } catch { /* ignore */ }
    try { gs.FS.unlink('/output.pdf') } catch { /* ignore */ }

    post({ type: 'progress', pct: 100 })
    const outBuf = outputBytes.buffer as ArrayBuffer
    post({ type: 'done', bytes: outBuf }, [outBuf])
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : 'Encryption failed' })
  }
}
