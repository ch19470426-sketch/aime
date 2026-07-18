// src/app/vistoria/tela37/page.tsx
// AIMÊ — Tela 37: Vistoria Máquinas e Equipamentos - NR-12

'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ItemSistema    { sistema: string }
interface ItemSubsistema { sistema: string; subsistema: string }
interface ItemAnomalia   { sistema: string; subsistema: string; anomalias: string }
interface ItemAtivo      { tipo_ativo: string; tag_ativo_nr_serie: string; finalidade_vistoria: string | null }

const VALOR_GUT: Record<string, number> = {
  'gravidade:Sem risco': 1, 'gravidade:Lesão/dano baixo': 2, 'gravidade:Lesão/dano moderado': 3, 'gravidade:Lesão/dano grave': 4, 'gravidade:Lesão/dano fatal': 5,
  'urgencia:Pode aguardar': 1, 'urgencia:Planejar': 3, 'urgencia:Imediata': 5,
  'probabilidade:Improvável': 1, 'probabilidade:Possível': 3, 'probabilidade:Provável/eminente': 5,
  'exposicaorisco:Eventual (1)': 1, 'exposicaorisco:Frequente (3)': 3, 'exposicaorisco:Muitas pessoas (5)': 5,
}

function calcularGR(gra: number, urg: number, abr: number, exp: number): number {
  return Math.round((0.4 * gra + 0.3 * urg + 0.2 * abr + 0.1 * exp) * 20)
}

const TIPO_SERVICO_BANCO: Record<string, string> = {
  '31': '31 Autovistoria', '32': '32 Vistoria inspeção',
  '33': '33 Vistoria imóvel novo', '34': '34 Vistoria fachada',
  '35': '35 Vistoria elevador', '36': '36 Vistoria nr-10',
  '37': '37 Vistoria nr-12', '38': '38 Vistoria nr-13',
}

const TITULO_TELA: Record<string, string> = {
  '31': 'Autovistoria', '32': 'Vistoria Inspeção', '33': 'Vistoria Imóvel Novo',
  '34': 'Vistoria Fachada', '35': 'Vistoria Elevador', '36': 'Vistoria Instalações Elétricas - NR-10',
  '37': 'Vistoria Máquinas e Equipamentos - NR-12', '38': 'Vistoria Caldeiras, Vasos de Pressão, Tubulações e Tanques - NR-13',
}

// ─── Wrapper ─────────────────────────────────────────────────────────────────

