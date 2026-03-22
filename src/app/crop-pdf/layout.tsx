import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Crop PDF',
  'crop-pdf',
  'Crop all pages of a PDF to remove margins or unwanted areas. Set crop values for each side. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
