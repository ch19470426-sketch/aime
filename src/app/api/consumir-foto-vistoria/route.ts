// src/app/api/consumir-foto-vistoria/route.ts
// AIMÊ — Debita 1 CR pela homologação de UMA foto/item de vistoria.
//
// Por que uma rota separada, em vez de embutir no fluxo de homologação:
// o insert em dados_vistoria acontece direto do navegador (fetch ao
// Supabase), sem passar por nenhuma rota Next.js — não há onde plugar o
// debito no MEIO dessa chamada. Esta rota é chamada pelo cliente logo
// DEPOIS que esse insert já teve sucesso (fire-and-forget: nunca trava
// a experiência do usuário, mesmo se o debito falhar — mesma filosofia
// de consumirCreditos()).

import { NextRequest, NextResponse } from 'next/server'
import { consumirCreditos } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { cpfInspetor, tipoServico, cnpjoucpf, numeroFoto } = await request.json()
    if (!cpfInspetor || !tipoServico || numeroFoto === undefined) {
      return NextResponse.json({ erro: 'Parâmetros obrigatórios ausentes.' }, { status: 400 })
    }
    const resultado = await consumirCreditos(cpfInspetor, Number(tipoServico), {
      quantidade: 1,
      cnpjoucpf,
      // Único por foto — idempotente: reprocessar a mesma homologação
      // (ex.: usuário clicou duas vezes) não debita de novo.
      referencia: `${cnpjoucpf}_${tipoServico}_foto_${numeroFoto}`,
    })
    return NextResponse.json(resultado)
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
