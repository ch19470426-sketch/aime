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
//   * Falha de infraestrutura NUNCA bloqueia o usuário: na dúvida, libera e registra o erro.

import { createClient } from '@supabase/supabase-js'

// ───────────────────────── Configuração ─────────────────────────

export function cobrancaAtiva(): boolean {
  return process.env.COBRANCA_CREDITOS_ATIVA === 'true'
}

/** Créditos que cada plano pago concede (mesmos valores de trocar-plano). */
export const PLANO_CR: Record<string, number> = {
  'PLANO SERVIÇO': 600,
  'PLANO MENSAL': 1200,
  'PLANO ESCRITÓRIO': 3000, // era 3600 até 05/10/2026 (24% do SM); agora 20% do SM, ~10 processos completos
}

/**
 * Preço de cada plano, em CENTAVOS (evita erro de ponto flutuante com
 * dinheiro). Definidos por Celso em 29/09/2026. PLANO CORTESIA não é
 * vendável (concedido só pela gestão) — sem preço aqui de propósito.
 */
export const PLANO_PRECO_CENTAVOS: Record<string, number> = {
  'PLANO SERVIÇO': 8100,
  'PLANO MENSAL': 13770,
  // 20% do salario minimo de referencia (R$ 1.620,00) = R$ 324,00. Era 24% = R$ 388,80
  // ate 05/10/2026 (Celso). Mudar so aqui e nos cartoes de escolher-plano.
  'PLANO ESCRITÓRIO': 32400,
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

/** Tipos de plano que dão direito a comprar créditos avulsos — decisão de
 *  Celso, 29/09/2026: avulso só para quem já tem Mensal ou Escritório
 *  vigente (Cortesia e Serviço não dão esse direito). */
const PLANOS_QUE_PERMITEM_AVULSO = ['PLANO MENSAL', 'PLANO ESCRITÓRIO']

/**
 * O CPF tem, HOJE, um contrato vigente (data_fim_contrato >= hoje) do tipo
 * Mensal ou Escritório? Entre vários vigentes, olha o de início mais
 * recente — mesma regra usada no resto do módulo de créditos.
 */
export async function podeComprarAvulso(cpf: string): Promise<boolean> {
  try {
    // Verifica se EXISTE algum contrato vigente do tipo certo — não olha só
    // "o mais recente" (bug real: com vários planos vigentes na MESMA data,
    // a ordenação por data empata entre eles e pode escolher qualquer um,
    // inclusive um tipo que não libera avulso, mesmo com Mensal/Escritório
    // tambem vigentes ao mesmo tempo — achado de Celso, 30/09/2026).
    const { data } = await admin()
      .from('contratos_inspetor').select('tipo_assinatura')
      .eq('cpf_inspetor', cpf).gte('data_fim_contrato', new Date().toISOString().slice(0, 10))
      .in('tipo_assinatura', PLANOS_QUE_PERMITEM_AVULSO)
      .limit(1).maybeSingle()
    return !!data
  } catch { return false }
}

/**
 * O CPF já tem QUALQUER contrato registrado (de qualquer tipo, vigente ou
 * não)? Usado para saber se é a primeira vez do inspetor escolhendo um
 * plano — decisão de Celso, 30/09/2026: todo inspetor é obrigado a
 * escolher um plano (mesmo que Cortesia) no primeiro acesso, aplicado
 * também retroativamente a quem já existe no sistema sem nenhum contrato.
 * Em caso de erro, retorna true (na dúvida, NÃO interrompe o acesso).
 */
export async function temAlgumContrato(cpf: string): Promise<boolean> {
  try {
    const { data, error } = await admin()
      .from('contratos_inspetor').select('cpf_inspetor').eq('cpf_inspetor', cpf).limit(1).maybeSingle()
    if (error) return true
    return !!data
  } catch { return true }
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
  cpf: string, tipo: string, qdeCreditos: number,
  // Assinatura: o contrato vale ATÉ essa data (próximo vencimento da cobrança, 'AAAA-MM-DD') em vez
  // dos 30 dias fixos — evita um dia sem plano em mês de 31 dias. Só o webhook de assinaturas usa.
  opcoes?: { fimAssinatura?: string }
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = admin()
  try {
    if (tipo === 'AVULSO') {
      const hojeAvulso = new Date().toISOString().slice(0, 10)
      // Validade de 90 dias — so para avulso concedido A PARTIR desta
      // mudanca (02/10/2026). Avulso concedido antes continua sem
      // vencimento (data_fim_avulso fica null), por decisao de Celso.
      const fimAvulso = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const { data: contrato } = await supabase
        .from('contratos_inspetor').select('*')
        .eq('cpf_inspetor', cpf).gte('data_fim_contrato', hojeAvulso)
        .order('data_inicio_contrato', { ascending: false }).limit(1).maybeSingle()

      if (contrato) {
        const { error } = await supabase.from('contratos_inspetor').update({
          qde_contratada_avulso: contrato.qde_contratada_avulso + qdeCreditos,
          saldo_quantidade_avulso: contrato.saldo_quantidade_avulso + qdeCreditos,
          data_fim_avulso: fimAvulso,
        }).eq('cpf_inspetor', cpf).eq('tipo_assinatura', contrato.tipo_assinatura)
          .eq('data_inicio_contrato', contrato.data_inicio_contrato)
        if (error) return { ok: false, erro: error.message }
      } else {
        const { error } = await supabase.from('contratos_inspetor').insert({
          cpf_inspetor: cpf, tipo_assinatura: 'PLANO SERVIÇO', // placeholder p/ satisfazer o check
          data_inicio_contrato: hojeAvulso,
          qde_contratada_plano: 0, saldo_quantidade_plano: 0,
          qde_contratada_avulso: qdeCreditos, saldo_quantidade_avulso: qdeCreditos,
          data_fim_avulso: fimAvulso,
        })
        if (error) return { ok: false, erro: error.message }
      }
      return { ok: true }
    }

    // Plano (MENSAL/SERVIÇO/ESCRITÓRIO) — normalmente um contrato novo, mas
    // a chave primária é (cpf, tipo_assinatura, data_inicio_contrato): se o
    // MESMO tipo já foi contratado HOJE por este CPF (ex.: testando duas
    // vezes no mesmo dia, ou renovação no mesmo dia em que o plano anterior
    // ainda está cheio), a linha já existe e não pode ser duplicada, e
    // qde_contratada_plano só aceita valores fixos (0/600/1200/3000) — não dá para "somar"
    // ali. A correção de 30/09 que só "renovava" o saldo ao valor cheio
    // DESCARTAVA o que foi pago se o saldo já estivesse cheio (achado de
    // Celso). Correto: o excedente entra como AVULSO — pool sem essa trava
    // de valor fixo (só exige múltiplo de 600) — garantindo que o
    // pagamento sempre vira crédito de verdade, nunca se perde.
    const hoje = new Date().toISOString().slice(0, 10)
    const { data: jaExiste } = await supabase
      .from('contratos_inspetor').select('qde_contratada_plano,saldo_quantidade_plano,qde_contratada_avulso,saldo_quantidade_avulso')
      .eq('cpf_inspetor', cpf).eq('tipo_assinatura', tipo).eq('data_inicio_contrato', hoje)
      .maybeSingle()

    if (jaExiste) {
      const faltaParaEncher = jaExiste.qde_contratada_plano - jaExiste.saldo_quantidade_plano
      const paraPlano = Math.min(faltaParaEncher, qdeCreditos)   // preenche o plano ate o teto antes de sobrar
      const excedente = qdeCreditos - paraPlano                  // o resto vira avulso, nunca se perde
      const atualizacao: Record<string, number | string> = {
        saldo_quantidade_plano: jaExiste.saldo_quantidade_plano + paraPlano,
        qde_contratada_avulso: jaExiste.qde_contratada_avulso + excedente,
        saldo_quantidade_avulso: jaExiste.saldo_quantidade_avulso + excedente,
      }
      // So renova a validade do avulso se algo foi de fato adicionado a ele
      // agora — nao mexe na data so por reprocessar um pedido sem excedente.
      if (excedente > 0) {
        atualizacao.data_fim_avulso = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      }
      if (opcoes?.fimAssinatura) atualizacao.data_fim_assinatura = opcoes.fimAssinatura
      const { error } = await supabase.from('contratos_inspetor').update(atualizacao)
        .eq('cpf_inspetor', cpf).eq('tipo_assinatura', tipo).eq('data_inicio_contrato', hoje)
      if (error) return { ok: false, erro: error.message }
      return { ok: true }
    }

    // TROCA/RENOVAÇÃO DE PLANO: se existe QUALQUER contrato vigente (mesmo
    // tipo mas de um dia anterior — ex.: comprou Mensal de novo por engano
    // enquanto o Mensal da semana passada ainda está ativo — ou de um tipo
    // diferente), o saldo desse contrato antigo é ZERADO (data_fim_contrato
    // não pode ser alterada — ver nota abaixo) e TUDO que ele ainda tinha —
    // saldo de plano não usado E qualquer avulso que já carregava — migra
    // para o avulso do contrato novo (sem vencimento). A colisão de MESMO
    // tipo + MESMO dia já foi tratada acima (jaExiste) e retorna antes de
    // chegar aqui, então não há risco de pegar a mesma linha duas vezes.
    // Decisão de Celso, 01/10/2026: nada se perde, em nenhum dos casos.
    const { data: planoAntigo } = await supabase
      .from('contratos_inspetor').select('tipo_assinatura,data_inicio_contrato,saldo_quantidade_plano,qde_contratada_avulso,saldo_quantidade_avulso,data_fim_avulso')
      .eq('cpf_inspetor', cpf)
      .gte('data_fim_contrato', hoje)
      .order('data_inicio_contrato', { ascending: false }).limit(1).maybeSingle()

    let avulsoMigradoQde = 0
    let avulsoMigradoSaldo = 0
    if (planoAntigo) {
      avulsoMigradoQde = planoAntigo.saldo_quantidade_plano + planoAntigo.qde_contratada_avulso
      avulsoMigradoSaldo = planoAntigo.saldo_quantidade_plano + planoAntigo.saldo_quantidade_avulso
      // data_fim_contrato NAO pode ser definida diretamente (coluna
      // controlada por gatilho no banco - so aceita DEFAULT). Zerar o
      // saldo já atinge o efeito prático: mesmo que a linha antiga
      // continue "vigente" pela data, sem saldo ela não contribui em
      // nada numa próxima consulta de disponibilidade/consumo — e a
      // linha NOVA (data_inicio_contrato de hoje) sempre é escolhida
      // primeiro por ser mais recente. Achado real de Celso, 01/10/2026.
      const { error: erroEncerra } = await supabase.from('contratos_inspetor').update({
        saldo_quantidade_plano: 0, qde_contratada_avulso: 0, saldo_quantidade_avulso: 0,
      }).eq('cpf_inspetor', cpf).eq('tipo_assinatura', planoAntigo.tipo_assinatura).eq('data_inicio_contrato', planoAntigo.data_inicio_contrato)
      if (erroEncerra) return { ok: false, erro: erroEncerra.message }
    }

    const { error } = await supabase.from('contratos_inspetor').insert({
      cpf_inspetor: cpf, tipo_assinatura: tipo,
      data_inicio_contrato: hoje,
      qde_contratada_plano: qdeCreditos, saldo_quantidade_plano: qdeCreditos,
      qde_contratada_avulso: avulsoMigradoQde, saldo_quantidade_avulso: avulsoMigradoSaldo,
      // Preserva a validade que o avulso ja tinha (ou null = sem
      // vencimento) — isto e realocacao do que ja existia, nao uma nova
      // concessao, entao NAO renova os 90 dias.
      data_fim_avulso: planoAntigo?.data_fim_avulso ?? null,
      ...(opcoes?.fimAssinatura ? { data_fim_assinatura: opcoes.fimAssinatura } : {}),
    })
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: String(e) }
  }
}
