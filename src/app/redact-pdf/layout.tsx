import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Redact PDF',
  'redact-pdf',
  'Permanently remove sensitive text and images from PDF. True redaction — content destroyed, not just hidden. GDPR-compliant. Draw boxes or search text. No upload.'
)

export default function RedactPdfLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
