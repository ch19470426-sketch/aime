"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import React from "react"
import Image from "next/image"

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const S: Record<string, React.CSSProperties> = {
  body:       { background:'#E8EEF7', display:'flex', justifyContent:'center', padding:'24px', fontFamily:'Arial, Helvetica, sans-serif', minHeight:'100vh' },
  page:       { width:'210mm', maxWidth:'100%', background:'#ffffff', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,.15)', overflow:'hidden', height:'fit-content' },
  header:     { background:'#1E3A8A', padding:'8px 16px', display:'flex', alignItems:'center', gap:'12px' },
  divider:    { height:'2px', background:'#1E3A8A' },
  formBody:   { padding:'16px 14px', display:'flex', flexDirection:'column', gap:'10px' },
  block:      { border:'1px solid #c3d4f0', borderRadius:'6px', overflow:'hidden' },
  blockTitle: { background:'#1E3A8A', color:'#ffffff', fontSize:'11px', fontWeight:700, padding:'5px 10px' },
  blockBody:  { padding:'12px', display:'flex', flexDirection:'column', gap:'8px' },
  btn:        { width:'100%', padding:'12px 14px', borderRadius:'8px', fontSize:'13px', fontWeight:700, border:'2px solid #1E3A8A', cursor:'pointer', textAlign:'left' as const, display:'flex', flexDirection:'column' as const, gap:'2px', background:'#fff', color:'#1E3A8A', fontFamily:'inherit' },
  btnPri:     { background:'#1E3A8A', color:'#fff', border:'2px solid #1E3A8A' },
  btnSec:     { background:'#fff', color:'#1E3A8A', border:'2px solid #1E3A8A' },
  btnVolt:    { background:'#fff', color:'#6B7280', border:'2px solid #C8D8E8' },
  sub2:       { fontSize:'11px', fontWeight:400, opacity:0.8 },
  footer:     { padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr', gap:'8px' },
}

function SelecaoInner() {
  const params        = useSearchParams()
  const cpfEletrico   = params.get('cpf_inspetor')   ?? ''
  const chaveEletrico = params.get('chave_inspetor') ?? ''
  const cnpjoucpf     = params.get('cnpjoucpf')      ?? ''

  const [arts,       setArts]       = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro,       setErro]       = useState('')

  useEffect(() => {
    if (!cpfEletrico) { setCarregando(false); return }
    async function carregar() {
      try {
        const res = await fetch(`/api/selecao-eletrico?cpf_eletrico=${cpfEletrico}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const data = json.arts ?? []
        if (Array.isArray(data) && data.length > 0) {
          setArts(data)
        }
    carregar()
  }, [cpfEletrico])

  function irVistoriaEletrica(art: any) {
    const sistemaEnc = encodeURIComponent('07-Instalações elétricas')
    // Arquivos salvos com chave do elétrico — usar chaveEletrico para buscar no Storage
    // cpf_inspetor do civil apenas para referência no laudo
    window.location.href =
      `/homologar?cpf_inspetor=${cpfEletrico}&chave_inspetor=${chaveEletrico}&cnpjoucpf=${art.cnpjoucpf}&sistema_fixo=${sistemaEnc}&cpf_eletrico=${cpfEletrico}&cpf_civil=${art.cpf_inspetor}`
  }

  function irNR10() {
    window.location.href =
      `/homologar?cpf_inspetor=${cpfEletrico}&chave_inspetor=${chaveEletrico}&cnpjoucpf=${cnpjoucpf}`
  }

  function voltar() {
    window.location.href = `/dashboard?cpf_inspetor=${cpfEletrico}&chave_inspetor=${chaveEletrico}`
  }

  return (
    <div style={S.body}>
      <div style={S.page}>
        {/* Cabeçalho */}
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={36}
            style={{ filter:'brightness(0) invert(1)', objectFit:'contain' }} />
          <div>
            <div style={{ fontSize:'10px', color:'#B5D4F4', fontWeight:600, letterSpacing:'0.5px', textTransform:'uppercase' }}>AIMÊ</div>
            <div style={{ fontSize:'14px', color:'#fff', fontWeight:700 }}>Homologar Vistoria</div>
          </div>
        </div>
        <div style={S.divider} />

        {carregando ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#4a6480', fontSize:'13px' }}>
            Carregando...
          </div>
        ) : (
          <>
            <div style={S.formBody}>
              <div style={S.block}>
                <div style={S.blockTitle}>Selecione o tipo de homologação</div>
                <div style={S.blockBody}>
                  {erro && <span style={{ color:'#E24B4A', fontSize:'12px' }}>{erro}</span>}

                  {/* Vistorias elétricas pendentes */}
                  {arts.length > 0 && arts.map(art => (
                    <button key={art.id} style={{ ...S.btn, ...S.btnPri }}
                      onClick={() => irVistoriaEletrica(art)}>
                      <span style={{ fontSize:'13px' }}>{art.razao_social}</span>
                      <span style={S.sub2}>{art.nome_inspetor} · {art.cpf_inspetor}</span>
                    </button>
                  ))}

                  {/* NR-10 */}
                  <button style={{ ...S.btn, ...S.btnSec }} onClick={irNR10}>
                    Vistoria NR-10
                  </button>
                </div>
              </div>
            </div>

            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnVolt }} onClick={voltar}>
                ← Voltar ao Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SelecaoHomologarEletrico() {
  return (
    <Suspense fallback={<div style={{ backgroundColor:'#E8EEF7', minHeight:'100vh' }} />}>
      <SelecaoInner />
    </Suspense>
  )
}
