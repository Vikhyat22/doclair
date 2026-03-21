import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Encrypt PDF',
  'encrypt-pdf',
  'Password protect PDF with AES-256 encryption free. Set open password and restrict printing, copying and editing. No upload, no watermark.'
)

export default function EncryptPDFLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
