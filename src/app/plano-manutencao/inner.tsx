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

// Tipo de vistoria apoio (número) para listar-vistorias
const TIPO_APOIO_NUM: Record<string,string> = {
  '51':'31','52':'32','53':'33','54':'34',
  '55':'35','56':'36','57':'37','58':'38',
}

const SLUG: Record<string,string> = {
  '51':'plano_manut_autovistoria','52':'plano_manut_inspecao',
  '53':'plano_manut_imovel_novo','54':'plano_manut_fachada',
  '55':'plano_manut_elevador','56':'plano_manut_nr10',
  '57':'plano_manut_nr12','58':'plano_manut_nr13',
}

// Estilos AIMÊ padrão
const BG   = '#E8EEF7'
const AZUL = '#1E3A8A'
const S = {
  body:   { backgroundColor: BG, minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
  header: { background: AZUL, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 },
  titulo: { color: '#fff', fontWeight: 700, fontSize: 16 },
  card:   { background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,.08)',
            padding: 24, margin: '20px auto', maxWidth: 680 },
  row:    { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 },
  label:  { fontSize: 12, fontWeight: 700, color: AZUL, marginBottom: 3, display: 'block' } as React.CSSProperties,
  val:    { fontSize: 14, color: '#1a1a2e' },
  btnPri: { borderRadius: 999, border: 'none', padding: '10px 28px', fontSize: 14,
            fontWeight: 700, cursor: 'pointer', background: AZUL, color: '#fff' },
  btnSec: { borderRadius: 999, border: `2px solid ${AZUL}`, padding: '10px 28px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#fff', color: AZUL },
  divider:{ borderTop: `2px solid ${AZUL}`, margin: '12px 0' },
  badge:  { background: '#dbeafe', color: AZUL, borderRadius: 8,
            padding: '2px 10px', fontSize: 12, fontWeight: 700 },
}

export default function PlanoManutencaoInner() {
  const params       = useSearchParams()
  const cpfInspetor  = params.get('cpf_inspetor')   ?? ''
  const chaveInsp    = params.get('chave_inspetor') ?? ''
  const cnpjoucpf    = params.get('cnpjoucpf')      ?? ''
  const tipoServico  = params.get('tipo_servico')   ?? ''

  const [etapa,    setEtapa]   = useState<'banner'|'gerando'|'gerado'|'erro'>('banner')
  const [erro,     setErro]    = useState('')
  const [ncs,      setNcs]     = useState<any[]>([])
  const [estabNome,setEstabNome] = useState('')
  const [qtdNCs,   setQtdNCs]  = useState(0)
  const [nomeArq,  setNomeArq] = useState('')
  const [blobUrl,  setBlobUrl] = useState('')
  const [status,   setStatus]  = useState('')

  const titulo = TITULO[tipoServico] ?? 'Plano de Manutenção'
  const tsApoioNum = TIPO_APOIO_NUM[tipoServico] ?? ''

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
      // Buscar nome do estabelecimento para o banner
      const eArr = await q('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=razao_social_nome,razao_social`)
      const e = Array.isArray(eArr) && eArr.length > 0 ? eArr[0] : {}
      setEstabNome(e.razao_social_nome || e.razao_social || cnpjoucpf)

      // Buscar NCs de vistorias homologadas via listar-vistorias
      const resNCs = await fetch(
        `/api/listar-vistorias?chave_inspetor=${chaveInsp}&cnpjoucpf=${cnpjoucpf}&tipo_servico=${tsApoioNum}`
      )
      const dadosNCs = await resNCs.json()
      const ncsArr = dadosNCs.ncs ?? []
      setNcs(ncsArr)
      setQtdNCs(ncsArr.length)
    } catch (err) {
      setErro(String(err)); setEtapa('erro')
    }
  }

  async function gerarPlano() {
    setEtapa('gerando')
    try {
      // Gerar procedimento corretivo via IA para cada NC
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

  function homologar() {
    window.location.href =
      `/homologar-produto?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInsp}` +
      `&cnpjoucpf=${cnpjoucpf}&tipo_servico=${tipoServico}` +
      `&nome=${encodeURIComponent(nomeArq)}&pasta=documentos_inspetor`
  }

  return (
    <div style={S.body}>
      {/* Header padrão AIMÊ */}
      <div style={S.header}>
        <img src="/logo.png" alt="AIMÊ" style={{ height: 32, filter: 'brightness(0) invert(1)' }}
          onError={(e:any) => e.target.style.display='none'} />
        <span style={S.titulo}>{titulo}</span>
      </div>

      {etapa === 'erro' && (
        <div style={{ ...S.card, color: '#9a3412' }}>
          <b>Erro:</b> {erro}<br /><br />
          <button style={S.btnSec} onClick={() => window.history.back()}>Voltar</button>
        </div>
      )}

      {/* BANNER inicial — padrão AIMÊ com orientação */}
      {etapa === 'banner' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ ...S.label }}>Estabelecimento</div>
              <div style={S.val}>{estabNome || cnpjoucpf}</div>
            </div>
            <span style={S.badge}>{titulo}</span>
          </div>
          <div style={S.divider} />

          <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
            <b style={{ color: AZUL }}>Procedimento para Execução do Serviço</b><br />
            ▶ Confirme que existe vistoria homologada para este estabelecimento.<br />
            ▶ Serão recuperadas <b>{qtdNCs}</b> não conformidade(s) da vistoria homologada.<br />
            ▶ A IA irá gerar o procedimento corretivo para cada não conformidade.<br />
            ▶ Revise o plano gerado antes de homologar e assinar.<br />
            ▶ Após a geração, faça o upload do PDF assinado para finalizar.
          </div>

          {qtdNCs === 0 && (
            <div style={{ background: '#fef3c7', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
              ⚠️ Nenhuma não conformidade encontrada para este estabelecimento/tipo de serviço.
              Verifique se existe vistoria homologada.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button style={S.btnSec} onClick={() => window.history.back()}>Voltar</button>
            <button style={S.btnPri} onClick={gerarPlano}>
              Gerar Plano de Manutenção →
            </button>
          </div>
        </div>
      )}

      {etapa === 'gerando' && (
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: AZUL, marginBottom: 12 }}>Gerando Plano...</div>
          <div style={{ color: '#4a6480', fontSize: 14 }}>{status}</div>
        </div>
      )}

      {etapa === 'gerado' && (
        <div style={S.card}>
          <div style={{ color: '#15803d', fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
            ✅ Plano gerado com sucesso!
          </div>
          <iframe src={blobUrl}
            style={{ width: '100%', height: 520, border: '1px solid #c3d4f0', borderRadius: 8, marginBottom: 16 }} />
          <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#713f12' }}>
            ⚠️ Favor inserir a respectiva ART no Anexo 2 antes de assinar.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button style={S.btnSec} onClick={() => window.open(blobUrl,'_blank')}>Baixar HTML</button>
            <button style={S.btnPri} onClick={homologar}>Homologar →</button>
          </div>
        </div>
      )}
    </div>
  )
}
