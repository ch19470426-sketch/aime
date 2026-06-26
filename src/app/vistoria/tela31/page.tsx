// src/app/vistoria/tela31/page.tsx
// AIMÊ — Tela 31: Autovistoria Predial
// Correção: useSearchParams() envolvido em Suspense (Next.js 16)

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useVistoria31 } from '@/hooks/useVistoria31'
import type { FormVistoria, FeedbackIa } from '@/hooks/useVistoria31'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ItemSistema    { sistema: string; descricao_sistema: string }
interface ItemSubsistema { sistema: string; subsistema: string }
interface ItemAnomalia   { sistema: string; subsistema: string; anomalia: string }
interface ItemParametro  { campo: string; valor: string; ordem: number }
interface ItemAtivo      { tipo_ativo: string; tag_ativo_nr_serie: string }

const TEXTO_FEEDBACK: Record<NonNullable<FeedbackIa>, string> = {
  avaliando_ambiente:  '🔍 Avaliando características do ambiente...',
  analisando_anomalia: '🔬 Analisando anomalia/falha...',
  cruzando_parametros: '⚙️  Cruzando parâmetros técnicos...',
  gerando_nc:          '✍️  Gerando Não Conformidade (NC)...',
  gerando_cp:          '✍️  Gerando Causa Provável (CP)...',
  concluido:           '✅  NC e CP geradas com sucesso!',
  erro:                '⚠️  Erro ao acionar a IA.',
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

// ─── Wrapper com Suspense (obrigatório no Next.js 16) ────────────────────────

export default function Tela31Page() {
  return (
    <Suspense fallback={
      <div style={S.page}>
        <div style={S.header}>
          <span style={S.headerLogo}>AIMÊ</span>
          <span style={S.headerTitulo}>Carregando...</span>
        </div>
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
          Carregando dados da vistoria...
        </div>
      </div>
    }>
      <Tela31Inner />
    </Suspense>
  )
}

// ─── Componente interno (usa useSearchParams) ─────────────────────────────────

function Tela31Inner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const supabase = createClient()

  const cpfInspetor   = params.get('cpf_inspetor')    ?? ''
  const chaveInspetor = params.get('chave_inspetor')  ?? cpfInspetor
  const cnpjoucpf     = params.get('cnpjoucpf')       ?? ''
  const tipoServico   = params.get('tipo_servico')    ?? '31'

  const tagObrigatorio = ['35', '37', '38'].includes(tipoServico)

  const [sistemas,     setSistemas]     = useState<ItemSistema[]>([])
  const [subsistemas,  setSubsistemas]  = useState<ItemSubsistema[]>([])
  const [anomalias,    setAnomalias]    = useState<ItemAnomalia[]>([])
  const [origens,      setOrigens]      = useState<string[]>([])
  const [locais,       setLocais]       = useState<string[]>([])
  const [gravidades,   setGravidades]   = useState<ItemParametro[]>([])
  const [urgencias,    setUrgencias]    = useState<ItemParametro[]>([])
  const [abrangencias, setAbrangencias] = useState<ItemParametro[]>([])
  const [exposicoes,   setExposicoes]   = useState<ItemParametro[]>([])
  const [ativos,       setAtivos]       = useState<ItemAtivo[]>([])
  const [carregando,   setCarregando]   = useState(true)

  const {
    form, estado,
    atualizar, inicializarIdentificacao,
    tirarFotoEGerarNcCp, salvarDados,
    encerrarVistoria, resetarSucesso, podeEncerrar,
  } = useVistoria31(cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico)

  const subsistemasFiltrados = subsistemas.filter((s) => s.sistema === form.sistema)
  const anomaliasFiltradas   = anomalias.filter(
    (a) => a.sistema === form.sistema && a.subsistema === form.subsistema
  )
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
        .select('sistema, descricao_sistema')
        .eq('tipo_servico', tipoServico)
        .order('sistema')
      if (sis) setSistemas(sis)

      const { data: sub } = await supabase
        .from('sistemas_construtivos')
        .select('sistema, subsistema')
        .eq('tipo_servico', tipoServico)
        .not('subsistema', 'is', null)
      if (sub) setSubsistemas(sub)

      const { data: ano } = await supabase
        .from('sistemas_construtivos')
        .select('sistema, subsistema, anomalia')
        .eq('tipo_servico', tipoServico)
        .not('anomalia', 'is', null)
      if (ano) setAnomalias(ano)

      const { data: par } = await supabase
        .from('tabela_parametros')
        .select('campo, valor, ordem')
        .eq('tipo_servico', tipoServico)
        .order('campo')
        .order('ordem')
      if (par) {
        const filtrar = (campo: string) => par.filter((p) => p.campo === campo)
        setOrigens(filtrar('origem').map((p) => p.valor))
        setLocais(filtrar('local').map((p) => p.valor))
        setGravidades(filtrar('gravidade'))
        setUrgencias(filtrar('urgencia'))
        setAbrangencias(filtrar('abrangencia'))
        setExposicoes(filtrar('exposicao'))
      }

      setCarregando(false)
    }
    carregar()
  }, [cpfInspetor, cnpjoucpf, tipoServico])

  function onSistemaChange(valor: string) {
    atualizar('sistema', valor)
    atualizar('subsistema', '')
    atualizar('anomalia', '')
  }
  function onSubsistemaChange(valor: string) {
    atualizar('subsistema', valor)
    atualizar('anomalia', '')
  }

  if (carregando) return (
    <div style={S.page}>
      <Cabecalho tipoServico={tipoServico} />
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
        Carregando dados da vistoria...
      </div>
    </div>
  )

  if (estado.sucesso) return (
    <div style={S.page}>
      <Cabecalho tipoServico={tipoServico} />
      <div style={S.card}>
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>✅</div>
          <h2 style={{ color: '#1E3A8A', marginBottom: '8px' }}>Registro salvo com sucesso!</h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
            Arquivo: <code style={S.code}>{estado.ultimoArquivoSalvo}</code>
          </p>
          <div style={S.botoesBar}>
            <button onClick={resetarSucesso} style={S.btnPrimary}>➕ Nova Manifestação</button>
            <button onClick={() => encerrarVistoria(() => router.push('/dashboard'))} style={S.btnEncerrar}>✖ Encerrar Vistoria</button>
          </div>
        </div>
      </div>
    </div>
  )

  const corGR = form.grauRisco >= 64 ? '#DC2626' : form.grauRisco >= 35 ? '#D97706' : '#16A34A'

  return (
    <div style={S.page}>
      <Cabecalho tipoServico={tipoServico} />
      <div style={S.card}>
        <div style={S.divisor} />

        <Secao titulo="Identificação">
          <div style={S.grid2}>
            <Campo label="CNPJ ou CPF">
              <input value={form.cnpjoucpf} readOnly style={S.inputSoLeitura} />
            </Campo>
            <Campo label="Razão Social ou Nome">
              <input value={form.razaoSocialNome} readOnly style={S.inputSoLeitura} />
            </Campo>
            <Campo label="Tipo Ativo *">
              <select value={form.tipoAtivo} onChange={(e) => { atualizar('tipoAtivo', e.target.value); atualizar('tagAtivoNrSerie', '') }} style={S.select}>
                <option value="">Selecione...</option>
                {tiposAtivo.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo label={tagObrigatorio ? 'TAG / Nº Série *' : 'TAG / Nº Série'}>
              <select value={form.tagAtivoNrSerie} onChange={(e) => atualizar('tagAtivoNrSerie', e.target.value)} style={S.select} disabled={!form.tipoAtivo}>
                <option value="">Selecione...</option>
                {tagsFiltradas.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Manifestação Patológica">
          <div style={S.grid2}>
            <Campo label="Sistema *">
              <select value={form.sistema} onChange={(e) => onSistemaChange(e.target.value)} style={S.select}>
                <option value="">Selecione...</option>
                {sistemas.map((s) => <option key={s.sistema} value={s.sistema}>{s.sistema}</option>)}
              </select>
            </Campo>
            <Campo label="Subsistema *">
              <select value={form.subsistema} onChange={(e) => onSubsistemaChange(e.target.value)} style={S.select} disabled={!form.sistema}>
                <option value="">Selecione...</option>
                {subsistemasFiltrados.map((s) => <option key={s.subsistema} value={s.subsistema}>{s.subsistema}</option>)}
              </select>
            </Campo>
            <Campo label="Anomalia ou Falha *">
              <select value={form.anomalia} onChange={(e) => atualizar('anomalia', e.target.value)} style={S.select} disabled={!form.subsistema}>
                <option value="">Selecione...</option>
                {anomaliasFiltradas.map((a) => <option key={a.anomalia} value={a.anomalia}>{a.anomalia}</option>)}
              </select>
            </Campo>
            <Campo label="Origem *">
              <select value={form.origem} onChange={(e) => atualizar('origem', e.target.value)} style={S.select}>
                <option value="">Selecione...</option>
                {origens.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Campo>
            <Campo label="Local *">
              <select value={form.local} onChange={(e) => atualizar('local', e.target.value)} style={S.select}>
                <option value="">Selecione...</option>
                {locais.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Campo>
            <Campo label="Complemento do Local">
              <input type="text" value={form.complemento} onChange={(e) => atualizar('complemento', e.target.value)} placeholder="Detalhe opcional do local..." style={S.input} />
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Classificação de Risco">
          <div style={S.grid4}>
            {[
              { campo: 'gravidade'   as const, label: 'Gravidade *',   lista: gravidades   },
              { campo: 'urgencia'    as const, label: 'Urgência *',    lista: urgencias    },
              { campo: 'abrangencia' as const, label: 'Abrangência *', lista: abrangencias },
              { campo: 'exposicao'   as const, label: 'Exposição *',   lista: exposicoes   },
            ].map(({ campo, label, lista }) => (
              <Campo key={campo} label={label}>
                <select value={form[campo]} onChange={(e) => atualizar(campo, Number(e.target.value) as FormVistoria[typeof campo])} style={S.select}>
                  <option value="">Sel...</option>
                  {lista.length > 0
                    ? lista.map((p) => <option key={p.valor} value={p.ordem}>{p.valor}</option>)
                    : [1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)
                  }
                </select>
              </Campo>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            <div style={{ ...S.painelGR, borderColor: corGR, flex: 1, minWidth: '140px' }}>
              <div style={S.painelLabel}>GRAU DE RISCO</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: corGR, lineHeight: 1 }}>{form.grauRisco}</div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>GR = ROUND((0,4×Gra + 0,3×Urg + 0,2×Abr + 0,1×Exp)×20)</div>
            </div>
            <div style={{ ...S.painelGR, borderColor: corGR, flex: 2, minWidth: '200px' }}>
              <div style={S.painelLabel}>PRIORIDADE</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: corGR }}>{form.prioridade}</div>
              <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>{form.definicaoPrioridade}</div>
            </div>
          </div>
        </Secao>

        <Secao titulo="Evidência Fotográfica">
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ minWidth: '90px' }}>
              <div style={S.painelLabel}>FOTO Nº</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#1E3A8A', lineHeight: 1 }}>{form.fotoNr || '—'}</div>
            </div>
            <div style={{ minWidth: '120px' }}>
              <div style={S.painelLabel}>DATA VISTORIA</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginTop: '4px' }}>{form.dataVistoria}</div>
            </div>
            {form.fotoBase64 && (
              <div style={{ flex: 1, minWidth: '160px' }}>
                <img src={form.fotoBase64} alt="Foto da anomalia" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #1E3A8A' }} />
              </div>
            )}
          </div>
          {estado.feedbackIa && estado.feedbackIa !== 'concluido' && estado.feedbackIa !== 'erro' && (
            <div style={S.feedbackNormal}><span style={S.pulsoDot} />{TEXTO_FEEDBACK[estado.feedbackIa]}</div>
          )}
          {estado.feedbackIa === 'concluido' && (
            <div style={{ ...S.feedbackNormal, background: '#F0FDF4', borderColor: '#BBF7D0', color: '#16A34A' }}>{TEXTO_FEEDBACK.concluido}</div>
          )}
          {estado.feedbackIa === 'erro' && (
            <div style={{ ...S.feedbackNormal, background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}>{TEXTO_FEEDBACK.erro} {estado.erroIa}</div>
          )}
        </Secao>

        <Secao titulo="Resultado da Análise e Avaliação">
          <Campo label={`Não Conformidade (NC)${form.ncGeradaPorIa ? ' — ✨ gerada por IA' : ''}`}>
            <textarea value={form.nc} onChange={(e) => atualizar('nc', e.target.value)} rows={3} maxLength={200} placeholder="Será preenchida automaticamente após tirar a foto..." style={{ ...S.input, resize: 'vertical', lineHeight: 1.6 }} />
            <div style={S.contador}>{form.nc.length}/200 caracteres</div>
          </Campo>
          <Campo label={`Causa Provável (CP)${form.cpGeradaPorIa ? ' — ✨ gerada por IA' : ''}`}>
            <textarea value={form.cp} onChange={(e) => atualizar('cp', e.target.value)} rows={3} maxLength={200} placeholder="Será preenchida automaticamente após tirar a foto..." style={{ ...S.input, resize: 'vertical', lineHeight: 1.6 }} />
            <div style={S.contador}>{form.cp.length}/200 caracteres</div>
          </Campo>
        </Secao>

        {estado.erroSave && <div style={S.erroBox}>⚠️ {estado.erroSave}</div>}

        <div style={S.botoesBar}>
          <button onClick={tirarFotoEGerarNcCp} disabled={!!estado.feedbackIa && estado.feedbackIa !== 'concluido' && estado.feedbackIa !== 'erro'}
            style={{ ...S.btnCamera, opacity: (!!estado.feedbackIa && estado.feedbackIa !== 'concluido' && estado.feedbackIa !== 'erro') ? 0.6 : 1 }}>
            📷 Tirar Foto
          </button>
          <button onClick={salvarDados} disabled={estado.salvando || !form.fotoNr}
            style={{ ...S.btnPrimary, opacity: (estado.salvando || !form.fotoNr) ? 0.6 : 1, cursor: (estado.salvando || !form.fotoNr) ? 'not-allowed' : 'pointer' }}>
            {estado.salvando ? '💾 Salvando...' : '💾 Salvar Dados'}
          </button>
          <button onClick={() => encerrarVistoria(() => router.push('/dashboard'))} disabled={!podeEncerrar}
            style={{ ...S.btnEncerrar, opacity: podeEncerrar ? 1 : 0.45, cursor: podeEncerrar ? 'pointer' : 'not-allowed' }}
            title={!podeEncerrar ? 'Salve o último registro antes de encerrar' : ''}>
            ✖ Encerrar Vistoria
          </button>
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

function Cabecalho({ tipoServico }: { tipoServico: string }) {
  return (
    <div style={S.header}>
      <span style={S.headerLogo}>AIMÊ</span>
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:           { minHeight: '100vh', background: '#E8EEF7', fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: '32px' },
  header:         { background: '#1E3A8A', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px' },
  headerLogo:     { color: '#fff', fontWeight: 800, fontSize: '20px', letterSpacing: '0.08em', flexShrink: 0 },
  headerTitulo:   { color: '#fff', fontWeight: 600, fontSize: '15px', flex: 1, textAlign: 'center' },
  card:           { maxWidth: '760px', margin: '20px auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(30,58,138,0.10)', padding: '20px' },
  divisor:        { height: '2px', background: '#1E3A8A', borderRadius: '2px', marginBottom: '20px' },
  secaoTitulo:    { fontSize: '11px', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.10em', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '12px' },
  label:          { display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:          { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: '#1E293B', background: '#F8FAFF', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  inputSoLeitura: { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#64748B', background: '#F1F5F9', boxSizing: 'border-box' },
  select:         { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', color: '#1E293B', background: '#F8FAFF', boxSizing: 'border-box', outline: 'none' },
  grid2:          { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  grid4:          { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  painelGR:       { background: '#F8FAFF', borderRadius: '8px', padding: '12px 14px', border: '2px solid #E2E8F0' },
  painelLabel:    { fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase' },
  feedbackNormal: { display: 'flex', alignItems: 'center', gap: '10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: '#1E40AF', marginTop: '10px' },
  pulsoDot:       { width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6', flexShrink: 0 },
  erroBox:        { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', color: '#DC2626', fontSize: '13px', marginBottom: '12px' },
  contador:       { fontSize: '11px', color: '#94A3B8', textAlign: 'right', marginTop: '2px' },
  botoesBar:      { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap', borderTop: '1px solid #E2E8F0', paddingTop: '20px' },
  btnCamera:      { background: '#0F766E', color: '#fff', border: 'none', borderRadius: '9999px', padding: '12px 24px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' },
  btnPrimary:     { background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '9999px', padding: '12px 24px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' },
  btnEncerrar:    { background: '#fff', color: '#DC2626', border: '2px solid #DC2626', borderRadius: '9999px', padding: '12px 24px', fontWeight: 700, fontSize: '15px' },
  code:           { background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
}
