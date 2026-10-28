import type { Metadata } from "next"
import "./globals.css"
import AuthFetch from "@/components/AuthFetch"
import OrigemVisita from "@/components/OrigemVisita"
import { IdentidadeProvider } from "@/lib/identidade"
import { GTM_ID, CONSENT_DEFAULT, gtmScript, gtmNoscript, COOKIE_CONSENT_SRC } from "@/lib/gtm"

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
        {/* Rastreamento (só com NEXT_PUBLIC_GTM_ID): 1º o consentimento padrão (tudo negado até o aceite), 2º o GTM, 3º o aviso de cookies do site.
            Scripts comuns no head, nesta ordem, para o consentimento rodar sempre antes do GTM. */}
        {GTM_ID && <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT }} />}
        {GTM_ID && <script dangerouslySetInnerHTML={{ __html: gtmScript(GTM_ID) }} />}
        {GTM_ID && <script src={COOKIE_CONSENT_SRC} defer />}
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
                .then(function(reg) {
                  console.log('[AIMÊ] SW registrado:', reg.scope)
                  // Forçar verificação de atualização a cada carregamento
                  reg.update()
                  // Recarregar a página quando um novo SW assumir o controle
                  let jaRecarregou = false
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (jaRecarregou) return
                    jaRecarregou = true
                    window.location.reload()
                  })
                })
                .catch(function(err) { console.log('[AIMÊ] SW erro:', err) })
            })
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {GTM_ID && <noscript dangerouslySetInnerHTML={{ __html: gtmNoscript(GTM_ID) }} />}
        <AuthFetch />
        <OrigemVisita />
        <IdentidadeProvider>{children}</IdentidadeProvider>
      </body>
    </html>
  )
}
