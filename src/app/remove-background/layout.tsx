import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Remove Background',
  'remove-background',
  'Remove image background free online. AI-powered, runs in your browser. Transparent PNG output. No upload, no watermark. Works on photos and logos.'
)

export default function RemoveBackgroundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
