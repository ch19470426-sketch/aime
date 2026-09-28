import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exigirGestor } from '@/lib/autorizacao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// AIMÊ — Painel Geral do Módulo Gestor. Cada indicador traz dois números:
// "total" (desde sempre) e "desde" (só a partir da data de referência
// informada, quando fizer sentido para aquele indicador).
//
// Limitação conhecida (decisão de Celso, 28/09/2026): as tabelas
// contratos_inspetor e dados_vistoria só guardam DATA, sem horário — o
// "tempo até a 1ª vistoria" é calculado em DIAS, não em horas.

type Contrato = {
  cpf_inspetor: string
  tipo_assinatura: string
  data_inicio_contrato: string
  data_fim_contrato: string | null
  qde_contratada_plano: number | null
  qde_contratada_avulso: number | null
  saldo_quantidade_plano: number | null
  saldo_quantidade_avulso: number | null
}

/** Lista TODOS os arquivos de uma pasta do Storage, paginando (o list() do Supabase limita por chamada). */
async function listarTodosArquivos(pasta: string): Promise<{ name: string; created_at: string }[]> {
  const todos: { name: string; created_at: string }[] = []
  const tamanhoPagina = 1000
  for (let offset = 0; offset < 200000; offset += tamanhoPagina) {
    const { data, error } = await supabase.storage.from('aime').list(pasta, { limit: tamanhoPagina, offset })
    if (error || !data) break
    for (const f of data) if (f.created_at) todos.push({ name: f.name, created_at: f.created_at })
    if (data.length < tamanhoPagina) break
  }
  return todos
}

/**
 * Agrupa os arquivos de documentos_inspetor por DOCUMENTO (não por arquivo —
 * cada laudo/plano gera .html + .pdf +, às vezes, _assinado.pdf; os três
 * contam como UM documento só). Devolve, por categoria, a data da primeira
 * geração de cada documento.
 */
function agruparDocumentos(arquivos: { name: string; created_at: string }[]) {
  const porBase = new Map<string, { categoria: 'laudo' | 'plano_manut' | null; primeiraData: string }>()
  for (const f of arquivos) {
    const base = f.name.replace(/(_assinado)?\.(html|pdf|json)$/i, '')
    const categoria = base.includes('_laudo_') ? 'laudo' : base.includes('_plano_manut_') ? 'plano_manut' : null
    if (!categoria) continue
    const atual = porBase.get(base)
    if (!atual || f.created_at < atual.primeiraData) porBase.set(base, { categoria, primeiraData: f.created_at })
  }
  return [...porBase.values()]
}

