export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120   // o PDF é gerado depois da resposta (Chromium leva 20 a 40 s para acordar)

// src/app/api/gerar-termo-aceite/route.ts
// AIMÊ — Gera o HTML do Termo de Aceite dos Serviços e salva em documentos_inspetor

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao, exigirDonoDaGeracao } from '@/lib/autorizacao'
import { after } from 'next/server'
import { termoEmHtml, dataDoAceite, TERMO_CABECALHO, TERMO_RODAPE } from '@/lib/termoAceite'
import { htmlParaPdf } from '@/lib/htmlParaPdf'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  try {
    const { cpfInspetor, chaveInspetor } = await request.json()
    if (!cpfInspetor || !chaveInspetor) {
      return NextResponse.json({ erro: 'cpfInspetor e chaveInspetor são obrigatórios' }, { status: 400 })
    }
    // DONO (AUTH_API_ATIVA): o termo é gerado só para o próprio usuário logado.
    const acessoDono = await exigirDonoDaGeracao(request, cpfInspetor, chaveInspetor)
    if (acessoDono.ok === false) return acessoDono.resposta

    // O texto é o do termo único (src/lib/termoAceite.ts); a data do aceite é gerada agora, no horário de Brasília (dd/mm/aaaa)
    const dataAceite = dataDoAceite()
    const html = termoEmHtml(dataAceite)

    const nomeArquivo = `${chaveInspetor}_termo_de_aceite.html`
    const { error } = await supabase.storage
      .from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, Buffer.from(html, 'utf-8'), {
        contentType: 'text/html',
        upsert: true,
      })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    // PDF do aceite, o comprovante que o inspetor baixa em Baixar Documentos: gerado DEPOIS da resposta (o aceite não espera o Chromium acordar) e com a
    // MESMA data do HTML. Se falhar, o aceite continua válido pelo HTML, que é o que o painel confere. Fora de uma requisição (testes), roda na hora.
    const gerarPdf = async () => {
      try {
        const pdf = await htmlParaPdf(termoEmHtml(dataAceite, { paraPdf: true }), { cabecalho: TERMO_CABECALHO, rodape: TERMO_RODAPE })
        const { error: errPdf } = await supabase.storage.from('aime').upload(`documentos_inspetor/${chaveInspetor}_termo_de_aceite.pdf`, pdf, { contentType: 'application/pdf', upsert: true })
        if (errPdf) console.error('[gerar-termo-aceite] PDF não gravado:', errPdf.message)
      } catch (e) {
        console.error('[gerar-termo-aceite] PDF não gerado:', e)
      }
    }
    try { after(gerarPdf) } catch { await gerarPdf() }

    return NextResponse.json({ ok: true, nomeArquivo })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
