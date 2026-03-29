import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Remove PDF Password',
  'remove-password',
  'Remove password from PDF free. Unlock password-protected PDFs in your browser while keeping the original text layer and page quality intact. No upload, no watermark.'
)

export default function RemovePasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
