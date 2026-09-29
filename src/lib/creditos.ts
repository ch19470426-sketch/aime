// src/lib/creditos.ts
// AIMÊ — Créditos (CR): custos por serviço, isenção de gestor, verificação
// de disponibilidade e consumo. Preparação para a integração com o Asaas.
//
// Como funciona
//   * A cobrança fica DESLIGADA por padrão. Só liga com a variável de
//     ambiente COBRANCA_CREDITOS_ATIVA=true (Vercel). Desligada, nada muda
//     para ninguém: verificar() libera tudo e consumir() não debita.
//   * Gestor (inspetor.is_gestor = true) é SEMPRE isento: não precisa ter
//     crédito, não tem crédito debitado. A isenção é aplicada em DOIS
//     lugares independentes — aqui e dentro da função SQL consumir_creditos
//     — para que um chamador que esqueça de checar não cobre um gestor.
//   * O débito em si é atômico no banco (sql/2026-09-27_creditos_asaas.sql).
//   * Falha de infraestrutura NUNCA bloqueia o usuário (mesma filosofia do
//     verificar-acesso): na dúvida, libera e registra o erro.

import { createClient } from '@supabase/supabase-js'

// ───────────────────────── Configuração ─────────────────────────

export function cobrancaAtiva(): boolean {
  return process.env.COBRANCA_CREDITOS_ATIVA === 'true'
}

/** Créditos que cada plano pago concede (mesmos valores de trocar-plano). */
export const PLANO_CR: Record<string, number> = {
  'PLANO SERVIÇO': 600,
  'PLANO MENSAL': 1200,
  'PLANO ESCRITÓRIO': 3600,
}

/**
 * Preço de cada plano, em CENTAVOS (evita erro de ponto flutuante com
 * dinheiro). Definidos por Celso em 29/09/2026. PLANO CORTESIA não é
 * vendável (concedido só pela gestão) — sem preço aqui de propósito.
 */
export const PLANO_PRECO_CENTAVOS: Record<string, number> = {
  'PLANO SERVIÇO': 8100,
  'PLANO MENSAL': 13770,
  'PLANO ESCRITÓRIO': 38880,
}

/** Avulso é vendido em múltiplos de 600 CR (mesma regra de adicionar-avulso). */
export const AVULSO_MULTIPLO = 600
export const AVULSO_MAXIMO = 36000
/** Preço por unidade de 600 CR avulso, em centavos — mesma taxa do PLANO SERVIÇO. */
export const AVULSO_PRECO_UNITARIO_CENTAVOS = 8100

/** Preço total (centavos) de uma contratação — null se o tipo não for vendável. */
export function precoCentavos(tipo: string, qdeCreditos: number): number | null {
  if (tipo === 'AVULSO') {
    const unidades = qdeCreditos / AVULSO_MULTIPLO
    return Number.isInteger(unidades) && unidades > 0 ? unidades * AVULSO_PRECO_UNITARIO_CENTAVOS : null
  }
  return PLANO_PRECO_CENTAVOS[tipo] ?? null
}

/** Vistoria só inicia com pelo menos este saldo disponível (especificação). */
export const MINIMO_INICIAR_VISTORIA = 100

// ─────────────────── Custo por serviço (parte pura) ───────────────────
// Especificação combinada em 05/09/2026:
//   proposta comercial 25 CR · plano de trabalho 25 CR · vistoria 1 CR
//   por foto · laudo 100 CR · plano de manutenção 50 CR

export type CategoriaServico =
  | 'proposta' | 'plano_trabalho' | 'vistoria' | 'laudo' | 'plano_manutencao'

const CUSTO_UNITARIO: Record<CategoriaServico, number> = {
  proposta: 25,
  plano_trabalho: 25,
  vistoria: 1,          // por foto
  laudo: 100,
  plano_manutencao: 50,
}

/** Classifica o código de serviço do menu. null = serviço não cobrado. */
export function categoriaDoServico(codigo: number): CategoriaServico | null {
  if (codigo >= 11 && codigo <= 18) return 'proposta'
  if (codigo >= 21 && codigo <= 28) return 'plano_trabalho'
  if ((codigo >= 31 && codigo <= 38) || codigo === 39) return 'vistoria'
  if (codigo >= 41 && codigo <= 48) return 'laudo'
  if (codigo >= 51 && codigo <= 58) return 'plano_manutencao'
  return null   // 40 (homologar), 61-64 (consultas), 99 (sair)…
}

/**
 * Custo em CR de uma execução. Para vistoria, `quantidade` é o número de
 * fotos; para os demais serviços é sempre 1 execução.
 * null = serviço não cobrado.
 */
