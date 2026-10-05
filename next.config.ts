import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Erros de tipo DERRUBAM o build (padrao do Next). Ficou ligado como
  // ignoreBuildErrors:true ate 05/10/2026 e por isso bugs reais (import
  // faltando, variavel fora de escopo) foram publicados sem aviso.
  experimental: {
    serverActions: {
      bodySizeLimit: '80mb',
    },
  },
  // @sparticuz/chromium precisa ficar fora do bundle — seus binários (pasta bin/)
  // são copiados como arquivos estáticos, não JS. Se o Next.js tentar empacotá-lo,
  // o caminho para os binários quebra em runtime ("input directory does not exist").
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  // serverExternalPackages sozinho evita o bundling do JS, mas NÃO garante que
  // os arquivos binários (bin/*.br) sejam copiados para o pacote da função
  // serverless na Vercel — isso é necessário além do external.
  outputFileTracingIncludes: {
    '/api/gerar-laudo-pdf/**': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/gerar-plano-manutencao-pdf/**': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/gerar-laudo-pdf-indice-real/**': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
}

export default nextConfig
