import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Compress Image',
  'compress-image',
  'Compress JPG, PNG and WebP images without visible quality loss. Free, no upload, instant results.',
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
