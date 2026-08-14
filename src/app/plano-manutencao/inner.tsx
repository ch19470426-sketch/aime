'use client'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

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

const S: Record<string,React.CSSProperties> = {
  body:     { background:'#E8EEF7', display:'flex', justifyContent:'center', padding:'24px', fontFamily:'Arial,sans-serif', minHeight:'100vh' },
  page:     { width:'210mm', maxWidth:'100%', background:'#ffffff', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,0.12)', overflow:'hidden' },
  header:   { background:'#1E3A8A', padding:'8px 16px', display:'flex', alignItems:'center', gap:'12px' },
  divider:  { height:'2px', background:'#1E3A8A' },
  formBody: { padding:'10px 14px', display:'flex', flexDirection:'column', gap:'8px' },
  block:    { border:'1px solid #c3d4f0', borderRadius:'6px', overflow:'hidden' },
  blockTitle:{ background:'#1E3A8A', color:'#fff', fontSize:'7.5pt', fontWeight:700, padding:'3px 10px' },
  footer:   { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginTop:'4px' },
  btn:      { padding:'8px 0', fontSize:'8pt', fontWeight:700, borderRadius:'50px', cursor:'pointer', border:'none' },
  btnSec:   { background:'#fff', border:'2px solid #1E3A8A', color:'#1E3A8A' },
  btnPri:   { background:'#1E3A8A', border:'2px solid #1E3A8A', color:'#fff' },
}

