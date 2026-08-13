'use client'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

const TITULO: Record<string,string> = {
  '51':'Plano de Manutenção — Autovistoria',
  '52':'Plano de Manutenção — Inspeção Predial',
  '53':'Plano de Manutenção — Imóvel Novo',
  '54':'Plano de Manutenção — Inspeção de Fachada',
  '55':'Plano de Manutenção — Elevadores',
  '56':'Plano de Manutenção — Instalações Elétricas NR-10',
  '57':'Plano de Manutenção — Máquinas e Equipamentos NR-12',
  '58':'Plano de Manutenção — Caldeiras e Vasos de Pressão NR-13',
}

// Tipo de vistoria de apoio (onde buscar as NCs)
const TIPO_APOIO: Record<string,string> = {
  '51':'31 Autovistoria','52':'32 Vistoria inspeção',
  '53':'33 Vistoria imóvel novo','54':'34 Vistoria fachada',
  '55':'35 Vistoria elevador','56':'36 Vistoria nr-10',
  '57':'37 Vistoria nr-12','58':'38 Vistoria nr-13',
}

const SLUG: Record<string,string> = {
  '51':'plano_manut_autovistoria','52':'plano_manut_inspecao',
  '53':'plano_manut_imovel_novo','54':'plano_manut_fachada',
  '55':'plano_manut_elevador','56':'plano_manut_nr10',
  '57':'plano_manut_nr12','58':'plano_manut_nr13',
}

const S: Record<string,any> = {
  body: { backgroundColor:'#E8EEF7', minHeight:'100vh', fontFamily:'Arial,sans-serif' },
  header: { background:'#1E3A8A', padding:'12px 20px', display:'flex', alignItems:'center', gap:12 },
  titulo: { color:'#fff', fontWeight:700, fontSize:16 },
  card: { background:'#fff', borderRadius:16, boxShadow:'0 2px 8px rgba(0,0,0,.08)', padding:24, margin:'20px auto', maxWidth:700 },
  label: { fontSize:12, fontWeight:600, color:'#1E3A8A', marginBottom:4, display:'block' },
  val: { fontSize:14, color:'#1a1a2e' },
  btn: { borderRadius:999, border:'none', padding:'10px 28px', fontSize:14, fontWeight:700, cursor:'pointer' },
  btnPri: { background:'#1E3A8A', color:'#fff' },
  btnSec: { background:'#fff', color:'#1E3A8A', border:'2px solid #1E3A8A' },
  etapa: { textAlign:'center' as const, color:'#4a6480', fontSize:14, padding:20 },
}

