import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Invert PDF',
  'invert-pdf',
  'Invert all colors in a PDF — white becomes black, black becomes white. Easier reading in dark environments. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
