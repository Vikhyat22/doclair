import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Word to PDF',
  'word-to-pdf',
  'Convert Word .docx and .doc to PDF free online. Fonts, tables, images and layout preserved. No upload, no watermark. Works offline.'
)

export default function WordToPDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
