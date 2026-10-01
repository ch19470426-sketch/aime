// src/app/api/gestor/alternar-gestor/route.ts
// AIMÊ — Promove um inspetor a gestor, ou remove esse direito.
//
// NÃO cria conta nova nem senha — só alterna is_gestor de um inspetor que
// JÁ tem cadastro e login próprios (decisão de Celso, 01/10/2026: o fluxo
// antigo de "+ Novo Gestor" criava um registro sem conta de login nenhuma
// e nunca definia is_gestor — substituído por isto).
//
// SEGURANÇA (concede/remove um privilégio administrativo):
//   * Checagem de gestor SEMPRE ativa (não usa exigirGestor, que fica
//     inerte se AUTH_API_ATIVA estiver desligada — mesmo motivo da rota de
//     higienização: uma ação deste tipo não pode depender de uma chave que
//     pode estar desligada).
//   * Um gestor não pode alterar o PRÓPRIO status (evita se trancar fora
//     sem querer).
//   * Não é permitido remover o ÚLTIMO gestor restante (o sistema ficaria
//     sem ninguém para administrar).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const sessao = await sessaoDaRequisicao(request)
    if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
    if ((await ehGestor(sessao.cpf)) !== true) {
      return NextResponse.json({ erro: 'Acesso negado.' }, { status: 403 })
    }

    const { cpf, novoValor } = await request.json()
    if (!cpf || typeof novoValor !== 'boolean') {
      return NextResponse.json({ erro: 'cpf e novoValor (true/false) são obrigatórios.' }, { status: 400 })
    }

    if (cpf === sessao.cpf) {
      return NextResponse.json({ erro: 'Você não pode alterar seu próprio status de gestor.' }, { status: 400 })
    }

    if (novoValor === false) {
      const { count } = await supabase
        .from('inspetor').select('cpf_inspetor', { count: 'exact', head: true }).eq('is_gestor', true)
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ erro: 'Não é possível remover o último gestor restante do sistema.' }, { status: 400 })
      }
    }

    const { error } = await supabase.from('inspetor').update({ is_gestor: novoValor }).eq('cpf_inspetor', cpf)
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
