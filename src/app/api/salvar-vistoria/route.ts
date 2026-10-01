export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/salvar-vistoria/route.ts
// AIMÊ — Salva formulário no Supabase Storage
// Suporta JSON (vistorias/) e HTML (vistorias_homologadas/)
//
// Rota reaproveitada por varios fluxos (vistoria online, sincronizacao
// offline via service worker, e tambem documentos_inspetor de
// proposta/plano) — so debita credito quando for genuinamente uma
// VISTORIA (pasta padrao 'vistorias', conteudo JSON). Proposta e plano ja
// sao cobrados em suas proprias rotas (gerar-proposta/gerar-plano), nao
// aqui, para nao cobrar duas vezes.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { consumirCreditos } from '@/lib/creditos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nomeArquivo, payload, pasta, contentType } = body
    // Log tamanho para diagnóstico
    const tamanho = JSON.stringify(payload).length
    if (tamanho > 3_000_000) {
      console.warn(`[salvar-vistoria] payload grande: ${(tamanho/1024).toFixed(0)}KB`)
    }

    if (!nomeArquivo || !payload) {
      return NextResponse.json({ erro: 'nomeArquivo e payload são obrigatórios' }, { status: 400 })
    }

    const folder   = pasta ?? 'vistorias'
    const mimeType = contentType ?? 'application/json'
    const isHtml   = mimeType === 'text/html'
    const conteudo = isHtml ? payload : JSON.stringify(payload, null, 2)
    const blob     = new Blob([conteudo], { type: mimeType })

    const { error } = await supabase.storage
      .from('aime')
      .upload(`${folder}/${nomeArquivo}`, blob, {
        contentType: mimeType,
        upsert: true,
      })

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    // Debito de 1 CR POR FOTO DE VISTORIA — momento certo e aqui (quando o
    // dado e de fato capturado/armazenado), nao na homologacao: o custo de
    // armazenamento e IA ja foi incorrido agora, e um item pode nunca
    // chegar a ser homologado (decisao de Celso, 01/10/2026 — corrige o
    // local onde isto estava antes). So cobra quando for vistoria de
    // verdade (pasta padrao, JSON) — nunca para documentos_inspetor
    // (proposta/plano, ja cobrados em suas proprias rotas). Fogo-e-esquece:
    // uma falha aqui nunca derruba o salvamento, que ja teve sucesso.
    if (folder === 'vistorias' && !isHtml && payload?.cpfInspetor && payload?.tipoServico) {
      try {
        await consumirCreditos(payload.cpfInspetor, Number(payload.tipoServico), {
          quantidade: 1,
          cnpjoucpf: payload.cnpjoucpf,
          referencia: `${payload.cnpjoucpf}_${payload.tipoServico}_foto_${payload.fotoNr ?? nomeArquivo}`,
        })
      } catch { /* nao deixa o debito falhar o salvamento, que ja teve sucesso */ }
    }

    return NextResponse.json({ sucesso: true, arquivo: `${folder}/${nomeArquivo}` })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
