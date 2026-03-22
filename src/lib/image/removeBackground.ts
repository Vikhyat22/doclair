import { removeBackground as imglyRemoveBg } from '@imgly/background-removal'

export interface RemoveBgResult {
  blob:     Blob
  filename: string
  width:    number
  height:   number
}

export async function removeImageBackground(
  file:        File,
  onProgress?: (pct: number) => void,
): Promise<RemoveBgResult> {
  onProgress?.(5)

  // Serve model files from our own domain (public/imgly/ populated by postinstall).
  // Must be absolute — fetch() requires a full URL, not a relative path.
  // Falls back gracefully if window is not defined (SSR guard, though this
  // function is only ever called client-side).
  const publicPath = typeof window !== 'undefined'
    ? `${window.location.origin}/imgly/`
    : 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/'

  const blob = await imglyRemoveBg(file, {
    publicPath,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress: (_key: any, current: number, total: number) => {
      if (total > 0) {
        const pct = Math.round((current / total) * 85) + 10
        onProgress?.(pct)
      }
    },
    model: 'isnet_quint8',   // quantised — 44 MB vs 168 MB for full isnet
  })

  onProgress?.(95)

  // Get dimensions from the resulting blob
  const url = URL.createObjectURL(blob)
  const img = new Image()
  const { width, height } = await new Promise<{ width: number; height: number }>(resolve => {
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.src = url
  })
  URL.revokeObjectURL(url)

  onProgress?.(100)

  const baseName = file.name.replace(/\.[^.]+$/, '')
  return {
    blob,
    filename: `${baseName}-no-bg.png`,
    width,
    height,
  }
}
