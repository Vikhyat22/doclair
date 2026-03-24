import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PowerPoint to PDF',
  'ppt-to-pdf',
  'Convert PowerPoint PPTX files to PDF online free. No upload, no watermark, files stay in your browser.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
