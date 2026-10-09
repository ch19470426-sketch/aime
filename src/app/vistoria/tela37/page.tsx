"use client"
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { salvarOffline } from '@/lib/offlineVistoria'
import { fetchTimeout } from '@/lib/fetchTimeout'
import { prioridadeDoGrau, corTelaDoGrau, fundoTelaDoGrau } from '@/lib/prioridade'
import { guardarFotoDoRascunho, lerFotoDoRascunho, apagarFotoDoRascunho } from '@/lib/rascunhoFoto'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ItemSistema    { sistema: string }
interface ItemSubsistema { sistema: string; subsistema: string }
interface ItemAnomalia   { sistema: string; subsistema: string; anomalias: string }
interface ItemAtivo      { tipo_ativo: string; tag_ativo_nr_serie: string; finalidade_vistoria: string | null }

// ── Fallback GUT NR (usado se banco indisponível) ────────────────────────────
const GUT_FALLBACK: Record<string, number> = {
  'gravidade:Sem risco': 1, 'gravidade:Lesão/dano baixo': 2, 'gravidade:Lesão/dano moderado': 3, 'gravidade:Lesão/dano grave': 4, 'gravidade:Lesão/dano fatal': 5,
  'urgencia:Pode aguardar': 1, 'urgencia:Planejar': 3, 'urgencia:Imediata': 5,
  'probabilidade:Improvável': 1, 'probabilidade:Possível': 3, 'probabilidade:Provável/eminente': 5,
  'exposicaorisco:Eventual': 1, 'exposicaorisco:Frequente': 3, 'exposicaorisco:Muitas pessoas': 5,
}
const PCT_FALLBACK = { Gravidade: 40, Urgência: 30, Abrangência: 20, Exposição: 10 }

function calcularGR(gra: number, urg: number, abr: number, exp: number, pct: Record<string,number> = PCT_FALLBACK): number {
  const pG = (pct.Gravidade ?? 40) / 100, pU = (pct['Urgência'] ?? 30) / 100
  const pA = (pct['Abrangência'] ?? pct['Probabilidade'] ?? 20) / 100, pE = (pct['Exposição'] ?? pct['Exposição risco'] ?? 10) / 100
  return Math.round((pG * gra + pU * urg + pA * abr + pE * exp) * 20)
}

