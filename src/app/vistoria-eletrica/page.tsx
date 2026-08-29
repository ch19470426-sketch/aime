"use client"
export const dynamic = 'force-dynamic'
import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import React from "react"
import Image from "next/image"

const S: Record<string, React.CSSProperties> = {
  body:       { background:'#E8EEF7', display:'flex', justifyContent:'center', padding:'24px', fontFamily:'Arial, Helvetica, sans-serif', minHeight:'100vh' },
  page:       { width:'210mm', maxWidth:'100%', background:'#ffffff', borderRadius:'16px', boxShadow:'0 4px 24px rgba(0,0,0,.15)', overflow:'hidden', height:'fit-content' },
  header:     { background:'#1E3A8A', padding:'8px 16px', display:'flex', alignItems:'center', gap:'12px' },
  divider:    { height:'2px', background:'#1E3A8A' },
  formBody:   { padding:'10px 14px', display:'flex', flexDirection:'column', gap:'8px' },
  block:      { border:'1px solid #c3d4f0', borderRadius:'6px', overflow:'hidden' },
  blockTitle: { background:'#1E3A8A', color:'#ffffff', fontSize:'11px', fontWeight:700, padding:'5px 10px' },
  blockBody:  { padding:'8px 10px', display:'flex', flexDirection:'column', gap:'6px' },
  field:      { display:'flex', flexDirection:'column', gap:'2px' },
  fieldLabel: { fontSize:'10px', fontWeight:600, color:'#4a6480' },
  input:      { width:'100%', border:'1px solid #c3d4f0', borderRadius:'4px', padding:'4px 6px', fontSize:'13px', color:'#1a1a2e', fontFamily:'inherit', background:'#ffffff', boxSizing:'border-box' },
  footer:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'4px', padding:'10px 14px' },
  btn:        { padding:'8px 0', fontSize:'13px', fontWeight:700, borderRadius:'50px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', fontFamily:'inherit', border:'none' },
  btnSec:     { background:'#ffffff', border:'2px solid #1E3A8A', color:'#1E3A8A' },
  btnPri:     { background:'#1E3A8A', border:'2px solid #1E3A8A', color:'#ffffff' },
  erro:       { color:'#E24B4A', fontSize:'7pt', marginTop:'2px' },
  ok:         { color:'#16A34A', fontSize:'7pt', marginTop:'2px', fontWeight:600 },
}

