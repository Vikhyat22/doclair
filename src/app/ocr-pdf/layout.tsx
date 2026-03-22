import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'OCR PDF',
  'ocr-pdf',
  'Extract text from scanned PDFs free. Make PDFs searchable or export as text. 100+ languages including Hindi. Powered by Tesseract.js. No upload.'
)

export default function OcrPdfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