export default function PlanoManutencaoInner() {
  const params = useSearchParams()
  const cpfInspetor   = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor = params.get('chave_inspetor') ?? ''
  const cnpjoucpf     = params.get('cnpjoucpf')      ?? ''
  const tipoServico   = params.get('tipo_servico')   ?? ''

  const [etapa,  setEtapa]  = useState<'carregando'|'pronto'|'gerando'|'gerado'|'erro'>('carregando')
  const [erro,   setErro]   = useState('')
  const [estab,  setEstab]  = useState<Record<string,any>>({})
  const [inspetor, setInspetor] = useState<Record<string,any>>({})
  const [ncs,    setNcs]    = useState<any[]>([])
  const [nomeArq, setNomeArq] = useState('')
  const [blobUrl, setBlobUrl] = useState('')
  const [status,  setStatus] = useState('')

  async function query(table: string, qp: string) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qp}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    })
    return r.json()
  }

  useEffect(() => {
    if (!cpfInspetor || !cnpjoucpf || !tipoServico) {
      setErro('Parâmetros obrigatórios ausentes.'); setEtapa('erro'); return
    }
    carregar()
  }, [cpfInspetor, cnpjoucpf, tipoServico])

  async function carregar() {
    setEtapa('carregando')
    try {
      // Estabelecimento
      const eArr = await query('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=*`)
      const e = Array.isArray(eArr) && eArr.length > 0 ? eArr[0] : {}

      // Ativos
      const tsApoio = TIPO_APOIO[tipoServico] ?? ''
      const aArr = await query('ativos_a_vistoriar',
        `cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=eq.${encodeURIComponent(tsApoio)}&select=*`)
      const ativos = Array.isArray(aArr) ? aArr : []

      // Contato
      const ccArr = await query('contato_cliente',
        `cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=eq.${encodeURIComponent(tsApoio)}&order=data_cadastro.desc&limit=1`)
      const cc = Array.isArray(ccArr) && ccArr.length > 0 ? ccArr[0] : {}

      // NCs de dados_vistoria — filtra Não conforme
      const dvArr = await query('dados_vistoria',
        `cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=eq.${encodeURIComponent(tsApoio)}&select=*`)
      const ncsRaw = Array.isArray(dvArr) ? dvArr : []

      // Inspetor
      const inArr = await query('inspetor', `cpf_inspetor=eq.${cpfInspetor}&select=*`)
      const ins = Array.isArray(inArr) && inArr.length > 0 ? inArr[0] : {}

      setEstab({ ...e, ...cc, ativos })
      setInspetor(ins)
      setNcs(ncsRaw)
      setEtapa('pronto')
    } catch (err) {
      setErro(String(err)); setEtapa('erro')
    }
  }

  async function gerarPlano() {
    setEtapa('gerando')
    setStatus('Gerando procedimentos corretivos via IA...')
    try {
      // Para cada NC — gerar procedimento corretivo
      const ncsComPC = await Promise.all(ncs.map(async (nc: any) => {
        try {
          const r = await fetch('/api/ia-laudo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'procedimento_corretivo', dados: { ...nc, tipo_servico: TIPO_APOIO[tipoServico] } })
          })
          const d = await r.json()
          return { ...nc, procedimento_corretivo: d.texto ?? '' }
        } catch { return nc }
      }))

      setStatus('Gerando documento...')
      const slug = SLUG[tipoServico] ?? `plano_manut_${tipoServico}`
      const nome = `${chaveInspetor}_${cnpjoucpf}_${slug}.html`

      const res = await fetch('/api/gerar-plano-manutencao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico,
          estab, inspetor, nomeArquivo: nome, ncs: ncsComPC
        })
      })
      const data = await res.json()
      if (!res.ok || data.erro) { setErro(data.erro ?? 'Erro ao gerar plano.'); setEtapa('erro'); return }

      // sessionStorage para bypass cache
      if (data.html) { try { sessionStorage.setItem('laudoHtml_' + nome, data.html) } catch {} }
      setNomeArq(nome)

      // Criar blob para visualização
      const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' })
      setBlobUrl(URL.createObjectURL(blob))
      setEtapa('gerado')
    } catch (err) {
      setErro(String(err)); setEtapa('erro')
    }
  }

  function baixarPDF() {
    const a = document.createElement('a')
    a.href = blobUrl; a.target = '_blank'; a.rel = 'noopener'
    a.download = nomeArq.replace('.html', '.html')
    a.click()
  }

  function homologar() {
    window.location.href = `/homologar-produto?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${cnpjoucpf}&tipo_servico=${tipoServico}&nome=${encodeURIComponent(nomeArq)}&pasta=documentos_inspetor`
  }

  const titulo = TITULO[tipoServico] ?? 'Plano de Manutenção'

  return (
    <div style={S.body}>
      <div style={S.header}>
        <span style={S.titulo}>{titulo}</span>
      </div>

      {etapa === 'carregando' && (
        <div style={S.etapa}>Carregando dados...</div>
      )}

      {etapa === 'erro' && (
        <div style={{ ...S.card, color: '#9a3412' }}>
          <b>Erro:</b> {erro}
          <br /><br />
          <button style={{ ...S.btn, ...S.btnSec }} onClick={() => window.history.back()}>Voltar</button>
        </div>
      )}

      {etapa === 'pronto' && (
        <div style={S.card}>
          <div style={{ marginBottom: 16 }}>
            <span style={S.label}>Estabelecimento</span>
            <span style={S.val}>{estab.razao_social_nome || estab.razao_social || cnpjoucpf}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={S.label}>Tipo de Plano</span>
            <span style={S.val}>{titulo}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={S.label}>Não conformidades encontradas</span>
            <span style={S.val}>{ncs.length} registro(s)</span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <span style={S.label}>Ativos</span>
            <span style={S.val}>{estab.ativos?.length ?? 0} ativo(s) cadastrado(s)</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button style={{ ...S.btn, ...S.btnSec }} onClick={() => window.history.back()}>Voltar</button>
            <button style={{ ...S.btn, ...S.btnPri }} onClick={gerarPlano}>
              Gerar Plano de Manutenção
            </button>
          </div>
        </div>
      )}

      {etapa === 'gerando' && (
        <div style={S.etapa}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1E3A8A', marginBottom: 8 }}>Gerando Plano...</div>
          <div>{status}</div>
        </div>
      )}

      {etapa === 'gerado' && (
        <div style={S.card}>
          <div style={{ color: '#15803d', fontWeight: 700, marginBottom: 12 }}>✅ Plano gerado com sucesso!</div>
          <iframe src={blobUrl} style={{ width: '100%', height: 500, border: '1px solid #c3d4f0', borderRadius: 8, marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button style={{ ...S.btn, ...S.btnSec }} onClick={baixarPDF}>Baixar HTML</button>
            <button style={{ ...S.btn, ...S.btnPri }} onClick={homologar}>Homologar →</button>
          </div>
        </div>
      )}
    </div>
  )
}
