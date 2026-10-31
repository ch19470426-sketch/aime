// src/app/api/croqui-localizacao/route.ts
// AIMÊ — Gera o croqui (mapa com marcador) do endereço do estabelecimento, para a tela de Coleta de Dados Básicos do laudo.
// Chave: GOOGLE_MAPS_API_KEY (Vercel, só servidor), com as APIs "Geocoding API" e "Maps Static API" habilitadas. Sem a chave, responde 503 e a
// tela segue com o envio manual da imagem. Nada do endereço vai para o log.

import { NextRequest, NextResponse } from 'next/server'
import { exigirSessao } from '@/lib/autorizacao'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { gerarCroqui, enderecoSuficiente, type EnderecoCroqui } from '@/lib/croqui'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Freio por usuário (melhor esforço: cada instância do servidor tem o seu contador). O teto de verdade fica na cota diária da chave, no Google Cloud.
const LIMITE_POR_HORA = 10
const usos = new Map<string, number[]>()
function dentroDoLimite(quem: string, agora = Date.now()): boolean {
  const recentes = (usos.get(quem) ?? []).filter(t => agora - t < 3600_000)
  if (recentes.length >= LIMITE_POR_HORA) { usos.set(quem, recentes); return false }
  recentes.push(agora); usos.set(quem, recentes)
  return true
}

export async function POST(request: NextRequest) {
  const acesso = await exigirSessao(request)
  if (acesso.ok === false) return acesso.resposta
  try {
    const chave = process.env.GOOGLE_MAPS_API_KEY
    if (!chave) return NextResponse.json({ erro: 'O croqui automático não está disponível no momento. Envie a imagem manualmente.' }, { status: 503 })

    const corpo = await request.json().catch(() => null) as EnderecoCroqui | null
    if (!corpo || typeof corpo !== 'object' || !enderecoSuficiente(corpo)) {
      return NextResponse.json({ erro: 'Endereço insuficiente: informe o CEP completo (ou rua e cidade).' }, { status: 400 })
    }

    const sessao = await sessaoDaRequisicao(request)
    const quem = sessao?.cpf ?? request.headers.get('x-forwarded-for') ?? 'anonimo'
    if (!dentroDoLimite(quem)) return NextResponse.json({ erro: 'Muitos croquis gerados em pouco tempo. Tente de novo mais tarde ou envie a imagem manualmente.' }, { status: 429 })

    const r = await gerarCroqui(corpo, chave)
    if (r.ok === false) return NextResponse.json({ erro: r.erro }, { status: r.status })
    return NextResponse.json({ imagem: r.imagem, aproximado: r.aproximado })
  } catch {
    return NextResponse.json({ erro: 'Não foi possível gerar o croqui agora. Envie a imagem manualmente.' }, { status: 500 })
  }
}
