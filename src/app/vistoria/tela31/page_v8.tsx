// src/app/vistoria/tela31/page.tsx
// AIMÊ — Tela 31: Autovistoria Predial v8
// Correções: estilos inline (funciona no Next.js 16), anomalias separadas por ";"

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

export default function Tela31Page() {
  return (
    <Suspense fallback={
      <div style={S.page}>
        <div style={S.header}>
          <span style={S.logo}>AIMÊ</span>
          <span style={S.headerTitulo}>Carregando...</span>
        </div>
        <p style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
          Carregando dados da vistoria...
        </p>
      </div>
    }>
      <Tela31Inner />
    </Suspense>
  )
}

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

  // Anomalias: separa string por ";" e filtra por sistema+subsistema
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

  const corGR = form.grauRisco >= 64 ? '#DC2626' : form.grauRisco >= 35 ? '#D97706' : '#16A34A'

  if (carregando) return (
    <div style={S.page}>
      <Header tipoServico={tipoServico} />
      <p style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
        Carregando dados da vistoria...
      </p>
    </div>
  )

  if (estado.sucesso) return (
    <div style={S.page}>
      <Header tipoServico={tipoServico} />
      <div style={S.card}>
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>✅</div>
          <h2 style={{ color: '#1E3A8A', marginBottom: '8px', fontSize: '20px' }}>
            Registro salvo com sucesso!
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
            Arquivo: <code style={S.code}>{estado.ultimoArquivoSalvo}</code>
          </p>
          <div style={S.botoes}>
            <Btn cor="primario" onClick={resetarSucesso}>➕ Nova Manifestação</Btn>
            <Btn cor="encerrar" onClick={() => encerrarVistoria(() => router.push('/dashboard'))}>
              ✖ Encerrar Vistoria
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <Header tipoServico={tipoServico} />
      <div style={S.card}>
        <div style={S.divisor} />

        {/* IDENTIFICAÇÃO */}
        <Secao titulo="Identificação">
          <div style={S.grid2}>
            <Campo label="CNPJ ou CPF">
              <input value={form.cnpjoucpf} readOnly style={S.inputRO} />
            </Campo>
            <Campo label="Razão Social ou Nome">
              <input value={form.razaoSocialNome} readOnly style={S.inputRO} />
            </Campo>
            <Campo label="Tipo Ativo *">
              <select style={S.select} value={form.tipoAtivo}
                onChange={(e) => { atualizar('tipoAtivo', e.target.value); atualizar('tagAtivoNrSerie', '') }}>
                <option value="">Selecione...</option>
                {tiposAtivo.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo label={tagObrigatorio ? 'TAG / Nº Série *' : 'TAG / Nº Série'}>
              <select style={S.select} value={form.tagAtivoNrSerie}
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
          <div style={S.grid2}>
            <Campo label="Sistema *">
              <select style={S.select} value={form.sistema} onChange={(e) => onSistemaChange(e.target.value)}>
                <option value="">Selecione...</option>
                {sistemas.map((s) => <option key={s.sistema} value={s.sistema}>{s.sistema}</option>)}
              </select>
            </Campo>
            <Campo label="Subsistema *">
              <select style={S.select} value={form.subsistema}
                onChange={(e) => onSubsistemaChange(e.target.value)} disabled={!form.sistema}>
                <option value="">Selecione...</option>
                {subsistemasFiltrados.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Campo>
            <Campo label="Anomalia ou Falha *">
              <select style={S.select} value={form.anomalia}
                onChange={(e) => atualizar('anomalia', e.target.value)} disabled={!form.subsistema}>
                <option value="">Selecione...</option>
                {anomaliasFiltradas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Campo>
            <Campo label="Origem *">
              <select style={S.select} value={form.origem} onChange={(e) => atualizar('origem', e.target.value)}>
                <option value="">Selecione...</option>
                {origens.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Campo>
            <Campo label="Local *">
              <select style={S.select} value={form.local} onChange={(e) => atualizar('local', e.target.value)}>
                <option value="">Selecione...</option>
                {locais.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Campo>
            <Campo label="Complemento do Local">
              <input type="text" style={S.input} value={form.complemento}
                onChange={(e) => atualizar('complemento', e.target.value)}
                placeholder="Detalhe opcional..." />
            </Campo>
          </div>
        </Secao>

        {/* CLASSIFICAÇÃO DE RISCO */}
        <Secao titulo="Classificação de Risco">
          <div style={S.grid4}>
            {[
              { label: 'Gravidade *',   lista: gravidades,   campo: 'gravidade'   as const },
              { label: 'Urgência *',    lista: urgencias,    campo: 'urgencia'    as const },
              { label: 'Abrangência *', lista: abrangencias, campo: 'abrangencia' as const },
              { label: 'Exposição *',   lista: exposicoes,   campo: 'exposicao'   as const },
            ].map(({ label, lista, campo }) => (
              <Campo key={campo} label={label}>
                <select style={S.select} onChange={(e) => onGutChange(campo, e.target.value)}>
                  <option value="">Sel...</option>
                  {lista.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </Campo>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            <div style={{ ...S.painel, borderColor: corGR, flex: 1, minWidth: '130px' }}>
              <div style={S.painelLabel}>GRAU DE RISCO</div>
              <div style={{ fontSize: '38px', fontWeight: 800, color: corGR, lineHeight: 1 }}>
                {form.grauRisco}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px', lineHeight: 1.4 }}>
                GR = ROUND((0,4×Gra + 0,3×Urg + 0,2×Abr + 0,1×Exp)×20)
              </div>
            </div>
            <div style={{ ...S.painel, borderColor: corGR, flex: 2, minWidth: '200px' }}>
              <div style={S.painelLabel}>PRIORIDADE</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: corGR }}>{form.prioridade}</div>
              <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px', lineHeight: 1.4 }}>
                {form.definicaoPrioridade}
              </div>
            </div>
          </div>
        </Secao>

        {/* EVIDÊNCIA FOTOGRÁFICA */}
        <Secao titulo="Evidência Fotográfica">
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={S.painelLabel}>FOTO Nº</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#1E3A8A', lineHeight: 1 }}>
                {form.fotoNr || '—'}
              </div>
            </div>
            <div>
              <div style={S.painelLabel}>DATA VISTORIA</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginTop: '4px' }}>
                {form.dataVistoria}
              </div>
            </div>
            {form.fotoBase64 && (
              <div style={{ flex: 1, minWidth: '160px' }}>
                <img src={form.fotoBase64} alt="Foto"
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #1E3A8A' }} />
              </div>
            )}
          </div>
          {estado.feedbackIa && estado.feedbackIa !== 'concluido' && estado.feedbackIa !== 'erro' && (
            <div style={S.feedbackInfo}>
              <span style={S.pulso} />
              {TEXTO_FEEDBACK[estado.feedbackIa]}
            </div>
          )}
          {estado.feedbackIa === 'concluido' && (
            <div style={S.feedbackOk}>{TEXTO_FEEDBACK.concluido}</div>
          )}
          {estado.feedbackIa === 'erro' && (
            <div style={S.feedbackErro}>{TEXTO_FEEDBACK.erro} {estado.erroIa}</div>
          )}
        </Secao>

        {/* RESULTADO DA ANÁLISE */}
        <Secao titulo="Resultado da Análise e Avaliação">
          <Campo label={`Não Conformidade (NC)${form.ncGeradaPorIa ? ' — ✨ gerada por IA' : ''}`}>
            <textarea style={S.textarea} value={form.nc} maxLength={200}
              onChange={(e) => atualizar('nc', e.target.value)}
              placeholder="Será preenchida automaticamente após tirar a foto..." />
            <div style={S.contador}>{form.nc.length}/200 caracteres</div>
          </Campo>
          <Campo label={`Causa Provável (CP)${form.cpGeradaPorIa ? ' — ✨ gerada por IA' : ''}`}>
            <textarea style={S.textarea} value={form.cp} maxLength={200}
              onChange={(e) => atualizar('cp', e.target.value)}
              placeholder="Será preenchida automaticamente após tirar a foto..." />
            <div style={S.contador}>{form.cp.length}/200 caracteres</div>
          </Campo>
        </Secao>

        {estado.erroSave && (
          <div style={S.erroSave}>⚠️ {estado.erroSave}</div>
        )}

        {/* BOTÕES */}
        <div style={S.botoes}>
          <Btn cor="camera" onClick={tirarFotoEGerarNcCp}
            disabled={!!estado.feedbackIa && estado.feedbackIa !== 'concluido' && estado.feedbackIa !== 'erro'}>
            📷 Tirar Foto
          </Btn>
          <Btn cor="primario" onClick={salvarDados} disabled={estado.salvando || !form.fotoNr}>
            {estado.salvando ? '💾 Salvando...' : '💾 Salvar Dados'}
          </Btn>
          <Btn cor="encerrar" onClick={() => encerrarVistoria(() => router.push('/dashboard'))}
            disabled={!podeEncerrar}>
            ✖ Encerrar Vistoria
          </Btn>
        </div>

        {!podeEncerrar && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#D97706', marginTop: '8px' }}>
            ⚠️ Salve o último registro antes de encerrar a vistoria.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Header({ tipoServico }: { tipoServico: string }) {
  return (
    <div style={S.header}>
      <span style={S.logo}>AIMÊ</span>
      <span style={S.headerTitulo}>{TITULO_TELA[tipoServico] ?? `Vistoria Tipo ${tipoServico}`}</span>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={S.secaoTitulo}>{titulo}</div>
      {children}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, cor }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  cor: 'primario' | 'camera' | 'encerrar'
}) {
  const cores = {
    primario: { background: '#1E3A8A', color: '#fff', border: 'none' },
    camera:   { background: '#0F766E', color: '#fff', border: 'none' },
    encerrar: { background: '#fff', color: '#DC2626', border: '2px solid #DC2626' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...cores[cor],
        borderRadius: '9999px',
        padding: '12px 24px',
        fontWeight: 700,
        fontSize: '15px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#1E293B',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const feedbackBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '13px',
  fontWeight: 500,
  marginTop: '10px',
  lineHeight: 1.4,
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#E8EEF7',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    paddingBottom: '32px',
  },
  header: {
    background: '#1E3A8A',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  logo: {
    color: '#fff',
    fontWeight: 800,
    fontSize: '18px',
    letterSpacing: '0.08em',
    flexShrink: 0,
  },
  headerTitulo: {
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    flex: 1,
    textAlign: 'center',
    lineHeight: 1.3,
  },
  card: {
    maxWidth: '860px',
    margin: '16px auto',
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(30,58,138,0.10)',
    padding: '20px',
  },
  divisor: {
    height: '2px',
    background: '#1E3A8A',
    borderRadius: '2px',
    marginBottom: '20px',
  },
  secaoTitulo: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '6px',
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '3px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    ...inputBase,
    border: '1px solid #CBD5E1',
    background: '#F8FAFF',
    outline: 'none',
  },
  inputRO: {
    ...inputBase,
    border: '1px solid #E2E8F0',
    background: '#F1F5F9',
    color: '#64748B',
  },
  select: {
    ...inputBase,
    border: '1px solid #CBD5E1',
    background: '#F8FAFF',
    outline: 'none',
    cursor: 'pointer',
  },
  textarea: {
    ...inputBase,
    border: '1px solid #CBD5E1',
    background: '#F8FAFF',
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.6,
    minHeight: '72px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '10px',
  },
  painel: {
    background: '#F8FAFF',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '2px solid #E2E8F0',
  },
  painelLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#94A3B8',
    letterSpacing: '0.08em',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  feedbackInfo: {
    ...feedbackBase,
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    color: '#1E40AF',
  },
  feedbackOk: {
    ...feedbackBase,
    background: '#F0FDF4',
    border: '1px solid #BBF7D0',
    color: '#16A34A',
  },
  feedbackErro: {
    ...feedbackBase,
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#DC2626',
  },
  pulso: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#3B82F6',
    flexShrink: 0,
  },
  erroSave: {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#DC2626',
    fontSize: '13px',
    marginBottom: '12px',
  },
  contador: {
    fontSize: '11px',
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: '2px',
  },
  botoes: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginTop: '20px',
    flexWrap: 'wrap',
    borderTop: '1px solid #E2E8F0',
    paddingTop: '20px',
  },
  code: {
    background: '#F1F5F9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
}
