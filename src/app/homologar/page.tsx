// src/app/homologar/page.tsx
// AIMÊ — Tela 40: Homologar Vistoria
// Permite revisar, ajustar NC/CP via IA e homologar formulários de vistoria

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Banner from '@/components/Banner'
import { useBanner } from '@/hooks/useBanner'

interface Formulario {
  nome: string
  chaveInspetor: string
  cpfInspetor: string
  cnpjoucpf: string
  tipoServico: string
  cnpjDisplay: string
  razaoSocial: string
  tipoAtivo: string
  tagNrSerie: string
  finalidade: string
  sistema: string
  subsistema: string
  anomalia: string
  origem: string
  local: string
  complemento: string
  gravidade: number
  urgencia: number
  abrangencia: number
  exposicao: number
  grauRisco: number
  prioridade: string
  fotoNr: string
  dataVistoria: string
  fotoBase64: string
  nc: string
  cp: string
  savedAt: string
}

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

export default function Tela40Page() {
  return (
    <Suspense fallback={
      <div style={S.body}><div style={S.page}>
        <div style={S.header}><span style={{ color: '#fff', fontWeight: 700 }}>AIMÊ — Carregando...</span></div>
      </div></div>
    }>
      <Tela40Inner />
    </Suspense>
  )
}

function Tela40Inner() {
  const params        = useSearchParams()
  const chaveInspetor = params.get('chave_inspetor') ?? 'INS-001'
  const cpfInspetor   = params.get('cpf_inspetor')   ?? ''
  const cnpjoucpf     = params.get('cnpjoucpf')      ?? ''

  const { bannerProps, informa, agradece, solicita } = useBanner()

  const [formularios,   setFormularios]   = useState<Formulario[]>([])
  const [indice,        setIndice]        = useState(0)
  const [carregando,    setCarregando]    = useState(true)
  const [salvando,      setSalvando]      = useState(false)
  const [gerandoIA,     setGerandoIA]     = useState(false)
  const [feedbackIA,    setFeedbackIA]    = useState('')

  // Campos editáveis
  const [nc,            setNc]            = useState('')
  const [cp,            setCp]            = useState('')
  const [local,         setLocal]         = useState('')
  const [complemento,   setComplemento]   = useState('')

  // Dados originais para detectar alterações
  const [origSistema,   setOrigSistema]   = useState('')
  const [origSubsistema,setOrigSubsistema]= useState('')
  const [origAnomalia,  setOrigAnomalia]  = useState('')
  const [origOrigem,    setOrigOrigem]    = useState('')

  const form = formularios[indice]

  useEffect(() => {
    if (!cnpjoucpf || !chaveInspetor) return
    carregarFormularios()
  }, [cnpjoucpf, chaveInspetor])

  async function carregarFormularios() {
    setCarregando(true)
    try {
      const res = await fetch(`/api/vistorias?chave_inspetor=${chaveInspetor}&cnpjoucpf=${cnpjoucpf}`)
      const data = await res.json()

      if (!data.formularios || data.formularios.length === 0) {
        informa(
          'Nenhuma vistoria encontrada',
          'Para que seja efetuada a homologação é necessário que exista uma vistoria concluída para a edificação/instituição. Nada encontrado, o processo será suspenso.',
          () => window.location.href = '/dashboard'
        )
        setCarregando(false)
        return
      }

      setFormularios(data.formularios)
      carregarFormularioCompleto(data.formularios[0].nome, data.formularios, 0)
    } catch (e) {
      informa('Erro', 'Não foi possível carregar as vistorias. Tente novamente.')
      setCarregando(false)
    }
  }

  async function carregarFormularioCompleto(nome: string, lista: Formulario[], idx: number) {
    setCarregando(true)
    try {
      const res = await fetch(`/api/vistorias/${nome}`)
      const data = await res.json()

      const atualizado = lista.map((f, i) => i === idx ? { ...f, ...data } : f)
      setFormularios(atualizado)
      setIndice(idx)
      setNc(data.nc ?? '')
      setCp(data.cp ?? '')
      setLocal(data.local ?? '')
      setComplemento(data.complemento ?? '')
      setOrigSistema(data.sistema ?? '')
      setOrigSubsistema(data.subsistema ?? '')
      setOrigAnomalia(data.anomalia ?? '')
      setOrigOrigem(data.origem ?? '')
    } catch (e) {
      informa('Erro', 'Não foi possível carregar o formulário.')
    } finally {
      setCarregando(false)
    }
  }

  function manifestacaoAlterada(): boolean {
    if (!form) return false
    return (
      local !== form.local ||
      origSistema !== form.sistema ||
      origSubsistema !== form.subsistema ||
      origAnomalia !== form.anomalia ||
      origOrigem !== form.origem
    )
  }

  async function gerarNcCpIA() {
    if (!form) return
    setGerandoIA(true)
    setFeedbackIA('⏳ Descrevendo Não Conformidade (NC) e Causa Provável (CP)...')
    try {
      const res = await fetch('/api/gerar-nc-cp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sistema: form.sistema,
          subsistema: form.subsistema,
          anomalia: form.anomalia,
          local, complemento,
          origem: form.origem,
          abrangencia: ''
        })
      })
      const data = await res.json()
      if (data.nc) setNc(data.nc)
      if (data.cp) setCp(data.cp)
      setFeedbackIA('✅ NC e CP atualizadas!')
    } catch (e) {
      setFeedbackIA('⚠️ Erro ao gerar NC/CP')
    } finally {
      setGerandoIA(false)
    }
  }

  async function avancarProximo() {
    if (!form) return
    setSalvando(true)

    // Regenerar NC/CP se manifestação foi alterada
    if (manifestacaoAlterada()) await gerarNcCpIA()

    // Salvar em dados_vistoria
    try {
      await fetch(`${SUPA_URL}/rest/v1/dados_vistoria`, {
        method: 'POST',
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          cpf_inspetor: form.cpfInspetor,
          cnpjoucpf: form.cnpjoucpf,
          tipo_servico: form.tipoServico,
          foto_nr: form.fotoNr,
          data_vistoria: form.dataVistoria,
          data_homologacao: new Date().toLocaleDateString('pt-BR'),
          tipo_ativo: form.tipoAtivo,
          tag_ativo_nr_serie: form.tagNrSerie,
          sistema: form.sistema,
          subsistema: form.subsistema,
          anomalia_requisito_vistoria: form.anomalia,
          origem_resultado: form.origem,
          local_ocorrencia: local,
          complemento_local: complemento,
          gravidade: form.gravidade,
          urgencia: form.urgencia,
          abrangencia: form.abrangencia,
          exposicao: form.exposicao,
          grau_risco: form.grauRisco,
          prioridade: form.prioridade,
          nc_descricao: nc,
          cp_descricao: cp,
        })
      })
    } catch (e) {
      console.error('Erro ao salvar dados_vistoria:', e)
    }

    // Avançar para próximo
    const proximoIdx = indice + 1
    if (proximoIdx >= formularios.length) {
      agradece(
        'Homologação concluída!',
        'Todos os registros foram revisados e homologados com sucesso.',
        () => window.location.href = '/dashboard'
      )
    } else {
      carregarFormularioCompleto(formularios[proximoIdx].nome, formularios, proximoIdx)
    }
    setSalvando(false)
  }

  async function voltarAnterior() {
    if (indice === 0) return
    const anteriorIdx = indice - 1
    carregarFormularioCompleto(formularios[anteriorIdx].nome, formularios, anteriorIdx)
  }

  function descartarColeta() {
    solicita(
      'Descartar coleta',
      `Tem certeza que deseja descartar o registro "${form?.nome}"? Esta ação não pode ser desfeita.`,
      [
        {
          label: 'Cancelar',
          acao: () => {},
          estilo: 'secundario'
        },
        {
          label: 'Descartar',
          acao: async () => {
            await fetch(`/api/vistorias?nome=${form?.nome}`, { method: 'DELETE' })
            const novaLista = formularios.filter((_, i) => i !== indice)
            if (novaLista.length === 0) {
              agradece('Pronto', 'Todos os registros foram processados.', () => window.location.href = '/dashboard')
            } else {
              const novoIdx = Math.min(indice, novaLista.length - 1)
              setFormularios(novaLista)
              carregarFormularioCompleto(novaLista[novoIdx].nome, novaLista, novoIdx)
            }
          },
          estilo: 'primario'
        }
      ]
    )
  }

  const corGR = form ? (form.grauRisco >= 64 ? '#E24B4A' : form.grauRisco >= 35 ? '#E8A000' : '#1A7A3C') : '#94A3B8'

  if (carregando) return (
    <div style={S.body}><div style={S.page}>
      <CabecalhoHTML />
      <div style={S.divider} />
      <p style={{ textAlign: 'center', padding: '40px', color: '#4a6480', fontSize: '9pt' }}>Carregando formulários...</p>
      <Banner {...bannerProps} />
    </div></div>
  )

  if (!form) return (
    <div style={S.body}><div style={S.page}>
      <CabecalhoHTML />
      <div style={S.divider} />
      <Banner {...bannerProps} />
    </div></div>
  )

  return (
    <div style={S.body}>
      <div style={S.page}>
        <CabecalhoHTML />
        <div style={S.divider} />
        <div style={S.formBody}>

          {/* Contador de registros */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '8pt', color: '#4a6480' }}>
              Registro <strong>{indice + 1}</strong> de <strong>{formularios.length}</strong> — {form.nome}
            </span>
            <span style={{ fontSize: '8pt', color: corGR, fontWeight: 700 }}>
              GR: {form.grauRisco} — {form.prioridade}
            </span>
          </div>

          {/* IDENTIFICAÇÃO */}
          <div style={S.block}>
            <div style={S.blockTitle}>Identificação</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c2 }}>
                <Field label={form.cnpjoucpf.length === 11 ? 'CPF' : 'CNPJ'}>
                  <input style={S.input} value={form.cnpjDisplay || form.cnpjoucpf} readOnly />
                </Field>
                <Field label={form.cnpjoucpf.length === 11 ? 'Nome' : 'Razão social'}>
                  <input style={S.input} value={form.razaoSocial} readOnly />
                </Field>
              </div>
              <div style={{ ...S.row, ...S.c3 }}>
                <Field label="Tipo de serviço">
                  <input style={S.input} value={form.tipoServico} readOnly />
                </Field>
                <Field label="Ativo">
                  <input style={S.input} value={form.tipoAtivo} readOnly />
                </Field>
                <Field label="TAG / Nº Série">
                  <input style={S.input} value={form.tagNrSerie} readOnly />
                </Field>
              </div>
            </div>
          </div>

          {/* MANIFESTAÇÃO PATOLÓGICA */}
          <div style={S.block}>
            <div style={S.blockTitle}>Manifestação Patológica / Apuração da Conformidade</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c3 }}>
                <Field label="Sistema"><input style={S.input} value={form.sistema} readOnly /></Field>
                <Field label="Subsistema"><input style={S.input} value={form.subsistema} readOnly /></Field>
                <Field label="Anomalia / Requisito"><input style={S.input} value={form.anomalia} readOnly /></Field>
              </div>
              <div style={{ ...S.row, ...S.c3 }}>
                <Field label="Origem / Resultado"><input style={S.input} value={form.origem} readOnly /></Field>
                <Field label="Local de ocorrência">
                  <input style={S.input} value={local} onChange={e => setLocal(e.target.value)} />
                </Field>
                <Field label="Complemento">
                  <input style={S.input} value={complemento} onChange={e => setComplemento(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {/* CLASSIFICAÇÃO DE RISCO */}
          <div style={S.block}>
            <div style={S.blockTitle}>Classificação de Risco</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c4 }}>
                <Field label="Gravidade"><input style={S.input} value={form.gravidade} readOnly /></Field>
                <Field label="Urgência"><input style={S.input} value={form.urgencia} readOnly /></Field>
                <Field label="Abrangência / Prob."><input style={S.input} value={form.abrangencia} readOnly /></Field>
                <Field label="Exposição"><input style={S.input} value={form.exposicao} readOnly /></Field>
              </div>
              <div style={S.riskMetrics}>
                <div style={{ ...S.metric, borderColor: corGR }}>
                  <span style={S.metricLbl}>Grau de Risco</span>
                  <span style={{ ...S.metricVal, color: corGR }}>{form.grauRisco}</span>
                  <div style={S.barWrap}><div style={{ ...S.bar, width: `${form.grauRisco}%`, background: corGR }} /></div>
                </div>
                <div style={{ ...S.metric, borderColor: corGR, justifyContent: 'center' }}>
                  <span style={S.metricLbl}>Prioridade</span>
                  <span style={{ ...S.badge, background: form.grauRisco >= 64 ? '#FCEBEB' : form.grauRisco >= 35 ? '#FFF0C2' : '#E6F5EE', color: corGR }}>{form.prioridade}</span>
                </div>
              </div>
            </div>
          </div>

          {/* EVIDÊNCIA FOTOGRÁFICA */}
          <div style={S.block}>
            <div style={S.blockTitle}>Evidência Fotográfica</div>
            <div style={S.blockBody}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <div style={S.painelLabel}>FOTO Nº</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E3A8A' }}>{form.fotoNr}</div>
                </div>
                <div>
                  <div style={S.painelLabel}>DATA VISTORIA</div>
                  <div style={{ fontSize: '8pt', fontWeight: 600, color: '#374151', marginTop: '4px' }}>{form.dataVistoria}</div>
                </div>
                {form.fotoBase64 && (
                  <div style={{ flex: 1 }}>
                    <img src={form.fotoBase64} alt="Foto" style={{ width: '100%', maxHeight: '90mm', objectFit: 'cover', borderRadius: '5px', border: '2px solid #1E3A8A' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* NC e CP */}
          <div style={S.block}>
            <div style={S.blockTitle}>Resultado da Análise e Avaliação</div>
            <div style={S.blockBody}>
              {feedbackIA && <div style={{ fontSize: '7pt', color: '#1E3A8A', background: '#EEF4FF', padding: '3px 8px', borderRadius: '4px', marginBottom: '6px' }}>{feedbackIA}</div>}
              <Field label="Não conformidade (NC)">
                <textarea style={{ ...S.input, ...S.textarea }} value={nc} maxLength={500} onChange={e => setNc(e.target.value)} />
              </Field>
              <Field label="Causa provável (CP)">
                <textarea style={{ ...S.input, ...S.textarea }} value={cp} maxLength={500} onChange={e => setCp(e.target.value)} />
              </Field>
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <button onClick={gerarNcCpIA} disabled={gerandoIA} style={{ ...S.btnSec, fontSize: '7pt', padding: '3px 10px' }}>
                  {gerandoIA ? '⏳ Gerando...' : '✨ Regerar NC/CP via IA'}
                </button>
              </div>
            </div>
          </div>

          {/* BOTÕES DE NAVEGAÇÃO */}
          <div style={S.footer}>
            <button style={{ ...S.btn, ...S.btnSec }} onClick={voltarAnterior} disabled={indice === 0}>
              ← Revisar anterior
            </button>
            <button style={{ ...S.btn, background: '#DC2626', color: '#fff', border: 'none' }} onClick={descartarColeta}>
              🗑 Descartar coleta
            </button>
            <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }} onClick={avancarProximo} disabled={salvando}>
              {salvando ? 'Salvando...' : indice === formularios.length - 1 ? 'Concluir homologação ✓' : 'Revisar próximo →'}
            </button>
          </div>

        </div>
      </div>
      <Banner {...bannerProps} />
    </div>
  )
}

