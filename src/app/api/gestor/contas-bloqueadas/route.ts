// src/app/api/gestor/contas-bloqueadas/route.ts
// AIMÊ — Lista as contas bloqueadas (estorno, chargeback ou cartão recusado 3 vezes) para o Painel do Gestor.
// SEGURANÇA: só gestor, com checagem PRÓPRIA e sempre ativa (não depende de AUTH_API_ATIVA).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sessaoDaRequisicao } from '@/lib/sessaoServidor'
import { ehGestor } from '@/lib/creditos'
import { TEXTO_MOTIVO } from '@/lib/textosBloqueio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const sessao = await sessaoDaRequisicao(request)
    if (!sessao) return NextResponse.json({ erro: 'Sessão inválida ou expirada.' }, { status: 401 })
    if ((await ehGestor(sessao.cpf)) !== true) return NextResponse.json({ erro: 'Acesso restrito a gestores.' }, { status: 403 })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await supabase.from('inspetor')
      .select('cpf_inspetor,nome_inspetor,inspetor_email,bloqueio_motivo,bloqueio_em')
      .eq('conta_bloqueada', true).order('bloqueio_em', { ascending: false })
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({
      contas: (data ?? []).map(c => ({ ...c, texto_motivo: TEXTO_MOTIVO[c.bloqueio_motivo ?? ''] ?? c.bloqueio_motivo ?? '' })),
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
