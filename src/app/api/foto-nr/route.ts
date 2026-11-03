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
import { exigirSessao, exigirProprioOuVinculado } from '@/lib/autorizacao'
import { listarArquivosComPrefixo } from '@/lib/armazenamento'
import { pendentesDaCombinacao } from '@/lib/pendentes'

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

// Remove de "vistorias/" as pendentes da combinação (chave do inspetor + CNPJ/CPF + serviço). Melhor esforço: se falhar, a higienização
// semanal (185 dias) é a segunda rede, e a numeração segue normalmente.
async function limparPendentesAntigas(cpfInspetor: string, cnpjoucpf: string, tipoServico: string) {
  try {
    const { data: insp } = await supabase.from('inspetor').select('chave_inspetor').eq('cpf_inspetor', cpfInspetor).maybeSingle()
    const chave = insp?.chave_inspetor
    if (!chave) return
    const arquivos = await listarArquivosComPrefixo(supabase, 'vistorias', chave)
    const alvo = pendentesDaCombinacao(arquivos.map(a => a.name), chave, cnpjoucpf, tipoServico)
    if (alvo.length === 0) return
    const { error } = await supabase.storage.from('aime').remove(alvo.map(n => `vistorias/${n}`))
    if (error) console.error('[foto-nr] limpeza de pendentes falhou:', error.message)
    else console.log(`[foto-nr] reinício da numeração: ${alvo.length} pendente(s) antiga(s) removida(s)`)
  } catch (e) {
    console.error('[foto-nr] limpeza de pendentes falhou:', e instanceof Error ? e.message : e)
  }
}

// ─── GET — consulta o próximo número sem incrementar ─────────────────────────
// Uso: /api/foto-nr?cpf_inspetor=X&cnpjoucpf=Y&tipo_servico=31

export async function GET(request: NextRequest) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  const p = request.nextUrl.searchParams
  const cpf_inspetor = p.get('cpf_inspetor')
  const cnpjoucpf    = p.get('cnpjoucpf')
  const tipo_servico = p.get('tipo_servico')
  // DONO (AUTH_API_ATIVA): o titular do CPF, ou o eletricista vinculado a ele (fluxo elétrico).
  const acessoDono = await exigirProprioOuVinculado(request, cpf_inspetor)
  if (acessoDono.ok === false) return acessoDono.resposta

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
//
// Usa a função atômica proximo_numero_foto (PostgreSQL) em vez de ler-depois-
// escrever separadamente — elimina a janela onde dois salvamentos próximos
// no tempo (ex: o mesmo inspetor trocando de ativo e salvando rápido em
// seguida) poderiam calcular o MESMO próximo número e um sobrescrever o
// arquivo do outro silenciosamente. Adicionado como precaução em 14/09/2026
// após um caso de item de vistoria que sumiu sem deixar rastro.

export async function POST(request: NextRequest) {
  // PORTEIRO (AUTH_API_ATIVA): exige sessão válida. Inerte enquanto a variável não for exatamente "true".
  const acessoApi = await exigirSessao(request)
  if (acessoApi.ok === false) return acessoApi.resposta
  const body = await request.json()
  const { cpf_inspetor, cnpjoucpf, tipo_servico } = body
  // DONO (AUTH_API_ATIVA): o titular do CPF, ou o eletricista vinculado a ele (fluxo elétrico).
  const acessoDono = await exigirProprioOuVinculado(request, cpf_inspetor)
  if (acessoDono.ok === false) return acessoDono.resposta

  if (!cpf_inspetor || !cnpjoucpf || !tipo_servico) {
    return NextResponse.json(
      { erro: 'Campos obrigatórios: cpf_inspetor, cnpjoucpf, tipo_servico' },
      { status: 400 }
    )
  }

  // A numeração vai reiniciar? (já existe contador e passou o limite). Se sim, as vistorias PENDENTES (não homologadas) desta combinação
  // têm mais de 60 dias sem uso e, com a numeração recomeçando em 1, poderiam colidir com as novas. Saem junto com o reinício.
  const { data: contador } = await supabase
    .from('foto_contador').select('updated_at')
    .eq('cpf_inspetor', cpf_inspetor).eq('cnpjoucpf', cnpjoucpf).eq('tipo_servico', tipo_servico)
    .maybeSingle()
  const vaiReiniciar = !!contador?.updated_at && deveReiniciar(contador.updated_at)

  const { data: novoNr, error } = await supabase.rpc('proximo_numero_foto', {
    p_cpf_inspetor: cpf_inspetor,
    p_cnpjoucpf: cnpjoucpf,
    p_tipo_servico: tipo_servico,
    p_limite_dias: LIMITE_DIAS_REINICIO,
  })

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  if (vaiReiniciar) await limparPendentesAntigas(String(cpf_inspetor), String(cnpjoucpf), String(tipo_servico))

  return NextResponse.json({
    nr:        novoNr,
    formatado: String(novoNr).padStart(3, '0'),
  })
}
