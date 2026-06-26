// src/app/vistoria/tela31/page.tsx
// AIMÊ — Tela 31: Autovistoria Predial v9
// Usando Tailwind CSS para garantir formatação correta na Vercel

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useVistoria31 } from '@/hooks/useVistoria31'
import type { FormVistoria, FeedbackIa } from '@/hooks/useVistoria31'

interface ItemSistema    { sistema: string }
interface ItemSubsistema { sistema: string; subsistema: string }
interface ItemAnomalia   { sistema: string; subsistema: string; anomalias: string }
interface ItemParametro  { tipo_parametro: string; descricao_parametros: string }
interface ItemAtivo      { tipo_ativo: string; tag_ativo_nr_serie: string }

const VALOR_GUT: Record<string, number> = {
  'Estética': 1, 'Leve': 2, 'Moderada': 3, 'Alta': 4, 'Crítica': 5,
  'Pode aguardar': 1, 'Planejar': 3, 'Imediata': 5,
  'Ponto isolado': 1, 'Vários pontos': 3, 'Sistema completo': 5,
  'Baixa': 1, 'Média': 3,
}

const TEXTO_FEEDBACK: Record<NonNullable<FeedbackIa>, string> = {
  avaliando_ambiente:  '🔍 Avaliando características do ambiente...',
  analisando_anomalia: '🔬 Analisando anomalia/falha...',
  cruzando_parametros: '⚙️ Cruzando parâmetros técnicos...',
  gerando_nc:          '✍️ Gerando Não Conformidade (NC)...',
  gerando_cp:          '✍️ Gerando Causa Provável (CP)...',
  concluido:           '✅ NC e CP geradas com sucesso!',
  erro:                '⚠️ Erro ao acionar a IA.',
}

const TITULO_TELA: Record<string, string> = {
  '31': 'Autovistoria Predial — NBR 16747',
  '32': 'Inspeção Predial — NBR 16747',
  '33': 'Recebimento de Imóvel Novo — NBR 15575',
  '34': 'Inspeção de Fachada — NBR 16083',
  '35': 'Inspeção de Elevadores',
  '36': 'Inspeção NR-10 — Instalações Elétricas',
  '37': 'Inspeção NR-12 — Máquinas e Equipamentos',
  '38': 'Inspeção NR-13 — Vasos de Pressão e Caldeiras',
}

const TIPO_SERVICO_BANCO: Record<string, string> = {
  '31': '31 Autovistoria', '32': '32 Vistoria inspeção',
  '33': '33 Vistoria imóvel novo', '34': '34 Vistoria fachada',
  '35': '35 Vistoria elevador', '36': '36 Vistoria nr-10',
  '37': '37 Vistoria nr-12', '38': '38 Vistoria nr-13',
}

// ─── Wrapper com Suspense ─────────────────────────────────────────────────────

export default function Tela31Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#E8EEF7]">
        <div className="bg-[#1E3A8A] px-5 py-3 flex items-center gap-3 sticky top-0 z-50 shadow-md">
          <span className="text-white font-black text-lg tracking-widest">AIMÊ</span>
          <span className="text-white font-semibold text-sm flex-1 text-center">Carregando...</span>
        </div>
        <p className="text-center p-16 text-slate-500">Carregando dados da vistoria...</p>
      </div>
    }>
      <Tela31Inner />
    </Suspense>
  )
}

// ─── Componente interno ───────────────────────────────────────────────────────

