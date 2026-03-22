#!/usr/bin/env node
/**
 * Downloads @imgly/background-removal model files from the official staticimgly CDN
 * into public/imgly/ so they can be served from Doclair's own domain.
 *
 * Files downloaded:
 *   - resources.json            (manifest)
 *   - ort-wasm-simd-threaded.wasm + .mjs   (ONNX Runtime WASM)
 *   - isnet_quint8 model chunks            (~44 MB, quantised for speed)
 *
 * Run: node scripts/download-imgly-models.mjs
 * Runs automatically via postinstall / prebuild.
 */

import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const OUT_DIR    = join(__dirname, '..', 'public', 'imgly')
const VERSION    = '1.7.0'
const BASE_URL   = `https://staticimgly.com/@imgly/background-removal-data/${VERSION}/dist`
const MODELS_TO_INCLUDE = ['isnet_quint8']    // quantised — best speed/quality balance
const WASM_KEYS  = [
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
]

async function fetchBuf(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function alreadyDownloaded(filePath, expectedSize) {
  if (!existsSync(filePath)) return false
  if (expectedSize && statSync(filePath).size !== expectedSize) return false
  return true
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  // 1 — Download resources.json
  console.log('Fetching resources.json…')
  const resourcesUrl = `${BASE_URL}/resources.json`
  const resourcesBuf = await fetchBuf(resourcesUrl)
  const resources    = JSON.parse(resourcesBuf.toString())
  writeFileSync(join(OUT_DIR, 'resources.json'), resourcesBuf)
  console.log(`  ✓ resources.json (${Object.keys(resources).length} entries)`)

  // 2 — Collect chunks to download
  const chunksToFetch = []

  for (const [key, entry] of Object.entries(resources)) {
    const isWasm  = WASM_KEYS.includes(key)
    const isModel = MODELS_TO_INCLUDE.some(m => key.includes(m))
    if (!isWasm && !isModel) continue

    for (const chunk of entry.chunks ?? []) {
      chunksToFetch.push({ name: chunk.name, key })
    }
  }

  console.log(`Downloading ${chunksToFetch.length} chunks…`)

  let done = 0
  for (const { name, key } of chunksToFetch) {
    const outPath = join(OUT_DIR, name)
    if (existsSync(outPath)) {
      done++
      continue   // already cached
    }
    const url = `${BASE_URL}/${name}`
    try {
      const buf = await fetchBuf(url)
      writeFileSync(outPath, buf)
      done++
      process.stdout.write(`\r  ${done}/${chunksToFetch.length} chunks (${key.split('/').pop()})   `)
    } catch (err) {
      console.error(`\n  ✗ Failed to fetch ${name}: ${err.message}`)
    }
  }

  console.log(`\n  ✓ All chunks downloaded to public/imgly/`)
  console.log(`Done — ${done} files in ${OUT_DIR}`)
}

main().catch(err => {
  console.error('download-imgly-models failed:', err.message)
  // Non-fatal — allow build to continue; fall back to CDN at runtime
  process.exit(0)
})