function CabecalhoHTML() {
  return (
    <div style={S.header}>
      <div style={{ width: '80px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Image src="/logo.png" alt="AIMÊ" width={80} height={36} style={{ filter: 'brightness(0) invert(1)', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <h1 style={{ fontSize: '11pt', fontWeight: 700, color: '#fff', margin: 0 }}>Homologar Vistoria</h1>
        <p style={{ fontSize: '7pt', color: '#B5D4F4', marginTop: '2px' }}>Revisão e homologação de formulários de vistoria</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  body:        { background: '#E8EEF7', display: 'flex', justifyContent: 'center', padding: '24px', fontFamily: 'Arial, Helvetica, sans-serif', minHeight: '100vh' },
  page:        { width: '210mm', maxWidth: '100%', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,.15)', overflow: 'hidden', height: 'fit-content' },
  header:      { background: '#1E3A8A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  divider:     { height: '2px', background: '#1E3A8A' },
  formBody:    { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px' },
  block:       { border: '1px solid #c3d4f0', borderRadius: '6px', overflow: 'hidden' },
  blockTitle:  { background: '#1E3A8A', color: '#ffffff', fontSize: '7.5pt', fontWeight: 700, padding: '3px 10px' },
  blockBody:   { padding: '5px 10px', display: 'flex', flexDirection: 'column', gap: '4px' },
  row:         { display: 'grid', gap: '4px' },
  c2:          { gridTemplateColumns: '1fr 1fr' },
  c3:          { gridTemplateColumns: '1fr 1fr 1fr' },
  c4:          { gridTemplateColumns: '1fr 1fr 1fr 1fr' },
  field:       { display: 'flex', flexDirection: 'column', gap: '1px' },
  fieldLabel:  { fontSize: '6.5pt', fontWeight: 600, color: '#4a6480' },
  input:       { width: '100%', border: '1px solid #c3d4f0', borderRadius: '4px', padding: '2px 5px', fontSize: '7.5pt', color: '#1a1a2e', fontFamily: 'inherit', background: '#ffffff', boxSizing: 'border-box' },
  textarea:    { resize: 'vertical', lineHeight: 1.35, minHeight: '36px' },
  riskMetrics: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' },
  metric:      { background: '#E8EEF7', border: '2px solid #c3d4f0', borderRadius: '5px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '8px' },
  metricLbl:   { fontSize: '6.5pt', color: '#4a6480', fontWeight: 600, whiteSpace: 'nowrap' },
  metricVal:   { fontSize: '13pt', fontWeight: 700, lineHeight: 1 },
  badge:       { display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '99px', fontSize: '7.5pt', fontWeight: 700 },
  barWrap:     { flex: 1, height: '5px', background: '#c3d4f0', borderRadius: '99px', overflow: 'hidden' },
  bar:         { height: '100%', borderRadius: '99px', transition: 'width 0.3s' },
  painelLabel: { fontSize: '6.5pt', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' },
  footer:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' },
  btn:         { padding: '8px 0', fontSize: '8pt', fontWeight: 700, borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  btnSec:      { background: '#ffffff', border: '2px solid #1E3A8A', color: '#1E3A8A' },
  btnPri:      { background: '#1E3A8A', border: '2px solid #1E3A8A', color: '#ffffff' },
}
