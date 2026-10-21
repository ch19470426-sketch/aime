// src/app/api/salvar-ativo/route.ts
// AIMÊ — Cadastro de um ativo a vistoriar (tabela ativos_a_vistoriar) PELO SERVIDOR. Antes a tela do plano gravava direto do navegador com a chave pública, e por isso
// a tabela tinha uma política de INSERT aberta a qualquer pessoa (alerta rls_policy_always_true do Supabase). Agora só o servidor grava, e só o próprio inspetor.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirSessao, exigirProprio } from '@/lib/autorizacao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Colunas que o cadastro do ativo grava. A data do cadastro NÃO entra: o banco a preenche com o relógio do servidor.
const COLUNAS = [
  'cpf_inspetor', 'cnpjoucpf', 'tipo_servico', 'tipo_ativo', 'tag_ativo_nr_serie', 'data_inicio_operacao', 'numero_pavimentos', 'numero_unidades_salas',
  'area_terreno', 'area_construida', 'numero_fachadas', 'perimetro_fachadas', 'fabricante_marca', 'subtipo', 'tensao_pressao_kv_kpa',
  'capacidade_potencia', 'fluido_classe_fluido', 'volume_interno_m3',
] as const

export async function POST(request: NextRequest) {
  try {
    const acessoApi = await exigirSessao(request)
    if (acessoApi.ok === false) return acessoApi.resposta
    const corpo = await request.json()
    const cpf = String(corpo?.cpf_inspetor ?? '').replace(/\D/g, '')
    if (!cpf || !corpo?.cnpjoucpf || !corpo?.tipo_servico || !corpo?.tipo_ativo) {
      return NextResponse.json({ erro: 'cpf_inspetor, cnpjoucpf, tipo_servico e tipo_ativo são obrigatórios.', message: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }
    const acessoDono = await exigirProprio(request, cpf)
    if (acessoDono.ok === false) return acessoDono.resposta

    const linha: Record<string, unknown> = {}
    for (const coluna of COLUNAS) if (corpo[coluna] !== undefined) linha[coluna] = corpo[coluna]
    linha.cpf_inspetor = cpf

    const { error } = await supabase.from('ativos_a_vistoriar').insert(linha)
    if (error) return NextResponse.json({ erro: error.message, message: error.message }, { status: error.code === '23505' ? 409 : 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: String(e), message: String(e) }, { status: 500 })
  }
}
