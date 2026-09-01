import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
  },
  // Aumentar limite de body para route handlers (foto base64 pode ser grande)
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
    responseLimit: '20mb',
  },
}

export default nextConfig
