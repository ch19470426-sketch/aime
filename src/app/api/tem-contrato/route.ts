// src/app/api/tem-contrato/route.ts
// AIMÊ — Usado pelo dashboard para decidir se o inspetor precisa ser
// redirecionado para /escolher-plano (nunca escolheu nenhum plano ainda,
// nem mesmo Cortesia). Gestor está sempre isento dessa obrigação.

import { NextRequest, NextResponse } from 'next/server'
import { ehGestor, temAlgumContrato, temPedidoPendenteRecente } from '@/lib/creditos'
import { contaBloqueada } from '@/lib/bloqueio'
import { exigirSessao } from '@/lib/autorizacao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // A identidade vem da SESSÃO, nunca da URL: quem chama só vê a situação da PRÓPRIA conta, e qualquer cpf_inspetor na URL é ignorado. Antes a rota
  // aceitava o CPF da URL sem login e devolvia contrato, bloqueio e motivo de QUALQUER CPF. Só com o porteiro desligado (desenvolvimento) o parâmetro vale.
  const acesso = await exigirSessao(request)
  if (acesso.ok === false) return acesso.resposta
  const cpf = acesso.ativa ? acesso.cpf : new URL(request.url).searchParams.get('cpf_inspetor')
  if (!cpf) return NextResponse.json({ erro: 'Não foi possível identificar o usuário.' }, { status: 400 })

  const gestor = await ehGestor(cpf)
  const tem = gestor === true ? true : await temAlgumContrato(cpf)
  // temContrato: há contrato de verdade (a tela de pagamento usa isto para saber que o pagamento
  //   foi reconhecido). liberado: contrato OU pagamento em andamento — é o que o portão do
  //   dashboard usa: quem já escolheu o plano e está pagando entra no menu sem esperar.
  const pendente = tem ? false : await temPedidoPendenteRecente(cpf)
  // Conta bloqueada (estorno, chargeback ou cartão recusado 3 vezes): o dashboard leva à tela "Conta bloqueada".
  const bloqueio = gestor === true ? { bloqueada: false, motivo: undefined } : await contaBloqueada(cpf)
  return NextResponse.json({
    temContrato: tem, liberado: tem || pendente, pagamentoPendente: pendente, gestor: gestor === true,
    bloqueada: bloqueio.bloqueada, bloqueioMotivo: bloqueio.motivo ?? null,
  })
}
