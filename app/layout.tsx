import type { Metadata, Viewport } from 'next'
import { Roboto } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import './globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  title: 'Obra Play Constructor',
  description: 'Plataforma de gestão de obras e cotações de materiais de construção',
  generator: 'Obra Play',
  applicationName: 'Obra Play Constructor',
  keywords: ['construção civil', 'cotação', 'materiais', 'obras', 'gestão'],
  authors: [{ name: 'Obra Play' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Obra Play Constructor',
    description: 'Gestão de obras e compras de materiais de construção',
    siteName: 'Obra Play',
    locale: 'pt_BR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D1B3E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${roboto.variable} bg-background`}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
