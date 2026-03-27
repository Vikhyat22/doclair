import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to Excel',
  'pdf-to-excel',
  'Convert PDF tables and row-based data to Excel XLSX online for free. Browser-based, no upload, no watermark.'
)

export default function PDFToExcelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
