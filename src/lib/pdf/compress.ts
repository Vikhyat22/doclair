import type { CompressWorkerMessage, CompressWorkerResult } from '@/types'

export async function compressPDF(
  file: File,
  quality: 'light' | 'medium' | 'heavy',
  onProgress?: (pct: number) => void
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./compress.worker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent<CompressWorkerResult>) => {
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

    worker.onerror = (e) => {
      reject(new Error(e.message || 'Worker error'))
      worker.terminate()
    }

    file.arrayBuffer().then((fileBytes) => {
      const msg: CompressWorkerMessage = { fileBytes, quality }
      worker.postMessage(msg, [fileBytes])
    }).catch(reject)
  })
}
