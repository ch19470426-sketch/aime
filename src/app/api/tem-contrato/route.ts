// src/app/api/tem-contrato/route.ts
// AIMÊ — Usado pelo dashboard para decidir se o inspetor precisa ser
// redirecionado para /escolher-plano (nunca escolheu nenhum plano ainda,
// nem mesmo Cortesia). Gestor está sempre isento dessa obrigação.

import { NextRequest, NextResponse } from 'next/server'
import { ehGestor, temAlgumContrato, temPedidoPendenteRecente } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cpf = new URL(request.url).searchParams.get('cpf_inspetor')
  if (!cpf) return NextResponse.json({ erro: 'cpf_inspetor é obrigatório' }, { status: 400 })

  const gestor = await ehGestor(cpf)
  const tem = gestor === true ? true : await temAlgumContrato(cpf)
  // temContrato: há contrato de verdade (a tela de pagamento usa isto para saber que o pagamento
  //   foi reconhecido). liberado: contrato OU pagamento em andamento — é o que o portão do
  //   dashboard usa: quem já escolheu o plano e está pagando entra no menu sem esperar.
  const pendente = tem ? false : await temPedidoPendenteRecente(cpf)
  return NextResponse.json({ temContrato: tem, liberado: tem || pendente, pagamentoPendente: pendente, gestor: gestor === true })
}
