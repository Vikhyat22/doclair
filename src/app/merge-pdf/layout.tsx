import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Merge PDF',
  'merge-pdf',
  'Combine multiple PDF files into one document instantly. 100% free, no watermark, no sign-up. Files never leave your browser.'
)

export default function MergePDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
