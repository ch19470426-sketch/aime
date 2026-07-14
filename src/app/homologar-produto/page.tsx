// src/app/homologar-produto/page.tsx
// AIMÊ — 2.10: Homologar, assinar e guardar produtos
// Tela compartilhada por Proposta, Plano de Trabalho e Laudos: revisão final,
// download do documento editável e do PDF, upload do PDF assinado (Gov.br) e guarda em Documentos inspetor.

'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Banner from '@/components/Banner'
import { useBanner } from '@/hooks/useBanner'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

// Mesmo mapeamento usado em Plano/Homologar — necessário para localizar o plano de origem
// de um Laudo (grupo 4x) e anexar seu bloco de documentos como Anexo 1.
const TIPO_VISTORIA: Record<string, string> = {
  '21': '31 Autovistoria', '22': '32 Vistoria inspeção',
  '23': '33 Vistoria imóvel novo', '24': '34 Vistoria fachada',
  '25': '35 Vistoria elevador', '26': '36 Vistoria nr-10',
  '27': '37 Vistoria nr-12', '28': '38 Vistoria nr-13',
  '29': '32 Vistoria inspeção',
}

export default function HomologarProdutoPage() {
  return (
    <Suspense fallback={
      <div style={S.body}><div style={S.page}>
        <HeaderBar subtitulo="Carregando..." />
        <div style={S.divider} />
        <p style={{ padding: '40px', textAlign: 'center', color: '#4a6480', fontSize: '9pt' }}>Carregando...</p>
      </div></div>
    }>
      <HomologarProdutoInner />
    </Suspense>
  )
}