export async function GET(request: NextRequest) {
  try {
    const acesso = await exigirGestor(request)
    if (acesso.ok === false) return acesso.resposta

    const desde = new URL(request.url).searchParams.get('desde') // 'AAAA-MM-DD' ou null
    const hoje = new Date().toISOString().slice(0, 10)

    // ---------- 1. Inspetores ----------
    const { data: inspetores } = await supabase
      .from('inspetor').select('cpf_inspetor, nome_inspetor, data_cadastro')
    const totalInspetores = inspetores?.length ?? 0
    const inspetoresDesde = desde ? (inspetores ?? []).filter(i => (i.data_cadastro ?? '') >= desde).length : null

    // ---------- 2. Contratos (base para varios indicadores) ----------
    const { data: contratosRaw } = await supabase
      .from('contratos_inspetor')
      .select('cpf_inspetor,tipo_assinatura,data_inicio_contrato,data_fim_contrato,qde_contratada_plano,qde_contratada_avulso,saldo_quantidade_plano,saldo_quantidade_avulso')
      .order('data_inicio_contrato', { ascending: false })
    const contratos: Contrato[] = contratosRaw ?? []

    // "Contrato atual" de cada inspetor = o de INICIO MAIS RECENTE. Comparado
    // explicitamente por data (nao confia na ordem devolvida pela consulta —
    // um .order() mal aplicado, ou um empate de data, nao pode inverter qual
    // contrato conta como "atual").
    const contratoAtualPorCpf = new Map<string, Contrato>()
    for (const c of contratos) {
      const atual = contratoAtualPorCpf.get(c.cpf_inspetor)
      if (!atual || c.data_inicio_contrato > atual.data_inicio_contrato) contratoAtualPorCpf.set(c.cpf_inspetor, c)
    }

    // Contrato VIGENTE de cada inspetor (data_fim >= hoje) — usado so para o
    // saldo de plano, mesma regra da funcao saldo_creditos() no banco. Entre
    // vigentes, tambem o de inicio mais recente.
    const contratoVigentePorCpf = new Map<string, Contrato>()
    for (const c of contratos) {
      if ((c.data_fim_contrato ?? '') < hoje) continue
      const atual = contratoVigentePorCpf.get(c.cpf_inspetor)
      if (!atual || c.data_inicio_contrato > atual.data_inicio_contrato) contratoVigentePorCpf.set(c.cpf_inspetor, c)
    }

    // ---------- Indicador: inspetores por tipo de plano ----------
    const porPlanoTotal: Record<string, number> = {}
    const porPlanoDesde: Record<string, number> = {}
    for (const c of contratoAtualPorCpf.values()) {
      porPlanoTotal[c.tipo_assinatura] = (porPlanoTotal[c.tipo_assinatura] ?? 0) + 1
      if (desde && c.data_inicio_contrato >= desde) porPlanoDesde[c.tipo_assinatura] = (porPlanoDesde[c.tipo_assinatura] ?? 0) + 1
    }

    // ---------- Indicador: creditos contratados (fluxo) e disponiveis (estoque) ----------
    const creditosContratadosTotal = contratos.reduce((s, c) => s + (c.qde_contratada_plano ?? 0) + (c.qde_contratada_avulso ?? 0), 0)
    const creditosContratadosDesde = desde
      ? contratos.filter(c => c.data_inicio_contrato >= desde).reduce((s, c) => s + (c.qde_contratada_plano ?? 0) + (c.qde_contratada_avulso ?? 0), 0)
      : null
    // Disponivel e sempre o saldo ATUAL (estoque) — nao existe "saldo de uma data passada" no banco, so o presente.
    let creditosDisponiveis = 0
    for (const cpf of new Set(contratos.map(c => c.cpf_inspetor))) {
      creditosDisponiveis += contratoVigentePorCpf.get(cpf)?.saldo_quantidade_plano ?? 0
      creditosDisponiveis += contratoAtualPorCpf.get(cpf)?.saldo_quantidade_avulso ?? 0
    }

    // ---------- 3. Vistorias (dados_vistoria) ----------
    const { data: vistoriasRaw } = await supabase
      .from('dados_vistoria').select('cpf_inspetor, data_vistoria')
    const vistorias = vistoriasRaw ?? []
    const totalVistoriasTotal = vistorias.length
    const totalVistoriasDesde = desde ? vistorias.filter(v => (v.data_vistoria ?? '') >= desde).length : null

    // Primeira vistoria de cada inspetor (para o indicador de tempo)
    const primeiraVistoriaPorCpf = new Map<string, string>()
    for (const v of vistorias) {
      if (!v.data_vistoria) continue
      const atual = primeiraVistoriaPorCpf.get(v.cpf_inspetor)
      if (!atual || v.data_vistoria < atual) primeiraVistoriaPorCpf.set(v.cpf_inspetor, v.data_vistoria)
    }

    // ---------- Indicador: tempo medio (dias) do contrato ATUAL ate a 1a vistoria ----------
    // Nao exclui diferenca negativa (vistoria feita antes do inicio do
    // contrato atual, comum quando o inspetor trocou de plano depois de ja
    // ter vistoriado em testes) — entra na media do jeito que e, para sempre
    // haver um valor no card, em vez de "—" quando ninguem se encaixar.
    const diferencasDias: number[] = []
    const diferencasDiasDesde: number[] = []
    for (const [cpf, contratoAtual] of contratoAtualPorCpf) {
      const primeira = primeiraVistoriaPorCpf.get(cpf)
      if (!primeira) continue
      const dias = (new Date(primeira).getTime() - new Date(contratoAtual.data_inicio_contrato).getTime()) / 86400000
      diferencasDias.push(dias)
      if (desde && contratoAtual.data_inicio_contrato >= desde) diferencasDiasDesde.push(dias)
    }
    const media = (arr: number[]) => arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null
    const diasAteVistoriaTotal = media(diferencasDias)
    const diasAteVistoriaDesde = desde ? media(diferencasDiasDesde) : null

    // ---------- 4 e 5. Laudos e planos de manutencao gerados (Storage) ----------
    const arquivos = await listarTodosArquivos('documentos_inspetor')
    const documentos = agruparDocumentos(arquivos)
    const laudosTotal = documentos.filter(d => d.categoria === 'laudo').length
    const planosManutTotal = documentos.filter(d => d.categoria === 'plano_manut').length
    const laudosDesde = desde ? documentos.filter(d => d.categoria === 'laudo' && d.primeiraData.slice(0, 10) >= desde).length : null
    const planosManutDesde = desde ? documentos.filter(d => d.categoria === 'plano_manut' && d.primeiraData.slice(0, 10) >= desde).length : null

    // ---------- Indicador: vistorias por laudo tecnico (media geral) ----------
    const vistoriasPorLaudoTotal = laudosTotal > 0 ? totalVistoriasTotal / laudosTotal : null
    const vistoriasPorLaudoDesde = desde && laudosDesde && laudosDesde > 0 && totalVistoriasDesde !== null
      ? totalVistoriasDesde / laudosDesde : null

    return NextResponse.json({
      desde,
      inspetores: { total: totalInspetores, desde: inspetoresDesde },
      porPlano: { total: porPlanoTotal, desde: desde ? porPlanoDesde : null },
      diasAtePrimeiraVistoria: { total: diasAteVistoriaTotal, desde: diasAteVistoriaDesde },
      vistoriasPorLaudo: { total: vistoriasPorLaudoTotal, desde: vistoriasPorLaudoDesde },
      laudosGerados: { total: laudosTotal, desde: laudosDesde },
      planosManutencaoGerados: { total: planosManutTotal, desde: planosManutDesde },
      creditos: {
        contratadosTotal: creditosContratadosTotal,
        contratadosDesde: creditosContratadosDesde,
        disponiveis: creditosDisponiveis,
      },
      // Mantidos para nao quebrar a aba "Inspetores" e outros usos existentes do resumo
      totalInspetores,
      inspetoresAtivos: contratoVigentePorCpf.size,
      contratosVigentes: contratoVigentePorCpf.size,
      totalCrPlano: [...contratoVigentePorCpf.values()].reduce((s, c) => s + (c.saldo_quantidade_plano ?? 0), 0),
      totalCrAvulso: [...contratoAtualPorCpf.values()].reduce((s, c) => s + (c.saldo_quantidade_avulso ?? 0), 0),
      totalCrConsumo: 0,
      inspetoresSemContrato: (inspetores ?? [])
        .filter(i => !contratoVigentePorCpf.has(i.cpf_inspetor))
        .map(i => i.nome_inspetor),
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