function fmtDoc(v: string) {
  const n = v.replace(/\D/g,"")
  if (n.length===14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,"$1.$2.$3/$4-$5")
  if (n.length===11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4")
  return v
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

const ORIGEM_DEFAULT = 'Funcional'

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
  const sessaoToken   = params.get('sessao')          ?? ''
  const tipoServicoBanco = TIPO_SERVICO_BANCO[tipoServico] ?? `${tipoServico} Autovistoria`
  const tagObrigatorio   = ['35', '37', '38'].includes(tipoServico)

  // ── Dados do estabelecimento ──
  const [cnpjDisplay,  setCnpjDisplay]  = useState('')
  const [razaoSocial,  setRazaoSocial]  = useState('')
  const [erroEstab,    setErroEstab]    = useState(false)
  const [erroAtivos,   setErroAtivos]   = useState(false)
  const [recarregarContador, setRecarregarContador] = useState(0)

  // ── Listas ──
  const [sistemas,     setSistemas]     = useState<ItemSistema[]>([])
  const [subsistemas,  setSubsistemas]  = useState<ItemSubsistema[]>([])
  const [anomalias,    setAnomalias]    = useState<ItemAnomalia[]>([])
  const [origens,      setOrigens]      = useState<string[]>([])
  const [locais,       setLocais]       = useState<string[]>([])
  const [valorGut, setValorGut] = useState<Record<string,number>>(GUT_FALLBACK)
  const [pctGut, setPctGut]   = useState(PCT_FALLBACK)
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
  const [origem,         setOrigem]          = useState(ORIGEM_DEFAULT)
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

  // ── Rascunho automático (proteção contra recarregamento inesperado da
  // página — ex: navegador/tablet descartando a aba durante a captura de
  // foto por limitação de memória, perdendo tudo que foi digitado) ──
  const draftKey = `aime_rascunho_${chaveInspetor}_${cnpjoucpf}_${tipoServico}`
  const [rascunhoRecuperado, setRascunhoRecuperado] = useState(false)
  const suprimirProximoSalvamentoRef = useRef(false)

  // ── Foto do rascunho (src/lib/rascunhoFoto.ts) ──
  // Abrir a câmera costuma derrubar a aba por falta de memória: a tela recarrega e a foto sumia (era preciso tirá-la de
  // novo e salvar de novo, a cada vistoria). Agora a foto é guardada no aparelho e restaurada junto com o rascunho.
  const [fotoRecuperada, setFotoRecuperada] = useState(false)
  const fotoAnteriorRef = useRef('')
  useEffect(() => {
    let vivo = true
    lerFotoDoRascunho(draftKey, sessaoToken).then(f => {
      if (vivo && f) { setFotoBase64(f); setFotoRecuperada(true); setRascunhoRecuperado(true) }
    })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (fotoBase64) guardarFotoDoRascunho(draftKey, sessaoToken, fotoBase64)
    else if (fotoAnteriorRef.current) apagarFotoDoRascunho(draftKey)   // só apaga quando a foto SAI (salvou ou removeu)
    fotoAnteriorRef.current = fotoBase64
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoBase64])
  // O aviso de recarregamento some sozinho: não fica de uma vistoria para a outra.
  useEffect(() => {
    if (!rascunhoRecuperado) return
    const t = setTimeout(() => { setRascunhoRecuperado(false); setFotoRecuperada(false) }, 20000)
    return () => clearTimeout(t)
  }, [rascunhoRecuperado])

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(draftKey)
      if (salvo) {
        const d = JSON.parse(salvo)
        if (d.sessao && sessaoToken && d.sessao === sessaoToken) {
        if (d.tipoAtivo)          setTipoAtivo(d.tipoAtivo)
        if (d.tagNrSerie)         setTagNrSerie(d.tagNrSerie)
        if (d.finalidade)         setFinalidade(d.finalidade)
        if (d.sistema)            setSistema(d.sistema)
        if (d.subsistema)         setSubsistema(d.subsistema)
        if (d.anomalia)           setAnomalia(d.anomalia)
        if (d.origem)             setOrigem(d.origem)
        if (d.local)              setLocal(d.local)
        if (d.complemento)        setComplemento(d.complemento)
        if (d.resultado)          setResultado(d.resultado)
        if (d.descGravidade)      setDescGravidade(d.descGravidade)
        if (d.descUrgencia)       setDescUrgencia(d.descUrgencia)
        if (d.descProbabilidade)  setDescProbabilidade(d.descProbabilidade)
        if (d.descExposicaoRisco) setDescExposicaoRisco(d.descExposicaoRisco)
        if (d.nc)                 setNc(d.nc)
        if (d.cp)                 setCp(d.cp)
        setRascunhoRecuperado(true)
        } else {
          try { localStorage.removeItem(draftKey) } catch {}
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (suprimirProximoSalvamentoRef.current) { suprimirProximoSalvamentoRef.current = false; return }
    const temAlgo = tipoAtivo || tagNrSerie || subsistema || anomalia
    try {
      if (temAlgo) {
        localStorage.setItem(draftKey, JSON.stringify({
          tipoAtivo, tagNrSerie, finalidade, sistema, subsistema, anomalia, origem, local,
          complemento, resultado, descGravidade, descUrgencia, descProbabilidade, descExposicaoRisco,
          nc, cp, sessao: sessaoToken,
        }))
      } else {
        localStorage.removeItem(draftKey)
      }
    } catch {}
  }, [tipoAtivo, tagNrSerie, finalidade, sistema, subsistema, anomalia, origem, local,
      complemento, resultado, descGravidade, descUrgencia, descProbabilidade, descExposicaoRisco,
      nc, cp, draftKey])

  // ── Estado ──
  const [feedbackIA,  setFeedbackIA]  = useState('')
  const [erroSave,    setErroSave]    = useState('')
  const [erroValidacao, setErroValidacao] = useState('')
  const [salvando,    setSalvando]    = useState(false)
  const [salvoOk,     setSalvoOk]     = useState(false)
  const [arquivoSalvo,setArquivoSalvo] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // GR calculado
  const gravNum = valorGut[`gravidade:${descGravidade}`]           ?? 0
  const urgNum  = valorGut[`urgencia:${descUrgencia}`]             ?? 0
  const abrNum  = valorGut[`probabilidade:${descProbabilidade}`]   ?? 0
  const expNum  = valorGut[`exposicaorisco:${descExposicaoRisco}`] ?? 0
  const grauRisco = (gravNum && urgNum && abrNum && expNum) ? calcularGR(gravNum, urgNum, abrNum, expNum, pctGut) : 0
  const prioridade = prioridadeDoGrau(grauRisco, true)
  const corGR = corTelaDoGrau(grauRisco, true)

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
      const res = await fetchTimeout(`${SUPA_URL}/rest/v1/${table}?${params}`, {
        headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
      }, 6000)
      // Sem isto, uma resposta de ERRO da Supabase (ex.: 400) mas com corpo em
      // JSON valido era aceita como se fosse o resultado — nunca lancava
      // excecao, entao comCache() nunca caia no catch (nem tentava o cache
      // de reserva), e quem chamou so via um objeto de erro no lugar de uma
      // lista (Array.isArray dava falso, nada era atualizado, sem aviso
      // nenhum). Achado real de Celso, 02/10/2026.
      if (!res.ok) { const corpo = await res.text(); throw new Error(`${table}: ${res.status} ${corpo}`) }
      return res.json()
    }

    // Busca com cache-reserva: tenta sempre os dados ATUAIS primeiro (limite de
    // 6s, para não travar em sinal fraco); só usa o que estava guardado no
    // aparelho se a busca de agora falhar de verdade (sem internet). Sempre que
    // a busca funciona, atualiza o que fica guardado. Sem isto, uma vez que o
    // aparelho guardava a lista pela primeira vez, uma edição feita depois em
    // Gestor/Parâmetros ou em Sistemas nunca aparecia nas telas de vistoria
    // desse aparelho — reportado por Celso em 28/09/2026.
    async function comCache(chave: string, table: string, params: string) {
      const chaveCompleta = `aime_${chave}_${tipoServico}`
      try {
        const dados = await query(table, params)
        if (Array.isArray(dados)) { try { localStorage.setItem(chaveCompleta, JSON.stringify(dados)) } catch {} }
        return dados
      } catch {
        try { const r = localStorage.getItem(chaveCompleta); if (r) return JSON.parse(r) } catch {}
        return []
      }
    }

    async function carregar() {
      setCarregando(true)
      console.warn('Carregando dados...')
      setDataVistoria(new Date().toLocaleDateString('pt-BR'))

      try {
        // Estabelecimento — busca atual, cache so como reserva offline
        if (cnpjoucpf) {
          const cacheEstKey = `aime_est_${cnpjoucpf}`
          let estArr: any = null
          try {
            estArr = await query('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=cnpjoucpf,razao_social_nome`)
            if (Array.isArray(estArr) && estArr[0]) { try { localStorage.setItem(cacheEstKey, JSON.stringify(estArr[0])) } catch {} }
          } catch {
            try { const r = localStorage.getItem(cacheEstKey); if (r) estArr = [JSON.parse(r)] } catch {}
          }
          if (Array.isArray(estArr) && estArr[0]) {
            const c = estArr[0].cnpjoucpf
            const fmt = c.length === 14
              ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
              : c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
            setCnpjDisplay(fmt)
            setRazaoSocial(estArr[0].razao_social_nome)
            setErroEstab(false)
            console.warn('Estab: ' + estArr[0].razao_social_nome?.slice(0,20))
          } else {
            // Nem a busca atual nem o cache tinham nada — conexao ruim e
            // primeira vez nesse aparelho. Sem isto, os campos ficam em
            // branco sem explicacao nenhuma (achado real de Celso,
            // 01/10/2026, com testes em tablet e notebook).
            setErroEstab(true)
          }
        }

        // Ativos
        if (cpfInspetor) {
          const atv = await comCache(`atv_${cnpjoucpf}`, 'ativos_a_vistoriar', `cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&select=tipo_ativo,tag_ativo_nr_serie,data_cadastro&order=data_cadastro.desc`)
          if (Array.isArray(atv)) {
            setAtivos(atv)
            // So sinaliza erro se vier vazio mesmo (nem busca atual nem
            // cache tinham nada) — carga inicial concorrendo com varias
            // outras buscas pode falhar so nesta, sem rede ruim de verdade
            // (achado real de Celso, 02/10/2026)
            setErroAtivos(atv.length === 0)
          }
          // Buscar finalidade_vistoria de contato_cliente
          try {
            const rCC = await fetch(`/api/contato-cliente?cpf_inspetor=${cpfInspetor}&cnpjoucpf=${cnpjoucpf}&tipo_servico=${encodeURIComponent('37 Vistoria nr-12')}`)
            const dCC = await rCC.json()
            const cc  = dCC?.data?.[0] ?? null
            if (cc?.finalidade_vistoria) setFinalidade(cc.finalidade_vistoria)
          } catch {}
        }

        // Sistemas
        // Sistemas — busca atual, cache so como reserva offline
        const sis = await comCache('sis', 'sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&ativo=eq.true&select=sistema&order=sistema`)
        if (Array.isArray(sis)) { setSistemas([...new Map(sis.map((s: ItemSistema) => [s.sistema, s])).values()]) }

        // Subsistemas — busca atual, cache so como reserva offline
        const sub = await comCache('sub', 'sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&ativo=eq.true&subsistema=not.is.null&select=sistema,subsistema`)
        if (Array.isArray(sub)) setSubsistemas(sub)

        // Anomalias — busca atual, cache so como reserva offline
        const ano = await comCache('ano', 'sistemas_construtivos', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&ativo=eq.true&anomalias=not.is.null&select=sistema,subsistema,anomalias`)
        if (Array.isArray(ano)) setAnomalias(ano)

        // Parâmetros
        // Buscar pesos GUT do banco com fallback
        fetch('/api/criticidade-gut?tipo_servico=37%20Vistoria%20nr-12')
          .then(r => r.json())
          .then(d => {
            if (d.valorGut) setValorGut(d.valorGut)
            if (d.percentuais) setPctGut(d.percentuais)
          })
          .catch(() => {})

        // Parâmetros — busca atual, cache so como reserva offline
        const par = await comCache('par', 'tabela_parametros', `tipo_servico=eq.${encodeURIComponent(tipoServicoBanco)}&select=tipo_parametro,descricao_parametros&order=tipo_parametro,descricao_parametros`)
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
  }, [cpfInspetor, cnpjoucpf, tipoServico, recarregarContador])

  // ── Foto e IA ──
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX_W = 900, MAX_H = 675
      let w = img.width, h = img.height
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const compressed = canvas.toDataURL('image/jpeg', 0.65)
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
    setFeedbackIA('⏳ Gerando não conformidade e causa provável...')
    try {
      const res = await fetch('/api/gerar-nc-cp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sistema, subsistema, anomalia,
          local: local || 'Instalação',
          complemento, origem,
          abrangencia: descProbabilidade || 'Local',
          resultado,
        })
      })
      if (!res.ok) throw new Error('Status: ' + res.status)
      const data = await res.json()
      const ncVal = data.nc || data.nao_conformidade || ''
      const cpVal = data.cp || data.causa_provavel || ''
      if (ncVal) setNc(ncVal)
      if (cpVal) setCp(cpVal)
      setFeedbackIA('✅ NC e CP gerados com sucesso!')
    } catch {
      // Qualquer falha (sem internet, timeout, sinal fraco) → aguardar reconexão
      setFeedbackIA('📵 Aguardando conexão para gerar NC e CP...')
      const aguardar = setInterval(async () => {
        if (navigator.onLine) {
          clearInterval(aguardar)
          setFeedbackIA('🔄 Conectado. Gerando NC e CP...')
          try {
            const r2 = await fetchTimeout('/api/gerar-nc-cp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sistema, subsistema, anomalia, local, complemento, origem, abrangencia: descProbabilidade })
            }, 10000)
            if (r2.ok) {
              const d2 = await r2.json()
              if (d2.nc || d2.nao_conformidade) setNc(d2.nc || d2.nao_conformidade)
              if (d2.cp || d2.causa_provavel) setCp(d2.cp || d2.causa_provavel)
              setFeedbackIA('✅ NC e CP geradas com sucesso!')
            } else {
              setFeedbackIA('⚠️ Erro ao gerar NC/CP. Tente novamente.')
            }
          } catch { /* continua aguardando na próxima iteração */ }
        }
      }, 3000)
    }
  }

  async function salvarDados() {
    blurAll()
    // Bloqueia o salvamento enquanto a IA ainda esta gerando a descricao de
    // NC/CP — sem essa checagem, clicar em Salvar antes da IA retornar podia
    // gravar a vistoria com NC/CP vazios ou incompletos, silenciosamente.
    if (resultado === 'Não conforme' && /^(⏳|📵|🔄)/.test(feedbackIA)) {
      setFeedbackIA('⚠️ Aguarde a IA terminar de gerar a NC e a CP antes de salvar.')
      return
    }
    if (!tipoAtivo) { alert('Selecione o Tipo de Ativo antes de salvar.'); return }
    if (!tagNrSerie) { alert('Selecione o TAG / Nº Série antes de salvar.'); return }
    if (!fotoBase64) { alert('Adicione a foto antes de salvar.'); return }
    if (!local) { alert('Informe o Local/Instalação/Setor/Área antes de salvar.'); return }
    if (!resultado) { alert('Selecione o Resultado antes de salvar.'); return }
    setSalvando(true); setErroSave('')
    // Declarado aqui (fora do try) para continuar acessivel la embaixo, no
    // caminho de SUCESSO, que roda depois que o try/catch termina — estava
    // dentro do try antes, causando ReferenceError no ultimo passo (so
    // depois que o dado JA tinha sido salvo com sucesso no servidor).
    // Achado real de Celso, 02/10/2026 — explica os "retornos de tela"
    // apos acionar a foto/salvar.
    let nomeArquivo = ''

    try {
    // Incrementa o contador de foto
    const nrRes = await fetchTimeout('/api/foto-nr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf_inspetor: cpfInspetor, cnpjoucpf, tipo_servico: tipoServico })
    }, 8000)
    const nrData = await nrRes.json()
    if (!nrRes.ok && nrRes.status === 503) throw new Error('offline')
    const nrFinal = nrData?.formatado ?? fotoNr

    nomeArquivo = `${chaveInspetor}_${cnpjoucpf}_${tipoServico}_${nrFinal}.json`
    const payload = {
      chaveInspetor, cpfInspetor, cnpjoucpf, tipoServico,
      savedAt: new Date().toISOString(),
      cnpjDisplay, razaoSocial, tipoAtivo, tagNrSerie, finalidade,
      sistema, subsistema, anomalia, origem, resultado, local, complemento,
      gravidade: gravNum, urgencia: urgNum, abrangencia: abrNum, exposicao: expNum,
      descGravidade, descUrgencia, descProbabilidade, descExposicaoRisco,
      grauRisco, prioridade, fotoNr: nrFinal, dataVistoria, fotoBase64, nc, cp,
    }

    const res = await fetchTimeout('/api/salvar-vistoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomeArquivo, payload })
    }, 15000)
    const resJson = await res.json()

    if (!res.ok || resJson.erro) {
      if (resJson.offline || res.status === 503) throw new Error('offline')
      setErroSave('Erro ao salvar: ' + (resJson.erro ?? res.statusText))
      setSalvando(false)
      return
    }

    } catch {
      // Sem internet — comprimir foto e salvar tudo junto no IDB
      try {
        let fotoOfflineNR = fotoBase64
        try {
          const img2 = new window.Image()
          await new Promise<void>(rs => { img2.onload = () => rs(); img2.src = fotoBase64 })
          const cv2 = document.createElement('canvas')
          const MAXO = 640
          let wo = img2.width, ho = img2.height
          if (wo > MAXO) { ho = Math.round(ho * MAXO / wo); wo = MAXO }
          if (ho > MAXO) { wo = Math.round(wo * MAXO / ho); ho = MAXO }
          cv2.width = wo; cv2.height = ho
          cv2.getContext('2d')?.drawImage(img2, 0, 0, wo, ho)
          fotoOfflineNR = cv2.toDataURL('image/jpeg', 0.5)
        } catch {}
        const dadosNR = { chaveInspetor, cpfInspetor, cnpjoucpf, tipoServico,
          cnpjDisplay, razaoSocial, tipoAtivo, tagNrSerie, finalidade,
          sistema, subsistema, anomalia, origem, resultado, local, complemento,
          gravidade: gravNum, urgencia: urgNum, abrangencia: abrNum, exposicao: expNum,
          descGravidade, descUrgencia, descProbabilidade, descExposicaoRisco,
          grauRisco, prioridade, fotoNr, dataVistoria, nc, cp, nc_pendente: !nc || !cp }
        await salvarOffline({ ...dadosNR, fotoBase64: fotoOfflineNR,
          payload: { ...dadosNR, fotoBase64: fotoOfflineNR } })
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const reg = await navigator.serviceWorker.ready
          await (reg as any).sync.register('aime-sync-vistoria')
        }
      } catch(errIDB) {
        console.warn('Erro IDB: ' + String(errIDB).slice(0,40))
        setErroSave('Erro IDB: ' + String(errIDB))
        setSalvando(false)
        return
      }
      const nomeLocal = `${chaveInspetor}_${cnpjoucpf}_${tipoServico}_pendente.json`
      console.warn('Salvo offline 📵')
      setSalvando(false); setSalvoOk(true); setArquivoSalvo(nomeLocal)
      setFeedbackIA('📵 Salvo localmente. Será sincronizado ao reconectar.')
      setSistema(''); setSubsistema(''); setAnomalia(''); setLocal(''); setComplemento('')
      setTipoAtivo(''); setTagNrSerie(''); setFotoBase64(''); setNc(''); setCp('')
      setDescGravidade(''); setDescUrgencia(''); setDescProbabilidade(''); setDescExposicaoRisco('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      try { localStorage.removeItem(draftKey) } catch {}
    setRascunhoRecuperado(false)
    suprimirProximoSalvamentoRef.current = true
      return
    }

    // Limpa formulário preservando CNPJ/RS
    setSistema(''); setSubsistema(''); setAnomalia(''); setOrigem(ORIGEM_DEFAULT); setLocal('')
    setComplemento(''); setTipoAtivo(''); setTagNrSerie('')
    setDescGravidade(''); setDescUrgencia(''); setDescProbabilidade(''); setDescExposicaoRisco('')
    setFotoBase64(''); setNc(''); setCp(''); setFeedbackIA('')
    console.warn('Salvo online ✅')
    if (fileInputRef.current) fileInputRef.current.value = ''
    try { localStorage.removeItem(draftKey) } catch {}
    setRascunhoRecuperado(false)
    suprimirProximoSalvamentoRef.current = true
    setSalvando(false); setSalvoOk(true); setArquivoSalvo(nomeArquivo)
  }

  function blurAll() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }

  function encerrar() {
    blurAll()
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
        <p style={{ color: '#4a6480', fontSize: '9pt', marginBottom: '20px' }}>Você pode registrar uma nova manifestação ou encerrar a vistoria.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => { blurAll(); setTimeout(() => setSalvoOk(false), 50) }} style={{ ...S.btn, ...S.btnPri }}>➕ Nova Manifestação</button>
          <button onClick={encerrar} style={{ ...S.btn, ...S.btnSec, minWidth: '140px' }}>Encerrar</button>
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

          {rascunhoRecuperado && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '6px',
              padding: '8px 12px', fontSize: '8pt', color: '#92400E', textAlign: 'center' }}>
              {fotoRecuperada
                ? 'ℹ️ A tela foi recarregada (isso pode acontecer ao usar a câmera). Recuperamos o que você tinha preenchido e a foto. Revise antes de salvar.'
                : 'ℹ️ A tela foi recarregada (isso pode acontecer ao usar a câmera). Recuperamos o que você tinha preenchido; tire a foto novamente.'}
            </div>
          )}

          {erroEstab && (
            <div style={{ backgroundColor:'#FEF3C7', border:'1px solid #F59E0B', borderRadius:'6px', padding:'8px 10px', fontSize:'11px', color:'#92400E', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
              <span>⚠️ Não foi possível carregar os dados do estabelecimento (CNPJ/Razão social). Verifique a conexão.</span>
              <button type="button" onClick={() => setRecarregarContador(c => c + 1)}
                style={{ backgroundColor:'#F59E0B', color:'white', border:'none', borderRadius:'4px', padding:'4px 10px', fontSize:'10px', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                Tentar novamente
              </button>
            </div>
          )}

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
                  <select style={S.input} value={tipoAtivo} onChange={e => { setTipoAtivo(e.target.value); setTagNrSerie('') }}>
                    <option value="">Selecione...</option>
                    {tiposAtivo.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {erroAtivos && (
                    <div style={{ backgroundColor:'#FEF3C7', border:'1px solid #F59E0B', borderRadius:'6px', padding:'6px 8px', fontSize:'10px', color:'#92400E', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px', marginTop:'4px' }}>
                      <span>⚠️ Não foi possível carregar os ativos cadastrados. Verifique a conexão.</span>
                      <button type="button" onClick={() => setRecarregarContador(c => c + 1)}
                        style={{ backgroundColor:'#F59E0B', color:'white', border:'none', borderRadius:'4px', padding:'3px 8px', fontSize:'9px', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                        Tentar novamente
                      </button>
                    </div>
                  )}
                </Field>
                <Field label={tagObrigatorio ? 'Tag / Nr série *' : 'Tag / Nr série'}>
                  <select style={S.input} value={tagNrSerie} onChange={e => {
                    setTagNrSerie(e.target.value)
                    const ativo = ativos.find(a => a.tipo_ativo === tipoAtivo && a.tag_ativo_nr_serie === e.target.value)
                    // finalidade vem de contato_cliente — não alterar
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
                {resultado === 'Conforme' ? (
                  // "Requisito atendido plenamente." não é uma opção real do banco —
                  // um <select> não exibe um valor que não está na lista de opções.
                  <input style={S.input} value={anomalia} readOnly />
                ) : (
                  <select style={S.input} value={anomalia} onChange={e => { setAnomalia(e.target.value); setResultado(''); setNc('') }} disabled={!subsistema}>
                    <option value="">Selecione o requisito normativo...</option>
                    {anomaliasFiltradas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                )}
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '4px', marginTop: '4px' }}>
                <Field label="Resultado *">
                  <select style={S.input} value={resultado} onChange={e => {
                    const val = e.target.value
                    setResultado(val)
                    if (val === 'Conforme') { setNc('Requisito atendido plenamente.'); setCp('Instalação de acordo com o projeto e normas aplicáveis.'); setAnomalia('Requisito atendido plenamente.') }
                    else if (val === 'Não aplicável') { setNc('Requisito não se aplica à instalação.'); if (anomalia === 'Requisito atendido plenamente.') setAnomalia('') }
                    else if (val === 'Não conforme') {
                      setNc(''); setCp('')
                      if (anomalia === 'Requisito atendido plenamente.') setAnomalia('')
                      if (fotoBase64) gerarNcCp(fotoBase64)
                    } else { setNc(''); setCp(''); if (anomalia === 'Requisito atendido plenamente.') setAnomalia('') }
                  }} disabled={!anomalia}>
                    <option value="">Sel...</option>
                    {['Conforme', 'Não conforme', 'Não aplicável', 'Não verificado'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Local/Instalação/Setor/Área *">
                  {locais.length > 0
                    ? <select style={{ ...S.input, borderColor: !local ? '#E24B4A' : undefined }} value={local} onChange={e => setLocal(e.target.value)}>
                        <option value="">Selecione...</option>
                        {locais.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    : <input style={{ ...S.input, borderColor: !local ? '#E24B4A' : undefined }} value={local} onChange={e => setLocal(e.target.value)} maxLength={150} placeholder="Ex: Quadro 2º pavimento..." />
                  }
                </Field>
                <Field label="Complemento">
                  <input style={S.input} value={complemento} onChange={e => setComplemento(e.target.value)} maxLength={150} placeholder="Detalhe adicional..." />
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
                  <span style={{ ...S.badge, background: fundoTelaDoGrau(grauRisco, true), color: corGR }}>
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
                {/* Box Foto Nº — à esquerda */}
                <div style={S.photoMeta}>
                  <span style={{ fontSize: '7pt', color: '#6B7280' }}>Foto Nº</span>
                  <span style={{ fontSize: '8pt', fontWeight: 700, color: '#1E3A8A' }}>{fotoNr}</span>
                </div>
                {/* Box Data vistoria — centralizada */}
                <div style={{ ...S.photoMeta, flex: 1, justifyContent: 'center' }}>
                  <span style={{ fontSize: '7pt', color: '#6B7280' }}>Data vistoria</span>
                  <span style={{ fontSize: '8pt', fontWeight: 600, color: '#374151' }}>{dataVistoria}</span>
                </div>
                {/* Botão Adicionar foto — à direita */}
                <button
                  style={S.photoBtn}
                  onClick={() => {
                    const faltando = []
                    if (!tipoAtivo) faltando.push('Tipo de ativo')
                    if (!tagNrSerie) faltando.push('TAG / Nº Série')
                    if (!sistema) faltando.push('Sistema')
                    if (!subsistema) faltando.push('Subsistema')
                    if (!anomalia) faltando.push('Anomalia')
                    if (!origem) faltando.push('Origem')
                    if (!local) faltando.push('Local de ocorrência')
                    if (!resultado) faltando.push('Resultado (C/NC/NA)')
                    if (!descGravidade) faltando.push('Gravidade')
                    if (!descUrgencia) faltando.push('Urgência')
                    if (!descProbabilidade) faltando.push('Probabilidade')
                    if (!descExposicaoRisco) faltando.push('Exposição ao risco')
                    if (faltando.length > 0) { setErroValidacao('Preencha antes de tirar a foto: ' + faltando.join(', ')); return }
                    setErroValidacao('')
                    fileInputRef.current?.click()
                  }}
                  disabled={!sistema || !subsistema || !anomalia}
                >
                  📷 Adicionar foto
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFotoChange} />
              </div>
              <div style={S.photoArea} onClick={() => {
                const faltando = []
                if (!tipoAtivo) faltando.push('Tipo de ativo')
                if (!tagNrSerie) faltando.push('TAG / Nº Série')
                if (!sistema) faltando.push('Sistema')
                if (!subsistema) faltando.push('Subsistema')
                if (!anomalia) faltando.push('Anomalia')
                if (!origem) faltando.push('Origem')
                if (!local) faltando.push('Local de ocorrência')
                if (!resultado) faltando.push('Resultado (C/NC/NA)')
                if (!descGravidade) faltando.push('Gravidade')
                if (!descUrgencia) faltando.push('Urgência')
                if (!descProbabilidade) faltando.push('Probabilidade')
                if (!descExposicaoRisco) faltando.push('Exposição ao risco')
                if (faltando.length > 0) { setErroValidacao('Preencha antes de tirar a foto: ' + faltando.join(', ')); return }
                setErroValidacao('')
                fileInputRef.current?.click()
              }}>
                {fotoBase64 && <img src={fotoBase64} alt="" style={{ display: 'block', width: '100%', maxHeight: '600px', objectFit: 'contain', margin: '0 auto', padding: '4px' }} />}
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
                  style={{ ...S.input, ...S.textarea, minHeight: '48px', backgroundColor: '#F8FAFC', color: '#374151' }}
                  value={nc}
                  maxLength={500}
                  readOnly
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

          {erroValidacao && <div style={{ color: '#DC2626', fontSize: '8pt', textAlign: 'center', marginTop: '4px', marginBottom: '4px', padding: '4px 8px', background: '#FEF2F2', borderRadius: '4px' }}>⚠️ {erroValidacao}</div>}
                    <div style={S.block}>
            <div style={S.blockTitle}>Causa Provável (CP)</div>
            <div style={S.blockBody}>
              <Field label="Causa provável (CP)">
                <textarea style={{ ...S.input, ...S.textarea, backgroundColor: "#F8FAFC", color: "#374151" }} value={cp} onChange={e => setCp(e.target.value)} placeholder="Descreva a causa provável da manifestação patológica..." />
              </Field>
            </div>
          </div>

          {erroSave && <div style={{ color: '#CC0000', fontSize: '8pt', textAlign: 'center', marginBottom: '6px' }}>⚠️ {erroSave}</div>}

          {/* FOOTER */}
          <div style={S.footer}>
            <button style={{ ...S.btn, ...S.btnSec }} onClick={() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setTimeout(() => encerrar(), 50) }}>Encerrar vistoria</button>
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
  photoControls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' },
  photoMeta:     { display: 'flex', gap: '8px', alignItems: 'center', background: '#f5f7fc', border: '1px solid #c3d4f0', borderRadius: '6px', padding: '4px 10px' },
  photoBtn:      { display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 12px', height: '24px', background: '#E8EEF7', border: '1px solid #c3d4f0', borderRadius: '4px', cursor: 'pointer', fontSize: '7pt', color: '#1E3A8A', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  dataDisplay:   { fontSize: '7.5pt', color: '#1E3A8A', fontWeight: 600, textAlign: 'center', padding: '2px 5px', border: '1px solid #c3d4f0', borderRadius: '4px', background: '#f5f7fc' },
  photoArea:     { border: '1.5px dashed #c3d4f0', borderRadius: '5px', background: '#E8EEF7', minHeight: '320px', position: 'relative', overflow: 'hidden', cursor: 'pointer', margin: '0 -10px' },
  aiStatus:      { fontSize: '6.5pt', color: '#1E3A8A', padding: '2px 6px', background: '#E8EEF7', borderRadius: '4px', marginTop: '2px' },
  footer:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' },
  btn:           { padding: '8px 0', fontSize: '8pt', fontWeight: 700, borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' },
  btnSec:        { background: '#ffffff', border: '2px solid #1E3A8A', color: '#1E3A8A' },
  btnPri:        { background: '#1E3A8A', border: '2px solid #1E3A8A', color: '#ffffff' },
}
