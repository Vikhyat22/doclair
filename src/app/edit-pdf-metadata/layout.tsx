import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Edit PDF Metadata',
  'edit-pdf-metadata',
  'Read and edit the title, author, keywords and other properties stored inside any PDF. Free, no upload.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
