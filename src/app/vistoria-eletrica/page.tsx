"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const S: Record<string, any> = {
  body:    { minHeight:'100vh', backgroundColor:'#E8EEF7', display:'flex', justifyContent:'center', alignItems:'flex-start', padding:'24px 16px' },
  page:    { width:'100%', maxWidth:'480px' },
  card:    { background:'#fff', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,.08)', marginBottom:'16px' },
  label:   { display:'block', fontSize:'11px', fontWeight:600, color:'#4a6480', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' },
  input:   { width:'100%', padding:'10px 12px', border:'1.5px solid #C8D8E8', borderRadius:'8px', fontSize:'14px', outline:'none' },
  btn:     { width:'100%', padding:'12px', borderRadius:'8px', fontSize:'14px', fontWeight:700, border:'none', cursor:'pointer' },
  btnPri:  { background:'#1E3A8A', color:'#fff' },
  btnSec:  { background:'#E8EEF7', color:'#1E3A8A' },
  titulo:  { fontSize:'16px', fontWeight:700, color:'#1E3A8A', marginBottom:'16px' },
  erro:    { color:'#E24B4A', fontSize:'12px', marginTop:'4px' },
  info:    { fontSize:'12px', color:'#6B7280', marginTop:'4px' },
}

function VistoriaEletricaInner() {
  const params = useSearchParams()
  const router = useRouter()

  const cpfEletrico   = params.get('cpf_inspetor')    ?? ''
  const chaveEletrico = params.get('chave_inspetor')  ?? ''

  const [cnpj,       setCnpj]       = useState('')
  const [cpfCivil,   setCpfCivil]   = useState('')
  const [artFile,    setArtFile]    = useState<File|null>(null)
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')
  const [msg,        setMsg]        = useState('')
  const [credencial, setCredencial] = useState<any>(null)

  function fmtCNPJ(v: string) {
    const d = v.replace(/\D/g,'').slice(0,14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
           .replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4')
           .replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3')
           .replace(/(\d{2})(\d{3})/, '$1.$2')
  }
  function fmtCPF(v: string) {
    const d = v.replace(/\D/g,'').slice(0,11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
           .replace(/(\d{3})(\d{3})(\d{3})/,'$1.$2.$3')
           .replace(/(\d{3})(\d{3})/,'$1.$2')
           .replace(/(\d{3})/,'$1')
  }

  async function credenciar() {
    setErro(''); setMsg('')
    const cnpjLimpo = cnpj.replace(/\D/g,'')
    const cpfLimpo  = cpfCivil.replace(/\D/g,'')
    if (cnpjLimpo.length < 14) { setErro('CNPJ inválido'); return }
    if (cpfLimpo.length < 11)  { setErro('CPF inválido'); return }
    if (!artFile)               { setErro('Selecione o arquivo da ART'); return }
    setSalvando(true)
    try {
      // 1. Verificar vistoria 32 aberta para este CNPJ + CPF civil
      const res = await fetch(
        `${SUPA_URL}/rest/v1/dados_vistoria?cnpjoucpf=eq.${cnpjLimpo}&cpf_inspetor=eq.${cpfLimpo}&tipo_servico=ilike.32%25&select=numero_foto&limit=1`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
      )
      const rows = await res.json()
      if (!Array.isArray(rows) || rows.length === 0) {
        setErro('Nenhuma vistoria de inspeção (32) encontrada para este CNPJ e CPF.'); setSalvando(false); return
      }

      // 2. Upload da ART
      const ext     = artFile.name.split('.').pop() ?? 'pdf'
      const nomeArt = `${cpfEletrico}_${cnpjLimpo}_art_eletrico.${ext}`
      const buf     = await artFile.arrayBuffer()
      const upRes   = await fetch(
        `${SUPA_URL}/storage/v1/object/aime/arts/${nomeArt}`,
        { method:'POST', headers:{ apikey: SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}`, 'Content-Type': artFile.type || 'application/pdf', 'x-upsert':'true' },
          body: buf }
      )
      if (!upRes.ok) throw new Error('Erro no upload da ART')

      // 3. Salvar credencial em art_profissional
      const insRes = await fetch(`${SUPA_URL}/rest/v1/art_profissional`, {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}`, 'Content-Type':'application/json', Prefer:'return=representation' },
        body: JSON.stringify({
          cpf_inspetor: cpfLimpo,
          cnpjoucpf:    cnpjLimpo,
          tipo_servico: '32 Vistoria inspeção',
          cpf_eletrico: cpfEletrico,
          arquivo_art:  `arts/${nomeArt}`,
        })
      })
      if (!insRes.ok) throw new Error('Erro ao salvar credencial')

      setCredencial({ cnpj: cnpjLimpo, cpfCivil: cpfLimpo })
      setMsg('Credencial registrada com sucesso!')
    } catch(e: any) {
      setErro(e.message ?? 'Erro inesperado')
    } finally {
      setSalvando(false)
    }
  }

  function irParaVistoria() {
    if (!credencial) return
    router.push(
      `/vistoria/tela32?cpf_inspetor=${credencial.cpfCivil}&chave_inspetor=${chaveEletrico}&cnpjoucpf=${credencial.cnpj}&tipo_servico=32&sistema_fixo=07-Instalações elétricas&cpf_eletrico=${cpfEletrico}&chave_eletrico=${chaveEletrico}`
    )
  }

  return (
    <div style={S.body}>
      <div style={S.page}>
        <div style={{ ...S.card, borderTop:'4px solid #1E3A8A' }}>
          <div style={S.titulo}>39 — Vistoria Inspeção Elétrica</div>
          <p style={{ fontSize:'12px', color:'#6B7280', marginBottom:'16px' }}>
            Informe o CNPJ do estabelecimento e o CPF do inspetor civil/arquiteto que realizou a vistoria de inspeção predial.
          </p>

          {!credencial ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <label style={S.label}>CNPJ do Estabelecimento *</label>
                <input style={S.input} value={cnpj}
                  onChange={e => setCnpj(fmtCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00" inputMode="numeric" />
              </div>
              <div>
                <label style={S.label}>CPF do Inspetor Predial (Civil/Arquiteto) *</label>
                <input style={S.input} value={cpfCivil}
                  onChange={e => setCpfCivil(fmtCPF(e.target.value))}
                  placeholder="000.000.000-00" inputMode="numeric" />
              </div>
              <div>
                <label style={S.label}>ART do Eng. Elétrico *</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                  style={{ ...S.input, padding:'6px' }}
                  onChange={e => setArtFile(e.target.files?.[0] ?? null)} />
                <span style={S.info}>PDF ou imagem da ART/RRT</span>
              </div>
              {erro && <span style={S.erro}>{erro}</span>}
              {msg  && <span style={{ ...S.erro, color:'#16A34A' }}>{msg}</span>}
              <button style={{ ...S.btn, ...S.btnPri }} onClick={credenciar} disabled={salvando}>
                {salvando ? 'Registrando...' : 'Registrar Credencial'}
              </button>
              <button style={{ ...S.btn, ...S.btnSec }} onClick={() => router.back()}>
                Voltar
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div style={{ background:'#DCFCE7', borderRadius:'8px', padding:'12px', fontSize:'13px', color:'#16A34A', fontWeight:600 }}>
                ✓ Credencial registrada — acesso liberado ao sistema elétrico
              </div>
              <button style={{ ...S.btn, ...S.btnPri }} onClick={irParaVistoria}>
                Iniciar Vistoria Elétrica
              </button>
              <button style={{ ...S.btn, ...S.btnSec }} onClick={() => router.push(`/dashboard?cpf_inspetor=${cpfEletrico}&chave_inspetor=${chaveEletrico}`)}>
                Voltar ao Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VistoriaEletrica() {
  return (
    <Suspense fallback={<div style={{ backgroundColor:'#E8EEF7', minHeight:'100vh' }} />}>
      <VistoriaEletricaInner />
    </Suspense>
  )
}
