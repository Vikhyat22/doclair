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

  const blob = await imglyRemoveBg(file, {
    publicPath: '/',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress: (_key: any, current: number, total: number) => {
      if (total > 0) {
        const pct = Math.round((current / total) * 85) + 10
        onProgress?.(pct)
      }
    },
    model: 'isnet',
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
