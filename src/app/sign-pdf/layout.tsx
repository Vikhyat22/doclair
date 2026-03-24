import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Sign PDF',
  'sign-pdf',
  'Sign PDF documents online free. Draw, type or upload your signature and place it anywhere on the PDF. No upload, no watermark, files stay in your browser.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
