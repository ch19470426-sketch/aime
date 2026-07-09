// src/app/homologar/page.tsx
// AIMÊ — Tela 40: Homologar Vistoria
// Reutiliza lógica completa das telas 31-38 com listas editáveis

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Banner from '@/components/Banner'
import { useBanner } from '@/hooks/useBanner'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ItemSistema    { sistema: string }
interface ItemSubsistema { sistema: string; subsistema: string }
interface ItemAnomalia   { sistema: string; subsistema: string; anomalias: string }

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
  resultado?: string
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

// ─── Constantes ──────────────────────────────────────────────────────────────
const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

const TIPO_SERVICO_BANCO: Record<string, string> = {
  '31': '31 Autovistoria', '32': '32 Vistoria inspeção',
  '33': '33 Vistoria imóvel novo', '34': '34 Vistoria fachada',
  '35': '35 Vistoria elevador', '36': '36 Vistoria nr-10',
  '37': '37 Vistoria nr-12', '38': '38 Vistoria nr-13',
}

const TITULO_TIPO: Record<string, string> = {
  '31': 'Autovistoria - NBR 16747', '32': 'Vistoria Inspeção - NBR 16747',
  '33': 'Vistoria Imóvel Novo - NBR 15575', '34': 'Vistoria Fachada - NBR 16083',
  '35': 'Vistoria Elevador', '36': 'Vistoria NR-10',
  '37': 'Vistoria NR-12', '38': 'Vistoria NR-13',
}

const VALOR_GUT_PREDIAL: Record<string, number> = {
  'gravidade:Estética': 1, 'gravidade:Leve': 2, 'gravidade:Moderada': 3, 'gravidade:Alta': 4, 'gravidade:Crítica': 5,
  'urgencia:Pode aguardar': 1, 'urgencia:Planejar': 3, 'urgencia:Imediata': 5,
  'abrangencia:Ponto isolado': 1, 'abrangencia:Vários pontos': 3, 'abrangencia:Sistema completo': 5,
  'exposicao:Baixa': 1, 'exposicao:Média': 3, 'exposicao:Alta': 5,
}

const VALOR_GUT_NR: Record<string, number> = {
  'gravidade:Sem risco': 1, 'gravidade:Lesão/dano baixo': 2, 'gravidade:Lesão/dano moderado': 3, 'gravidade:Lesão/dano grave': 4, 'gravidade:Lesão/dano fatal': 5,
  'urgencia:Pode aguardar': 1, 'urgencia:Planejar': 3, 'urgencia:Imediata': 5,
  'probabilidade:Improvável': 1, 'probabilidade:Possível': 3, 'probabilidade:Provável/eminente': 5,
  'exposicaorisco:Máximo 2 pessoas': 1, 'exposicaorisco:Até 6 pessoas': 3, 'exposicaorisco:Muitas pessoas': 5,
}


// Mapas reversos: número → texto para carregar listas na homologação
const GR_PREDIAL_REVERSO: Record<number, Record<string, string>> = {
  gravidade:   { 1: 'Estética', 2: 'Leve', 3: 'Moderada', 4: 'Alta', 5: 'Crítica' },
  urgencia:    { 1: 'Pode aguardar', 3: 'Planejar', 5: 'Imediata' },
  abrangencia: { 1: 'Ponto isolado', 3: 'Vários pontos', 5: 'Sistema completo' },
  exposicao:   { 1: 'Baixa', 3: 'Média', 5: 'Alta' },
}

const GR_NR_REVERSO: Record<number, Record<string, string>> = {
  gravidade:     { 1: 'Sem risco', 2: 'Lesão/dano baixo', 3: 'Lesão/dano moderado', 4: 'Lesão/dano grave', 5: 'Lesão/dano fatal' },
  urgencia:      { 1: 'Pode aguardar', 3: 'Planejar', 5: 'Imediata' },
  abrangencia:   { 1: 'Improvável', 3: 'Possível', 5: 'Provável/eminente' },
  exposicao:     { 1: 'Máximo 2 pessoas', 3: 'Até 6 pessoas', 5: 'Muitas pessoas' },
}

function calcularGR(gra: number, urg: number, abr: number, exp: number): number {
  return Math.round((0.4 * gra + 0.3 * urg + 0.2 * abr + 0.1 * exp) * 20)
}

