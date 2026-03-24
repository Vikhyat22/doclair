import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Translate PDF',
  'translate-pdf',
  'Translate PDF documents to any language online free using AI. Preserves formatting. No upload — text stays in your browser.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
