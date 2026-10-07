// src/lib/envioPdf.ts
// AIMÊ — Envio do PDF assinado do inspetor, sem passar o arquivo pelo servidor (limite de 4,5 MB da
// Vercel -> erro 413). Em duas etapas: (1) pede ao servidor uma URL de envio assinada, mandando só o NOME
// do arquivo; (2) envia o PDF direto ao Storage do Supabase. Recebe as dependências por parâmetro para
// poder ser testada sem navegador, sem servidor e sem Supabase.

export type DepsEnvioPdf = {
  /** fetch já com a sessão (o AuthFetch do app anexa o token nas chamadas a /api/). */
  fetchFn: (url: string, init: RequestInit) => Promise<Response>
  /** Envia o arquivo ao Storage usando o token assinado. */
  enviarAoStorage: (path: string, token: string, arquivo: Blob) => Promise<{ error: { message: string } | null }>
}

export type ResultadoEnvioPdf = { ok: true; path: string } | { ok: false; erro: string }

/** O arquivo começa com "%PDF-"? (evita guardar como PDF algo que não é.) */
export async function pareceUmPdf(arquivo: Blob): Promise<boolean> {
  try { return (await arquivo.slice(0, 5).text()) === '%PDF-' } catch { return false }
}

export async function enviarPdfAssinado(arquivo: Blob, nomePdf: string, deps: DepsEnvioPdf): Promise<ResultadoEnvioPdf> {
  if (!(await pareceUmPdf(arquivo))) return { ok: false, erro: 'O arquivo selecionado não parece ser um PDF.' }

  // 1) só o nome viaja para o servidor
  let prep: Response
  try {
    prep = await deps.fetchFn('/api/upload-pdf-assinado', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomeArquivo: nomePdf }),
    })
  } catch { return { ok: false, erro: 'Sem conexão com o servidor. Verifique a internet e tente novamente.' } }
  let dados: { erro?: string; path?: string; token?: string } = {}
  try { dados = await prep.json() } catch { /* resposta sem JSON */ }
  if (!prep.ok || !dados.path || !dados.token) {
    if (prep.status === 401) return { ok: false, erro: 'Sua sessão expirou. Entre novamente e envie o PDF de novo.' }
    return { ok: false, erro: `Falha ao preparar o envio do PDF (${prep.status}). ${dados.erro ?? ''}`.trim() }
  }

  // 2) o PDF vai direto ao Storage
  try {
    const { error } = await deps.enviarAoStorage(dados.path, dados.token, arquivo)
    if (error) {
      if (/maximum allowed size|too large|payload/i.test(error.message)) return { ok: false, erro: 'O arquivo é maior do que o armazenamento aceita.' }
      return { ok: false, erro: `Falha ao enviar o PDF ao armazenamento. ${error.message}`.trim() }
    }
  } catch (e) {
    return { ok: false, erro: `Falha ao enviar o PDF ao armazenamento. ${e instanceof Error ? e.message : String(e)}`.trim() }
  }
  return { ok: true, path: dados.path }
}
