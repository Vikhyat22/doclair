import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Chat with PDF',
  'chat-with-pdf',
  'Ask questions about any PDF using Claude AI free. No API key needed. Get instant answers about contracts, reports, research papers. No upload.'
)

export default function ChatWithPdfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
