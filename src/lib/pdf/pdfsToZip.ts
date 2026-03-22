import JSZip from 'jszip'

export async function pdfFilesToZip(files: File[]): Promise<Blob> {
  const zip = new JSZip()
  for (const file of files) {
    const bytes = await file.arrayBuffer()
    zip.file(file.name, bytes)
  }
  return zip.generateAsync({
    type:        'blob',
    compression: 'DEFLATE',
  })
}
