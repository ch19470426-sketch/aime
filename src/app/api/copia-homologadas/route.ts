// src/app/api/copia-homologadas/route.ts
// AIMÊ — cópia semanal de segurança das fotos homologadas (24/10/2026).
// Copia "vistorias_homologadas/" para "copias_seguranca/AAAA-MM-DD/" (data de Brasília) dentro do mesmo bucket e
// mantém só as 4 últimas cópias. Não altera nem apaga nada da pasta de origem.
//
// SEGURANÇA: mesma regra da higienização — só o cron da Vercel (Bearer CRON_SECRET) ou um gestor logado.
// Modo SIMULAÇÃO por padrão; só copia de verdade com ?simular=false. A única exclusão é a de pastas antigas
// DENTRO de "copias_seguranca/", em nomes AAAA-MM-DD, e só depois de a cópia de hoje terminar sem falhas.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import { dataBrasiliaMaisDias } from '@/lib/contratos'
import { PASTA_ORIGEM, PASTA_COPIAS, COPIAS_MANTIDAS, copiasParaApagar } from '@/lib/copiaSeguranca'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Nomes dos itens de uma pasta do Storage, paginando. */
async function nomesDe(pasta: string): Promise<string[]> {
  const nomes: string[] = []
  const porPagina = 1000
  for (let offset = 0; offset < 500000; offset += porPagina) {
    const { data, error } = await supabase.storage.from('aime').list(pasta, { limit: porPagina, offset })
    if (error) throw new Error(`listar ${pasta}: ${error.message}`)
    if (!data) break
    for (const f of data) nomes.push(f.name)
    if (data.length < porPagina) break
  }
  return nomes
}

function ehCronVercel(request: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return false
  return request.headers.get('authorization') === `Bearer ${segredo}`
}

export async function GET(request: NextRequest) {
  try {
    if (!ehCronVercel(request)) {
      const sessao = await sessaoDaRequisicao(request)
      if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
      if ((await ehGestor(sessao.cpf)) !== true) return NextResponse.json({ erro: 'Acesso negado.' }, { status: 403 })
    }

    const simular = new URL(request.url).searchParams.get('simular') !== 'false'   // padrão: SIMULA
    const hoje = dataBrasiliaMaisDias(0)
    const destino = `${PASTA_COPIAS}/${hoje}`
    const inicio = Date.now()

    const origem = await nomesDe(PASTA_ORIGEM)
    const jaCopiados = new Set(await nomesDe(destino))
    const faltam = origem.filter(n => !jaCopiados.has(n))
    const resultado: Record<string, unknown> = {
      simulado: simular, destino, origem: origem.length, jaCopiados: jaCopiados.size, aCopiar: faltam.length,
    }

    if (!simular) {
      let copiados = 0; const falhas: string[] = []; let incompleto = false
      for (const nome of faltam) {
        if (Date.now() - inicio > 50_000) { incompleto = true; break }   // margem do limite de 60 s; a próxima execução completa
        const { error } = await supabase.storage.from('aime').copy(`${PASTA_ORIGEM}/${nome}`, `${destino}/${nome}`)
        if (error) falhas.push(nome); else copiados++
      }
      resultado.copiados = copiados
      resultado.falhas = falhas
      resultado.incompleto = incompleto

      // Retenção: só depois de a cópia de hoje estar completa
      if (falhas.length === 0 && !incompleto) {
        const pastas = copiasParaApagar(await nomesDe(PASTA_COPIAS), COPIAS_MANTIDAS)
        const apagadas: string[] = []
        for (const p of pastas) {
          const arquivos = await nomesDe(`${PASTA_COPIAS}/${p}`)
          const { error } = arquivos.length
            ? await supabase.storage.from('aime').remove(arquivos.map(a => `${PASTA_COPIAS}/${p}/${a}`))
            : { error: null }
          if (!error) apagadas.push(p)
        }
        resultado.pastasAntigasApagadas = apagadas
      }
    } else {
      resultado.pastasAntigasQueSairiam = copiasParaApagar(await nomesDe(PASTA_COPIAS), COPIAS_MANTIDAS)
    }

    return NextResponse.json(resultado)
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
