import type { Metadata } from 'next'
import { toolMetadata } from '@/constants/seo'

export const metadata: Metadata = toolMetadata(
  'Organize Pages',
  'organize-pages',
  'Reorder, rotate, delete and duplicate PDF pages free. Drag-and-drop with touch support. Full-page preview. Non-destructive. No upload, no watermark.'
)

export default function OrganizePagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
