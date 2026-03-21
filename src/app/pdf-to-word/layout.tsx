import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to Word',
  'pdf-to-word',
  'Convert PDF to Word DOCX free. Extracts text with heading detection. No upload, no watermark. Works offline in your browser.'
)

export default function PdfToWordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
