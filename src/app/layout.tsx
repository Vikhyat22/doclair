import type { Metadata } from 'next'
import { Syne, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
})
const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: {
    default: 'Doclair — Free Online PDF & Document Tools',
    template: '%s | Doclair',
  },
  description:
    '55+ free browser-based PDF, image & document tools. No upload, no watermark, no sign-up. Files never leave your device.',
  metadataBase: new URL('https://doclair.in'),
  openGraph: { siteName: 'Doclair', type: 'website' },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <head>
        <script
          defer
          data-domain="doclair.in"
          src="https://plausible.io/js/script.js"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A1612" />
      </head>
      <body>{children}</body>
    </html>
  )
}
