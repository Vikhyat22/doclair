import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Repair PDF',
  'repair-pdf',
  'Fix corrupted or damaged PDF files. Re-builds PDF structure to recover readable content. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
