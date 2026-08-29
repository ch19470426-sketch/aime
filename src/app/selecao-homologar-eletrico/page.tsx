"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const S: Record<string,any> = {
  body:   { minHeight:'100vh', backgroundColor:'#E8EEF7', display:'flex', justifyContent:'center', alignItems:'flex-start', padding:'24px 16px' },
  page:   { width:'100%', maxWidth:'480px' },
  card:   { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,.08)', marginBottom:'16px' },
  titulo: { fontSize:'16px', fontWeight:700, color:'#1E3A8A', marginBottom:'4px' },
  sub:    { fontSize:'12px', color:'#6B7280', marginBottom:'20px' },
  btn:    { width:'100%', padding:'14px 16px', borderRadius:'10px', fontSize:'14px', fontWeight:700, border:'2px solid #1E3A8A', cursor:'pointer', marginBottom:'10px', textAlign:'left' as const, display:'flex', flexDirection:'column' as const, gap:'2px' },
  btnPri: { background:'#1E3A8A', color:'#fff' },
  btnSec: { background:'#fff', color:'#1E3A8A' },
  sub2:   { fontSize:'11px', fontWeight:400, opacity:0.8 },
}

function SelecaoInner() {
  const params        = useSearchParams()
  const cpfEletrico   = params.get('cpf_inspetor')   ?? ''
  const chaveEletrico = params.get('chave_inspetor') ?? ''
  const cnpjoucpf     = params.get('cnpjoucpf')      ?? ''

  const [arts,       setArts]       = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        // Buscar credenciais elétricas pendentes
        const res = await fetch(
          `${SUPA_URL}/rest/v1/art_profissional?cpf_eletrico=eq.${cpfEletrico}&select=id,cnpjoucpf,cpf_inspetor,data_cadastro&order=data_cadastro.desc`,
          { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
        )
        const data = await res.json()
        if (Array.isArray(data)) {
          // Buscar razão social de cada CNPJ
          const cnpjs = [...new Set(data.map((d:any) => d.cnpjoucpf))]
          const estabs: Record<string,string> = {}
          await Promise.all(cnpjs.map(async (cnpj: string) => {
            const r = await fetch(
              `${SUPA_URL}/rest/v1/estabelecimento?cnpjoucpf=eq.${cnpj}&select=razao_social_nome`,
              { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
            )
            const e = await r.json()
            if (Array.isArray(e) && e.length > 0) estabs[cnpj] = e[0].razao_social_nome
          }))
          setArts(data.map((d:any) => ({ ...d, razao_social: estabs[d.cnpjoucpf] ?? d.cnpjoucpf })))
        }
      } catch {}
      setCarregando(false)
    }
    carregar()
  }, [])

  function irVistoriaEletrica(art: any) {
    window.location.href =
      `/homologar?cpf_inspetor=${art.cpf_inspetor}&chave_inspetor=${chaveEletrico}&cnpjoucpf=${art.cnpjoucpf}&sistema_fixo=07-Instalações elétricas&cpf_eletrico=${cpfEletrico}`
  }

  function irNR10() {
    window.location.href =
      `/homologar?cpf_inspetor=${cpfEletrico}&chave_inspetor=${chaveEletrico}&cnpjoucpf=${cnpjoucpf}`
  }

  function voltar() {
    window.location.href = `/dashboard?cpf_inspetor=${cpfEletrico}&chave_inspetor=${chaveEletrico}`
  }

  if (carregando) return <div style={{ backgroundColor:'#E8EEF7', minHeight:'100vh' }} />

  return (
    <div style={S.body}>
      <div style={S.page}>
        <div style={{ ...S.card, borderTop:'4px solid #1E3A8A' }}>
          <div style={S.titulo}>Homologar Vistoria</div>
          <div style={S.sub}>Selecione o tipo de homologação:</div>

          {/* Vistorias elétricas pendentes */}
          {arts.map(art => (
            <button key={art.id} style={{ ...S.btn, ...S.btnPri }} onClick={() => irVistoriaEletrica(art)}>
              <span>⚡ Vistoria Elétrica — Inspeção Predial</span>
              <span style={S.sub2}>{art.razao_social}</span>
              <span style={S.sub2}>Inspetor predial: {art.cpf_inspetor}</span>
            </button>
          ))}

          {/* NR-10 normal */}
          <button style={{ ...S.btn, ...S.btnSec }} onClick={irNR10}>
            <span>🔌 Vistoria NR-10</span>
            <span style={S.sub2}>Acesso completo às vistorias NR-10</span>
          </button>

          <button style={{ ...S.btn, ...S.btnSec, border:'2px solid #C8D8E8' }} onClick={voltar}>
            ← Voltar ao Dashboard
          </button>
        </div>
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
