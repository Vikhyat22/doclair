import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Add Blank Page to PDF',
  'add-blank-page',
  'Insert a blank page anywhere in a PDF. Choose position and size — A4, US Letter, or match your document. 100% free, no upload, no watermark.'
)

export default function AddBlankPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
