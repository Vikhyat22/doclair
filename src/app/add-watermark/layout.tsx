import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Add Watermark to PDF',
  'add-watermark',
  'Add text or image watermarks to PDF free. Control opacity, rotation, position. Live preview. No upload, no watermark from Doclair.'
)

export default function AddWatermarkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
