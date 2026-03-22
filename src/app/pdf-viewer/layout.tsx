import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF Viewer',
  'pdf-viewer',
  'Open and read any PDF directly in your browser. Zoom, search, navigate pages. No Adobe required. No upload.'
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
