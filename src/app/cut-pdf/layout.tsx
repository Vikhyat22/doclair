import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Cut PDF',
  'cut-pdf',
  'Split each PDF page into two halves — top/bottom or left/right. Useful for booklets and double-page scans. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
