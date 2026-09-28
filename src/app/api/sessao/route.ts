// src/app/api/sessao/route.ts
// AIMÊ — Diagnóstico: o servidor reconhece a sua sessão?
//
// Abra /api/sessao numa aba do navegador em que você está logado. É uma
// navegação comum (sem cabeçalho de token), então o resultado mostra se o
// COOKIE de sessão é reconhecido pelo servidor — exatamente o que o service
// worker e a abertura de documentos usam. Serve para conferir antes de ligar
// AUTH_API_ATIVA. Não altera nada e só mostra dados do próprio chamador.

import { NextRequest, NextResponse } from 'next/server'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { autorizacaoAtiva } from '@/lib/autorizacao'
import { ehGestor } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const s = await sessaoDaRequisicao(request)
  const base = { protecaoAtiva: autorizacaoAtiva() }
  if (!s) {
    return NextResponse.json({
      ...base, autenticado: false,
      dica: 'Nenhuma sessão válida chegou ao servidor. Se você está logado, avise: o cookie de sessão não está sendo reconhecido.',
    })
  }
  const mascarado = `***.${s.cpf.slice(3, 6)}.${s.cpf.slice(6, 9)}-**`
  return NextResponse.json({
    ...base, autenticado: true, via: s.via, cpf: mascarado, gestor: await ehGestor(s.cpf),
  })
}
