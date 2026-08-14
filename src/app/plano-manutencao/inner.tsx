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
  const inputPdfRef = useRef<HTMLInputElement>(null)

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
      const [eArr, insArr, ncRes] = await Promise.all([
        q('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=razao_social_nome,razao_social`),
        q('inspetor', `cpf_inspetor=eq.${cpfInspetor}&select=cabecalho_documentos,nome_inspetor`),
        fetch(`/api/listar-vistorias?chave_inspetor=${chaveInsp}&cnpjoucpf=${cnpjoucpf}&tipo_servico=${tsApoioNum}`)
      ])
      const e   = Array.isArray(eArr)   && eArr.length   > 0 ? eArr[0]   : {}
      const ins = Array.isArray(insArr) && insArr.length > 0 ? insArr[0] : {}
      const dadosNCs = await ncRes.json()
      setEstabNome(e.razao_social_nome || e.razao_social || cnpjoucpf)
      setCabInspetor(ins.cabecalho_documentos || ins.nome_inspetor || '')
      setNcs(dadosNCs.ncs ?? [])
      setEtapa('banner')
    } catch (err) { setErro(String(err)); setEtapa('erro') }
  }

  async function gerarPlano() {
    setEtapa('gerando')
    try {
      setStatus('Gerando procedimentos corretivos via IA...')
      const ncsComPC = await Promise.all(ncs.map(async (nc: any) => {
        try {
          const r = await fetch('/api/ia-laudo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'procedimento_corretivo', dados: { ...nc, tipo_servico: tipoServico } })
          })
          const d = await r.json()
          return { ...nc, procedimento_corretivo: d.texto ?? '' }
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

      if (data.html) { try { sessionStorage.setItem('laudoHtml_' + nome, data.html) } catch {} }
      setNomeArq(nome)
      setBlobUrl(URL.createObjectURL(new Blob([data.html], { type: 'text/html;charset=utf-8' })))
      setEtapa('gerado')
    } catch (err) { setErro(String(err)); setEtapa('erro') }
  }

  function salvarPDF() {
    const a = document.createElement('a')
    a.href = blobUrl
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
              <div style={{ padding: '8px 10px', fontSize: '9pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{estabNome}</span>
                <span style={{ color: '#6B7280', fontSize: '8pt' }}>{cnpjoucpf}</span>
              </div>
            </div>

            {/* Orientação */}
            <div style={S.block}>
              <div style={S.blockTitle}>Informações gerais para Geração do Plano</div>
              <div style={{ padding: '8px 10px', fontSize: '8.5pt', color: '#374151', lineHeight: 1.7 }}>
                <p>▶ Confirme que existe vistoria homologada para este estabelecimento.</p>
                <p>▶ Foram encontradas <b style={{ color: '#1E3A8A' }}>{ncs.length}</b> não conformidade(s) na vistoria homologada.</p>
                <p>▶ A IA irá gerar o procedimento corretivo para cada não conformidade.</p>
                <p>▶ Revise o plano gerado antes de homologar e assinar.</p>
                <p>▶ Após a geração, faça o upload do PDF assinado para finalizar.</p>
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
              <div style={{ padding: '8px 10px', fontSize: '8.5pt', color: '#374151', lineHeight: 1.5 }}>
                Plano gerado com sucesso. Baixe o documento, revise e assine digitalmente.
                Após, faça o upload do PDF assinado para finalizar.<br />
                <b>⚠️ Lembre-se de inserir a ART no Anexo 2 antes de assinar.</b>
              </div>
            </div>

            <div style={{ border: '1px solid #c3d4f0', borderRadius: 6, overflow: 'hidden', height: 500 }}>
              <iframe src={blobUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
            </div>

            <input ref={inputPdfRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={enviarPdfAssinado} />

            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec }} onClick={() => window.location.href = retorno}>
                Voltar
              </button>
              <button style={{ ...S.btn, ...S.btnSec }} onClick={salvarPDF}>
                ↓ Baixar PDF
              </button>
              <button style={{ ...S.btn, ...S.btnPri, opacity: enviando ? 0.6 : 1 }}
                onClick={() => inputPdfRef.current?.click()} disabled={enviando}>
                {enviando ? 'Enviando...' : '↑ PDF Assinado'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
