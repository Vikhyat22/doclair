import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF Privacy Scanner',
  'privacy-scanner',
  'Scan any PDF for hidden metadata that could expose your identity. Strip all detected data with one click. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