export default function PlanoManutencaoInner() {
  const params        = useSearchParams()
  const cpfInspetor   = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor = params.get('chave_inspetor') ?? ''
  const cnpjoucpf     = params.get('cnpjoucpf')      ?? ''
  const tipoServico   = params.get('tipo_servico')   ?? ''

  type Etapa = 'carregando'|'pronto'|'gerando'|'gerado'|'erro'
  const [etapa,    setEtapa]    = useState<Etapa>('carregando')
  const [erro,     setErro]     = useState('')
  const [estab,    setEstab]    = useState<Record<string,any>>({})
  const [inspetor, setInspetor] = useState<Record<string,any>>({})
  const [ncs,      setNcs]      = useState<any[]>([])
  const [nomeArq,  setNomeArq]  = useState('')
  const [blobUrl,  setBlobUrl]  = useState('')
  const [html,     setHtml]     = useState('')
  const [status,   setStatus]   = useState('')
  const [enviando, setEnviando] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const inputPdfRef = useRef<HTMLInputElement>(null)

  async function q(table: string, qp: string) {
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
  }, [])

  async function carregar() {
    try {
      const tsApoio = TIPO_APOIO[tipoServico] ?? ''
      const [eArr, aArr, ccArr, dvArr, inArr] = await Promise.all([
        q('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=*`),
        q('ativos_a_vistoriar', `cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=eq.${encodeURIComponent(tsApoio)}&select=*`),
        q('contato_cliente', `cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=eq.${encodeURIComponent(tsApoio)}&order=data_cadastro.desc&limit=1`),
        q('dados_vistoria', `cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=eq.${encodeURIComponent(tsApoio)}&select=*${['55','56','57','58'].includes(tipoServico)?'&origem_resultado=eq.N%C3%A3o%20conforme':''}`),
        q('inspetor', `cpf_inspetor=eq.${cpfInspetor}&select=*`),
      ])
      const e  = Array.isArray(eArr)  && eArr.length  > 0 ? eArr[0]  : {}
      const cc = Array.isArray(ccArr) && ccArr.length > 0 ? ccArr[0] : {}
      const ins = Array.isArray(inArr) && inArr.length > 0 ? inArr[0] : {}
      setEstab({ ...e, ...cc, ativos: Array.isArray(aArr) ? aArr : [] })
      setInspetor(ins)
      setNcs(Array.isArray(dvArr) ? dvArr : [])
      setEtapa('pronto')
    } catch (err) { setErro(String(err)); setEtapa('erro') }
  }

  async function gerarPlano() {
    setEtapa('gerando')
    try {
      setStatus('Gerando procedimentos corretivos via IA...')
      const ncsComPC = await Promise.all(ncs.map(async (nc: any) => {
        try {
          const r = await fetch('/api/ia-laudo', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ tipo:'procedimento_corretivo', dados:{ ...nc, tipo_servico: tipoServico } })
          })
          const d = await r.json()
          return { ...nc, procedimento_corretivo: d.texto ?? '' }
        } catch { return nc }
      }))

      setStatus('Gerando documento...')
      const slug = SLUG[tipoServico] ?? `plano_manut_${tipoServico}`
      const nome = `${chaveInspetor}_${cnpjoucpf}_${slug}.html`

      const res = await fetch('/api/gerar-plano-manutencao', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico, nomeArquivo: nome, ncs: ncsComPC })
      })
      const data = await res.json()
      if (!res.ok || data.erro) { setErro(data.erro ?? 'Erro ao gerar plano.'); setEtapa('erro'); return }

      if (data.html) { try { sessionStorage.setItem('laudoHtml_'+nome, data.html) } catch {} }
      setNomeArq(nome)
      setHtml(data.html)
      const blob = new Blob([data.html], { type:'text/html;charset=utf-8' })
      setBlobUrl(URL.createObjectURL(blob))
      setEtapa('gerado')
    } catch (err) { setErro(String(err)); setEtapa('erro') }
  }

  async function salvarPdf() {
    setGerandoPdf(true)
    try {
      const printCss = `@media print { @page { margin: 20mm 15mm 20mm 20mm; } }`
      const htmlPrint = html.replace('</head>', `<style>${printCss}</style><script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),600)})</script></head>`)
      const blob = new Blob([htmlPrint], { type:'text/html;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.target = '_blank'; a.rel = 'noopener'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(()=>URL.revokeObjectURL(url), 60000)
    } catch (err) { alert('Erro ao gerar PDF: '+String(err)) }
    setGerandoPdf(false)
  }

  async function onArquivoPdfEscolhido(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviando(true)
    try {
      const form = new FormData()
      form.append('arquivo', file)
      form.append('nome', nomeArq.replace('.html','.pdf'))
      form.append('pasta', 'documentos_inspetor')
      const res = await fetch('/api/upload-pdf', { method:'POST', body: form })
      if (!res.ok) throw new Error('Falha ao enviar PDF')
      alert('PDF enviado com sucesso!')
    } catch (err) { alert('Erro ao enviar PDF: '+String(err)) }
    setEnviando(false)
  }

  const titulo = TITULO[tipoServico] ?? 'Plano de Manutenção'

  return (
    <div style={S.body}>
      <div style={S.page}>
        {/* Header padrão */}
        <div style={S.header}>
          <div style={{ flex:1, textAlign:'center' }}>
            <h1 style={{ fontSize:'11pt', fontWeight:700, color:'#fff', margin:0 }}>Homologar e Armazenar Documento</h1>
            <p style={{ fontSize:'7pt', color:'#B5D4F4', marginTop:'2px' }}>{titulo}</p>
          </div>
        </div>
        <div style={S.divider} />

        <div style={S.formBody}>

          {etapa === 'carregando' && (
            <p style={{ textAlign:'center', color:'#4a6480', padding:'40px', fontSize:'9pt' }}>Carregando dados...</p>
          )}

          {etapa === 'erro' && (
            <div style={{ padding:'20px' }}>
              <p style={{ color:'#9a3412', fontSize:'9pt', textAlign:'center', marginBottom:'12px' }}>{erro}</p>
              <button style={{ ...S.btn, ...S.btnSec, width:'100%' }} onClick={() => window.history.back()}>Voltar</button>
            </div>
          )}

          {etapa === 'pronto' && (
            <>
              <div style={S.block}>
                <div style={S.blockTitle}>Dados carregados</div>
                <div style={{ padding:'10px', fontSize:'8.5pt', color:'#374151', lineHeight:1.6 }}>
                  <p style={{ margin:'2px 0' }}><b>Estabelecimento:</b> {estab.razao_social_nome || estab.razao_social || cnpjoucpf}</p>
                  <p style={{ margin:'2px 0' }}><b>Tipo de Plano:</b> {titulo}</p>
                  <p style={{ margin:'2px 0' }}><b>Não conformidades:</b> {ncs.length} registro(s)</p>
                  <p style={{ margin:'2px 0' }}><b>Ativos:</b> {estab.ativos?.length ?? 0} ativo(s) cadastrado(s)</p>
                </div>
              </div>
              <div style={{ ...S.footer, gridTemplateColumns:'1fr 1fr' }}>
                <button style={{ ...S.btn, ...S.btnSec }} onClick={() => window.history.back()}>Voltar</button>
                <button style={{ ...S.btn, ...S.btnPri }} onClick={gerarPlano}>Gerar Plano de Manutenção →</button>
              </div>
            </>
          )}

          {etapa === 'gerando' && (
            <div style={{ textAlign:'center', padding:'40px' }}>
              <p style={{ fontSize:'13pt', fontWeight:700, color:'#1E3A8A', marginBottom:'8px' }}>Gerando Plano...</p>
              <p style={{ fontSize:'9pt', color:'#4a6480' }}>{status}</p>
            </div>
          )}

          {etapa === 'gerado' && (
            <>
              {/* Banner padrão igual ao homologar-produto */}
              <div style={S.block}>
                <div style={{ padding:'12px' }}>
                  <p style={{ fontSize:'8.5pt', color:'#374151', lineHeight:1.5, margin:0 }}>
                    Baixe o documento, revise e o assine digitalmente. Após faça upload para rastreabilidade e armazenamento seguro no AIMÊ.
                  </p>
                </div>
              </div>

              <input ref={inputPdfRef} type="file" accept="application/pdf"
                style={{ position:'absolute', width:1, height:1, opacity:0, overflow:'hidden', pointerEvents:'none' }}
                onChange={onArquivoPdfEscolhido} />

              {/* Preview iframe */}
              <div style={{ border:'1px solid #c3d4f0', borderRadius:'6px', overflow:'hidden' }}>
                <div style={{ background:'#1E3A8A', color:'#fff', fontSize:'7.5pt', fontWeight:700, padding:'3px 10px' }}>
                  Preview do documento
                </div>
                <iframe src={blobUrl} style={{ width:'100%', height:'800px', border:'none', display:'block' }} title="Preview do plano" />
              </div>

              {/* Botões padrão */}
              <div style={S.footer}>
                <button style={{ ...S.btn, ...S.btnSec }} onClick={() => window.history.back()}>Voltar</button>
                <button style={{ ...S.btn, ...S.btnSec, opacity: gerandoPdf ? 0.6 : 1 }} onClick={salvarPdf} disabled={gerandoPdf}>
                  {gerandoPdf ? 'Aguarde...' : '↓ Salvar como PDF'}
                </button>
                <button style={{ ...S.btn, ...S.btnPri, opacity: enviando ? 0.6 : 1 }}
                  onClick={() => inputPdfRef.current?.click()} disabled={enviando}>
                  {enviando ? 'Enviando...' : '↑ Salvar PDF no AIMÊ'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
