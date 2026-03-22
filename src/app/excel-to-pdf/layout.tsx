import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Excel to PDF',
  'excel-to-pdf',
  'Convert .xlsx and .xls spreadsheets to PDF. Each sheet becomes a section. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