function ehNR(ts: string): boolean {
  return ['35', '36', '37', '38'].includes(ts)
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Tela40Page() {
  return (
    <Suspense fallback={
      <div style={S.body}><div style={S.page}>
        <HeaderBar subtitulo="Carregando..." />
        <div style={S.divider} />
        <p style={{ padding: '40px', textAlign: 'center', color: '#4a6480', fontSize: '9pt' }}>Carregando...</p>
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

  // Lista de formulários
  const [formularios,  setFormularios]  = useState<Formulario[]>([])
  const [indice,       setIndice]       = useState(0)
  const [carregando,   setCarregando]   = useState(true)
  const [salvando,     setSalvando]     = useState(false)
  const [gerandoIA,    setGerandoIA]    = useState(false)
  const [feedbackIA,   setFeedbackIA]   = useState('')
  const [fotoBase64,    setFotoBase64]    = useState('')

  // Listas de validação (carregadas do banco)
  const [sistemas,     setSistemas]     = useState<ItemSistema[]>([])
  const [subsistemas,  setSubsistemas]  = useState<ItemSubsistema[]>([])
  const [anomalias,    setAnomalias]    = useState<ItemAnomalia[]>([])
  const [origens,      setOrigens]      = useState<string[]>([])
  const [locais,       setLocais]       = useState<string[]>([])
  const [gravidades,   setGravidades]   = useState<string[]>([])
  const [urgencias,    setUrgencias]    = useState<string[]>([])
  const [abrangencias, setAbrangencias] = useState<string[]>([])
  const [exposicoes,   setExposicoes]   = useState<string[]>([])

  // Campos editáveis
  const [sistema,          setSistema]          = useState('')
  const [subsistema,       setSubsistema]       = useState('')
  const [anomalia,         setAnomalia]         = useState('')
  const [origem,           setOrigem]           = useState('')
  const [resultado,        setResultado]        = useState('')
  const [local,            setLocal]            = useState('')
  const [complemento,      setComplemento]      = useState('')
  const [descGravidade,    setDescGravidade]    = useState('')
  const [descUrgencia,     setDescUrgencia]     = useState('')
  const [descAbrangencia,  setDescAbrangencia]  = useState('')
  const [descExposicao,    setDescExposicao]    = useState('')
  const [nc,               setNc]               = useState('')
  const [cp,               setCp]               = useState('')

  const form = formularios[indice]
  const ts   = form?.tipoServico ?? ''
  const isNR = ehNR(ts)
  const tipoServicoBanco = TIPO_SERVICO_BANCO[ts] ?? ''

  // GR calculado
  const VALOR_GUT = isNR ? VALOR_GUT_NR : VALOR_GUT_PREDIAL
  const gravNum = VALOR_GUT[`gravidade:${descGravidade}`] ?? 0
  const urgNum  = VALOR_GUT[`urgencia:${descUrgencia}`]   ?? 0
  const abrNum  = isNR
    ? (VALOR_GUT[`probabilidade:${descAbrangencia}`] ?? 0)
    : (VALOR_GUT[`abrangencia:${descAbrangencia}`]   ?? 0)
  const expNum  = isNR
    ? (VALOR_GUT[`exposicaorisco:${descExposicao}`]  ?? 0)
    : (VALOR_GUT[`exposicao:${descExposicao}`]       ?? 0)
  const grauRisco = (gravNum && urgNum && abrNum && expNum) ? calcularGR(gravNum, urgNum, abrNum, expNum) : (form?.grauRisco ?? 0)
  const prioridade = isNR
    ? (grauRisco >= 75 ? 'Muito alta' : grauRisco >= 50 ? 'Alta' : grauRisco >= 30 ? 'Média' : 'Baixa')
    : (grauRisco >= 64 ? 'Alta' : grauRisco >= 35 ? 'Média' : 'Baixa')
  const corGR = grauRisco >= (isNR ? 75 : 64) ? '#E24B4A' : grauRisco >= (isNR ? 50 : 35) ? '#E8A000' : '#1A7A3C'

  // Listas filtradas
  const subsistemasFiltrados = [...new Set(subsistemas.filter(s => s.sistema === sistema).map(s => s.subsistema))]
  const anomaliasFiltradas   = anomalias
    .filter(a => a.sistema === sistema && a.subsistema === subsistema)
    .flatMap(a => a.anomalias.split(';').map(x => x.trim()).filter(Boolean))

  async function query(table: string, params: string) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${params}`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    })
    return res.json()
  }

  // Carregar listas quando tipo_servico mudar
  useEffect(() => {
    if (!tipoServicoBanco) return
    async function carregarListas() {
      const sis = await query('sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&select=sistema&order=sistema`)
      if (Array.isArray(sis)) setSistemas([...new Map(sis.map((s: ItemSistema) => [s.sistema, s])).values()])

      const sub = await query('sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&subsistema=not.is.null&select=sistema,subsistema`)
      if (Array.isArray(sub)) setSubsistemas(sub)

      const ano = await query('sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&anomalias=not.is.null&select=sistema,subsistema,anomalias`)
      if (Array.isArray(ano)) setAnomalias(ano)

      const par = await query('tabela_parametros', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&select=tipo_parametro,descricao_parametros&order=tipo_parametro,descricao_parametros`)
      if (Array.isArray(par)) {
        const f = (tipo: string) => par.filter((p: {tipo_parametro: string, descricao_parametros: string}) => p.tipo_parametro === tipo).map((p: {descricao_parametros: string}) => p.descricao_parametros)
        setOrigens(f('Origem'))
        setLocais(f('Local ocorrência'))
        setGravidades(f('Gravidade'))
        setUrgencias(f('Urgência'))
        setAbrangencias(isNR ? f('Probabilidade') : f('Abrangência'))
        setExposicoes(isNR ? f('Exposição risco') : f('Exposição'))
      }
    }
    carregarListas()
  }, [tipoServicoBanco, isNR])

  // Carregar formulários
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
        informa('Nenhuma vistoria encontrada',
          'Para que seja efetuada a homologação é necessário que exista uma vistoria concluída para a edificação/instituição. Nada encontrado, o processo será suspenso.',
          () => window.location.href = '/dashboard'
        )
        setCarregando(false)
        return
      }
      setFormularios(data.formularios)
      await carregarFormularioCompleto(data.formularios[0].nome, data.formularios, 0)
    } catch(e) {
      informa('Erro', 'Não foi possível carregar as vistorias.')
      setCarregando(false)
    }
  }

  async function carregarFormularioCompleto(nome: string, lista: Formulario[], idx: number) {
    setCarregando(true)
    try {
      const res  = await fetch(`/api/vistorias?nome=${nome}`)
      const data = await res.json()
      const atualizado = lista.map((f, i) => i === idx ? { ...f, ...data } : f)
      setFormularios(atualizado)
      setIndice(idx)
      setSistema(data.sistema ?? '')
      setSubsistema(data.subsistema ?? '')
      setAnomalia(data.anomalia ?? '')
      setOrigem(data.origem ?? '')
      setResultado(data.resultado ?? '')
      setFotoBase64(data.fotoBase64 ?? '')
      setLocal(data.local ?? '')
      setComplemento(data.complemento ?? '')
      // Corrigir encoding Latin-1 → UTF-8 que ocorre no Storage
      const fixEnc = (s: string) => {
        try {
          return decodeURIComponent(escape(s))
        } catch {
          return s
        }
      }
      setNc(fixEnc(data.nc ?? ''))
      setCp(fixEnc(data.cp ?? ''))
      setFeedbackIA('')
      // Mapear valores numéricos de volta para texto nas listas
      const isNRLocal = ehNR(data.tipoServico ?? '')
      const mapRev = isNRLocal ? GR_NR_REVERSO : GR_PREDIAL_REVERSO
      if (data.gravidade)   setDescGravidade(  (mapRev.gravidade   as Record<number,string>)[data.gravidade]   ?? '')
      if (data.urgencia)    setDescUrgencia(   (mapRev.urgencia    as Record<number,string>)[data.urgencia]    ?? '')
      if (data.abrangencia) setDescAbrangencia((mapRev.abrangencia as Record<number,string>)[data.abrangencia] ?? '')
      if (data.exposicao)   setDescExposicao(  (mapRev.exposicao   as Record<number,string>)[data.exposicao]   ?? '')
    } catch(e) {
      informa('Erro', 'Não foi possível carregar o formulário.')
    } finally {
      setCarregando(false)
    }
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
          sistema, subsistema, anomalia, local, complemento,
          origem: isNR ? 'Funcional' : origem,
          abrangencia: descAbrangencia || 'Ponto isolado'
        })
      })
      const data = await res.json()
      if (data.nc) setNc(data.nc)
      if (!isNR && data.cp) setCp(data.cp)
      setFeedbackIA('✅ NC' + (isNR ? '' : ' e CP') + ' atualizadas!')
    } catch(e) {
      setFeedbackIA('⚠️ Erro ao gerar NC/CP')
    } finally {
      setGerandoIA(false)
    }
  }

  async function avancarProximo() {
    if (!form) return
    setSalvando(true)
    try {
      // Salvar em dados_vistoria
      await fetch(`${SUPA_URL}/rest/v1/dados_vistoria`, {
        method: 'POST',
        headers: {
          'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'
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
          sistema, subsistema,
          anomalia_requisito_vistoria: anomalia,
          origem_resultado: isNR ? resultado : origem,
          local_ocorrencia: local,
          complemento_local: complemento,
          gravidade: gravNum || form.gravidade,
          urgencia: urgNum || form.urgencia,
          abrangencia: abrNum || form.abrangencia,
          exposicao: expNum || form.exposicao,
          grau_risco: grauRisco || form.grauRisco,
          prioridade: prioridade || form.prioridade,
          nc_descricao: nc,
          cp_descricao: cp,
        })
      })

      // Gerar HTML da vistoria e salvar em vistorias_homologadas/
      const nomeHtml = form.nome.replace(/\.json$/, '.html')
      const htmlContent = gerarHtmlVistoria(form, {
        sistema, subsistema, anomalia,
        origem: isNR ? resultado : origem,
        local, complemento,
        gravidade: gravNum || form.gravidade,
        urgencia: urgNum || form.urgencia,
        abrangencia: abrNum || form.abrangencia,
        exposicao: expNum || form.exposicao,
        grauRisco: grauRisco || form.grauRisco,
        prioridade: prioridade || form.prioridade,
        nc, cp,
        dataHomologacao: new Date().toLocaleDateString('pt-BR'),
        isNR,
      })

      // Salvar HTML em vistorias_homologadas/
      await fetch('/api/salvar-vistoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeArquivo: nomeHtml,
          pasta: 'vistorias_homologadas',
          payload: htmlContent,
          contentType: 'text/html',
        })
      })

      // Excluir JSON de vistorias/
      await fetch(`/api/vistorias?nome=${form.nome}`, { method: 'DELETE' })

      // Avançar — remover atual e ir para próximo
      const novaLista = formularios.filter((_, i) => i !== indice)
      
      if (novaLista.length === 0) {
        agradece('Homologação concluída!',
          'Todos os registros foram revisados e homologados com sucesso.',
          () => window.location.href = '/dashboard'
        )
        return
      }
      
      const proximoIdx = indice < novaLista.length ? indice : novaLista.length - 1
      setFormularios(novaLista)
      await carregarFormularioCompleto(novaLista[proximoIdx].nome, novaLista, proximoIdx)
    } catch(e) {
      informa('Erro', 'Não foi possível salvar o registro. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function voltarAnterior() {
    if (indice === 0) return
    await carregarFormularioCompleto(formularios[indice - 1].nome, formularios, indice - 1)
  }

  function descartarColeta() {
    solicita('Descartar coleta',
      `Tem certeza que deseja descartar o registro "${form?.nome}"? Esta ação não pode ser desfeita.`,
      [
        { label: 'Cancelar', acao: () => {}, estilo: 'secundario' },
        { label: 'Descartar', acao: async () => {
          await fetch(`/api/vistorias?nome=${form?.nome}`, { method: 'DELETE' })
          const novaLista = formularios.filter((_, i) => i !== indice)
          if (novaLista.length === 0) {
            agradece('Pronto', 'Todos os registros foram processados.', () => window.location.href = '/dashboard')
          } else {
            const novoIdx = Math.min(indice, novaLista.length - 1)
            setFormularios(novaLista)
            await carregarFormularioCompleto(novaLista[novoIdx].nome, novaLista, novoIdx)
          }
        }, estilo: 'primario' }
      ]
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (carregando) return (
    <div style={S.body}><div style={S.page}>
      <HeaderBar subtitulo={ts ? `Homologação do Resultado - ${TITULO_TIPO[ts] ?? ts}` : 'Carregando...'} />
      <div style={S.divider} />
      <p style={{ padding: '40px', textAlign: 'center', color: '#4a6480', fontSize: '9pt' }}>Carregando formulários...</p>
      <Banner {...bannerProps} />
    </div></div>
  )

  if (!form) return (
    <div style={S.body}><div style={S.page}>
      <HeaderBar subtitulo="Homologar Vistoria" />
      <div style={S.divider} />
      <Banner {...bannerProps} />
    </div></div>
  )

  return (
    <div style={S.body}>
      <div style={S.page}>
        <HeaderBar subtitulo={`Homologação do Resultado - ${TITULO_TIPO[ts] ?? ts}`} />
        <div style={S.divider} />
        <div style={S.formBody}>



          {/* IDENTIFICAÇÃO */}
          <div style={S.block}>
            <div style={S.blockTitle}>Identificação</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c2 }}>
                <Field label={form.cnpjoucpf.length === 11 ? 'CPF' : 'CNPJ'}>
                  <input style={S.inputRO} value={form.cnpjDisplay || form.cnpjoucpf} readOnly />
                </Field>
                <Field label={form.cnpjoucpf.length === 11 ? 'Nome' : 'Razão social'}>
                  <input style={S.inputRO} value={form.razaoSocial} readOnly />
                </Field>
              </div>
              <div style={{ ...S.row, ...S.c3 }}>
                <Field label="Tipo de serviço"><input style={S.inputRO} value={TITULO_TIPO[ts] ?? ts} readOnly /></Field>
                <Field label="Ativo a vistoriar"><input style={S.inputRO} value={form.tipoAtivo} readOnly /></Field>
                <Field label="TAG / Nº Série"><input style={S.inputRO} value={form.tagNrSerie} readOnly /></Field>
              </div>
            </div>
          </div>

          {/* MANIFESTAÇÃO PATOLÓGICA ou CONFORMIDADE NORMATIVA */}
          <div style={S.block}>
            <div style={S.blockTitle}>{isNR ? 'Apuração da Conformidade Regulatória' : 'Manifestação Patológica'}</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c2 }}>
                <Field label="Sistema">
                  <select style={S.input} value={sistema} onChange={e => { setSistema(e.target.value); setSubsistema(''); setAnomalia('') }}>
                    <option value="">Selecione...</option>
                    {sistemas.map(s => <option key={s.sistema} value={s.sistema}>{s.sistema}</option>)}
                  </select>
                </Field>
                <Field label={isNR ? 'Subsistema / Componente' : 'Subsistema'}>
                  <select style={S.input} value={subsistema} onChange={e => { setSubsistema(e.target.value); setAnomalia('') }} disabled={!sistema}>
                    <option value="">Selecione...</option>
                    {subsistemasFiltrados.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label={isNR ? 'Requisito Normativo' : 'Anomalia / Falha'}>
                <select style={S.input} value={anomalia} onChange={e => setAnomalia(e.target.value)} disabled={!subsistema}>
                  <option value="">Selecione...</option>
                  {anomaliasFiltradas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              {isNR ? (
                <div style={{ ...S.row, ...S.c3 }}>
                  <Field label="Resultado">
                    <select style={S.input} value={resultado} onChange={e => {
                      setResultado(e.target.value)
                      if (e.target.value === 'Conforme') setNc('Requisito atendido plenamente.')
                      else if (e.target.value === 'Não aplicável') setNc('Requisito não se aplica à instalação.')
                      else setNc('')
                    }}>
                      <option value="">Selecione...</option>
                      {['Conforme', 'Não conforme', 'Não aplicável', 'Não verificado'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Local/Instalação/Setor/Área *">
                    <input style={S.input} value={local} onChange={e => setLocal(e.target.value)} placeholder="Ex: Quadro 2º pavimento..." />
                  </Field>
                  <Field label="Complemento">
                    <input style={S.input} value={complemento} onChange={e => setComplemento(e.target.value)} />
                  </Field>
                </div>
              ) : (
                <div style={{ ...S.row, ...S.c3 }}>
                  <Field label="Origem">
                    <select style={S.input} value={origem} onChange={e => setOrigem(e.target.value)}>
                      <option value="">Selecione...</option>
                      {origens.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Local de ocorrência">
                    <select style={S.input} value={local} onChange={e => setLocal(e.target.value)}>
                      <option value="">Selecione...</option>
                      {locais.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="Complemento do local">
                    <input style={S.input} value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Detalhe opcional..." />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* CLASSIFICAÇÃO DE RISCO */}
          <div style={S.block}>
            <div style={S.blockTitle}>Classificação de Risco</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c4 }}>
                <Field label="Gravidade">
                  <select style={S.input} value={descGravidade} onChange={e => setDescGravidade(e.target.value)}>
                    <option value="">Sel...</option>
                    {gravidades.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Urgência">
                  <select style={S.input} value={descUrgencia} onChange={e => setDescUrgencia(e.target.value)}>
                    <option value="">Sel...</option>
                    {urgencias.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label={isNR ? 'Probabilidade' : 'Abrangência'}>
                  <select style={S.input} value={descAbrangencia} onChange={e => setDescAbrangencia(e.target.value)}>
                    <option value="">Sel...</option>
                    {abrangencias.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label={isNR ? 'Exposição risco' : 'Exposição'}>
                  <select style={S.input} value={descExposicao} onChange={e => setDescExposicao(e.target.value)}>
                    <option value="">Sel...</option>
                    {exposicoes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <div style={S.riskMetrics}>
                <div style={{ ...S.metric, borderColor: corGR }}>
                  <span style={S.metricLbl}>Grau de Risco</span>
                  <span style={{ ...S.metricVal, color: corGR }}>{grauRisco || form.grauRisco || '—'}</span>
                  <div style={S.barWrap}><div style={{ ...S.bar, width: `${grauRisco || form.grauRisco}%`, background: corGR }} /></div>
                </div>
                <div style={{ ...S.metric, borderColor: corGR, justifyContent: 'center' }}>
                  <span style={S.metricLbl}>Prioridade</span>
                  <span style={{ ...S.badge, background: corGR === '#E24B4A' ? '#FCEBEB' : corGR === '#E8A000' ? '#FFF0C2' : '#E6F5EE', color: corGR }}>
                    {prioridade || form.prioridade}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* EVIDÊNCIA FOTOGRÁFICA */}
          <div style={S.block}>
            <div style={S.blockTitle}>Evidência Fotográfica</div>
            <div style={S.blockBody}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3px' }}>
                <div style={{ width: '60px' }}>
                  <label style={{ fontSize: '6pt', fontWeight: 600, color: '#4a6480' }}>Foto Nº</label>
                  <input style={{ ...S.inputRO, textAlign: 'center', fontWeight: 700, color: '#1E3A8A', width: '100%', boxSizing: 'border-box', padding: '1px 4px', fontSize: '7pt' }} value={form.fotoNr} readOnly />
                </div>
                <div style={{ width: '90px' }}>
                  <label style={{ fontSize: '6pt', fontWeight: 600, color: '#4a6480' }}>Data Vistoria</label>
                  <input style={{ ...S.inputRO, width: '100%', boxSizing: 'border-box', padding: '1px 4px', fontSize: '7pt' }} value={form.dataVistoria} readOnly />
                </div>
              </div>
              {fotoBase64
                ? <img src={fotoBase64} alt="Foto" style={{ width: '100%', height: '110mm', objectFit: 'cover', borderRadius: '5px', border: '2px solid #1E3A8A', display: 'block' }} />
                : <div style={{ width: '100%', height: '110mm', background: '#f1f5f9', border: '2px dashed #c3d4f0', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '7.5pt' }}>Sem foto</div>
              }
            </div>
          </div>

                    {/* RESULTADO DA ANÁLISE */}
          <div style={S.block}>
            <div style={S.blockTitle}>{isNR ? 'Não Conformidade / Observações' : 'Resultado da Análise e Avaliação'}</div>
            <div style={S.blockBody}>
              {feedbackIA && <div style={{ fontSize: '7pt', color: '#1E3A8A', background: '#EEF4FF', padding: '3px 8px', borderRadius: '4px', marginBottom: '6px' }}>{feedbackIA}</div>}
              <Field label="Não conformidade (NC)">
                <textarea style={{ ...S.input, ...S.textarea }} value={nc} maxLength={500}
                  readOnly={isNR && (resultado === 'Conforme' || resultado === 'Não aplicável')}
                  onChange={e => setNc(e.target.value)} />
              </Field>
              {!isNR && (
                <Field label="Causa provável (CP)">
                  <textarea style={{ ...S.input, ...S.textarea }} value={cp} maxLength={500} onChange={e => setCp(e.target.value)} />
                </Field>
              )}

            </div>
          </div>

          {/* BOTÕES */}
          <div style={S.footer}>
            <button style={{ ...S.btn, ...S.btnSec, opacity: indice === 0 ? 0.4 : 1 }} onClick={voltarAnterior} disabled={indice === 0}>
              ← Revisar anterior
            </button>
            <button style={{ ...S.btn, background: '#DC2626', color: '#fff', border: 'none' }} onClick={descartarColeta}>
              🗑 Descartar
            </button>
            <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }} onClick={avancarProximo} disabled={salvando}>
              {salvando ? 'Salvando...' : indice === formularios.length - 1 ? 'Concluir ✓' : 'Revisar próximo →'}
            </button>
          </div>

        </div>
      </div>
      <Banner {...bannerProps} />
    </div>
  )
}


// ─── Gerador de HTML da vistoria ─────────────────────────────────────────────
interface DadosHomologacao {
  sistema: string; subsistema: string; anomalia: string; origem: string
  local: string; complemento: string; gravidade: number; urgencia: number
  abrangencia: number; exposicao: number; grauRisco: number; prioridade: string
  nc: string; cp: string; dataHomologacao: string; isNR: boolean
}

function gerarHtmlVistoria(form: Formulario, dados: DadosHomologacao): string {
  const corGR = dados.grauRisco >= (dados.isNR ? 75 : 64) ? '#E24B4A'
    : dados.grauRisco >= (dados.isNR ? 50 : 35) ? '#E8A000' : '#1A7A3C'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 10px; background: #fff; font-size: 7.5pt; color: #1a1a2e; }
  .header { background: #1E3A8A; padding: 8px 16px; display: flex; align-items: center; gap: 12px; }
  .header h1 { font-size: 11pt; font-weight: 700; color: #fff; margin: 0; flex: 1; text-align: center; }
  .header p { font-size: 7pt; color: #B5D4F4; margin: 2px 0 0; text-align: center; }
  .divider { height: 2px; background: #1E3A8A; }
  .body { padding: 10px 14px; }
  .block { border: 1px solid #c3d4f0; border-radius: 6px; overflow: hidden; margin-bottom: 5px; }
  .block-title { background: #1E3A8A; color: #fff; font-size: 7.5pt; font-weight: 700; padding: 3px 10px; }
  .block-body { padding: 5px 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; }
  .field { display: flex; flex-direction: column; gap: 1px; margin-bottom: 3px; }
  .field label { font-size: 6.5pt; font-weight: 600; color: #4a6480; }
  .field span { border: 1px solid #c3d4f0; border-radius: 4px; padding: 2px 5px; font-size: 7.5pt; background: #f1f5f9; color: #374151; }
  .field-edit span { background: #fff; }
  .foto { width: 100%; max-height: 90mm; object-fit: cover; border-radius: 5px; border: 2px solid #1E3A8A; }
  .gr-bar-wrap { flex: 1; height: 5px; background: #c3d4f0; border-radius: 99px; overflow: hidden; }
  .gr-bar { height: 100%; border-radius: 99px; }
  .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 99px; font-size: 7.5pt; font-weight: 700; }
  .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px; }
  .metric { background: #E8EEF7; border: 2px solid #c3d4f0; border-radius: 5px; padding: 3px 8px; display: flex; align-items: center; gap: 8px; }
  .stamp { background: #E6F5EE; border: 2px solid #1A7A3C; border-radius: 8px; padding: 6px 12px; text-align: center; margin-top: 8px; }
  .stamp span { color: #1A7A3C; font-weight: 700; font-size: 8pt; }
</style>
</head>
<body>
<div class="header">
  <div style="flex:1;text-align:center">
    <h1>AIMÊ — Vistoria Homologada</h1>
    <p>Formulário de registro de vistoria — ${TITULO_TIPO[form.tipoServico] ?? form.tipoServico}</p>
  </div>
</div>
<div class="divider"></div>
<div class="body">

  <div class="block">
    <div class="block-title">Identificação</div>
    <div class="block-body">
      <div class="grid2">
        <div class="field"><label>${form.cnpjoucpf.length === 11 ? 'CPF' : 'CNPJ'}</label><span>${form.cnpjDisplay || form.cnpjoucpf}</span></div>
        <div class="field"><label>${form.cnpjoucpf.length === 11 ? 'Nome' : 'Razão social'}</label><span>${form.razaoSocial}</span></div>
      </div>
      <div class="grid3">
        <div class="field"><label>Tipo de serviço</label><span>${TITULO_TIPO[form.tipoServico] ?? form.tipoServico}</span></div>
        <div class="field"><label>Ativo a vistoriar</label><span>${form.tipoAtivo}</span></div>
        <div class="field"><label>TAG / Nº Série</label><span>${form.tagNrSerie}</span></div>
      </div>
    </div>
  </div>

  <div class="block">
    <div class="block-title">${dados.isNR ? 'Apuração da Conformidade Regulatória' : 'Manifestação Patológica'}</div>
    <div class="block-body">
      <div class="grid2">
        <div class="field"><label>Sistema</label><span>${dados.sistema}</span></div>
        <div class="field"><label>${dados.isNR ? 'Subsistema / Componente' : 'Subsistema'}</label><span>${dados.subsistema}</span></div>
      </div>
      <div class="field"><label>${dados.isNR ? 'Requisito Normativo' : 'Anomalia / Falha'}</label><span>${dados.anomalia}</span></div>
      <div class="grid3">
        <div class="field"><label>${dados.isNR ? 'Resultado' : 'Origem'}</label><span>${dados.origem}</span></div>
        <div class="field"><label>${dados.isNR ? 'Local/Instalação/Setor/Área' : 'Local de ocorrência'}</label><span>${dados.local}</span></div>
        <div class="field"><label>Complemento</label><span>${dados.complemento}</span></div>
      </div>
    </div>
  </div>

  <div class="block">
    <div class="block-title">Classificação de Risco</div>
    <div class="block-body">
      <div class="grid4">
        <div class="field"><label>Gravidade</label><span>${dados.gravidade}</span></div>
        <div class="field"><label>Urgência</label><span>${dados.urgencia}</span></div>
        <div class="field"><label>${dados.isNR ? 'Probabilidade' : 'Abrangência'}</label><span>${dados.abrangencia}</span></div>
        <div class="field"><label>${dados.isNR ? 'Exposição risco' : 'Exposição'}</label><span>${dados.exposicao}</span></div>
      </div>
      <div class="metrics">
        <div class="metric" style="border-color:${corGR}">
          <span style="font-size:6.5pt;color:#4a6480;font-weight:600">Grau de Risco</span>
          <span style="font-size:13pt;font-weight:700;color:${corGR}">${dados.grauRisco}</span>
          <div class="gr-bar-wrap"><div class="gr-bar" style="width:${dados.grauRisco}%;background:${corGR}"></div></div>
        </div>
        <div class="metric" style="border-color:${corGR};justify-content:center">
          <span style="font-size:6.5pt;color:#4a6480;font-weight:600">Prioridade</span>
          <span class="badge" style="color:${corGR}">${dados.prioridade}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="block">
    <div class="block-title">Evidência Fotográfica</div>
    <div class="block-body" style="display:flex;gap:12px;align-items:flex-start">
      <div>
        <div style="font-size:6.5pt;font-weight:700;color:#94A3B8;text-transform:uppercase">Foto Nº</div>
        <div style="font-size:24px;font-weight:800;color:#1E3A8A">${form.fotoNr}</div>
      </div>
      <div>
        <div style="font-size:6.5pt;font-weight:700;color:#94A3B8;text-transform:uppercase">Data Vistoria</div>
        <div style="font-size:8pt;font-weight:600;color:#374151;margin-top:4px">${form.dataVistoria}</div>
      </div>
      ${form.fotoBase64 ? `<div style="flex:1"><img src="${form.fotoBase64}" class="foto" alt="Foto evidência" /></div>` : ''}
    </div>
  </div>

  <div class="block">
    <div class="block-title">${dados.isNR ? 'Não Conformidade / Observações' : 'Resultado da Análise e Avaliação'}</div>
    <div class="block-body">
      <div class="field field-edit"><label>Não conformidade (NC)</label><span style="white-space:pre-wrap">${dados.nc}</span></div>
      ${!dados.isNR ? `<div class="field field-edit"><label>Causa provável (CP)</label><span style="white-space:pre-wrap">${dados.cp}</span></div>` : ''}
    </div>
  </div>

  <div class="stamp">
    <span>✓ Vistoria homologada em ${dados.dataHomologacao} — ${form.chaveInspetor}</span>
  </div>

</div>
</body>
</html>`
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function HeaderBar({ subtitulo }: { subtitulo: string }) {
  return (
    <div style={S.header}>
      <div style={{ width: '80px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Image src="/logo.png" alt="AIMÊ" width={80} height={36} style={{ filter: 'brightness(0) invert(1)', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <h1 style={{ fontSize: '11pt', fontWeight: 700, color: '#fff', margin: 0 }}>Homologar Vistoria</h1>
        <p style={{ fontSize: '7pt', color: '#B5D4F4', marginTop: '2px' }}>{subtitulo}</p>
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

// ─── Estilos ──────────────────────────────────────────────────────────────────
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
  inputRO:     { width: '100%', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 5px', fontSize: '7.5pt', color: '#64748b', fontFamily: 'inherit', background: '#f1f5f9', boxSizing: 'border-box' },
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
