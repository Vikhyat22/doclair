import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Flatten PDF',
  'flatten-pdf',
  'Merge form fields, annotations and signatures into static page content. Make PDF non-editable. Free, no upload, no watermark.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
