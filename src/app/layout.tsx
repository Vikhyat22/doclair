import type { Metadata } from 'next'
import { Syne, DM_Sans, DM_Mono } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'
import ClarityScript from '@/components/ClarityScript'

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
    '70+ free browser-based PDF, image & document tools. No upload, no watermark, no sign-up. Files never leave your device.',
  metadataBase: new URL('https://doclair.in'),
  openGraph: {
    siteName: 'Doclair',
    type: 'website',
    url: 'https://doclair.in',
    locale: 'en_IN',
    images: [{ url: 'https://doclair.in/og-image.png', width: 1200, height: 630, alt: 'Doclair — Free PDF Tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://doclair.in/og-image.png'],
  },
  alternates: { canonical: 'https://doclair.in' },
  robots: { index: true, follow: true },
  // favicon.ico, icon.png and apple-icon.png are in src/app/ —
  // Next.js App Router picks them up automatically (no metadata.icons needed)
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A1612" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://doclair.in/#organization',
                name: 'Doclair',
                url: 'https://doclair.in',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://doclair.in/icon-512.png',
                  width: 512,
                  height: 512,
                },
                sameAs: ['https://github.com/doclair/doclair'],
              },
              {
                '@type': 'WebSite',
                '@id': 'https://doclair.in/#website',
                url: 'https://doclair.in',
                name: 'Doclair',
                description: '70+ free browser-based PDF, image & document tools. No upload, no watermark, no sign-up.',
                publisher: { '@id': 'https://doclair.in/#organization' },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://doclair.in/tools?q={search_term_string}',
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }) }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <div id="main-content">{children}</div>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <ClarityScript clarityId={process.env.NEXT_PUBLIC_CLARITY_ID} />
        )}
      </body>
    </html>
  )
}
