import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF Word Counter',
  'pdf-word-counter',
  'Count words, characters and paragraphs in any PDF. Per-page breakdown. Exclude numbers. Free, no upload.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
