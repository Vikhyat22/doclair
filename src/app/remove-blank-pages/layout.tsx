import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Remove Blank Pages from PDF',
  'remove-blank-pages',
  'Automatically detect and remove blank and empty pages from any PDF. Preview before removing. Free, no upload.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
