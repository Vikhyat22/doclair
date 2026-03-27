import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to HTML',
  'pdf-to-html',
  'Convert PDF text into clean HTML online for free. Download a browser-ready .html file with no upload and no watermark.'
)

export default function PDFToHTMLLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
