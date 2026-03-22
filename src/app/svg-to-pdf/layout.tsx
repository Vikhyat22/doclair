import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'SVG to PDF',
  'svg-to-pdf',
  'Convert SVG vector graphics to PDF free. Perfect for logos, icons and illustrations. No upload, instant.'
)

export default function SvgToPdfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
