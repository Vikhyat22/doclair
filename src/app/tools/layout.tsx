import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All Free PDF Tools — No Upload, No Watermark',
  description: 'Browse 70+ free browser-based PDF, image and document tools. No file upload, no watermark, no sign-up required.',
  alternates: { canonical: 'https://doclair.in/tools' },
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
