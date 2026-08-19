'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const S = {
  page: { backgroundColor:'#E8EEF7', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' } as React.CSSProperties,
  card: { backgroundColor:'white', borderRadius:'16px', boxShadow:'0 25px 50px rgba(0,0,0,0.15)', width:'100%', maxWidth:'420px', overflow:'hidden' } as React.CSSProperties,
  header: { backgroundColor:'#1E3A8A', padding:'20px 24px', textAlign:'center' as const },
  body: { padding:'28px 24px' },
  label: { display:'block', fontSize:'12px', fontWeight:700, color:'#374151', marginBottom:'6px' },
  input: { width:'100%', padding:'10px 14px', border:'1.5px solid #D1D5DB', borderRadius:'8px', fontSize:'13px', boxSizing:'border-box' as const },
  btn: { width:'100%', backgroundColor:'#1E3A8A', color:'white', border:'none', borderRadius:'9999px', padding:'12px', fontSize:'13px', fontWeight:700, cursor:'pointer', marginTop:'16px' },
  link: { color:'#1E3A8A', fontSize:'12px', cursor:'pointer', textDecoration:'underline', display:'block', textAlign:'center' as const, marginTop:'16px' },
}

export default function RecuperarSenhaPage() {
  const [cpf, setCpf] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()

  function formatCpf(v: string) {
    const d = v.replace(/\D/g,'').slice(0,11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
           .replace(/(\d{3})(\d{3})(\d{3})/,'$1.$2.$3')
           .replace(/(\d{3})(\d{3})/,'$1.$2')
           .replace(/(\d{3})/,'$1')
  }

  async function enviar() {
    setErro(''); setLoading(true)
    try {
      const res = await fetch('/api/recuperar-senha', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ cpf })
      })
      const data = await res.json()
      if (!res.ok || data.erro) { setErro(data.erro || 'Erro ao processar. Tente novamente.'); return }
      setEnviado(true)
    } catch { setErro('Erro de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.header}>
          <img src="/logo.png" height={36} alt="AIMÊ" style={{filter:'brightness(0) invert(1)'}} />
          <div style={{color:'white', fontSize:'13px', marginTop:'6px', fontWeight:700}}>Recuperar Senha</div>
        </div>
        <div style={S.body}>
          {enviado ? (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'40px', marginBottom:'12px'}}>📧</div>
              <div style={{fontWeight:700, color:'#1E3A8A', fontSize:'15px', marginBottom:'8px'}}>E-mail enviado!</div>
              <p style={{fontSize:'13px', color:'#374151', lineHeight:1.6}}>
                Se o CPF informado estiver cadastrado, você receberá um e-mail com o link para redefinir sua senha.
                Verifique também a caixa de spam.
              </p>
              <button style={S.btn} onClick={() => router.push('/')}>Voltar ao login</button>
            </div>
          ) : (
            <>
              <p style={{fontSize:'13px', color:'#374151', marginBottom:'20px', lineHeight:1.6}}>
                Informe seu CPF cadastrado no AIMÊ. Enviaremos um link de redefinição para o seu e-mail.
              </p>
              <label style={S.label}>CPF</label>
              <input
                style={S.input}
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                onKeyDown={e => e.key==='Enter' && enviar()}
                maxLength={14}
              />
              {erro && <p style={{color:'#DC2626', fontSize:'12px', marginTop:'8px'}}>{erro}</p>}
              <button style={{...S.btn, opacity: loading ? 0.7 : 1}} onClick={enviar} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
              <span style={S.link} onClick={() => router.push('/')}>Voltar ao login</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
