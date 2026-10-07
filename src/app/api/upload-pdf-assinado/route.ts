export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/upload-pdf-assinado/route.ts
// AIMÊ — Guarda o PDF assinado (Gov.br) do inspetor em documentos_inspetor/.
//
// COMO FUNCIONA (07/10/2026): o PDF NÃO passa mais por esta rota. A rota recebe só o NOME do arquivo e
// devolve uma URL de envio ASSINADA; o navegador envia o PDF direto ao Storage do Supabase (até 50 MB).
// Antes, o PDF ia em base64 dentro do JSON desta rota, e a Vercel recusa corpos acima de 4,5 MB nas
// rotas do servidor (erro 413): um laudo assinado com muitas fotos não conseguia ser enviado.
//
// SEGURANÇA: antes qualquer pessoa, sem login, podia gravar (e sobrescrever) arquivos em
// documentos_inspetor/ por esta rota, que usa a chave de serviço. Agora exige sessão válida, e o nome é
// limpo (sem pastas, só letras, números, ponto, hífen e sublinhado, e sempre .pdf).
//
// COMPATIBILIDADE: se vier "base64" (tela antiga ainda em cache no navegador), mantém o envio antigo, que
// continua valendo para arquivos pequenos.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cpfDaSessao } from '@/lib/sessaoServidor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Só o nome do arquivo, sem pastas, com caracteres seguros e sempre terminando em .pdf. null se não sobrar nada. */
export function limparNomePdf(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  const soNome = bruto.split(/[\\/]/).pop() ?? ''
  let nome = soNome.trim().replace(/[^a-zA-Z0-9._\-]/g, '_').replace(/^\.+/, '')
  if (!nome) return null
  if (!/\.pdf$/i.test(nome)) nome += '.pdf'
  if (nome.length > 150) nome = nome.slice(0, 146) + '.pdf'
  return nome
}

export async function POST(request: NextRequest) {
  try {
    const cpf = await cpfDaSessao(request)
    if (!cpf) return NextResponse.json({ erro: 'Sessão inválida ou expirada. Entre novamente.' }, { status: 401 })

    const corpo = await request.json().catch(() => ({}))
    const nome = limparNomePdf(corpo?.nomeArquivo)
    if (!nome) return NextResponse.json({ erro: 'nomeArquivo é obrigatório.' }, { status: 400 })
    const caminho = `documentos_inspetor/${nome}`

    // Formato antigo (tela em cache): o PDF vem em base64 no corpo.
    if (typeof corpo?.base64 === 'string' && corpo.base64) {
      const buffer = Buffer.from(corpo.base64, 'base64')
      const { error } = await supabase.storage.from('aime').upload(caminho, buffer, { contentType: 'application/pdf', upsert: true })
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // Formato novo: devolve a URL de envio assinada; o navegador envia o PDF direto ao Storage.
    const { data, error } = await supabase.storage.from('aime').createSignedUploadUrl(caminho, { upsert: true })
    if (error || !data) return NextResponse.json({ erro: error?.message ?? 'Não foi possível preparar o envio.' }, { status: 500 })
    return NextResponse.json({ ok: true, path: data.path, token: data.token })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