export function custoDoServico(codigo: number, quantidade = 1): number | null {
  const cat = categoriaDoServico(codigo)
  if (!cat) return null
  const qtd = cat === 'vistoria' ? Math.max(1, Math.floor(quantidade)) : 1
  return CUSTO_UNITARIO[cat] * qtd
}

/** Saldo mínimo exigido para INICIAR o serviço. */
export function custoParaIniciar(codigo: number): number | null {
  const cat = categoriaDoServico(codigo)
  if (!cat) return null
  return cat === 'vistoria' ? MINIMO_INICIAR_VISTORIA : CUSTO_UNITARIO[cat]
}

// ─────────────── Decisões (partes puras, testáveis sem banco) ───────────────

export type Saldo = {
  existe: boolean
  isento?: boolean
  saldo_plano?: number
  saldo_avulso?: number
  saldo_total?: number
}

export type Verificacao = {
  liberado: boolean
  motivo:
    | 'cobranca_inativa' | 'servico_nao_cobrado' | 'isento_gestor'
    | 'saldo_ok' | 'saldo_insuficiente' | 'verificacao_indisponivel'
  necessario?: number
  saldoTotal?: number
  faltam?: number
}

/** Decide se o serviço pode iniciar, dado o saldo lido do banco. */
export function decidirVerificacao(saldo: Saldo | null, necessario: number): Verificacao {
  // Sem leitura confiável → libera (nunca bloqueia por engano)
  if (!saldo || !saldo.existe) return { liberado: true, motivo: 'verificacao_indisponivel' }
  if (saldo.isento) return { liberado: true, motivo: 'isento_gestor' }
  const total = saldo.saldo_total ?? 0
  if (total >= necessario) return { liberado: true, motivo: 'saldo_ok', necessario, saldoTotal: total }
  return {
    liberado: false, motivo: 'saldo_insuficiente',
    necessario, saldoTotal: total, faltam: necessario - total,
  }
}

export type ResultadoConsumo = {
  ok: boolean
  cobrado: boolean
  motivo:
    | 'cobranca_inativa' | 'servico_nao_cobrado' | 'isento_gestor' | 'duplicado'
    | 'debitado' | 'saldo_insuficiente' | 'inspetor_nao_encontrado' | 'erro'
  debitadoPlano?: number
  debitadoAvulso?: number
  saldoPlano?: number
  saldoAvulso?: number
  necessario?: number
  erro?: string
}

/** Traduz o JSON devolvido por consumir_creditos() para o resultado da API. */
export function interpretarConsumo(r: any): ResultadoConsumo {
  if (!r || typeof r !== 'object') return { ok: false, cobrado: false, motivo: 'erro', erro: 'resposta vazia' }
  if (r.isento)   return { ok: true, cobrado: false, motivo: 'isento_gestor' }
  if (r.duplicado) return { ok: true, cobrado: false, motivo: 'duplicado' }
  if (r.ok) {
    return {
      ok: true, cobrado: true, motivo: 'debitado',
      debitadoPlano: r.debitado_plano, debitadoAvulso: r.debitado_avulso,
      saldoPlano: r.saldo_plano, saldoAvulso: r.saldo_avulso,
    }
  }
  if (r.motivo === 'saldo_insuficiente') {
    return {
      ok: false, cobrado: false, motivo: 'saldo_insuficiente',
      necessario: r.necessario, saldoPlano: r.saldo_plano, saldoAvulso: r.saldo_avulso,
    }
  }
  if (r.motivo === 'inspetor_nao_encontrado') return { ok: false, cobrado: false, motivo: 'inspetor_nao_encontrado' }
  return { ok: false, cobrado: false, motivo: 'erro', erro: String(r.motivo ?? 'desconhecido') }
}

// ───────────────────────── Acesso ao banco ─────────────────────────

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * true/false conforme inspetor.is_gestor; null se não foi possível
 * determinar. Lê a tabela diretamente — funciona mesmo antes de a
 * migração SQL dos créditos ser aplicada.
 */
export async function ehGestor(cpf: string): Promise<boolean | null> {
  try {
    const { data, error } = await admin()
      .from('inspetor').select('is_gestor').eq('cpf_inspetor', cpf).maybeSingle()
    if (error || !data) return null
    return data.is_gestor === true
  } catch { return null }
}

/** Saldo via função SQL. null se a migração ainda não foi aplicada ou houve erro. */
export async function lerSaldo(cpf: string): Promise<Saldo | null> {
  try {
    const { data, error } = await admin().rpc('saldo_creditos', { p_cpf: cpf })
    if (error) { console.error('[creditos] saldo_creditos:', error.message); return null }
    return data as Saldo
  } catch (e) { console.error('[creditos] saldo_creditos exceção:', e); return null }
}

