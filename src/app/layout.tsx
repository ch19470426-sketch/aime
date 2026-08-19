import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "AIMÊ",
  description: "Sistema de gestão AIMÊ",
  manifest: "/manifest.json",
  themeColor: "#1E3A8A",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AIMÊ",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1E3A8A" />
        <style>{`
          @media screen and (orientation: landscape) and (max-height: 500px) {
            body { transform: rotate(-90deg); transform-origin: left top;
                   width: 100vh; height: 100vw; overflow-x: hidden;
                   position: absolute; top: 100%; left: 0; }
          }
        `}</style>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AIMÊ" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('[AIMÊ] SW registrado:', reg.scope) })
                .catch(function(err) { console.log('[AIMÊ] SW erro:', err) })
            })
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
