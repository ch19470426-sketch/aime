"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface NC {
  sistema: string; subsistema: string; anomalia: string; local: string
  complemento: string; grauRisco: number; prioridade: string; fotoNr: string
  nc: string; cp: string; fotoBase64?: string
}

// ─── Config por tipo de laudo ─────────────────────────────────────────────────
const LAUDO_CONFIG: Record<string, {
  titulo: string; tipoVistoria: string; norma: string
  labelEstabelecimento: string; labelResponsavel: string; labelCNPJ: string
  temClassificacao: boolean
}> = {
  '41': { titulo: 'Laudo de Autovistoria', tipoVistoria: '31', norma: 'NBR 16.747/2020 + IBAPE/2025', labelEstabelecimento: 'Condomínio', labelResponsavel: 'Síndico/Responsável', labelCNPJ: 'CNPJ', temClassificacao: true },
  '42': { titulo: 'Laudo de Inspeção Predial', tipoVistoria: '32', norma: 'NBR 16.747/2020 + IBAPE/2025', labelEstabelecimento: 'Condomínio', labelResponsavel: 'Síndico/Responsável', labelCNPJ: 'CNPJ', temClassificacao: true },
  '43': { titulo: 'Laudo de Imóvel Novo', tipoVistoria: '33', norma: 'NBR 15.575 + NBR 16.747', labelEstabelecimento: 'Proprietário', labelResponsavel: 'Proprietário', labelCNPJ: 'CPF', temClassificacao: true },
  '44': { titulo: 'Laudo de Inspeção de Fachada', tipoVistoria: '34', norma: 'NBR 13.755 + NBR 16.747', labelEstabelecimento: 'Condomínio', labelResponsavel: 'Síndico/Responsável', labelCNPJ: 'CNPJ', temClassificacao: true },
}

const NIVEIS_INSPECAO = ['Nível 1', 'Nível 2', 'Nível 3']
const GRAUS_RISCO     = ['Crítico', 'Regular', 'Mínimo']
const DESEMPENHOS     = ['Bom', 'Regular', 'Ruim', 'Crítico']
const QUALID_MANUT    = ['Atende totalmente', 'Atende parcialmente', 'Não atende']
const COND_USO        = ['Uso regular', 'Uso irregular']

// Classificação específica — Imóvel Novo (43)
const CL43 = {
  a: ['Conforme', 'Pequenas NC', 'Moderadas NC', 'Graves NC'],
  b: ['Excelente', 'Bom', 'Regular', 'Insatisfatório'],
  c: ['Atende plenamente', 'Atende com restrições', 'Não atende'],
  d: ['Apto', 'Apto com ressalvas', 'Não apto'],
  e: ['Classe A', 'Classe B', 'Classe C', 'Classe D', 'Classe E'],
  f: ['95-100', '85-94', '70-84', '50-69', '<50'],
}

// Classificação específica — Fachada (44)
const CL44 = {
  a: ['Excelente', 'Bom', 'Regular', 'Deficiente', 'Crítico'],
  b: ['Adequada', 'Parcial', 'Insuficiente', 'Inexistente'],
  c: ['Baixa', 'Média', 'Alta', 'Muito alta'],
  d: ['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Crítico'],
  e: ['Atende', 'Atende parcialmente', 'Não atende'],
  f: ['Programável', 'No curto prazo', 'Urgente', 'Emergencial'],
}

const SLUG: Record<string, string> = {
  '41': 'laudo_autovistoria', '42': 'laudo_inspecao',
  '43': 'laudo_imovel_novo',  '44': 'laudo_fachada',
}

// ─── Wrapper Suspense ─────────────────────────────────────────────────────────
export default function LaudoPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh" }} />}>
      <LaudoComplemento />
    </Suspense>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
