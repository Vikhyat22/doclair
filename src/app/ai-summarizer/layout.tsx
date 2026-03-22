import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'AI PDF Summarizer',
  'ai-summarizer',
  'Get an AI-generated summary of any PDF instantly free. Key points, conclusions, important details. Powered by Claude AI. No upload, no API key needed.'
)

export default function AiSummarizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
