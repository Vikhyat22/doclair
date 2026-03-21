import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'JPG to PDF',
  'jpg-to-pdf',
  'Convert JPG, PNG, HEIC, WebP and other images to PDF free. Drag to set order. Rotate per image. A4, Letter, Legal, A3. No upload, no watermark.'
)

export default function JpgToPDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