export default function Tela31Page() {
  return (
    <Suspense fallback={
      <div style={S.body}><div style={S.page}>
        <div style={S.header}><span style={{ color: '#fff', fontWeight: 700 }}>AIMÊ — Carregando...</span></div>
      </div></div>
    }>
      <Tela31Inner />
    </Suspense>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function Tela31Inner() {
  const params        = useSearchParams()
  const cpfInspetor   = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor = params.get('chave_inspetor') ?? cpfInspetor
  const cnpjoucpf     = params.get('cnpjoucpf')      ?? ''
  const tipoServico   = String(params.get('tipo_servico') ?? '31')
  const tipoServicoBanco = TIPO_SERVICO_BANCO[tipoServico] ?? `${tipoServico} Autovistoria`
  const tagObrigatorio   = ['35', '37', '38'].includes(tipoServico)

  // ── Dados do estabelecimento ──
  const [cnpjDisplay,  setCnpjDisplay]  = useState('')
  const [razaoSocial,  setRazaoSocial]  = useState('')

  // ── Listas ──
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

  // ── Campos do formulário ──
  const [tipoAtivo,      setTipoAtivo]      = useState('')
  const [tagNrSerie,     setTagNrSerie]      = useState('')
  const [finalidade,     setFinalidade]      = useState('')
  const [sistema,        setSistema]         = useState('')
  const [subsistema,     setSubsistema]      = useState('')
  const [anomalia,       setAnomalia]        = useState('')
  const [origem,         setOrigem]          = useState('')
  const [local,          setLocal]           = useState('')
  const [complemento,    setComplemento]     = useState('')
  const [resultado,      setResultado]        = useState('')
  const [descGravidade,     setDescGravidade]    = useState('')
  const [descUrgencia,      setDescUrgencia]     = useState('')
  const [descProbabilidade, setDescProbabilidade] = useState('')
  const [descExposicaoRisco,setDescExposicaoRisco]= useState('')
  const [fotoBase64,     setFotoBase64]      = useState('')
  const [fotoNr,         setFotoNr]          = useState('')
  const [dataVistoria,   setDataVistoria]    = useState('')
  const [nc,             setNc]              = useState('')
  const [cp,             setCp]              = useState('')

  // ── Estado ──
  const [feedbackIA,  setFeedbackIA]  = useState('')
  const [erroSave,    setErroSave]    = useState('')
  const [salvando,    setSalvando]    = useState(false)
  const [salvoOk,     setSalvoOk]     = useState(false)
  const [arquivoSalvo,setArquivoSalvo] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // GR calculado
  const gravNum = VALOR_GUT[`gravidade:${descGravidade}`]           ?? 0
  const urgNum  = VALOR_GUT[`urgencia:${descUrgencia}`]             ?? 0
  const abrNum  = VALOR_GUT[`probabilidade:${descProbabilidade}`]   ?? 0
  const expNum  = VALOR_GUT[`exposicaorisco:${descExposicaoRisco}`] ?? 0
  const grauRisco = (gravNum && urgNum && abrNum && expNum) ? calcularGR(gravNum, urgNum, abrNum, expNum) : 0
  const prioridade = grauRisco >= 75 ? 'Muito alta' : grauRisco >= 50 ? 'Alta' : grauRisco >= 30 ? 'Média' : grauRisco > 0 ? 'Baixa' : '—'
  const corGR = grauRisco >= 64 ? '#E24B4A' : grauRisco >= 35 ? '#E8A000' : '#1A7A3C'

  // Listas filtradas
  const subsistemasFiltrados = [...new Set(subsistemas.filter(s => s.sistema === sistema).map(s => s.subsistema))]
  const anomaliasFiltradas   = anomalias
    .filter(a => a.sistema === sistema && a.subsistema === subsistema)
    .flatMap(a => a.anomalias.split(';').map(x => x.trim()).filter(Boolean))
  const tiposAtivo    = [...new Set(ativos.map(a => a.tipo_ativo))]
  const tagsFiltradas = ativos.filter(a => a.tipo_ativo === tipoAtivo).map(a => a.tag_ativo_nr_serie)

  // ── Carga inicial via fetch (evita createClient no SSR) ──
  const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
  const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

  useEffect(() => {
    if (typeof window === 'undefined') return

    async function query(table: string, params: string) {
      const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${params}`, {
        headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
      })
      return res.json()
    }

    async function carregar() {
      setCarregando(true)
      setDataVistoria(new Date().toLocaleDateString('pt-BR'))

      try {
        // Estabelecimento
        if (cnpjoucpf) {
          const est = await query('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=cnpjoucpf,razao_social_nome`)
          if (Array.isArray(est) && est[0]) {
            const c = est[0].cnpjoucpf
            const fmt = c.length === 14
              ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
              : c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
            setCnpjDisplay(fmt)
            setRazaoSocial(est[0].razao_social_nome)
          }
        }

        // Ativos
        if (cpfInspetor) {
          const atv = await query('ativos_a_vistoriar', `cpf_inspetor=eq.${cpfInspetor}&tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&select=tipo_ativo,tag_ativo_nr_serie,finalidade_vistoria,data_cadastro&order=data_cadastro.desc`)
          if (Array.isArray(atv)) setAtivos(atv)
        }

        // Sistemas
        const sis = await query('sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&select=sistema&order=sistema`)
        if (Array.isArray(sis)) setSistemas([...new Map(sis.map((s: ItemSistema) => [s.sistema, s])).values()])

        const sub = await query('sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&subsistema=not.is.null&select=sistema,subsistema`)
        if (Array.isArray(sub)) setSubsistemas(sub)

        const ano = await query('sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&anomalias=not.is.null&select=sistema,subsistema,anomalias`)
        if (Array.isArray(ano)) setAnomalias(ano)

        // Parâmetros
        const par = await query('tabela_parametros', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&select=tipo_parametro,descricao_parametros&order=tipo_parametro,descricao_parametros`)
        if (Array.isArray(par)) {
          const f = (tipo: string) => par.filter((p: {tipo_parametro: string, descricao_parametros: string}) => p.tipo_parametro === tipo).map((p: {descricao_parametros: string}) => p.descricao_parametros)
          setOrigens(f('Origem'))
          setLocais(f('Local ocorrência'))
          setGravidades(f('Gravidade'))
          setUrgencias(f('Urgência'))
          setAbrangencias(f('Probabilidade'))
          setExposicoes(f('Exposição risco'))
        }
      } catch(e) {
        console.error('Erro no carregamento:', e)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [cpfInspetor, cnpjoucpf, tipoServico])

  // ── Foto e IA ──
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX_W = 480, MAX_H = 360
      let w = img.width, h = img.height
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const compressed = canvas.toDataURL('image/jpeg', 0.5)
      setFotoBase64(compressed)
      setDataVistoria(new Date().toLocaleDateString('pt-BR'))
      fetch('/api/foto-nr?cpf_inspetor=' + cpfInspetor + '&cnpjoucpf=' + cnpjoucpf + '&tipo_servico=' + tipoServico)
        .then(r => r.json())
        .then(d => { if (d?.formatado) setFotoNr(d.formatado) })
        .catch(() => {})
      if (resultado === 'Não conforme') gerarNcCp(compressed)
    }
    img.src = url
  }

  async function gerarNcCp(foto: string) {
    if (resultado !== 'Não conforme') return
    if (!sistema || !subsistema || !anomalia) return
    setFeedbackIA('⏳ Analisando requisito normativo...')
    await delay(400)
    setFeedbackIA('⏳ Gerando descrição da não conformidade...')
    try {
      const res = await fetch('/api/gerar-nc-cp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sistema, subsistema, anomalia, local: local || 'Instalação', complemento, origem: 'Funcional', abrangencia: descProbabilidade || 'Possível' })
      })
      if (!res.ok) throw new Error('Status: ' + res.status)
      const data = await res.json()
      const ncVal = data.nc || data.nao_conformidade || ''
      if (ncVal) setNc(ncVal)
      setFeedbackIA('✅ Não conformidade gerada com sucesso!')
    } catch(e) {
      setFeedbackIA('⚠️ Erro ao gerar NC: ' + String(e))
    }
  }

  async function salvarDados() {
    if (!fotoBase64) { alert('Adicione a foto antes de salvar.'); return }
    if (!local) { alert('Informe o Local/Instalação/Setor/Área antes de salvar.'); return }
    if (!resultado) { alert('Selecione o Resultado antes de salvar.'); return }
    setSalvando(true); setErroSave('')

    try {
    // Incrementa o contador de foto
    const nrRes = await fetch('/api/foto-nr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf_inspetor: cpfInspetor, cnpjoucpf, tipo_servico: tipoServico })
    })
    const nrData = await nrRes.json()
    const nrFinal = nrData?.formatado ?? fotoNr

    const nomeArquivo = `${chaveInspetor}${nrFinal}.json`
    const payload = {
      chaveInspetor, cpfInspetor, cnpjoucpf, tipoServico,
      savedAt: new Date().toISOString(),
      cnpjDisplay, razaoSocial, tipoAtivo, tagNrSerie, finalidade,
      sistema, subsistema, anomalia, origem, resultado, local, complemento,
      gravidade: gravNum, urgencia: urgNum, abrangencia: abrNum, exposicao: expNum,
      grauRisco, prioridade, fotoNr: nrFinal, dataVistoria, fotoBase64, nc, cp,
    }

    const res = await fetch('/api/salvar-vistoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomeArquivo, payload })
    })
    const resJson = await res.json()

    if (!res.ok || resJson.erro) {
      setErroSave('Erro ao salvar: ' + (resJson.erro ?? res.statusText))
      setSalvando(false)
      return
    }

    } catch(e) {
      setErroSave('Erro ao salvar: ' + String(e))
      setSalvando(false)
      return
    }

    // Limpa formulário preservando CNPJ/RS
    setSistema(''); setSubsistema(''); setAnomalia(''); setOrigem(''); setLocal('')
    setComplemento(''); setTipoAtivo(''); setTagNrSerie(''); setFinalidade('')
    setDescGravidade(''); setDescUrgencia(''); setDescProbabilidade(''); setDescExposicaoRisco('')
    setFotoBase64(''); setNc(''); setCp(''); setFeedbackIA('')
    setSalvando(false); setSalvoOk(true); setArquivoSalvo(nomeArquivo)
  }

  function encerrar() {
    window.location.href = '/dashboard'
  }

  if (carregando) return (
    <div style={S.body}><div style={S.page}>
      <CabecalhoHTML tipoServico={tipoServico} />
      <div style={S.divider} />
      <div style={S.formBody}><p style={{ textAlign: 'center', padding: '40px', color: '#4a6480' }}>Carregando dados...</p></div>
    </div></div>
  )

  if (salvoOk) return (
    <div style={S.body}><div style={S.page}>
      <CabecalhoHTML tipoServico={tipoServico} />
      <div style={S.divider} />
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
        <h2 style={{ color: '#1E3A8A', fontSize: '14pt', marginBottom: '8px' }}>Registro salvo!</h2>
        <p style={{ color: '#4a6480', fontSize: '9pt', marginBottom: '20px' }}>Arquivo: {arquivoSalvo}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => setSalvoOk(false)} style={{ ...S.btn, ...S.btnPri }}>➕ Nova Manifestação</button>
          <button onClick={encerrar} style={{ ...S.btn, ...S.btnSec }}>Encerrar</button>
        </div>
      </div>
    </div></div>
  )

  return (
    <div style={S.body}>
      <div style={S.page}>
        <CabecalhoHTML tipoServico={tipoServico} />
        <div style={S.divider} />
        <div style={S.formBody}>

          {/* IDENTIFICAÇÃO */}
          <div style={S.block}>
            <div style={S.blockTitle}>Identificação</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c2 }}>
                <Field label="CNPJ"><input style={S.input} value={cnpjDisplay} readOnly /></Field>
                <Field label="Razão social"><input style={S.input} value={razaoSocial} readOnly /></Field>
              </div>
              <div style={{ ...S.row, ...S.c3 }}>
                <Field label="Ativo a vistoriar">
                  <select style={S.input} value={tipoAtivo} onChange={e => { setTipoAtivo(e.target.value); setTagNrSerie(''); setFinalidade('') }}>
                    <option value="">Selecione...</option>
                    {tiposAtivo.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label={tagObrigatorio ? 'Tag / Nr série *' : 'Tag / Nr série'}>
                  <select style={S.input} value={tagNrSerie} onChange={e => {
                    setTagNrSerie(e.target.value)
                    const ativo = ativos.find(a => a.tipo_ativo === tipoAtivo && a.tag_ativo_nr_serie === e.target.value)
                    setFinalidade(ativo?.finalidade_vistoria ?? '')
                  }} disabled={!tipoAtivo}>
                    <option value="">Selecione...</option>
                    {tagsFiltradas.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Finalidade da vistoria">
                  <input style={{ ...S.input, background: '#f5f7fc', color: '#4a6480' }} value={finalidade} readOnly />
                </Field>
              </div>
            </div>
          </div>

          {/* APURAÇÃO DA CONFORMIDADE REGULATÓRIA */}
          <div style={S.block}>
            <div style={S.blockTitle}>Apuração da Conformidade Regulatória</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c2 }}>
                <Field label="Sistema">
                  <select style={S.input} value={sistema} onChange={e => { setSistema(e.target.value); setSubsistema(''); setAnomalia(''); setResultado(''); setNc('') }}>
                    <option value="">Selecione...</option>
                    {sistemas.map(s => <option key={s.sistema} value={s.sistema}>{s.sistema}</option>)}
                  </select>
                </Field>
                <Field label="Subsistema / Componente">
                  <select style={S.input} value={subsistema} onChange={e => { setSubsistema(e.target.value); setAnomalia(''); setResultado(''); setNc('') }} disabled={!sistema}>
                    <option value="">Selecione...</option>
                    {subsistemasFiltrados.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Requisito Normativo">
                <select style={S.input} value={anomalia} onChange={e => { setAnomalia(e.target.value); setResultado(''); setNc('') }} disabled={!subsistema}>
                  <option value="">Selecione o requisito normativo...</option>
                  {anomaliasFiltradas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '4px', marginTop: '4px' }}>
                <Field label="Resultado *">
                  <select style={S.input} value={resultado} onChange={e => {
                    const val = e.target.value
                    setResultado(val)
                    if (val === 'Conforme') setNc('Requisito atendido plenamente.')
                    else if (val === 'Não aplicável') setNc('Requisito não se aplica à instalação.')
                    else if (val === 'Não conforme') {
                      setNc('')
                      if (fotoBase64) gerarNcCp(fotoBase64)
                    } else setNc('')
                  }} disabled={!anomalia}>
                    <option value="">Sel...</option>
                    {['Conforme', 'Não conforme', 'Não aplicável', 'Não verificado'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Local/Instalação/Setor/Área *">
                  <input style={{ ...S.input, borderColor: !local ? '#E24B4A' : undefined }} value={local} onChange={e => setLocal(e.target.value)} placeholder="Ex: Quadro 2º pavimento..." />
                </Field>
                <Field label="Complemento">
                  <input style={S.input} value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Detalhe adicional..." />
                </Field>
              </div>
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
                <Field label="Probabilidade">
                  <select style={S.input} value={descProbabilidade} onChange={e => setDescProbabilidade(e.target.value)}>
                    <option value="">Sel...</option>
                    {abrangencias.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Exposição risco">
                  <select style={S.input} value={descExposicaoRisco} onChange={e => setDescExposicaoRisco(e.target.value)}>
                    <option value="">Sel...</option>
                    {exposicoes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <div style={S.riskMetrics}>
                <div style={S.metric}>
                  <span style={S.metricLbl}>Grau de Risco</span>
                  <span style={{ ...S.metricVal, color: corGR }}>{grauRisco || '—'}</span>
                  <div style={S.barWrap}>
                    <div style={{ ...S.bar, width: `${grauRisco}%`, background: corGR }} />
                  </div>
                </div>
                <div style={{ ...S.metric, justifyContent: 'center' }}>
                  <span style={S.metricLbl}>Prioridade</span>
                  <span style={{ ...S.badge, background: grauRisco >= 64 ? '#FCEBEB' : grauRisco >= 35 ? '#FFF0C2' : '#E6F5EE', color: corGR }}>
                    {prioridade}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* EVIDÊNCIA FOTOGRÁFICA */}
          <div style={S.block}>
            <div style={S.blockTitle}>Evidência Fotográfica</div>
            <div style={S.blockBody}>
              <div style={S.photoControls}>
                <Field label="Foto nº">
                  <input style={{ ...S.input, textAlign: 'center', background: '#f5f7fc', color: '#1E3A8A', fontWeight: 700 }} value={fotoNr} readOnly />
                </Field>
                <Field label="Data da vistoria">
                  <div style={S.dataDisplay}>{dataVistoria}</div>
                </Field>
                <button
                  style={S.photoBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!sistema || !subsistema || !anomalia}
                >
                  📷 Adicionar foto
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFotoChange} />
              </div>
              <div style={S.photoArea} onClick={() => fileInputRef.current?.click()}>
                {fotoBase64 && <img src={fotoBase64} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                {!fotoBase64 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8aa3c4', fontSize: '8pt' }}>Clique para adicionar a foto da anomalia</div>}
              </div>
              {feedbackIA && <div style={S.aiStatus}>{feedbackIA}</div>}
            </div>
          </div>

          {/* NÃO CONFORMIDADE / OBSERVAÇÕES */}
          <div style={S.block}>
            <div style={S.blockTitle}>Não Conformidade / Observações</div>
            <div style={S.blockBody}>
              <Field label={resultado === 'Não conforme' ? 'Descrição da Não Conformidade (IA)' : 'Observações'}>
                <textarea
                  style={{ ...S.input, ...S.textarea, minHeight: '48px' }}
                  value={nc}
                  maxLength={500}
                  readOnly={resultado === 'Conforme' || resultado === 'Não aplicável'}
                  onChange={e => setNc(e.target.value)}
                  placeholder={
                    !resultado ? 'Selecione o resultado primeiro...' :
                    resultado === 'Não conforme' ? 'Gerado por IA após adicionar foto...' :
                    resultado === 'Não verificado' ? 'Descreva o motivo pelo qual o requisito não foi verificado...' :
                    ''
                  }
                />
              </Field>
            </div>
          </div>

          {erroSave && <div style={{ color: '#CC0000', fontSize: '8pt', textAlign: 'center', marginBottom: '6px' }}>⚠️ {erroSave}</div>}

          {/* FOOTER */}
          <div style={S.footer}>
            <button style={{ ...S.btn, ...S.btnSec }} onClick={encerrar}>Encerrar vistoria</button>
            <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }} onClick={salvarDados} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar dados'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CabecalhoHTML({ tipoServico }: { tipoServico: string }) {
  return (
    <div style={S.header}>
      <div style={{ width: '80px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Image src="/logo.png" alt="AIMÊ" width={80} height={36} style={{ filter: 'brightness(0) invert(1)', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <h1 style={{ fontSize: '11pt', fontWeight: 700, color: '#fff', margin: 0 }}>{TITULO_TELA[tipoServico] ?? `Vistoria ${tipoServico}`}</h1>
        <p style={{ fontSize: '7pt', color: '#B5D4F4', marginTop: '2px' }}>Formulário para Registro de Conformidade Regulatória</p>
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

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  body:          { background: '#E8EEF7', display: 'flex', justifyContent: 'center', padding: '24px', fontFamily: 'Arial, Helvetica, sans-serif', minHeight: '100vh' },
  page:          { width: '210mm', maxWidth: '100%', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,.15)', overflow: 'hidden', height: 'fit-content' },
  header:        { background: '#1E3A8A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  divider:       { height: '2px', background: '#1E3A8A' },
  formBody:      { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px' },
  block:         { border: '1px solid #c3d4f0', borderRadius: '6px', overflow: 'hidden' },
  blockTitle:    { background: '#1E3A8A', color: '#ffffff', fontSize: '7.5pt', fontWeight: 700, padding: '3px 10px' },
  blockBody:     { padding: '5px 10px', display: 'flex', flexDirection: 'column', gap: '4px' },
  row:           { display: 'grid', gap: '4px' },
  c2:            { gridTemplateColumns: '1fr 1fr' },
  c3:            { gridTemplateColumns: '1fr 1fr 1fr' },
  c4:            { gridTemplateColumns: '1fr 1fr 1fr 1fr' },
  field:         { display: 'flex', flexDirection: 'column', gap: '1px' },
  fieldLabel:    { fontSize: '6.5pt', fontWeight: 600, color: '#4a6480' },
  input:         { width: '100%', border: '1px solid #c3d4f0', borderRadius: '4px', padding: '2px 5px', fontSize: '7.5pt', color: '#1a1a2e', fontFamily: 'inherit', background: '#ffffff', boxSizing: 'border-box' },
  textarea:      { resize: 'vertical', lineHeight: 1.35, minHeight: '32px' },
  riskMetrics:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' },
  metric:        { background: '#E8EEF7', border: '1px solid #c3d4f0', borderRadius: '5px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '8px' },
  metricLbl:     { fontSize: '6.5pt', color: '#4a6480', fontWeight: 600, whiteSpace: 'nowrap' },
  metricVal:     { fontSize: '13pt', fontWeight: 700, lineHeight: 1 },
  badge:         { display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '99px', fontSize: '7.5pt', fontWeight: 700 },
  barWrap:       { flex: 1, height: '5px', background: '#c3d4f0', borderRadius: '99px', overflow: 'hidden' },
  bar:           { height: '100%', borderRadius: '99px', transition: 'width 0.3s' },
  photoControls: { display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: '6px', alignItems: 'end', marginBottom: '4px' },
  photoBtn:      { display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 12px', height: '24px', background: '#E8EEF7', border: '1px solid #c3d4f0', borderRadius: '4px', cursor: 'pointer', fontSize: '7pt', color: '#1E3A8A', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  dataDisplay:   { fontSize: '7.5pt', color: '#1E3A8A', fontWeight: 600, textAlign: 'center', padding: '2px 5px', border: '1px solid #c3d4f0', borderRadius: '4px', background: '#f5f7fc' },
  photoArea:     { border: '1.5px dashed #c3d4f0', borderRadius: '5px', background: '#E8EEF7', height: '90mm', position: 'relative', overflow: 'hidden', cursor: 'pointer' },
  aiStatus:      { fontSize: '6.5pt', color: '#1E3A8A', padding: '2px 6px', background: '#E8EEF7', borderRadius: '4px', marginTop: '2px' },
  footer:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' },
  btn:           { padding: '8px 0', fontSize: '8pt', fontWeight: 700, borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' },
  btnSec:        { background: '#ffffff', border: '2px solid #1E3A8A', color: '#1E3A8A' },
  btnPri:        { background: '#1E3A8A', border: '2px solid #1E3A8A', color: '#ffffff' },
}
