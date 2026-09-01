'use client'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

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

const TIPO_APOIO_NUM: Record<string,string> = {
  '51':'31','52':'32','53':'33','54':'34',
  '55':'35','56':'36','57':'37','58':'38',
}
// Tipo de vistoria completo para busca em dados_vistoria
const TIPO_VISTORIA_LONGO: Record<string,string> = {
  '31':'31 Autovistoria','32':'32 Vistoria inspeção',
  '33':'33 Vistoria imóvel novo','34':'34 Vistoria fachada',
  '35':'35 Vistoria elevador','36':'36 Vistoria nr-10',
  '37':'37 Vistoria nr-12','38':'38 Vistoria nr-13',
}

const SLUG: Record<string,string> = {
  '51':'plano_manut_autovistoria','52':'plano_manut_inspecao',
  '53':'plano_manut_imovel_novo', '54':'plano_manut_fachada',
  '55':'plano_manut_elevador',    '56':'plano_manut_nr10',
  '57':'plano_manut_nr12',        '58':'plano_manut_nr13',
}

// Estilos idênticos ao homologar-produto
const S: Record<string, React.CSSProperties> = {
  body:       { background: '#E8EEF7', display: 'flex', justifyContent: 'center',
                padding: '24px', fontFamily: 'Arial, sans-serif', minHeight: '100vh' },
  page:       { width: '210mm', maxWidth: '100%', background: '#ffffff',
                borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,.1)' },
  header:     { background: '#1E3A8A', padding: '8px 16px', display: 'flex',
                alignItems: 'center', gap: '12px', borderRadius: '16px 16px 0 0' },
  divider:    { height: '2px', background: '#1E3A8A' },
  formBody:   { padding: '10px 14px 6px', display: 'flex', flexDirection: 'column', gap: '8px' },
  block:      { border: '1px solid #c3d4f0', borderRadius: '6px', overflow: 'hidden' },
  blockTitle: { background: '#1E3A8A', color: '#fff', fontSize: '7.5pt',
                fontWeight: 700, padding: '3px 10px' },
  footer:     { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px', marginTop: '4px' },
  btn:        { padding: '8px 0', fontSize: '8pt', fontWeight: 700,
                borderRadius: '50px', cursor: 'pointer', border: 'none' },
  btnSec:     { background: '#fff', border: '2px solid #1E3A8A', color: '#1E3A8A' },
  btnPri:     { background: '#1E3A8A', border: '2px solid #1E3A8A', color: '#fff' },
}

function HeaderBar({ subtitulo }: { subtitulo: string }) {
  return (
    <div style={S.header}>
      <div style={{ width: 80, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Image src="/logo.png" alt="AIMÊ" width={80} height={36}
          style={{ filter: 'brightness(0) invert(1)', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <h1 style={{ fontSize: '11pt', fontWeight: 700, color: '#fff', margin: 0 }}>{subtitulo}</h1>
      </div>
      <div style={{ width: 80 }} />
    </div>
  )
}

export default function PlanoManutencaoInner() {
  const params      = useSearchParams()
  const cpfInspetor = params.get('cpf_inspetor')   ?? ''
  const chaveInsp   = params.get('chave_inspetor') ?? ''
  const cnpjoucpf   = params.get('cnpjoucpf')      ?? ''
  const tipoServico = params.get('tipo_servico')   ?? ''

  const [etapa,     setEtapa]    = useState<'carregando'|'banner'|'gerando'|'gerado'|'erro'>('carregando')
  const [erro,      setErro]     = useState('')
  const [ncs,       setNcs]      = useState<any[]>([])
  const [estabNome, setEstabNome]= useState('')
  const [cabInspetor, setCabInspetor] = useState('')
  const [blobUrl,   setBlobUrl]  = useState('')
  const [nomeArq,   setNomeArq]  = useState('')
  const [status,    setStatus]   = useState('')
  const [enviando,  setEnviando] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [htmlGerado, setHtmlGerado] = useState('')
  const inputPdfRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLDivElement>(null)

  const titulo      = TITULO[tipoServico] ?? 'Plano de Manutenção'
  const tsApoioNum  = TIPO_APOIO_NUM[tipoServico] ?? ''

  useEffect(() => {
    if (!cpfInspetor || !cnpjoucpf || !tipoServico) {
      setErro('Parâmetros obrigatórios ausentes.'); setEtapa('erro'); return
    }
    carregarInfo()
  }, [])

  async function q(table: string, qp: string) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qp}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    })
    return r.json()
  }

  async function carregarInfo() {
    try {
      const [infoRes, ncRes] = await Promise.all([
        fetch(`/api/gerar-plano-manutencao`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpfInspetor, chaveInspetor: chaveInsp, cnpjoucpf, tipoServico, nomeArquivo: '_info_', ncs: [] })
        }),
        fetch(`/api/listar-vistorias?chave_inspetor=${chaveInsp}&cnpjoucpf=${cnpjoucpf}&tipo_servico=${tsApoioNum}`)
      ])
      const info = await infoRes.json()
      const dadosNCs = await ncRes.json()
      setEstabNome(info.estabNome || cnpjoucpf)
      setCabInspetor(info.cabInspetor || '')
      setNcs(dadosNCs.ncs ?? [])
      setEtapa('banner')
    } catch (err) { setErro(String(err)); setEtapa('erro') }
  }

  async function gerarPlano() {
    try { sessionStorage.clear() } catch {}
    setEtapa('gerando')
    try {
      // 1. Buscar SNC já salva em dados_vistoria para cada NC
      setStatus('Buscando soluções de NC do banco de dados...')
      const SUPA_URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
      const SUPA_KEY2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
      const ncsComSNC = await Promise.all(ncs.map(async (nc: any) => {
        try {
          const fotoNr = Number(nc.fotoNr ?? nc.numero_foto ?? 0)
          if (!fotoNr) return nc
          const r = await fetch(
            (() => {
              const tsNum = String(nc.tipoServico ?? nc.tipo_servico ?? tsApoioNum ?? '').split(' ')[0]
              const tsBanco = TIPO_VISTORIA_LONGO[tsNum] ?? tsNum
              const cpfInsp = nc.cpfInspetor ?? nc.cpf_inspetor ?? cpfInspetor
              return `/api/buscar-solucao-nc?cpf_inspetor=${encodeURIComponent(cpfInsp)}&cnpjoucpf=${encodeURIComponent(cnpjoucpf)}&tipo_servico=${encodeURIComponent(tsBanco)}&foto_nr=${fotoNr}`
            })()
          )
          const d = await r.json()
          const snc = d.descricao_solucao_nc ?? ''
          return { ...nc, descricao_solucao_nc: snc, solucaoNC: snc }
        } catch { return nc }
      }))

      // 2. Gerar PC via IA usando a SNC já salva
      setStatus('Gerando procedimentos corretivos via IA...')
      const ncsComPC = await Promise.all(ncsComSNC.map(async (nc: any) => {
        try {
          const rPC = await fetch('/api/ia-laudo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'procedimento_corretivo', dados: { ...nc, tipo_servico: tipoServico } })
          })
          const dPC = await rPC.json()
          return { ...nc, procedimento_corretivo: dPC.texto ?? '' }
        } catch { return nc }
      }))

      setStatus('Gerando documento...')
      const slug = SLUG[tipoServico] ?? `plano_manut_${tipoServico}`
      const nome = `${chaveInsp}_${cnpjoucpf}_${slug}.html`

      const res = await fetch('/api/gerar-plano-manutencao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfInspetor, chaveInspetor: chaveInsp, cnpjoucpf, tipoServico, nomeArquivo: nome, ncs: ncsComPC })
      })
      const data = await res.json()
      if (!res.ok || data.erro) { setErro(data.erro ?? 'Erro ao gerar.'); setEtapa('erro'); return }

      if (data.html) { try { sessionStorage.setItem('laudoHtml_' + nome, data.html) } catch {}; setHtmlGerado(data.html) }
      setNomeArq(nome)
      setBlobUrl(URL.createObjectURL(new Blob([data.html], { type: 'text/html;charset=utf-8' })))
      setEtapa('gerado')
    } catch (err) { setErro(String(err)); setEtapa('erro') }
  }

  async function salvarPDF() {
    if (!htmlGerado || !nomeArq) return
    if (gerandoPdf) return
    setGerandoPdf(true)
    try {
      // Gera o PDF no servidor via Puppeteer — mesma técnica confiável usada
      // nos laudos (window.print() não respeita margens/paginação corretamente).
      const res = await fetch('/api/gerar-laudo-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeArquivo: nomeArq })
      })
      if (!res.ok) {
        let detalhe = ''
        try { detalhe = (await res.json())?.erro ?? '' } catch {}
        throw new Error(`Falha ao gerar o PDF (${res.status}). ${detalhe}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const nomeBase = nomeArq.replace('.html','') + '.pdf'
      const a = document.createElement('a')
      a.href = url
      a.download = nomeBase
      a.click()
      URL.revokeObjectURL(url)
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : 'Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setGerandoPdf(false)
    }
  }

  async function enviarPdfAssinado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviando(true)
    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      const nomePdf = nomeArq.replace('.html', '_assinado.pdf')
      await supabase.storage.from('aime').upload(`documentos_inspetor/${nomePdf}`, file, { upsert: true })
      alert('PDF assinado salvo com sucesso!')
    } catch (err) { alert('Erro ao enviar: ' + String(err)) }
    finally { setEnviando(false) }
  }

  function homologar() {
    window.location.href =
      `/homologar-produto?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInsp}` +
      `&cnpjoucpf=${cnpjoucpf}&tipo_servico=${tipoServico}` +
      `&nome=${encodeURIComponent(nomeArq)}&pasta=documentos_inspetor`
  }

  const retorno = `/dashboard`

  return (
    <div style={S.body}>
      <div style={S.page}>
        <HeaderBar subtitulo={titulo} />
        <div style={S.divider} />

        {etapa === 'carregando' && (
          <p style={{ padding: 40, textAlign: 'center', color: '#4a6480', fontSize: '9pt' }}>
            Carregando dados...
          </p>
        )}

        {etapa === 'erro' && (
          <div style={S.formBody}>
            <p style={{ color: '#9a3412', fontSize: '9pt', padding: 20 }}><b>Erro:</b> {erro}</p>
            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnPri, gridColumn: '1 / -1' }}
                onClick={() => window.location.href = retorno}>Voltar ao Dashboard</button>
            </div>
          </div>
        )}

        {etapa === 'banner' && (
          <div style={S.formBody}>
            {/* Cabeçalho inspetor */}
            {cabInspetor && (
              <div style={{ textAlign: 'center', color: '#1E3A8A', fontWeight: 700,
                fontSize: '9pt', padding: '6px 0', borderBottom: '1px solid #1E3A8A' }}>
                {cabInspetor}
              </div>
            )}

            {/* Bloco 1 */}
            <div style={S.block}>
              <div style={S.blockTitle}>Edificação/Estabelecimento</div>
              <div style={{ padding: '8px 10px', fontSize: '9pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, flex: 1 }}>{estabNome}</span>
                <span style={{ color: '#6B7280', fontSize: '8pt', flexShrink: 0, fontWeight: 700 }}>
                  {(()=>{ const n=cnpjoucpf.replace(/\D/g,''); return n.length===14?n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') })()}
                </span>
              </div>
            </div>

            {/* Orientação */}
            <div style={S.block}>
              <div style={S.blockTitle}>Informações gerais para Geração do Plano</div>
              <div style={{ padding: '8px 10px', fontSize: '8.5pt', color: '#374151', lineHeight: 1.7, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p>▶ Foram encontradas <b style={{ color: '#1E3A8A' }}>{ncs.length}</b> não conformidade(s) na vistoria homologada.</p>
                  <p>▶ A IA irá gerar o procedimento corretivo para cada não conformidade.</p>
                  <p>▶ Revise o plano gerado antes de homologar e assinar.</p>
                  <p>▶ Após a geração, faça o upload do PDF assinado para finalizar.</p>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <img src="/mie_orienta.png" alt="Miê" width={90} height={90}
                    style={{ objectFit: 'contain' }}
                    onError={(e:any) => (e.target as HTMLImageElement).style.display='none'} />
                </div>
              </div>
            </div>

            {ncs.length === 0 && (
              <div style={{ background: '#fef3c7', borderRadius: 6, padding: '8px 12px',
                fontSize: '8.5pt', color: '#92400e' }}>
                ⚠️ Nenhuma não conformidade encontrada. Verifique se existe vistoria homologada.
              </div>
            )}

            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec }} onClick={() => window.location.href = retorno}>
                Voltar
              </button>
              <div />
              <button style={{ ...S.btn, ...S.btnPri }} onClick={gerarPlano}>
                Gerar Plano →
              </button>
            </div>
          </div>
        )}

        {etapa === 'gerando' && (
          <p style={{ padding: 40, textAlign: 'center', color: '#1E3A8A',
            fontSize: '10pt', fontWeight: 700 }}>
            {status || 'Gerando Plano de Manutenção...'}
          </p>
        )}

        {etapa === 'gerado' && (
          <div style={S.formBody}>
            <div style={S.block}>
              <div style={{ padding: '8px 10px', fontSize: '8.5pt', color: '#374151', lineHeight: 1.5, textAlign: 'center' }}>
                <b style={{ color: '#1E3A8A' }}>✅ Plano de Manutenção gerado com sucesso!</b><br />
                Revise o documento apresentado abaixo e o ajuste de acordo com seu entendimento técnico; baixe o PDF e o assine digitalmente. Após faça upload para o AIMÊ para armazenamento, rastreabilidade e continuidade do processo.
              </div>
            </div>

            <input ref={inputPdfRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={enviarPdfAssinado} />

            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec }} onClick={() => window.location.href = retorno}>
                Voltar
              </button>
              <button style={{ ...S.btn, ...S.btnSec, opacity: gerandoPdf ? 0.6 : 1 }} onClick={salvarPDF} disabled={gerandoPdf}>
                {gerandoPdf ? '⏳ Gerando PDF...' : '↓ Baixar PDF'}
              </button>
              <button style={{ ...S.btn, ...S.btnPri, opacity: enviando ? 0.6 : 1 }}
                onClick={() => inputPdfRef.current?.click()} disabled={enviando}>
                {enviando ? 'Enviando...' : '↑ PDF Assinado'}
              </button>
            </div>

            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: htmlGerado }}
              style={{
                border: '1px solid #c3d4f0', borderRadius: 6,
                height: 520, overflowY: 'auto', padding: '12px 20px',
                background: '#fff', fontSize: '9pt', lineHeight: 1.5,
                fontFamily: 'Arial, sans-serif', marginTop: 8,
                outline: 'none'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
