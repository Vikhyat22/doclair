import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Split PDF',
  'split-pdf',
  'Split PDF into individual pages or extract custom page ranges free. Visual page thumbnails. No upload, no watermark. Works offline.'
)

export default function SplitPDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
