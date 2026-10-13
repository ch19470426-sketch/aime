export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// src/app/api/gestor/migrar-chave-para-cpf/route.ts
// AIMÊ — MIGRAÇÃO ÚNICA (13/10/2026): a chave do inspetor volta a ser o CPF, e os arquivos que começam pela chave antiga (INS-nnn)
// passam a começar pelo CPF. ROTA TEMPORÁRIA: remover junto com a coluna inspetor.chave_legada depois da migração.
//
// Ordem: (1) executar sql/2026-10-13_chave_inspetor_igual_cpf.sql no Supabase (guarda a chave antiga em chave_legada e grava o
// CPF em chave_inspetor); (2) chamar esta rota como gestor, primeiro em SIMULAÇÃO (padrão) e depois com { "executar": true }.
// Idempotente: arquivo cujo destino já existe é contado como "já existia" e não é tocado; rodar de novo não faz mal.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirGestor } from '@/lib/autorizacao'
import { chaveDoCpf } from '@/lib/chaveInspetor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'aime'
const PASTAS = ['vistorias', 'vistorias_homologadas', 'documentos_inspetor', 'laudos_imagens']
const LOTE = 1000

/** Nomes de arquivo da pasta que começam por `prefixo` (o filtro do armazenamento é por trecho; aqui se confere o começo). */
async function listarComPrefixo(pasta: string, prefixo: string): Promise<string[]> {
  const achados: string[] = []
  for (let offset = 0; ; offset += LOTE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(pasta, { limit: LOTE, offset, search: prefixo })
    if (error) throw new Error(error.message)
    for (const objeto of data ?? []) if (objeto.name.startsWith(prefixo)) achados.push(objeto.name)
    if (!data || data.length < LOTE) break
  }
  return achados
}

export async function POST(request: NextRequest) {
  try {
    const acesso = await exigirGestor(request)
    if (acesso.ok === false) return acesso.resposta

    let executar = false
    try { executar = (await request.json())?.executar === true } catch { /* sem corpo: simulação */ }

    const { data: inspetores, error } = await supabase.from('inspetor').select('cpf_inspetor, chave_legada').not('chave_legada', 'is', null)
    if (error) {
      return NextResponse.json({
        erro: error.message,
        dica: 'Execute antes o arquivo sql/2026-10-13_chave_inspetor_igual_cpf.sql no Supabase (cria a coluna chave_legada).',
      }, { status: 500 })
    }

    const totais = { cadastros: 0, encontrados: 0, movidos: 0, ja_existiam: 0, erros: 0 }
    const relatorio: { cpf: string; pasta: string; de: string; para: string; situacao: string; mensagem?: string }[] = []

    for (const insp of inspetores ?? []) {
      const cpf = chaveDoCpf(insp.cpf_inspetor)
      const legada = String(insp.chave_legada ?? '')
      if (!cpf || !legada) continue
      totais.cadastros++
      for (const pasta of PASTAS) {
        for (const nome of await listarComPrefixo(pasta, legada + '_')) {
          const destino = `${cpf}_${nome.slice(legada.length + 1)}`
          totais.encontrados++
          if (!executar) { relatorio.push({ cpf, pasta, de: nome, para: destino, situacao: 'a_mover' }); continue }
          const { error: erroMove } = await supabase.storage.from(BUCKET).move(`${pasta}/${nome}`, `${pasta}/${destino}`)
          if (!erroMove) { totais.movidos++; relatorio.push({ cpf, pasta, de: nome, para: destino, situacao: 'movido' }) }
          else if (/already exists|duplicate/i.test(erroMove.message)) { totais.ja_existiam++; relatorio.push({ cpf, pasta, de: nome, para: destino, situacao: 'ja_existia' }) }
          else { totais.erros++; relatorio.push({ cpf, pasta, de: nome, para: destino, situacao: 'erro', mensagem: erroMove.message }) }
        }
      }
    }
    return NextResponse.json({ modo: executar ? 'executado' : 'simulacao', totais, relatorio })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
