import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to Word',
  'pdf-to-word',
  'Convert PDF to Word DOCX free with editable, balanced, and preserve-layout modes. Tables and embedded images are preserved locally in your browser.'
)

export default function PdfToWordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
