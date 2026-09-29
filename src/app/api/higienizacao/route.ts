// src/app/api/higienizacao/route.ts
// AIMÊ — Item 3.7 da especificação: higienização semanal dos diretórios
// "Vistorias", "Documentos inspetor" e das tabelas "Dados vistoria" e
// "Ativos a vistoriar", excluindo o que tem mais de 185 dias.
//
// SEGURANÇA (exclusão é IRREVERSÍVEL, sem backup automático no plano atual
// do Supabase — ver registro de 28/09/2026):
//   * Modo SIMULAÇÃO por padrão. Só executa de verdade com ?simular=false
//     explícito.
//   * A execução REAL só é aceita de duas origens:
//       1. O cron da Vercel (identificado pelo cabeçalho que a própria
//          Vercel injeta, comparado a CRON_SECRET nas variáveis de ambiente)
//       2. Um gestor logado (mesmo porteiro usado no painel do gestor)
//     Qualquer outra chamada com ?simular=false é recusada.
//   * A simulação é sempre liberada (nenhum efeito colateral) para permitir
//     conferência antes de ligar a execução real.
//   * Cada exclusão de arquivo é feita individualmente (não em lote único),
//     para que uma falha isolada não impeça as demais e para relatar
//     exatamente o que foi ou não excluído.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import {
  dataCorte, selecionarArquivosVistorias, selecionarArquivosDocumentos,
  selecionarLinhasPorData, PRAZO_PADRAO_DIAS, type ArquivoStorage,
} from '@/lib/higienizacao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Lista todos os arquivos de uma pasta do Storage, paginando. */
async function listarTodos(pasta: string): Promise<ArquivoStorage[]> {
  const todos: ArquivoStorage[] = []
  const porPagina = 1000
  for (let offset = 0; offset < 500000; offset += porPagina) {
    const { data, error } = await supabase.storage.from('aime').list(pasta, { limit: porPagina, offset })
    if (error || !data) break
    for (const f of data) todos.push({ name: f.name, created_at: f.created_at ?? null })
    if (data.length < porPagina) break
  }
  return todos
}

/** Chamada legítima do cron da Vercel: cabeçalho Authorization: Bearer <CRON_SECRET>. */
function ehCronVercel(request: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return false
  return request.headers.get('authorization') === `Bearer ${segredo}`
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const simular = url.searchParams.get('simular') !== 'false'   // padrão: SIMULA
    const prazoDias = Number(url.searchParams.get('dias') ?? PRAZO_PADRAO_DIAS)
    if (!Number.isFinite(prazoDias) || prazoDias < 0) {
      return NextResponse.json({ erro: 'Parâmetro "dias" inválido.' }, { status: 400 })
    }

    if (!simular) {
      const viaCron = ehCronVercel(request)
      if (!viaCron) {
        // Checagem PROPRIA, SEMPRE ativa — nao usa exigirGestor porque esse
        // porteiro fica inerte se AUTH_API_ATIVA estiver desligada (correto
        // para as demais rotas, inaceitavel aqui: exclusao permanente nao
        // pode depender de uma chave que pode estar desligada por qualquer
        // motivo, inclusive engano).
        const sessao = await sessaoDaRequisicao(request)
        if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
        if ((await ehGestor(sessao.cpf)) !== true) {
          return NextResponse.json({ erro: 'Acesso negado.' }, { status: 403 })
        }
      }
    }

    const corte = dataCorte(new Date(), prazoDias)
    const resultado: Record<string, unknown> = { simulado: simular, prazoDias, dataCorte: corte.toISOString().slice(0, 10) }

    // ---------- a) Storage "vistorias/" ----------
    const arqVistorias = await listarTodos('vistorias')
    const selVistorias = selecionarArquivosVistorias(arqVistorias, corte)
    if (simular) {
      resultado.vistorias = { total: arqVistorias.length, elegiveis: selVistorias.length, amostra: selVistorias.slice(0, 10).map(a => a.name) }
    } else {
      let removidos = 0; const falhas: string[] = []
      for (const a of selVistorias) {
        const { error } = await supabase.storage.from('aime').remove([`vistorias/${a.name}`])
        if (error) falhas.push(a.name); else removidos++
      }
      resultado.vistorias = { elegiveis: selVistorias.length, removidos, falhas }
    }

    // ---------- b) Storage "documentos_inspetor/" (preserva Termo de Aceite) ----------
    const arqDocs = await listarTodos('documentos_inspetor')
    const selDocs = selecionarArquivosDocumentos(arqDocs, corte)
    if (simular) {
      resultado.documentosInspetor = { total: arqDocs.length, elegiveis: selDocs.length, amostra: selDocs.slice(0, 10).map(a => a.name) }
    } else {
      let removidos = 0; const falhas: string[] = []
      for (const a of selDocs) {
        const { error } = await supabase.storage.from('aime').remove([`documentos_inspetor/${a.name}`])
        if (error) falhas.push(a.name); else removidos++
      }
      resultado.documentosInspetor = { elegiveis: selDocs.length, removidos, falhas }
    }

    // ---------- c) Tabela dados_vistoria (por data_homologacao) ----------
    const { data: linhasVist } = await supabase.from('dados_vistoria').select('numero_foto,cpf_inspetor,cnpjoucpf,tipo_servico,data_homologacao')
    const selLinhasVist = selecionarLinhasPorData(linhasVist ?? [], 'data_homologacao', corte)
    if (simular) {
      resultado.dadosVistoria = { total: (linhasVist ?? []).length, elegiveis: selLinhasVist.length }
    } else {
      let removidos = 0
      for (const l of selLinhasVist) {
        const { error } = await supabase.from('dados_vistoria').delete()
          .eq('cpf_inspetor', l.cpf_inspetor).eq('cnpjoucpf', l.cnpjoucpf)
          .eq('tipo_servico', l.tipo_servico).eq('numero_foto', l.numero_foto)
        if (!error) removidos++
      }
      resultado.dadosVistoria = { elegiveis: selLinhasVist.length, removidos }
    }

    // ---------- d) Tabela ativos_a_vistoriar (por data_cadastro) ----------
    // Sem coluna "id" — a identidade de uma linha é a combinacao das 5
    // colunas abaixo (mesma chave usada em outras rotas do app para
    // localizar um ativo especifico).
    const { data: linhasAtivos } = await supabase.from('ativos_a_vistoriar')
      .select('cpf_inspetor,cnpjoucpf,tipo_servico,tipo_ativo,tag_ativo_nr_serie,data_cadastro')
    const selLinhasAtivos = selecionarLinhasPorData(linhasAtivos ?? [], 'data_cadastro', corte)
    if (simular) {
      resultado.ativosAVistoriar = { total: (linhasAtivos ?? []).length, elegiveis: selLinhasAtivos.length }
    } else {
      let removidos = 0; const falhas: number[] = []
      for (let i = 0; i < selLinhasAtivos.length; i++) {
        const l: any = selLinhasAtivos[i]
        const { error } = await supabase.from('ativos_a_vistoriar').delete()
          .eq('cpf_inspetor', l.cpf_inspetor).eq('cnpjoucpf', l.cnpjoucpf).eq('tipo_servico', l.tipo_servico)
          .eq('tipo_ativo', l.tipo_ativo).eq('tag_ativo_nr_serie', l.tag_ativo_nr_serie)
        if (error) falhas.push(i); else removidos++
      }
      resultado.ativosAVistoriar = { elegiveis: selLinhasAtivos.length, removidos, falhasNaLinha: falhas.length }
    }

    return NextResponse.json(resultado)
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
