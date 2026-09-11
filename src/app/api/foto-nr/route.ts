export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/foto-nr/route.ts
// AIMÊ — Numeração sequencial de fotos
//
// Chave: cpf_inspetor + cnpjoucpf + tipo_servico
// Sequência contínua para a mesma combinação — MAS reinicia em 1 se passaram
// mais de 60 dias desde o último uso (evita numeração crescendo para sempre
// em vistorias muito espaçadas no tempo, como o mesmo cliente revisitado
// mais de um ano depois). Testado isoladamente antes de aplicar — ver commit.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LIMITE_DIAS_REINICIO = 60

// Decide se a numeração deve reiniciar em 1: sem registro anterior, ou mais
// de LIMITE_DIAS_REINICIO dias desde o último uso registrado.
function deveReiniciar(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  const diffDias = diffMs / (1000 * 60 * 60 * 24)
  return diffDias > LIMITE_DIAS_REINICIO
}

// ─── GET — consulta o próximo número sem incrementar ─────────────────────────
// Uso: /api/foto-nr?cpf_inspetor=X&cnpjoucpf=Y&tipo_servico=31

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const cpf_inspetor = p.get('cpf_inspetor')
  const cnpjoucpf    = p.get('cnpjoucpf')
  const tipo_servico = p.get('tipo_servico')

  if (!cpf_inspetor || !cnpjoucpf || !tipo_servico) {
    return NextResponse.json(
      { erro: 'Parâmetros obrigatórios: cpf_inspetor, cnpjoucpf, tipo_servico' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('foto_contador')
    .select('ultimo_nr,updated_at')
    .eq('cpf_inspetor', cpf_inspetor)
    .eq('cnpjoucpf',    cnpjoucpf)
    .eq('tipo_servico', tipo_servico)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  const reiniciar = deveReiniciar(data?.updated_at)
  const proximo = reiniciar ? 1 : (data?.ultimo_nr ?? 0) + 1
  return NextResponse.json({
    proximo,
    formatado: String(proximo).padStart(3, '0'),
  })
}

// ─── POST — incrementa e retorna o número a ser usado ────────────────────────
// Body: { cpf_inspetor, cnpjoucpf, tipo_servico }

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { cpf_inspetor, cnpjoucpf, tipo_servico } = body

  if (!cpf_inspetor || !cnpjoucpf || !tipo_servico) {
    return NextResponse.json(
      { erro: 'Campos obrigatórios: cpf_inspetor, cnpjoucpf, tipo_servico' },
      { status: 400 }
    )
  }

  // Lê o valor atual (pode não existir ainda)
  const { data: atual } = await supabase
    .from('foto_contador')
    .select('ultimo_nr,updated_at')
    .eq('cpf_inspetor', cpf_inspetor)
    .eq('cnpjoucpf',    cnpjoucpf)
    .eq('tipo_servico', tipo_servico)
    .single()

  const reiniciar = deveReiniciar(atual?.updated_at)
  const novoNr = reiniciar ? 1 : (atual?.ultimo_nr ?? 0) + 1

  // Upsert: cria se não existir, atualiza se já existir. updated_at sempre
  // avança para agora, marcando esta como a atividade mais recente.
  const { error } = await supabase
    .from('foto_contador')
    .upsert(
      { cpf_inspetor, cnpjoucpf, tipo_servico, ultimo_nr: novoNr, updated_at: new Date().toISOString() },
      { onConflict: 'cpf_inspetor,cnpjoucpf,tipo_servico' }
    )

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({
    nr:        novoNr,
    formatado: String(novoNr).padStart(3, '0'),
    reiniciado: reiniciar,
  })
}
