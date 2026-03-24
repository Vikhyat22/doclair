import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Edit PDF + Sign',
  'edit-pdf',
  'Add text and signatures to PDF files free online. Click to place text, draw or type your signature. No upload, no watermark, files stay in your browser.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