function VistoriaEletricaInner() {
  const params        = useSearchParams()
  const router        = useRouter()
  const cpfEletrico   = params.get('cpf_inspetor')   ?? ''
  const chaveEletrico = params.get('chave_inspetor') ?? ''

  const [cnpj,      setCnpj]      = useState('')
  const [cpfCivil,  setCpfCivil]  = useState('')
  const [artFile,   setArtFile]   = useState<File|null>(null)
  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState('')
  const [credencial,setCredencial]= useState<any>(null)

  function fmtCNPJ(v: string) {
    const d = v.replace(/\D/g,'').slice(0,14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
             .replace(/(\d{2})(\d{3})(\d{3})(\d{4})/,'$1.$2.$3/$4')
             .replace(/(\d{2})(\d{3})(\d{3})/,'$1.$2.$3')
             .replace(/(\d{2})(\d{3})/,'$1.$2')
  }
  function fmtCPF(v: string) {
    const d = v.replace(/\D/g,'').slice(0,11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
             .replace(/(\d{3})(\d{3})(\d{3})/,'$1.$2.$3')
             .replace(/(\d{3})(\d{3})/,'$1.$2')
  }

  async function credenciar() {
    setErro('')
    const cnpjLimpo = cnpj.replace(/\D/g,'')
    const cpfLimpo  = cpfCivil.replace(/\D/g,'')
    if (cnpjLimpo.length < 14) { setErro('CNPJ inválido'); return }
    if (cpfLimpo.length < 11)  { setErro('CPF inválido'); return }
    if (!artFile)               { setErro('Selecione o arquivo da ART/RRT'); return }
    setSalvando(true)
    try {
      const ext  = artFile.name.split('.').pop() ?? 'pdf'
      const nome = `${cpfEletrico}_${cnpjLimpo}_art_eletrico.${ext}`
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(artFile)
      })
      const res  = await fetch('/api/upload-art-eletrico', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          nomeArquivo: nome, base64: b64,
          contentType: artFile.type || 'application/pdf',
          cpfEletrico, cnpjoucpf: cnpjLimpo,
          cpfInspetor: cpfLimpo, tipoServico: '32 Vistoria inspeção',
        })
      })
      const data = await res.json()
      if (!res.ok || data.erro) throw new Error(data.erro || 'Erro no upload')
      setCredencial({ cnpj: cnpjLimpo, cpfCivil: cpfLimpo })
    } catch(e: any) {
      setErro(e.message ?? 'Erro inesperado')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={S.body}>
      <div style={S.page}>
        {/* Cabeçalho */}
        <div style={S.header}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <Image src="/logo.png" alt="AIMÊ" width={80} height={36}
              style={{ filter:'brightness(0) invert(1)', objectFit:'contain' }} />
            <div>
              <div style={{ fontSize:'10px', color:'#B5D4F4', fontWeight:600, letterSpacing:'0.5px', textTransform:'uppercase' }}>AIMÊ</div>
              <div style={{ fontSize:'14px', color:'#fff', fontWeight:700 }}>39 — Vistoria Inspeção Elétrica</div>
            </div>
          </div>
        </div>
        <div style={S.divider} />

        {!credencial ? (
          <>
            <div style={S.formBody}>
              <div style={S.block}>
                <div style={S.blockTitle}>Credenciamento</div>
                <div style={S.blockBody}>
                  <p style={{ fontSize:'12px', color:'#4a6480', margin:0 }}>
                    Informe o CNPJ do estabelecimento e o CPF do inspetor predial que realizou a vistoria de inspeção.
                  </p>

                  <div style={S.field}>
                    <label style={S.fieldLabel}>CNPJ DO ESTABELECIMENTO *</label>
                    <input style={S.input} value={cnpj}
                      onChange={e => setCnpj(fmtCNPJ(e.target.value))}
                      placeholder="00.000.000/0000-00" inputMode="numeric" />
                  </div>

                  <div style={S.field}>
                    <label style={S.fieldLabel}>CPF DO INSPETOR PREDIAL (CIVIL/ARQUITETO) *</label>
                    <input style={S.input} value={cpfCivil}
                      onChange={e => setCpfCivil(fmtCPF(e.target.value))}
                      placeholder="000.000.000-00" inputMode="numeric" />
                  </div>

                  <div style={S.field}>
                    <label style={S.fieldLabel}>ART/RRT DO ENG. ELÉTRICO *</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                      style={{ ...S.input, padding:'3px 6px' }}
                      onChange={e => setArtFile(e.target.files?.[0] ?? null)} />
                    <span style={{ fontSize:'10px', color:'#6B7280' }}>PDF ou imagem da ART/RRT</span>
                  </div>

                  {erro && <span style={S.erro}>{erro}</span>}
                </div>
              </div>
            </div>

            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec }}
                onClick={() => router.push(`/dashboard?cpf_inspetor=${cpfEletrico}&chave_inspetor=${chaveEletrico}`)}>
                Voltar
              </button>
              <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }}
                onClick={credenciar} disabled={salvando}>
                {salvando ? 'Registrando...' : 'Registrar ART'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={S.formBody}>
              <div style={S.block}>
                <div style={S.blockTitle}>Credencial Registrada</div>
                <div style={S.blockBody}>
                  <span style={S.ok}>✓ ART registrada — acesso liberado ao sistema elétrico</span>
                  <p style={{ fontSize:'12px', color:'#4a6480', margin:0 }}>
                    Clique em <b>Iniciar Vistoria</b> para registrar as não conformidades do sistema elétrico.
                  </p>
                </div>
              </div>
            </div>
            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec }}
                onClick={() => router.push(`/dashboard?cpf_inspetor=${cpfEletrico}&chave_inspetor=${chaveEletrico}`)}>
                Dashboard
              </button>
              <button style={{ ...S.btn, ...S.btnPri }}
                onClick={() => router.push(
                  `/vistoria/tela32?cpf_inspetor=${credencial.cpfCivil}&chave_inspetor=${chaveEletrico}&cnpjoucpf=${credencial.cnpj}&tipo_servico=32&sistema_fixo=07-Instalações elétricas&cpf_eletrico=${cpfEletrico}`
                )}>
                Iniciar Vistoria
              </button>
            </div>
          </>
        )}
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
