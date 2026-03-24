/// <reference lib="webworker" />

import type { CompressWorkerMessage, CompressWorkerResult } from '@/types'

const GS_SETTINGS = {
  light: {
    pdfSettings: '/printer',
    colorImageResolution: 300,
    grayImageResolution:  300,
    monoImageResolution:  300,
    jpegQuality: 90,
  },
  medium: {
    pdfSettings: '/ebook',
    colorImageResolution: 150,
    grayImageResolution:  150,
    monoImageResolution:  150,
    jpegQuality: 72,
  },
  heavy: {
    pdfSettings: '/screen',
    colorImageResolution: 72,
    grayImageResolution:  72,
    monoImageResolution:  72,
    jpegQuality: 50,
  },
}

type Settings = typeof GS_SETTINGS['light']

function buildGsArgs(s: Settings, input: string, output: string): string[] {
  return [
    '-dBATCH',
    '-dNOPAUSE',
    '-dNOPROMPT',
    '-dSAFER',
    '-sDEVICE=pdfwrite',
    `-dPDFSETTINGS=${s.pdfSettings}`,
    '-dCompatibilityLevel=1.4',
    // Image downsampling
    '-dDownsampleColorImages=true',
    '-dDownsampleGrayImages=true',
    '-dDownsampleMonoImages=true',
    `-dColorImageResolution=${s.colorImageResolution}`,
    `-dGrayImageResolution=${s.grayImageResolution}`,
    `-dMonoImageResolution=${s.monoImageResolution}`,
    '-dColorImageDownsampleType=/Bicubic',
    '-dGrayImageDownsampleType=/Bicubic',
    // JPEG encoding
    '-dEncodeColorImages=true',
    '-dEncodeGrayImages=true',
    '-dAutoFilterColorImages=false',
    '-dAutoFilterGrayImages=false',
    '-dColorImageFilter=/DCTEncode',
    '-dGrayImageFilter=/DCTEncode',
    `-dJPEGQ=${s.jpegQuality}`,
    // Font optimisation — subset fonts to used chars only (major reduction for text PDFs)
    '-dSubsetFonts=true',
    '-dCompressFonts=true',
    '-dEmbedAllFonts=true',
    // Deduplication
    '-dDetectDuplicateImages=true',
    `-sOutputFile=${output}`,
    input,
  ]
}

// Singleton GS instance — loaded once, reused across compressions
let gsInstance: { FS: any; callMain: (args: string[]) => number } | null = null

async function getGS() {
  if (gsInstance) return gsInstance
  // /gs.wasm is served from public/ — locateFile overrides the WASM URL so it
  // always resolves correctly regardless of where the worker bundle is served from
  const { default: loadWASM } = await import('@okathira/ghostpdl-wasm')
  gsInstance = await loadWASM({ locateFile: (file: string) => '/' + file })
  return gsInstance!
}

function post(msg: CompressWorkerResult, transfer?: Transferable[]) {
  if (transfer) {
    self.postMessage(msg, transfer)
  } else {
    self.postMessage(msg)
  }
}

self.onmessage = async (e: MessageEvent<CompressWorkerMessage>) => {
  const { fileBytes, quality } = e.data

  post({ type: 'progress', pct: 5 })

  // ── ATTEMPT 1: Ghostscript WASM ──────────────────────────────────
  try {
    const gs = await getGS()
    post({ type: 'progress', pct: 20 })

    const settings  = GS_SETTINGS[quality]
    const inputFile  = '/input.pdf'
    const outputFile = '/output.pdf'

    gs.FS.writeFile(inputFile, new Uint8Array(fileBytes))
    post({ type: 'progress', pct: 40 })

    const gsArgs = buildGsArgs(settings, inputFile, outputFile)
    post({ type: 'progress', pct: 50 })

    const exitCode = gs.callMain(gsArgs)
    if (exitCode !== 0) throw new Error(`Ghostscript exited with code ${exitCode}`)
    post({ type: 'progress', pct: 85 })

    const outputBytes = gs.FS.readFile(outputFile, { encoding: 'binary' }) as Uint8Array
    try { gs.FS.unlink(inputFile)  } catch { /* ignore */ }
    try { gs.FS.unlink(outputFile) } catch { /* ignore */ }

    post({ type: 'progress', pct: 100 })
    // Transfer the buffer — zero-copy, fast
    const outBuf = outputBytes.buffer as ArrayBuffer
    post({ type: 'done', bytes: outBuf }, [outBuf])
    return
  } catch (gsErr) {
    console.warn('[compress.worker] Ghostscript failed, falling back to pdf-lib:', gsErr)
  }

  // ── FALLBACK: pdf-lib structural compression ─────────────────────
  try {
    post({ type: 'progress', pct: 70 })
    const { PDFDocument } = await import('@cantoo/pdf-lib')
    const doc = await PDFDocument.load(fileBytes, { throwOnInvalidObject: false })
    const saved = await doc.save({ useObjectStreams: true, addDefaultPage: false })
    post({ type: 'progress', pct: 100 })
    const savedBuf = saved.buffer as ArrayBuffer
    post({ type: 'done', bytes: savedBuf }, [savedBuf])
  } catch (fallbackErr) {
    post({
      type: 'error',
      message: fallbackErr instanceof Error ? fallbackErr.message : 'Compression failed',
    })
  }
}
