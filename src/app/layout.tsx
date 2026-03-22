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
  icons: {
    icon: [
      { url: '/favicon.ico',  sizes: '32x32',   type: 'image/x-icon' },
      { url: '/icon-16.png',  sizes: '16x16',   type: 'image/png' },
      { url: '/icon-32.png',  sizes: '32x32',   type: 'image/png' },
      { url: '/icon-96.png',  sizes: '96x96',   type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.svg',  type: 'image/svg+xml' },
    ],
    apple:    [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.ico',
  },
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
        {/* Google Analytics 4 */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `,
          }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A1612" />
      </head>
      <body>{children}</body>
    </html>
  )
}
