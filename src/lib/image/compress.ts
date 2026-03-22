import imageCompression from 'browser-image-compression'

export interface CompressImageOptions {
  maxSizeMB:        number
  maxWidthOrHeight?: number
  quality:          number  // 0-1
}

export async function compressImage(
  file: File,
  opts: CompressImageOptions,
  onProgress?: (pct: number) => void,
): Promise<{ blob: Blob; filename: string }> {
  const compressed = await imageCompression(file, {
    maxSizeMB:        opts.maxSizeMB,
    maxWidthOrHeight: opts.maxWidthOrHeight,
    useWebWorker:     true,
    onProgress,
    fileType:         file.type as 'image/jpeg' | 'image/png' | 'image/webp',
    initialQuality:   opts.quality,
  })

  const ext      = file.name.split('.').pop() ?? 'jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '')

  return {
    blob:     compressed,
    filename: `${baseName}-compressed.${ext}`,
  }
}
