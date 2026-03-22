import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'HEIC to PDF',
  'heif-to-pdf',
  'Convert iPhone HEIC photos to PDF free. No upload, no app. Drag and drop from iPhone or Mac.'
)

export default function HeifToPdfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
