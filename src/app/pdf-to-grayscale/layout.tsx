import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'PDF to Grayscale',
  'pdf-to-grayscale',
  'Convert a color PDF to black and white. Reduces file size and printing costs. 100% free, no upload, no watermark.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
