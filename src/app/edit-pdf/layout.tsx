import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Edit PDF Text + Sign',
  'edit-pdf',
  'Edit existing PDF text for text-based files, search and replace across PDF pages, export simple edits through direct PDF rewrite when safe, run OCR for scanned PDFs, add clipboard images, quick date or stamp inserts, rotatable images or signatures, whiteout erase areas, and keep everything in your browser. No upload, no watermark.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
