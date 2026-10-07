// src/components/VersaoBuild.tsx
// AIMÊ — Versão do aplicativo, discreta no canto inferior direito. Existe porque, nos testes, mais de uma
// vez foi preciso descobrir "o que está no ar" (um texto antigo aparecia depois de um deploy novo).
// O commit vem da Vercel no build (VERCEL_GIT_COMMIT_SHA) e a data e a hora são as do build, em Brasília.

export default function VersaoBuild() {
  const commit = process.env.NEXT_PUBLIC_BUILD_COMMIT || ''
  const iso = process.env.NEXT_PUBLIC_BUILD_TIME || ''
  const quando = iso
    ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <div style={{ position: 'fixed', right: 8, bottom: 4, fontSize: 9, color: '#9CA3AF', pointerEvents: 'none', zIndex: 5 }}>
      {commit ? `v ${commit}` : 'v local'}{quando ? ` · ${quando}` : ''}
    </div>
  )
}
