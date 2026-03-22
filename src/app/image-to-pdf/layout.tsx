import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Image to PDF',
  'image-to-pdf',
  'Convert any image to PDF free. JPG, PNG, WebP, HEIC, SVG, GIF, BMP, TIFF. No upload, instant.'
)

export default function ImageToPdfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
