import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to PowerPoint',
  'pdf-to-ppt',
  'Convert PDF to PowerPoint PPTX free online. Each PDF page becomes an editable slide. No upload, no watermark, files stay in your browser.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
