import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Compress PDF',
  'compress-pdf',
  'Reduce PDF file size online for free. No upload, no watermark. Choose light, medium or heavy compression. Files stay in your browser.'
)

export default function CompressPDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