function LaudoComplemento() {
  const params        = useSearchParams()
  const cpfInspetor   = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor = params.get('chave_inspetor')  ?? ''
  const cnpjoucpf     = params.get('cnpjoucpf')       ?? ''
  const tipoServico   = params.get('tipo_servico')    ?? '41'

  const cfg = LAUDO_CONFIG[tipoServico] ?? LAUDO_CONFIG['41']

  // ── Sessão ──
  const [sessaoVerificada, setSessaoVerificada] = useState(false)
  useEffect(() => {
    async function verificar() {
      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.email) { window.location.href = '/'; return }
        const cpfSessao = session.user.email.split('@')[0]
        if (cpfInspetor && cpfSessao !== cpfInspetor) { window.location.href = '/'; return }
        setSessaoVerificada(true)
      } catch { window.location.href = '/' }
    }
    verificar()
  }, [cpfInspetor])

  // ── Estados ──
  const [etapa, setEtapa]       = useState<'complemento'|'gerando'|'pronto'>('complemento')
  const [erro, setErro]         = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')

  // Dados do estabelecimento
  const [estab, setEstab]       = useState<Record<string,string>>({})
  const [inspetor, setInspetor] = useState<Record<string,string>>({})
  const [ncs, setNcs]           = useState<NC[]>([])
  const [carregando, setCarregando] = useState(true)

  // Complemento 1.1
  const [nomeConvencao, setNomeConvencao] = useState('')
  const [nivelInspecao, setNivelInspecao]  = useState('')
  const [sinteseEdif, setSinteseEdif]     = useState('')
  const [sinteseTemp, setSinteseTemp]     = useState('')  // gerado pela IA, aguarda confirmar
  const [editandoSintese, setEditandoSintese] = useState(false)
  const [gerandoSintese, setGerandoSintese] = useState(false)

  // Complemento 3.1
  const [dadosVistoria, setDadosVistoria] = useState('')
  const [descVistoria, setDescVistoria]   = useState('')
  const [descTemp, setDescTemp]           = useState('')  // gerado pela IA, aguarda confirmar
  const [editandoDesc, setEditandoDesc]   = useState(false)
  const [gerandoDesc, setGerandoDesc]     = useState(false)

  // Complemento 3.3
  const [nivel, setNivel]     = useState('')
  const [risco, setRisco]     = useState('')
  const [desempenho, setDesempenho] = useState('')
  const [manut, setManut]     = useState('')
  const [uso, setUso]         = useState('')
  const [desempGeral, setDesempGeral] = useState('')

  // Recomendações 5
  const [rec51, setRec51] = useState('')
  const [rec52, setRec52] = useState('')
  const [rec53, setRec53] = useState('')
  const [rec54, setRec54] = useState('')
  const [gerandoRec, setGerandoRec] = useState(false)

  // ── Campos complementares ──
  const [croquiBase64, setCroquiBase64]     = useState('')
  const [fotoCapa, setFotoCapa]             = useState('')  // foto fachada
  const [artRrt, setArtRrt]                 = useState('')  // ART/RRT base64

  // Documentos Anexo 1 — situação e resultado por documento
  const DOCS_LISTA = [
    'Auto de Conclusão da Edificação (HABITE-SE)',
    'Convenção do Condomínio',
    'Alvará de Funcionamento de Elevadores',
    'Relatório de Inspeção Anual dos Elevadores (RIA)',
    'Apólice de Seguro da edificação',
    'Auto de Vistoria do Corpo de Bombeiros (AVCB)',
    'Atestado do Sistema de Proteção a Descarga Atmosférica (SPDA)',
    'Avaliação da Rede de Distribuição Interna de Gás',
    'Contrato de Manutenção de Elevadores',
    'Certificado de Desratização e Desinsetização',
    'Relatório de Manutenção e Limpeza das Caixas de Água',
    'Certificado do reservatório de GLP',
    'Laudo de autovistoria anterior',
    'Projeto Arquitetônico Aprovado na Prefeitura',
    'Projetos Elétrico e Hidrossanitário Aprovados na Prefeitura',
    'Manual de Uso, Operação e Manutenção da Edificação',
    'Plano de Manutenção Preventiva da Edificação',
    'Atestado de Brigada de Incêndio (Imóveis não Residenciais)',
    'Alvará de Funcionamento (Imóveis não Residenciais)',
    'Licenças Ambientais (Imóveis não Residenciais)',
    'Outorga e Licença de Estação de Tratamento de Efluentes',
    'Outorga e Licença de Poço Profundo de Captação de Água',
  ]
  const [docsAnexo1, setDocsAnexo1] = useState<Record<string,{situacao:string,resultado:string}>>({}) // preenchido pelo plano

  const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
  const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

  // ── Carregar dados ──
  useEffect(() => {
    if (!sessaoVerificada || !cnpjoucpf) return
    async function carregar() {
      setCarregando(true)
      try {
        // Estabelecimento
        const resE = await fetch(`${SUPA_URL}/rest/v1/estabelecimento?cnpjoucpf=eq.${cnpjoucpf}&select=*`, {
          headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
        })
        const dadosE = await resE.json()
        if (Array.isArray(dadosE) && dadosE.length > 0) {
          const e = dadosE[0]
          setEstab(e)
          // Buscar endereço pelo CEP sempre (sobrescreve campos do BD)
          if (e.cep || e.cep_estabelecimento) {
            try {
              const cepNum = String(e.cep_estabelecimento || e.cep || '').replace(/\D/g, '')
              if (cepNum.length === 8) {
                const vr = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`)
                const vd = await vr.json()
                if (!vd.erro) {
                  setEstab(prev => ({
                    ...prev,
                    logradouro: vd.logradouro || prev.logradouro || '',
                    bairro:     vd.bairro     || prev.bairro     || '',
                    cidade:     vd.localidade || prev.cidade     || '',
                    uf:         vd.uf         || prev.uf         || '',
                  }))
                }
              }
            } catch { /* segue sem endereço */ }
          }
        }
        // Buscar dados de ativos_a_vistoriar (responsável, tipo, características)
        const resA = await fetch(`${SUPA_URL}/rest/v1/ativos_a_vistoriar?cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf.replace(/\./g,"").replace(/-/g,"").replace(/\//g,"")}&select=*`, {
          headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
        })
        const dadosA = await resA.json()
        if (Array.isArray(dadosA) && dadosA.length > 0) {
          const a = dadosA[0]
          setEstab(prev => ({
            ...prev,
            // Responsável sempre vem dos ativos
            nome_responsavel:      a.nome_responsavel     || prev.nome_responsavel     || '',
            funcao_responsavel:    a.funcao_responsavel   || prev.funcao_responsavel   || '',
            whatsapp:              a.whatsapp             || prev.whatsapp             || '',
            email:                 a.email                || prev.email                || '',
            // Características do imóvel — sempre dos ativos
            tipo_imovel:           a.tipo_imovel || a.tipo_de_ativo || a.tipo || prev.tipo_imovel || '',
            uso_imovel:            a.uso_ativo            || prev.uso_imovel           || '',
            numero_pavimentos:     a.numero_pavimentos    || prev.numero_pavimentos    || '',
            numero_unidades_salas: a.numero_unidades_salas|| prev.numero_unidades_salas|| '',
            area_construida:       a.area_construida      || prev.area_construida      || '',
            area_terreno:          a.area_terreno         || prev.area_terreno         || '',
          }))
        }

        // Inspetor
        const resI = await fetch(`${SUPA_URL}/rest/v1/inspetor?cpf_inspetor=eq.${cpfInspetor}&select=*`, {
          headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
        })
        const dadosI = await resI.json()
        // Buscar documentos do plano de trabalho via gerar-plano
        try {
          const SLUG_PLANO: Record<string,string> = {"41":"plano_autovistoria","42":"plano_inspecao","43":"plano_imovel_novo","44":"plano_fachada"}
          const slugP = SLUG_PLANO[String(tipoServico)] ?? "plano_autovistoria"
          const nomeP = `${chaveInspetor}_${cnpjoucpf}_${slugP}.html`
          const resP = await fetch(`/api/ler-documento?nome=${encodeURIComponent(nomeP)}&pasta=documentos_inspetor`)
          if (resP.ok) {
            const dataP = await resP.json()
            if (dataP.existe && dataP.html) {
              const htmlPlano: string = dataP.html
              // A tabela de documentos vem após "Documentos" no HTML do plano
              // Cada doc está em: <td style="font-size:10pt">NOME</td>
              // mas só na tabela de documentos (não atividades)
              // Extrair a seção após o título de documentos
              const secIdx = htmlPlano.search(/Documentos|Relação de Documentos/i)
              const secHtml = secIdx >= 0 ? htmlPlano.slice(secIdx) : htmlPlano
              // Pegar todas as células com texto longo (documentos têm nomes longos)
              const tdMatches = [...secHtml.matchAll(/<td[^>]*font-size:10pt[^>]*>([^<]+)<\/td>/g)]
              const docsPlano = tdMatches
                .map((m: RegExpMatchArray) => m[1].trim())
                .filter((d: string) => 
                  d.length > 8 && 
                  !d.match(/^[\d]/) &&  // não é número (linha de atividade)
                  !d.match(/^\d{2}\/\d{2}/) && // não é data
                  !d.match(/^[—\-]$/)  // não é placeholder
                )
              if (docsPlano.length > 0) {
                setDocsAnexo1(Object.fromEntries(docsPlano.map((d: string) => [d, {situacao:'',resultado:''}])))
              }
            }
          }
        } catch { /* usa lista padrão */ }

        if (Array.isArray(dadosI) && dadosI.length > 0) setInspetor(dadosI[0])

        // NCs das vistorias
        const resNCs = await fetch(`/api/listar-vistorias?chave_inspetor=${chaveInspetor}&cnpjoucpf=${cnpjoucpf}&tipo_servico=${cfg.tipoVistoria}`)
        const dadosNCs = await resNCs.json()
        if (dadosNCs.ncs) setNcs(dadosNCs.ncs)
        else if (dadosNCs.erro) setErro('Erro ao buscar NCs: ' + dadosNCs.erro)
      } catch (e) {
        setErro('Erro ao carregar dados: ' + String(e))
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [sessaoVerificada, cnpjoucpf])

  // ── IA: Síntese da edificação ──
  async function gerarSintese() {
    setGerandoSintese(true)
    try {
      const res = await fetch('/api/ia-laudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'sintese_edificacao',
          dados: {
            razao_social: estab.razao_social_nome,
            uso: estab.uso_imovel, tipo: estab.tipo_imovel,
            pavimentos: estab.numero_pavimentos, unidades: estab.numero_unidades_salas,
            area_construida: estab.area_construida, area_terreno: estab.area_terreno,
            responsavel: estab.nome_responsavel, funcao: estab.funcao_responsavel,
            nome_convencao: nomeConvencao, nivel_inspecao: nivelInspecao,
          }
        })
      })
      const data = await res.json()
      if (data.texto) { setSinteseEdif(data.texto); setSinteseTemp('') }
      else setErro('IA não retornou resultado: ' + JSON.stringify(data).substring(0, 100))
    } catch (e) { setErro('Erro ao gerar síntese: ' + String(e)) }
    finally { setGerandoSintese(false) }
  }

  // ── IA: Descrição da vistoria ──
  async function gerarDescricao() {
    setGerandoDesc(true)
    try {
      const res = await fetch('/api/ia-laudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'descricao_vistoria', dados: { informacoes: dadosVistoria, tipo_servico: tipoServico, nivel_inspecao: nivelInspecao } })
      })
      const data = await res.json()
      if (data.texto) { setDadosVistoria(data.texto); setDescVistoria(data.texto); setDescTemp('') }
      else setErro('IA não retornou resultado: ' + JSON.stringify(data).substring(0, 100))
    } catch (e) { setErro('Erro ao gerar descrição: ' + String(e)) }
    finally { setGerandoDesc(false) }
  }

  // ── IA: Recomendações ──
  async function gerarRecomendacoes() {
    setGerandoRec(true)
    try {
      const ncsAM = ncs.filter(nc => nc.prioridade === 'Alta' || nc.prioridade === 'Média')
      const ativo = await fetch(`${SUPA_URL}/rest/v1/ativos_a_vistoriar?cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=ilike.%${cfg.tipoVistoria}%&select=data_inicio_operacao&limit=1`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
      }).then(r => r.json())
      const dataHabitese = Array.isArray(ativo) && ativo.length > 0 ? ativo[0].data_inicio_operacao : null
      const res = await fetch('/api/ia-laudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'recomendacoes',
          dados: {
            ncs: ncsAM, tipo_servico: tipoServico,
            uso: estab.uso_imovel, tipo: estab.tipo_imovel,
            data_habite_se: dataHabitese,
            classificacao: { nivel, risco, desempenho, manut, uso, desempGeral }
          }
        })
      })
      const data = await res.json()
      if (data.rec51) setRec51(data.rec51)
      if (data.rec52) setRec52(data.rec52)
      if (data.rec53) setRec53(data.rec53)
      if (data.rec54) setRec54(data.rec54)
    } catch { setErro('Erro ao gerar recomendações. Tente novamente.') }
    finally { setGerandoRec(false) }
  }

  // ── Ler arquivo como base64 ──
  function lerArquivoBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // ── Gerar laudo ──
  async function gerarLaudo() {
    setErro('')
    if (!sinteseEdif) { setErro('Gere ou preencha a síntese da edificação (item 1.1).'); return }
    if (!dadosVistoria) { setErro('Preencha a descrição da vistoria (item 3.1).'); return }
    // validação 3.3 temporariamente desativada
    setEtapa('gerando')
    try {
      const slug = SLUG[tipoServico] ?? `laudo_${tipoServico}`
      const nome = `${chaveInspetor}_${cnpjoucpf}_${slug}.html`

      // ── Salvar imagens no storage antes de enviar payload ──
      async function salvarImagem(b64: string, sufixo: string): Promise<string> {
        if (!b64) return ''
        const ext = b64.startsWith('data:image/png') ? 'png'
          : b64.startsWith('data:application/pdf') ? 'pdf' : 'jpg'
        const nomeImg = `${chaveInspetor}_${cnpjoucpf}_${sufixo}.${ext}`
        try {
          const res = await fetch('/api/upload-imagem-laudo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: b64, nomeArquivo: nomeImg }),
          })
          if (!res.ok) return ''
          const data = await res.json()
          return data.path ?? ''
        } catch { return '' }
      }

      const [pathCroqui, pathFoto, pathArt] = await Promise.all([
        salvarImagem(croquiBase64, 'croqui'),
        salvarImagem(fotoCapa, 'fachada'),
        salvarImagem(artRrt, 'art_rrt'),
      ])

      // ── Gerar recomendações por sistema + SNC para cada NC via IA ──
      const sistemaComNCs = [...new Set((ncs ?? []).map((nc: any) => nc.sistema).filter(Boolean))]
      const recsSistema: Record<string, string> = {}

      // RSR — recomendação por sistema (paralelo)
      await Promise.all(sistemaComNCs.map(async (s: string) => {
        const ncsS = (ncs ?? []).filter((nc: any) => nc.sistema === s)
        try {
          const r = await fetch('/api/ia-laudo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'recomendacao_sistema', dados: { sistema: s, ncs: ncsS } })
          })
          const d = await r.json()
          if (d.texto) recsSistema[s] = d.texto
        } catch { /* segue sem recomendação */ }
      }))

      // SNC — solução para cada NC (paralelo)
      const ncsComSolucao = await Promise.all((ncs ?? []).map(async (nc: any) => {
        try {
          const r = await fetch('/api/ia-laudo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'solucao_nc', dados: nc })
          })
          const d = await r.json()
          return { ...nc, solucaoNC: d.texto ?? '' }
        } catch { return nc }
      }))

      // DRT — recomendações gerais item 5 (manutenção, uso, sustentabilidade, outros)
      let rec51 = '', rec52 = '', rec53 = '', rec54 = ''
      try {
        const rDRT = await fetch('/api/ia-laudo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'recomendacoes',
            dados: {
              tipo_servico: tipoServico,
              ncs: ncsComSolucao.filter((nc: any) => nc.prioridade === 'Alta' || nc.prioridade === 'Média'),
              classificacao: { nivel: nivelInspecao, risco, desempenho, manut, uso, desempGeral },
            }
          })
        })
        const dDRT = await rDRT.json()
        if (dDRT.rec51) rec51 = dDRT.rec51
        if (dDRT.rec52) rec52 = dDRT.rec52
        if (dDRT.rec53) rec53 = dDRT.rec53
        if (dDRT.rec54) rec54 = dDRT.rec54
      } catch { /* segue sem recomendações DRT */ }

      const res = await fetch('/api/gerar-laudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
          estab, inspetor, ncs: ncsComSolucao, nomeArquivo: nome,
          complemento: {
            nomeConvencao, sinteseEdif,
            pathCroqui, pathFoto, pathArt, docsAnexo1,
            descVistoria: descVistoria || dadosVistoria,
            nivelInspecao,
            classificacao: { nivel: nivelInspecao, risco, desempenho, manut, uso, desempGeral },
            rec51, rec52, rec53, rec54,
            recsSistema,
          }
        })
      })
      const data = await res.json()
      if (!res.ok || data.erro) { setErro(data.erro ?? 'Erro ao gerar laudo.'); setEtapa('complemento'); return }
      setNomeArquivo(nome)
      // Redirecionar diretamente usando a variável local (não o estado que pode não ter atualizado)
      window.location.href = `/homologar-produto?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${cnpjoucpf}&tipo_servico=${tipoServico}&nome_arquivo=${encodeURIComponent(nome)}&titulo=${encodeURIComponent(cfg.titulo)}`
    } catch (e) {
      setErro('Erro ao gerar laudo: ' + String(e))
      setEtapa('complemento')
    }
  }

  // ── Estilos ──
  const S = {
    body:      { backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" },
    card:      { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", width: "100%", maxWidth: "860px", overflow: "hidden" },
    header:    { backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" },
    divider:   { height: "2px", backgroundColor: "#1E3A8A" },
    body2:     { padding: "8px 12px" },
    bloco:     { border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden", marginBottom: "6px" },
    bHead:     { backgroundColor: "#1E3A8A", padding: "4px 12px" },
    bTitle:    { color: "white", fontWeight: "bold" as const, fontSize: "14px" },
    bBody:     { padding: "5px 8px" },
    label:     { fontSize: "11px", fontWeight: "600" as const, color: "#374151", display: "block", marginBottom: "3px" },
    input:     { border: "1px solid #D1D5DB", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", width: "100%", outline: "none", boxSizing: "border-box" as const },
    textarea:  { border: "1px solid #D1D5DB", borderRadius: "6px", padding: "5px 8px", fontSize: "12px", width: "100%", outline: "none", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: "96px" },
    btn:       { padding: "8px 20px", borderRadius: "50px", border: "none", backgroundColor: "#1E3A8A", color: "white", fontWeight: "600" as const, fontSize: "12px", cursor: "pointer" },
    btnSec:    { padding: "8px 20px", borderRadius: "50px", border: "2px solid #1E3A8A", backgroundColor: "white", color: "#1E3A8A", fontWeight: "600" as const, fontSize: "12px", cursor: "pointer" },
    btnIA:     { padding: "6px 14px", borderRadius: "50px", border: "none", backgroundColor: "#059669", color: "white", fontWeight: "600" as const, fontSize: "11px", cursor: "pointer" },
    grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" },
    grid3:     { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" },
    contagem:  { fontSize: "10px", color: "#9CA3AF", textAlign: "right" as const, marginTop: "2px" },
  }

  if (!sessaoVerificada) return (
    <div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#4a6480", fontSize: "14px" }}>Verificando sessão...</p>
    </div>
  )

  if (etapa === 'gerando') return (
    <div style={{ ...S.body, alignItems: "center" }}>
      <div style={{ textAlign: "center", color: "#1E3A8A" }}>
        <p style={{ fontSize: "16px", fontWeight: "bold" }}>Gerando laudo...</p>
        <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>Aguarde enquanto o documento é montado.</p>
      </div>
    </div>
  )

  if (etapa === 'pronto') return (
    <div style={S.body}>
      <div style={S.card}>
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>{cfg.titulo}</span>
        </div>
        <div style={S.divider} />
        <div style={{ ...S.body2, textAlign: "center", padding: "32px" }}>
          <p style={{ color: "#059669", fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>✓ Laudo gerado com sucesso!</p>
          <p style={{ color: "#6B7280", fontSize: "13px", marginBottom: "24px" }}>O laudo foi salvo em Documentos Inspetor. Agora baixe o Word, revise, assine e faça upload.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button style={S.btn} onClick={() => {
              window.location.href = `/homologar-produto?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${cnpjoucpf}&tipo_servico=${tipoServico}&nome_arquivo=${encodeURIComponent(nomeArquivo)}&titulo=${encodeURIComponent(cfg.titulo)}`
            }}>Homologar documento →</button>
            <button style={S.btnSec} onClick={() => window.location.href = '/dashboard'}>Voltar ao Menu</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.body}>
      <div style={S.card}>
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ color: "white", fontWeight: "bold", fontSize: "12px" }}>{cfg.titulo}</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "10px" }}>Coleta de Dados Básicos para Geração de Laudos</div>
          </div>
        </div>
        <div style={S.divider} />
        <div style={S.body2}>

          {carregando && <p style={{ color: "#6B7280", fontSize: "12px", marginBottom: "12px" }}>Carregando dados...</p>}

          {/* ── 1.1 Síntese da Edificação ── */}
          <div style={S.bloco}>
            <div style={S.bHead}><span style={S.bTitle}>1.1 — Descrição da Edificação ou Estabelecimento</span></div>
            <div style={S.bBody}>
              <div style={S.grid3}>
                <div>
                  <label style={S.label}>Razão social / Nome</label>
                  <input style={{ ...S.input, backgroundColor: '#F8FAFC' }} value={estab.razao_social_nome ?? ''} readOnly />
                </div>
                <div>
                  <label style={S.label}>Nível da Inspeção</label>
                  <select style={S.input} value={nivelInspecao} onChange={e => setNivelInspecao(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option>Nível 1</option><option>Nível 2</option><option>Nível 3</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Responsável pelo ativo</label>
                  <input style={{ ...S.input }} value={estab.nome_responsavel ?? ''} onChange={e => setEstab(prev=>({...prev,nome_responsavel:e.target.value}))} />
                </div>
              </div>
              <div style={{ marginTop: "8px" }}>
                <label style={S.label}>Descreva sinteticamente a edificação (Convenção ou Escritura) *</label>
                <textarea style={{ ...S.textarea, backgroundColor: editandoSintese ? '#FFFBEB' : undefined, borderColor: editandoSintese ? '#F59E0B' : undefined }} value={sinteseEdif} maxLength={900} value={sinteseEdif}
                  onChange={e => setSinteseEdif(e.target.value)}
                  placeholder="Insira uma breve descrição e a topologia da edificação, ou clique em ✦ Gerar para geração automática com IA..." />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={S.contagem}>{sinteseEdif.length}/900 caracteres</div>
                  {editandoSintese && <span style={{ fontSize:"10px", color:"#92400E" }}>✏️ Modo ajuste — edite e clique em Salvar</span>}
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "6px" }}>
                  <button style={{ ...S.btnIA, opacity: gerandoSintese ? 0.7 : 1 }}
                    onClick={gerarSintese} disabled={gerandoSintese}>
                    {gerandoSintese ? 'Gerando...' : '✦ Gerar'}
                  </button>

                </div>
              </div>
            </div>
          </div>

          {/* ── 3.1 Descrição da Vistoria ── */}
          <div style={S.bloco}>
            <div style={S.bHead}><span style={S.bTitle}>3.1 — Descrição da Vistoria Técnica</span></div>
            <div style={S.bBody}>
              <label style={S.label}>Descreva sinteticamente como foi realizada a vistoria</label>
              <textarea style={{ ...S.textarea, minHeight: '130px', backgroundColor: editandoDesc ? '#FFFBEB' : undefined, borderColor: editandoDesc ? '#F59E0B' : undefined }}
                value={dadosVistoria}
                maxLength={900}
                onChange={e => setDadosVistoria(e.target.value)}
                placeholder="Descreva o caminhamento efetuado e ocorrências havidas durante a vistoria..."
              ></textarea>
                <button style={{ ...S.btnIA, opacity: gerandoDesc ? 0.7 : 1 }}
                  onClick={gerarDescricao} disabled={gerandoDesc || !dadosVistoria}>
                  {gerandoDesc ? 'Gerando...' : '✦ Gerar'}
                </button>

              </div>
            </div>
          </div>

          {/* ── 3.3 Classificação da Edificação ── */}
          {cfg.temClassificacao && (
            <div style={S.bloco}>
              <div style={S.bHead}>
                <span style={S.bTitle}>
                  {tipoServico === '43' ? '3.3 — Resultado da Classificação do Imóvel'
                    : tipoServico === '44' ? '3.3 — Resultado da Classificação da Fachada'
                    : '3.3 — Resultado da Classificação da Edificação'}
                </span>
              </div>
              <div style={{ ...S.bBody, paddingTop: '4px', paddingBottom: '4px' }}>
                {/* 41 e 42 — classificação padrão NBR 16.747 */}
                {(tipoServico === '41' || tipoServico === '42') && (
                  <>
                    <div style={S.grid3}>
                      {[
                        { lbl: 'a) Grau de risco *', val: risco, set: setRisco, opts: GRAUS_RISCO },
                        { lbl: 'b) Desempenho *', val: desempenho, set: setDesempenho, opts: DESEMPENHOS },
                        { lbl: 'c) Qualidade da manutenção *', val: manut, set: setManut, opts: QUALID_MANUT },
                      ].map(({ lbl, val, set, opts }) => (
                        <div key={lbl}>
                          <label style={S.label}>{lbl}</label>
                          <select style={S.input} value={val} onChange={e => set(e.target.value)}>
                            <option value="">Selecione...</option>
                            {opts.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div style={{ ...S.grid2, marginTop: '6px' }}>
                      {[
                        { lbl: 'd) Condições de uso *', val: uso, set: setUso, opts: COND_USO },
                        { lbl: 'e) Desempenho geral *', val: desempGeral, set: setDesempGeral, opts: DESEMPENHOS },
                      ].map(({ lbl, val, set, opts }) => (
                        <div key={lbl}>
                          <label style={S.label}>{lbl}</label>
                          <select style={S.input} value={val} onChange={e => set(e.target.value)}>
                            <option value="">Selecione...</option>
                            {opts.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {/* 43 — Imóvel Novo */}
                {tipoServico === '43' && (
                  <div style={S.grid3}>
                    {[
                      { lbl: 'a) Conformidade construtiva *', val: nivel, set: setNivel, opts: CL43.a },
                      { lbl: 'b) Qualidade de acabamento *', val: risco, set: setRisco, opts: CL43.b },
                      { lbl: 'c) Funcionalidade *', val: desempenho, set: setDesempenho, opts: CL43.c },
                      { lbl: 'd) Habitabilidade *', val: manut, set: setManut, opts: CL43.d },
                      { lbl: 'e) Classe do imóvel *', val: uso, set: setUso, opts: CL43.e },
                      { lbl: 'f) Grau de satisfação no recebimento *', val: desempGeral, set: setDesempGeral, opts: CL43.f },
                    ].map(({ lbl, val, set, opts }) => (
                      <div key={lbl}>
                        <label style={S.label}>{lbl}</label>
                        <select style={S.input} value={val} onChange={e => set(e.target.value)}>
                          <option value="">Selecione...</option>
                          {opts.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
                {/* 44 — Fachada */}
                {tipoServico === '44' && (
                  <div style={S.grid3}>
                    {[
                      { lbl: 'a) Estado de conservação *', val: nivel, set: setNivel, opts: CL44.a },
                      { lbl: 'b) Histórico de manutenção *', val: risco, set: setRisco, opts: CL44.b },
                      { lbl: 'c) Exposição ambiental *', val: desempenho, set: setDesempenho, opts: CL44.c },
                      { lbl: 'd) Risco de desprendimento *', val: manut, set: setManut, opts: CL44.d },
                      { lbl: 'e) Desempenho do sistema *', val: uso, set: setUso, opts: CL44.e },
                      { lbl: 'f) Prioridade de intervenção *', val: desempGeral, set: setDesempGeral, opts: CL44.f },
                    ].map(({ lbl, val, set, opts }) => (
                      <div key={lbl}>
                        <label style={S.label}>{lbl}</label>
                        <select style={S.input} value={val} onChange={e => set(e.target.value)}>
                          <option value="">Selecione...</option>
                          {opts.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* ── Croqui + Foto Fachada ── */}
          <div style={S.bloco}>
            <div style={S.bHead}><span style={S.bTitle}>Localização — Croqui e Foto da Fachada Principal</span></div>
            <div style={S.bBody}>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Croqui de localização (mapa)</label>
                  {croquiBase64
                    ? <div style={{ position:'relative' }}>
                        <img src={croquiBase64} style={{ width:'100%', height:'120px', objectFit:'cover', border:'1px solid #D1D5DB', borderRadius:'4px' }} alt="Croqui" />
                        <button onClick={() => setCroquiBase64('')}
                          style={{ position:'absolute', top:4, right:4, background:'#DC2626', color:'white', border:'none', borderRadius:'4px', padding:'2px 8px', fontSize:'10px', cursor:'pointer' }}>✕</button>
                      </div>
                    : <label style={{ border:'1px dashed #D1D5DB', borderRadius:'6px', padding:'20px', textAlign:'center' as const, display:'block', cursor:'pointer', fontSize:'11px', color:'#6B7280' }}>
                        📍 Clique para inserir croqui / mapa
                        <input type="file" accept="image/*" style={{ display:'none' }}
                          onChange={async e => { const f = e.target.files?.[0]; if (f) setCroquiBase64(await lerArquivoBase64(f)) }} />
                      </label>
                  }
                </div>
                <div>
                  <label style={S.label}>Foto da fachada principal</label>
                  {fotoCapa
                    ? <div style={{ position:'relative' }}>
                        <img src={fotoCapa} style={{ width:'100%', height:'120px', objectFit:'cover', border:'1px solid #D1D5DB', borderRadius:'4px' }} alt="Fachada" />
                        <button onClick={() => setFotoCapa('')}
                          style={{ position:'absolute', top:4, right:4, background:'#DC2626', color:'white', border:'none', borderRadius:'4px', padding:'2px 8px', fontSize:'10px', cursor:'pointer' }}>✕</button>
                      </div>
                    : <label style={{ border:'1px dashed #D1D5DB', borderRadius:'6px', padding:'20px', textAlign:'center' as const, display:'block', cursor:'pointer', fontSize:'11px', color:'#6B7280' }}>
                        📷 Clique para inserir foto da fachada
                        <input type="file" accept="image/*" style={{ display:'none' }}
                          onChange={async e => { const f = e.target.files?.[0]; if (f) setFotoCapa(await lerArquivoBase64(f)) }} />
                      </label>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* ── ART/RRT ── */}
          <div style={S.bloco}>
            <div style={S.bHead}><span style={S.bTitle}>Anexo 3 — ART / RRT do Responsável Técnico</span></div>
            <div style={S.bBody}>
              {artRrt
                ? <div style={{ position:'relative' }}>
                    {artRrt.startsWith('data:image')
                      ? <img src={artRrt} style={{ width:'100%', maxHeight:'200px', objectFit:'contain', border:'1px solid #D1D5DB', borderRadius:'4px' }} alt="ART/RRT" />
                      : <div style={{ padding:'12px', background:'#F0F4FF', borderRadius:'4px', fontSize:'11px', color:'#1E3A8A' }}>
                          📄 Arquivo PDF carregado
                        </div>
                    }
                    <button onClick={() => setArtRrt('')}
                      style={{ position:'absolute', top:4, right:4, background:'#DC2626', color:'white', border:'none', borderRadius:'4px', padding:'2px 8px', fontSize:'10px', cursor:'pointer' }}>✕ Remover</button>
                  </div>
                : <label style={{ border:'1px dashed #D1D5DB', borderRadius:'6px', padding:'16px', textAlign:'center' as const, display:'block', cursor:'pointer', fontSize:'11px', color:'#6B7280' }}>
                    📋 Clique para inserir imagem ou PDF da ART/RRT
                    <input type="file" accept="image/*,application/pdf" style={{ display:'none' }}
                      onChange={async e => { const f = e.target.files?.[0]; if (f) setArtRrt(await lerArquivoBase64(f)) }} />
                  </label>
              }
              <p style={{ fontSize:'10px', color:'#9CA3AF', marginTop:'6px' }}>
                A ART ou RRT será inserida no Anexo 3 do laudo. Formatos aceitos: imagem (JPG/PNG) ou PDF.
              </p>
            </div>
          </div>

          {/* ── Documentos Anexo 1 ── */}
          <div style={S.bloco}>
            <div style={S.bHead}><span style={S.bTitle}>Anexo 1 — Documentação da Edificação Solicitada</span></div>
            <div style={S.bBody}>
              <p style={{ fontSize:'10px', color:'#6B7280', marginBottom:'8px' }}>
                Informe a situação e o resultado de cada documento solicitado ao responsável.
              </p>
              <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:'10px' }}>
                <thead>
                  <tr style={{ backgroundColor:'#1E3A8A', color:'white' }}>
                    <th style={{ padding:'4px 6px', textAlign:'left' as const, width:'50%' }}>Documento</th>
                    <th style={{ padding:'4px 6px', textAlign:'center' as const, width:'25%' }}>Situação</th>
                    <th style={{ padding:'4px 6px', textAlign:'center' as const, width:'25%' }}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(docsAnexo1).map((doc, i) => (
                    <tr key={doc} style={{ backgroundColor: i%2===0 ? '#F8FAFC' : 'white' }}>
                      <td style={{ padding:'3px 6px', borderBottom:'1px solid #E2E8F0' }}>{doc}</td>
                      <td style={{ padding:'2px 4px', borderBottom:'1px solid #E2E8F0' }}>
                        <select style={{ ...S.input, fontSize:'10px', padding:'2px 4px' }}
                          value={docsAnexo1[doc]?.situacao ?? ''}
                          onChange={e => setDocsAnexo1(prev => ({...prev, [doc]: {...prev[doc], situacao: e.target.value}}))}>
                          <option value="">—</option>
                          <option>Entregue</option>
                          <option>Pendente</option>
                          <option>Desnecessário</option>
                        </select>
                      </td>
                      <td style={{ padding:'2px 4px', borderBottom:'1px solid #E2E8F0' }}>
                        <select style={{ ...S.input, fontSize:'10px', padding:'2px 4px' }}
                          value={docsAnexo1[doc]?.resultado ?? ''}
                          onChange={e => setDocsAnexo1(prev => ({...prev, [doc]: {...prev[doc], resultado: e.target.value}}))}>
                          <option value="">—</option>
                          <option>Conforme</option>
                          <option>Não conforme</option>
                          <option>Não se aplica</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Observação ── */}
          <div style={{ backgroundColor: "#FFF9E6", border: "1px solid #F59E0B", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px" }}>
            <p style={{ fontSize: "11px", fontWeight: "bold" as const, color: "#92400E", marginBottom: "4px" }}>Observação:</p>
            <p style={{ fontSize: "11px", color: "#92400E" }}>
              A revisão integral do laudo deverá ser efetuada e ajustada pelo profissional no arquivo editável que será baixado, assinado (homologado) e carregado para validação e guarda na base de dados do AIMÊ. Ao profissional também cabe a responsabilidade de reescrever o conteúdo do item 6.- Conclusão, conforme análise do laudo e observações em campo, quando da coleta de dados de vistoria.
            </p>
          </div>

          {/* ── NCs resumo ── */}
          {ncs.length > 0 && (
            <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px", fontSize: "11px", color: "#6B7280" }}>
              {ncs.length} não conformidade(s) carregada(s) da vistoria {cfg.tipoVistoria} · {ncs.filter(n => n.prioridade === 'Alta').length} Alta · {ncs.filter(n => n.prioridade === 'Média').length} Média · {ncs.filter(n => n.prioridade === 'Baixa').length} Baixa
            </div>
          )}

          {ncs.length === 0 && !carregando && (
            <div style={{ backgroundColor: "#FFF9E6", border: "1px solid #F59E0B", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px", fontSize: "11px", color: "#92400E" }}>
              ⚠️ Nenhuma NC encontrada para este estabelecimento/serviço. Verifique se a vistoria foi realizada e homologada.
            </div>
          )}

          {erro && <p style={{ color: "#DC2626", fontSize: "12px", marginBottom: "12px" }}>{erro}</p>}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button style={S.btnSec} onClick={() => window.location.href = '/dashboard'}>Voltar</button>
            <button style={S.btn} onClick={gerarLaudo} disabled={carregando}>
              Gerar Laudo →
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
