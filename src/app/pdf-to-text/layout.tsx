import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to Text',
  'pdf-to-text',
  'Extract all text from PDF as a .txt file free. Copy to clipboard or download. No upload, instant. For scanned PDFs, use OCR PDF first.'
)

export default function PdfToTextLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
