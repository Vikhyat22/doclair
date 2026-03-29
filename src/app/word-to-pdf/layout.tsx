import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Word to PDF',
  'word-to-pdf',
  'Convert Word .docx and .doc to PDF free online. Page settings, lists, tables, images, and page breaks preserved locally in your browser. No upload, no watermark. Works offline.'
)

export default function WordToPDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
