import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'GST Invoice Generator',
  'gst-invoice',
  'Generate GST-compliant Tax Invoices free. CGST/SGST and IGST auto-calculated. GSTIN validation, HSN codes, bank details. No sign-up, data never leaves your browser.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