function HomologarProdutoInner() {
  const params         = useSearchParams()
  const cpfInspetor    = params.get('cpf_inspetor')    ?? ''
  const chaveInspetor  = params.get('chave_inspetor')  ?? 'INS-001'
  const cnpjoucpf      = params.get('cnpjoucpf')       ?? ''
  const tipoServico    = params.get('tipo_servico')    ?? ''
  const nomeArquivo    = params.get('nome_arquivo')    ?? ''
  const titulo         = params.get('titulo')          ?? 'Documento'

  const { bannerProps, informa, orienta, agradece } = useBanner()

  const [carregando,  setCarregando]  = useState(true)
  const [html,        setHtml]        = useState('')
  const [erroCarregar, setErroCarregar] = useState(false)
  const [gerandoDocx, setGerandoDocx] = useState(false)
  const [enviando,    setEnviando]    = useState(false)
  const [arquivoPdf,  setArquivoPdf]  = useState<File | null>(null)

  const numServico = Number(tipoServico)
  const grupo4x    = numServico >= 41 && numServico <= 49

  // Monta o nome amigável do arquivo baixado: <cnpjoucpf>_<tipo_documento>[_<categoria>]
  function nomeAmigavel(extensao: string): string {
    const familia = Math.floor(numServico / 10)   // 1=proposta 2=plano 4=laudo
    const categoria = numServico % 10              // 1..9

    const CATEGORIAS: Record<number, string> = {
      1: 'autovistoria', 2: 'inspecao', 3: 'imovel_novo', 4: 'fachada',
      5: 'elevador', 6: 'nr10', 7: 'nr12', 8: 'nr13',
    }

    let base = ''
    if (categoria === 9) {
      base = 'plano_manutencao'
    } else if (familia === 1) {
      base = `proposta_${CATEGORIAS[categoria] ?? categoria}`
    } else if (familia === 2) {
      base = `plano_trabalho_${CATEGORIAS[categoria] ?? categoria}`
    } else if (familia === 4) {
      base = `laudo_${CATEGORIAS[categoria] ?? categoria}`
    } else {
      base = 'documento'
    }

    return `${cnpjoucpf}_${base}.${extensao}`
  }

  useEffect(() => {
    if (!nomeArquivo) { setErroCarregar(true); setCarregando(false); return }
    carregarDocumento()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeArquivo])

  async function query(table: string, qparams: string) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${qparams}`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    })
    return res.json()
  }

  // Extrai a seção "1.3.- Relação de Documentos Solicitados" do HTML de um plano salvo
  function extrairSecaoDocs(htmlPlano: string): {doc:string; situacao:string; resultado:string}[] {
    const marcador = '<h2>1.3.- Relação de Documentos Solicitados</h2>'
    const inicio = htmlPlano.indexOf(marcador)
    if (inicio === -1) return []
    const resto = htmlPlano.slice(inicio)
    const fimTabela = resto.indexOf('</table>')
    if (fimTabela === -1) return []
    const bloco = resto.slice(0, fimTabela)
    const linhas = [...bloco.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    return linhas.map(m => {
      const tds = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(t => t[1])
      const doc = (tds[0] ?? '').replace(/<[^>]+>/g, '').trim()
      const sitM = (tds[1] ?? '').match(/<option[^>]*selected[^>]*>([^<]*)<\/option>/)
      const resM = (tds[2] ?? '').match(/<option[^>]*selected[^>]*>([^<]*)<\/option>/)
      return { doc, situacao: sitM?.[1]?.trim() || '—', resultado: resM?.[1]?.trim() || '—' }
    }).filter(l => l.doc)
  }

  function montarAnexo1(docs: {doc:string; situacao:string; resultado:string}[]): string {
    if (docs.length === 0) return ''
    const linhas = docs.map(d =>
      `<tr><td style="padding:3px 6px">${d.doc}</td><td style="padding:3px 6px">${d.situacao}</td><td style="padding:3px 6px">${d.resultado}</td></tr>`
    ).join('')
    return `
<h2>Anexo 1 — Relação de Documentos do Plano de Trabalho</h2>
<table style="width:100%;border-collapse:collapse;font-size:8pt">
  <thead><tr style="background:#1E3A8A;color:#fff">
    <th style="padding:3px 6px;text-align:left">Documento</th>
    <th style="padding:3px 6px;text-align:left">Situação</th>
    <th style="padding:3px 6px;text-align:left">Resultado</th>
  </tr></thead>
  <tbody>${linhas}</tbody>
</table>`
  }

  async function carregarDocumento() {
    setCarregando(true)
    try {
      const res = await fetch(`/api/ler-documento?nome=${encodeURIComponent(nomeArquivo)}&pasta=documentos_inspetor`)
      const data = await res.json()
      if (!data.existe) {
        setErroCarregar(true)
        setCarregando(false)
        return
      }
      let htmlFinal = data.html as string

      // Item (c): para documentos do grupo 4x (Laudos), anexa o bloco de documentos do plano de origem
      if (grupo4x) {
        const tipoPlano = String(numServico - 20)
        const nomePlano = `${chaveInspetor}_plano_${tipoPlano}_${cnpjoucpf}.html`
        try {
          const docRes = await fetch(`/api/ler-documento?nome=${encodeURIComponent(nomePlano)}&pasta=documentos_inspetor`)
          const docData = await docRes.json()
          if (docData.existe) {
            const docsAnexo = extrairSecaoDocs(docData.html)
            const anexoHtml = montarAnexo1(docsAnexo)
            htmlFinal = htmlFinal.replace('</body>', anexoHtml + '</body>')
          }
        } catch { /* segue sem o anexo se o plano de origem não for encontrado */ }
      }

      setHtml(htmlFinal)
      setCarregando(false)
      orienta('Revisão e Homologação',
        'Revise e ajuste o documento gerado e efetue a sua homologação. A responsabilidade pelo resultado do trabalho é do profissional. Ele é quem responde em juízo.'
      )
    } catch {
      setErroCarregar(true)
      setCarregando(false)
    }
  }

  async function baixarEditavel() {
    setGerandoDocx(true)
    try {
      const res = await fetch('/api/gerar-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html })
      })
      if (!res.ok) throw new Error('Falha ao gerar o documento Word')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeAmigavel('docx')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      informa('Erro', 'Não foi possível gerar o documento editável. Tente novamente.')
    } finally {
      setGerandoDocx(false)
    }
  }

  function imprimirPdf() {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 300)
    informa('Gerar PDF',
      'Na janela de impressão que abriu, escolha "Salvar como PDF" (ou impressora PDF) e confirme o local de salvamento. Recomendamos guardar os arquivos baixados para eventuais necessidades futuras, pois na base de dados do AIMÊ o PDF ficará armazenado por um ano. Se surgir alguma demanda específica do cliente, o arquivo editável (Word) será a base para ajustes.'
    )
  }

  async function enviarPdfAssinado() {
    if (!arquivoPdf) {
      informa('Atenção', 'Selecione o arquivo PDF assinado no Gov.br antes de enviar.')
      return
    }
    setEnviando(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(arquivoPdf)
      })

      const nomePdf = nomeArquivo.replace(/\.html$/i, '.pdf')
      const res = await fetch('/api/upload-pdf-assinado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeArquivo: nomePdf, base64 })
      })
      if (!res.ok) throw new Error('Falha ao enviar o PDF assinado')

      // Item (h): grupo 4x — soma 1 em qtd_servicos_exec e ajusta saldo do contrato
      if (grupo4x && cpfInspetor) {
        try {
          await fetch('/api/atualizar-contador-servico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpfInspetor })
          })
        } catch { /* não bloqueia a homologação se a contagem falhar */ }
      }

      setEnviando(false)
      agradece('Homologação concluída',
        'O documento homologado e assinado foi guardado com sucesso em Documentos inspetor.',
        () => window.location.href = '/dashboard'
      )
    } catch {
      setEnviando(false)
      informa('Erro', 'Não foi possível enviar o PDF assinado. Tente novamente.')
    }
  }

  if (carregando) return (
    <div style={S.body}><div style={S.page}>
      <HeaderBar subtitulo="Carregando..." />
      <div style={S.divider} />
      <p style={{ padding: '40px', textAlign: 'center', color: '#4a6480', fontSize: '9pt' }}>Carregando documento...</p>
    </div></div>
  )

  if (erroCarregar) return (
    <div style={S.body}><div style={S.page}>
      <HeaderBar subtitulo="Documento não encontrado" />
      <div style={S.divider} />
      <div style={S.formBody}>
        <p style={{ fontSize: '9pt', color: '#9a3412', textAlign: 'center', padding: '20px' }}>
          Não foi possível localizar o documento a ser homologado.
        </p>
        <div style={S.footer}>
          <button style={{ ...S.btn, ...S.btnPri, gridColumn: '1 / -1' }} onClick={() => window.location.href = '/dashboard'}>
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div></div>
  )

  return (
    <div style={S.body}><div style={S.page}>
      <HeaderBar subtitulo={`Homologar, Assinar e Guardar — ${titulo}`} />
      <div style={S.divider} />
      <div style={S.formBody}>

        <div style={S.block}>
          <div style={S.blockTitle}>1.- Baixar documento editável e PDF</div>
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '8pt', color: '#4a6480' }}>
              Revise o conteúdo do documento e baixe as duas versões antes de prosseguir.
            </p>
            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec, opacity: gerandoDocx ? 0.6 : 1 }} onClick={baixarEditavel} disabled={gerandoDocx}>
                {gerandoDocx ? 'Gerando Word...' : 'Baixar documento editável (Word)'}
              </button>
              <button style={{ ...S.btn, ...S.btnPri, gridColumn: 'span 2' }} onClick={imprimirPdf}>
                Imprimir / Salvar como PDF
              </button>
            </div>
          </div>
        </div>

        <div style={S.block}>
          <div style={S.blockTitle}>2.- Assinatura digital</div>
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ fontSize: '7pt', color: '#4a6480' }}>
              Acesse o Gov.br e assine digitalmente o PDF baixado. Em seguida, envie aqui o arquivo assinado.
            </p>
            <input type="file" accept="application/pdf"
              onChange={e => setArquivoPdf(e.target.files?.[0] ?? null)}
              style={{ fontSize: '7pt' }} />
          </div>
        </div>

        <div style={S.footer}>
          <button style={{ ...S.btn, ...S.btnSec }} onClick={() => window.location.href = '/dashboard'}>
            Voltar
          </button>
          <button style={{ ...S.btn, ...S.btnPri, opacity: (enviando || !arquivoPdf) ? 0.6 : 1 }}
            onClick={enviarPdfAssinado} disabled={enviando || !arquivoPdf}>
            {enviando ? 'Enviando...' : 'Homologar e Guardar'}
          </button>
        </div>

      </div>
      <Banner {...bannerProps} />
    </div></div>
  )
}

function HeaderBar({ subtitulo }: { subtitulo: string }) {
  return (
    <div style={S.header}>
      <div style={{ width: '80px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Image src="/logo.png" alt="AIMÊ" width={80} height={36} style={{ filter: 'brightness(0) invert(1)', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <h1 style={{ fontSize: '11pt', fontWeight: 700, color: '#fff', margin: 0 }}>Homologar, Assinar e Guardar</h1>
        <p style={{ fontSize: '7pt', color: '#B5D4F4', marginTop: '2px' }}>{subtitulo}</p>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  body:        { background: '#E8EEF7', display: 'flex', justifyContent: 'center', padding: '24px', fontFamily: 'Arial, Helvetica, sans-serif', minHeight: '100vh' },
  page:        { width: '210mm', maxWidth: '100%', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,.15)', overflow: 'hidden', height: 'fit-content' },
  header:      { background: '#1E3A8A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  divider:     { height: '2px', background: '#1E3A8A' },
  formBody:    { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  block:       { border: '1px solid #c3d4f0', borderRadius: '6px', overflow: 'hidden' },
  blockTitle:  { background: '#1E3A8A', color: '#ffffff', fontSize: '7.5pt', fontWeight: 700, padding: '3px 10px' },
  footer:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' },
  btn:         { padding: '8px 0', fontSize: '8pt', fontWeight: 700, borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  btnSec:      { background: '#ffffff', border: '2px solid #1E3A8A', color: '#1E3A8A' },
  btnPri:      { background: '#1E3A8A', border: '2px solid #1E3A8A', color: '#ffffff' },
}
