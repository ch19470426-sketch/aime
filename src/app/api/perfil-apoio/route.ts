// src/app/api/perfil-apoio/route.ts
// AIMÊ — Perfil de apoio do usuário logado (vistoria 39): título profissional → sistemas que ele pode vistoriar. As telas (acesso à vistoria 39 e
// seleção da homologação) usam esta resposta, e não um parâmetro da URL, para saber se o usuário é Eng Elétrico ou Eng Mecânico.
import { NextRequest, NextResponse } from 'next/server'
import { exigirSessao, exigirProprio } from '@/lib/autorizacao'
import { perfilDoProfissional } from '@/lib/perfilApoioServidor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  const cpf = (request.nextUrl.searchParams.get('cpf_inspetor') ?? '').replace(/\D/g, '')
  if (!cpf) return NextResponse.json({ erro: 'cpf_inspetor obrigatório' }, { status: 400 })
  const acessoDono = await exigirProprio(request, cpf)
  if (acessoDono.ok === false) return acessoDono.resposta
  return NextResponse.json({ perfil: await perfilDoProfissional(cpf) })
}
