import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'POS Billing',
  'pos-billing',
  'Free point-of-sale billing for Indian shops. Product catalog, GST receipts, bill history. Works offline. No sign-up, data stays on device.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
