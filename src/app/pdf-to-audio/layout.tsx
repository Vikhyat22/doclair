import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to Audio',
  'pdf-to-audio',
  'Convert PDF text to spoken audio using text-to-speech. Listen to your documents on the go. 100% free, no upload.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
