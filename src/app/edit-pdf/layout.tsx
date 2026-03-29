import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Edit PDF Text + Sign',
  'edit-pdf',
  'Edit existing PDF text for text-based files, search and replace across PDF pages, run OCR for scanned PDFs, add whiteout erase areas, and export edited pages with a clean searchable text layer. No upload, no watermark, files stay in your browser.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
