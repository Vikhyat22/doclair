import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'CSV to PDF',
  'csv-to-pdf',
  'Convert CSV files to a formatted PDF table with highlighted headers. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