function Tela31Inner() {
  const router   = useRouter()
  const params   = useSearchParams()
  const supabase = createClient()

  const cpfInspetor      = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor    = params.get('chave_inspetor') ?? cpfInspetor
  const cnpjoucpf        = params.get('cnpjoucpf')      ?? ''
  const tipoServico      = params.get('tipo_servico')   ?? '31'
  const tipoServicoBanco = TIPO_SERVICO_BANCO[tipoServico] ?? `${tipoServico} Autovistoria`
  const tagObrigatorio   = ['35', '37', '38'].includes(tipoServico)

  const [sistemas,     setSistemas]     = useState<ItemSistema[]>([])
  const [subsistemas,  setSubsistemas]  = useState<ItemSubsistema[]>([])
  const [anomalias,    setAnomalias]    = useState<ItemAnomalia[]>([])
  const [origens,      setOrigens]      = useState<string[]>([])
  const [locais,       setLocais]       = useState<string[]>([])
  const [gravidades,   setGravidades]   = useState<string[]>([])
  const [urgencias,    setUrgencias]    = useState<string[]>([])
  const [abrangencias, setAbrangencias] = useState<string[]>([])
  const [exposicoes,   setExposicoes]   = useState<string[]>([])
  const [ativos,       setAtivos]       = useState<ItemAtivo[]>([])
  const [carregando,   setCarregando]   = useState(true)

  const {
    form, estado,
    atualizar, inicializarIdentificacao,
    tirarFotoEGerarNcCp, salvarDados,
    encerrarVistoria, resetarSucesso, podeEncerrar,
  } = useVistoria31(cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico)

  const subsistemasFiltrados = [...new Set(
    subsistemas.filter((s) => s.sistema === form.sistema).map((s) => s.subsistema)
  )]
  const anomaliasFiltradas = anomalias
    .filter((a) => a.sistema === form.sistema && a.subsistema === form.subsistema)
    .flatMap((a) => a.anomalias.split(';').map((x) => x.trim()).filter(Boolean))
  const tiposAtivo    = [...new Set(ativos.map((a) => a.tipo_ativo))]
  const tagsFiltradas = ativos
    .filter((a) => a.tipo_ativo === form.tipoAtivo)
    .map((a) => a.tag_ativo_nr_serie)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
console.log('Buscando estabelecimento:', cnpjoucpf)
if (cnpjoucpf) {
  const { data, error } = await supabase
    .from('estabelecimento')
    .select('cnpjoucpf, razao_social_nome')
    .eq('cnpjoucpf', cnpjoucpf)
    .single()
  console.log('Resultado:', data, 'Erro:', error)
      if (cnpjoucpf) {
        const { data } = await supabase
          .from('estabelecimento')
          .select('cnpjoucpf, razao_social_nome')
          .eq('cnpjoucpf', cnpjoucpf)
          .single()
        if (data) inicializarIdentificacao(data.cnpjoucpf, data.razao_social_nome)
      }

      if (cpfInspetor) {
        const { data } = await supabase
          .from('ativos_a_vistoriar')
          .select('tipo_ativo, tag_ativo_nr_serie, data_cadastro')
          .eq('cpf_inspetor', cpfInspetor)
          .order('data_cadastro', { ascending: false })
        if (data) setAtivos(data)
      }

      const { data: sis } = await supabase
        .from('sistemas_construtivos')
        .select('sistema')
        .eq('tipo_servico', tipoServicoBanco)
        .order('sistema')
      if (sis) setSistemas([...new Map(sis.map((s) => [s.sistema, s])).values()])

      const { data: sub } = await supabase
        .from('sistemas_construtivos')
        .select('sistema, subsistema')
        .eq('tipo_servico', tipoServicoBanco)
        .not('subsistema', 'is', null)
      if (sub) setSubsistemas(sub)

      const { data: ano } = await supabase
        .from('sistemas_construtivos')
        .select('sistema, subsistema, anomalias')
        .eq('tipo_servico', tipoServicoBanco)
        .not('anomalias', 'is', null)
      if (ano) setAnomalias(ano)

      const { data: par } = await supabase
        .from('tabela_parametros')
        .select('tipo_parametro, descricao_parametros')
        .eq('tipo_servico', tipoServicoBanco)
        .order('tipo_parametro')
        .order('descricao_parametros')
      if (par) {
        const f = (tipo: string) =>
          par.filter((p) => p.tipo_parametro === tipo).map((p) => p.descricao_parametros)
        setOrigens(f('Origem'))
        setLocais(f('Local ocorrência'))
        setGravidades(f('Gravidade'))
        setUrgencias(f('Urgência'))
        setAbrangencias(f('Abrangência'))
        setExposicoes(f('Exposição'))
      }

      setCarregando(false)
    }
    carregar()
  }, [cpfInspetor, cnpjoucpf, tipoServico])

  function onSistemaChange(v: string) {
    atualizar('sistema', v); atualizar('subsistema', ''); atualizar('anomalia', '')
  }
  function onSubsistemaChange(v: string) {
    atualizar('subsistema', v); atualizar('anomalia', '')
  }
  function onGutChange(campo: 'gravidade'|'urgencia'|'abrangencia'|'exposicao', desc: string) {
    atualizar(campo, (VALOR_GUT[desc] ?? 1) as FormVistoria[typeof campo])
  }

  const corGR = form.grauRisco >= 64 ? 'text-red-600 border-red-600' :
                form.grauRisco >= 35 ? 'text-amber-600 border-amber-600' : 'text-green-600 border-green-600'
  const corGRtxt = form.grauRisco >= 64 ? '#DC2626' : form.grauRisco >= 35 ? '#D97706' : '#16A34A'

  if (carregando) return (
    <div className="min-h-screen bg-[#E8EEF7]">
      <Header tipoServico={tipoServico} />
      <p className="text-center p-16 text-slate-500">Carregando dados da vistoria...</p>
    </div>
  )

  if (estado.sucesso) return (
    <div className="min-h-screen bg-[#E8EEF7]">
      <Header tipoServico={tipoServico} />
      <div className="max-w-3xl mx-auto mt-4 mx-4 bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center py-10">
          <div className="text-6xl mb-3">✅</div>
          <h2 className="text-[#1E3A8A] text-xl font-bold mb-2">Registro salvo com sucesso!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Arquivo: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{estado.ultimoArquivoSalvo}</code>
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={resetarSucesso} className="bg-[#1E3A8A] text-white font-bold px-6 py-3 rounded-full hover:opacity-90">
              ➕ Nova Manifestação
            </button>
            <button onClick={() => encerrarVistoria(() => router.push('/dashboard'))}
              className="bg-white text-red-600 border-2 border-red-600 font-bold px-6 py-3 rounded-full hover:opacity-90">
              ✖ Encerrar Vistoria
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#E8EEF7] pb-8">
      <Header tipoServico={tipoServico} />

      <div className="max-w-3xl mx-auto mt-4 px-3">
        <div className="bg-white rounded-2xl shadow-lg p-5">
          {/* Divisor */}
          <div className="h-0.5 bg-[#1E3A8A] rounded mb-5" />

          {/* IDENTIFICAÇÃO */}
          <Secao titulo="Identificação">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="CNPJ ou CPF">
                <input value={form.cnpjoucpf} readOnly className={inputRO} />
              </Campo>
              <Campo label="Razão Social ou Nome">
                <input value={form.razaoSocialNome} readOnly className={inputRO} />
              </Campo>
              <Campo label="Tipo Ativo *">
                <select className={sel} value={form.tipoAtivo}
                  onChange={(e) => { atualizar('tipoAtivo', e.target.value); atualizar('tagAtivoNrSerie', '') }}>
                  <option value="">Selecione...</option>
                  {tiposAtivo.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo label={tagObrigatorio ? 'TAG / Nº Série *' : 'TAG / Nº Série'}>
                <select className={sel} value={form.tagAtivoNrSerie}
                  onChange={(e) => atualizar('tagAtivoNrSerie', e.target.value)}
                  disabled={!form.tipoAtivo}>
                  <option value="">Selecione...</option>
                  {tagsFiltradas.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Campo>
            </div>
          </Secao>

          {/* MANIFESTAÇÃO PATOLÓGICA */}
          <Secao titulo="Manifestação Patológica">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Sistema *">
                <select className={sel} value={form.sistema} onChange={(e) => onSistemaChange(e.target.value)}>
                  <option value="">Selecione...</option>
                  {sistemas.map((s) => <option key={s.sistema} value={s.sistema}>{s.sistema}</option>)}
                </select>
              </Campo>
              <Campo label="Subsistema *">
                <select className={sel} value={form.subsistema}
                  onChange={(e) => onSubsistemaChange(e.target.value)} disabled={!form.sistema}>
                  <option value="">Selecione...</option>
                  {subsistemasFiltrados.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Campo>
              <Campo label="Anomalia ou Falha *">
                <select className={sel} value={form.anomalia}
                  onChange={(e) => atualizar('anomalia', e.target.value)} disabled={!form.subsistema}>
                  <option value="">Selecione...</option>
                  {anomaliasFiltradas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Campo>
              <Campo label="Origem *">
                <select className={sel} value={form.origem} onChange={(e) => atualizar('origem', e.target.value)}>
                  <option value="">Selecione...</option>
                  {origens.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Campo>
              <Campo label="Local *">
                <select className={sel} value={form.local} onChange={(e) => atualizar('local', e.target.value)}>
                  <option value="">Selecione...</option>
                  {locais.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Complemento do Local">
                <input type="text" className={inp} value={form.complemento}
                  onChange={(e) => atualizar('complemento', e.target.value)}
                  placeholder="Detalhe opcional..." />
              </Campo>
            </div>
          </Secao>

          {/* CLASSIFICAÇÃO DE RISCO */}
          <Secao titulo="Classificação de Risco">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Gravidade *',   lista: gravidades,   campo: 'gravidade'   as const },
                { label: 'Urgência *',    lista: urgencias,    campo: 'urgencia'    as const },
                { label: 'Abrangência *', lista: abrangencias, campo: 'abrangencia' as const },
                { label: 'Exposição *',   lista: exposicoes,   campo: 'exposicao'   as const },
              ].map(({ label, lista, campo }) => (
                <Campo key={campo} label={label}>
                  <select className={sel} onChange={(e) => onGutChange(campo, e.target.value)}>
                    <option value="">Sel...</option>
                    {lista.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Campo>
              ))}
            </div>
            <div className="flex gap-3 mt-3 flex-wrap">
              <div className={`flex-1 min-w-32 bg-slate-50 rounded-xl p-3 border-2 ${corGR}`}>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Grau de Risco</div>
                <div className="text-4xl font-black leading-none" style={{ color: corGRtxt }}>{form.grauRisco}</div>
                <div className="text-xs text-slate-400 mt-1 leading-snug">GR = ROUND((0,4×Gra+0,3×Urg+0,2×Abr+0,1×Exp)×20)</div>
              </div>
              <div className={`flex-[2] min-w-48 bg-slate-50 rounded-xl p-3 border-2 ${corGR}`}>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Prioridade</div>
                <div className="text-xl font-bold" style={{ color: corGRtxt }}>{form.prioridade}</div>
                <div className="text-xs text-slate-600 mt-1 leading-snug">{form.definicaoPrioridade}</div>
              </div>
            </div>
          </Secao>

          {/* EVIDÊNCIA FOTOGRÁFICA */}
          <Secao titulo="Evidência Fotográfica">
            <div className="flex gap-4 flex-wrap items-start mb-3">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Foto Nº</div>
                <div className="text-4xl font-black text-[#1E3A8A] leading-none">{form.fotoNr || '—'}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Data Vistoria</div>
                <div className="text-base font-semibold text-slate-700 mt-1">{form.dataVistoria}</div>
              </div>
              {form.fotoBase64 && (
                <div className="flex-1 min-w-40">
                  <img src={form.fotoBase64} alt="Foto da anomalia"
                    className="w-full max-h-56 object-cover rounded-xl border-2 border-[#1E3A8A]" />
                </div>
              )}
            </div>
            {!form.fotoBase64 && (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400 text-sm">
                📷 A foto aparecerá aqui após acionar "Tirar Foto"
              </div>
            )}
            {estado.feedbackIa && estado.feedbackIa !== 'concluido' && estado.feedbackIa !== 'erro' && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mt-3 text-blue-700 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                {TEXTO_FEEDBACK[estado.feedbackIa]}
              </div>
            )}
            {estado.feedbackIa === 'concluido' && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mt-3 text-green-700 text-sm font-medium">
                {TEXTO_FEEDBACK.concluido}
              </div>
            )}
            {estado.feedbackIa === 'erro' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mt-3 text-red-700 text-sm">
                {TEXTO_FEEDBACK.erro} {estado.erroIa}
              </div>
            )}
          </Secao>

          {/* RESULTADO DA ANÁLISE */}
          <Secao titulo="Resultado da Análise e Avaliação">
            <Campo label={`Não Conformidade (NC)${form.ncGeradaPorIa ? ' — ✨ gerada por IA' : ''}`}>
              <textarea className={txt} value={form.nc} maxLength={200} rows={3}
                onChange={(e) => atualizar('nc', e.target.value)}
                placeholder="Será preenchida automaticamente após tirar a foto..." />
              <div className="text-xs text-slate-400 text-right mt-0.5">{form.nc.length}/200 caracteres</div>
            </Campo>
            <Campo label={`Causa Provável (CP)${form.cpGeradaPorIa ? ' — ✨ gerada por IA' : ''}`}>
              <textarea className={txt} value={form.cp} maxLength={200} rows={3}
                onChange={(e) => atualizar('cp', e.target.value)}
                placeholder="Será preenchida automaticamente após tirar a foto..." />
              <div className="text-xs text-slate-400 text-right mt-0.5">{form.cp.length}/200 caracteres</div>
            </Campo>
          </Secao>

          {estado.erroSave && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-red-700 text-sm mb-3">
              ⚠️ {estado.erroSave}
            </div>
          )}

          {/* BOTÕES */}
          <div className="flex gap-2.5 justify-center flex-wrap border-t border-slate-200 pt-5 mt-5">
            <button onClick={tirarFotoEGerarNcCp}
              disabled={!!estado.feedbackIa && estado.feedbackIa !== 'concluido' && estado.feedbackIa !== 'erro'}
              className="bg-teal-700 text-white font-bold px-6 py-3 rounded-full disabled:opacity-50 hover:opacity-90 text-sm sm:text-base">
              📷 Tirar Foto
            </button>
            <button onClick={salvarDados} disabled={estado.salvando || !form.fotoNr}
              className="bg-[#1E3A8A] text-white font-bold px-6 py-3 rounded-full disabled:opacity-50 hover:opacity-90 text-sm sm:text-base">
              {estado.salvando ? '💾 Salvando...' : '💾 Salvar Dados'}
            </button>
            <button onClick={() => encerrarVistoria(() => router.push('/dashboard'))}
              disabled={!podeEncerrar}
              className="bg-white text-red-600 border-2 border-red-600 font-bold px-6 py-3 rounded-full disabled:opacity-40 hover:opacity-90 text-sm sm:text-base">
              ✖ Encerrar Vistoria
            </button>
          </div>

          {!podeEncerrar && (
            <p className="text-center text-xs text-amber-600 mt-2">
              ⚠️ Salve o último registro antes de encerrar a vistoria.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Header({ tipoServico }: { tipoServico: string }) {
  return (
    <div className="bg-[#1E3A8A] px-5 py-3 flex items-center gap-3 sticky top-0 z-50 shadow-md">
      <span className="text-white font-black text-lg tracking-widest flex-shrink-0">AIMÊ</span>
      <span className="text-white font-semibold text-sm flex-1 text-center leading-snug">
        {TITULO_TELA[tipoServico] ?? `Vistoria Tipo ${tipoServico}`}
      </span>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-bold text-[#1E3A8A] uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">
        {titulo}
      </div>
      {children}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  )
}

// ─── Classes Tailwind reutilizáveis ───────────────────────────────────────────

const inp = "w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-800 outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100"
const inputRO = "w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500"
const sel = "w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-800 outline-none focus:border-[#1E3A8A] cursor-pointer"
const txt = "w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-800 outline-none focus:border-[#1E3A8A] resize-y min-h-16 leading-relaxed font-sans"