/** Pode este CPF INICIAR este serviço? (Gate a ser ligado no dashboard.) */
export async function verificarDisponibilidade(cpf: string, codigoServico: number): Promise<Verificacao> {
  if (!cobrancaAtiva()) return { liberado: true, motivo: 'cobranca_inativa' }
  const necessario = custoParaIniciar(codigoServico)
  if (necessario === null) return { liberado: true, motivo: 'servico_nao_cobrado' }
  return decidirVerificacao(await lerSaldo(cpf), necessario)
}

/**
 * Registra o consumo de créditos de uma execução. Gestor: nada é debitado.
 * `referencia` torna a chamada idempotente (ex.: nome do arquivo da foto).
 * O chamador NÃO deve bloquear o trabalho do usuário se isto falhar.
 */
export async function consumirCreditos(
  cpf: string,
  codigoServico: number,
  opcoes: { quantidade?: number; cnpjoucpf?: string; referencia?: string } = {}
): Promise<ResultadoConsumo> {
  if (!cobrancaAtiva()) return { ok: true, cobrado: false, motivo: 'cobranca_inativa' }
  const custo = custoDoServico(codigoServico, opcoes.quantidade ?? 1)
  if (custo === null) return { ok: true, cobrado: false, motivo: 'servico_nao_cobrado' }

  try {
    const { data, error } = await admin().rpc('consumir_creditos', {
      p_cpf: cpf,
      p_custo: custo,
      p_codigo_servico: String(codigoServico),
      p_cnpjoucpf: opcoes.cnpjoucpf ?? null,
      p_referencia: opcoes.referencia ?? null,
    })
    if (error) {
      console.error('[creditos] consumir_creditos:', error.message)
      return { ok: false, cobrado: false, motivo: 'erro', erro: error.message }
    }
    return interpretarConsumo(data)
  } catch (e) {
    console.error('[creditos] consumir_creditos exceção:', e)
    return { ok: false, cobrado: false, motivo: 'erro', erro: String(e) }
  }
}

/**
 * Concede créditos de verdade (após pagamento confirmado). Mesma lógica já
 * usada em /api/trocar-plano (plano) e /api/gestor/adicionar-avulso
 * (avulso) — extraída aqui para o webhook do Asaas reaproveitar, em vez de
 * duplicar. data_fim_contrato NUNCA é definida aqui: é calculada por um
 * gatilho no próprio banco a partir de data_inicio_contrato, exatamente
 * como nessas duas rotas já fazem.
 */
export async function concederCreditos(
  cpf: string, tipo: string, qdeCreditos: number
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = admin()
  try {
    if (tipo === 'AVULSO') {
      const { data: contrato } = await supabase
        .from('contratos_inspetor').select('*')
        .eq('cpf_inspetor', cpf).gte('data_fim_contrato', new Date().toISOString().slice(0, 10))
        .order('data_inicio_contrato', { ascending: false }).limit(1).maybeSingle()

      if (contrato) {
        const { error } = await supabase.from('contratos_inspetor').update({
          qde_contratada_avulso: contrato.qde_contratada_avulso + qdeCreditos,
          saldo_quantidade_avulso: contrato.saldo_quantidade_avulso + qdeCreditos,
        }).eq('cpf_inspetor', cpf).eq('tipo_assinatura', contrato.tipo_assinatura)
          .eq('data_inicio_contrato', contrato.data_inicio_contrato)
        if (error) return { ok: false, erro: error.message }
      } else {
        const { error } = await supabase.from('contratos_inspetor').insert({
          cpf_inspetor: cpf, tipo_assinatura: 'PLANO SERVIÇO', // placeholder p/ satisfazer o check
          data_inicio_contrato: new Date().toISOString().slice(0, 10),
          qde_contratada_plano: 0, saldo_quantidade_plano: 0,
          qde_contratada_avulso: qdeCreditos, saldo_quantidade_avulso: qdeCreditos,
        })
        if (error) return { ok: false, erro: error.message }
      }
      return { ok: true }
    }

    // Plano (MENSAL/SERVIÇO/ESCRITÓRIO) — novo contrato
    const { error } = await supabase.from('contratos_inspetor').insert({
      cpf_inspetor: cpf, tipo_assinatura: tipo,
      data_inicio_contrato: new Date().toISOString().slice(0, 10),
      qde_contratada_plano: qdeCreditos, saldo_quantidade_plano: qdeCreditos,
      qde_contratada_avulso: 0, saldo_quantidade_avulso: 0,
    })
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: String(e) }
  }
}
