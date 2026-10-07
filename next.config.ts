import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Versão visível na tela (rótulo discreto no canto inferior direito, src/components/VersaoBuild.tsx):
  // permite conferir o que está no ar sem abrir o painel da Vercel. O commit só vem preenchido quando
  // a Vercel informa o Git do deploy; a data e a hora do build vêm sempre.
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
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
