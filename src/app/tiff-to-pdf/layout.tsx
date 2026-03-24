import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'TIFF to PDF',
  'tiff-to-pdf',
  'Convert TIFF and TIF images to PDF online free. Multi-page TIFF supported. No upload, no watermark, files stay in your browser.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
