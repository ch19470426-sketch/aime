'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const S = {
  page: { backgroundColor:'#E8EEF7', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', overflow:'hidden' } as React.CSSProperties,
  card: { backgroundColor:'white', borderRadius:'16px', boxShadow:'0 25px 50px rgba(0,0,0,0.15)', width:'100%', maxWidth:'420px', overflow:'hidden' } as React.CSSProperties,
  header: { backgroundColor:'#1E3A8A', padding:'8px 16px', textAlign:'center' as const },
  body: { padding:'28px 24px' },
  label: { display:'block', fontSize:'12px', fontWeight:700, color:'#374151', marginBottom:'6px' },
  input: { width:'100%', padding:'10px 14px', border:'1.5px solid #D1D5DB', borderRadius:'8px', fontSize:'13px', boxSizing:'border-box' as const, marginBottom:'16px' },
  btn: { width:'100%', backgroundColor:'#1E3A8A', color:'white', border:'none', borderRadius:'9999px', padding:'12px', fontSize:'13px', fontWeight:700, cursor:'pointer', marginTop:'8px' },
}

function NovaSenhaForm() {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [pronto, setPronto] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // O Supabase envia o token no hash da URL: #access_token=xxx&type=recovery
    // Precisamos extrair e estabelecer a sessão manualmente
    const hash = window.location.hash
    if (!hash) { setErro('Link inválido ou expirado. Solicite um novo link.'); return }

    const params = new URLSearchParams(hash.replace('#', ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (type !== 'recovery' || !accessToken) {
      setErro('Link inválido ou expirado. Solicite um novo link.')
      return
    }

    // Estabelecer sessão com o token do link
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
      .then(({ error }) => {
        if (error) {
          setErro('Link expirado. Solicite um novo link de recuperação.')
        } else {
          setPronto(true)
        }
      })
  }, [])

  async function salvar() {
    setErro('')
    const senhaOk = senha.length >= 8 && /[A-Za-z]/.test(senha) && /[0-9]/.test(senha) && /[^A-Za-z0-9]/.test(senha)
    if (!senhaOk) { setErro('A senha deve ter no mínimo 8 caracteres, incluindo pelo menos uma letra, um número e um caractere especial.'); return }
    if (senha !== confirma) { setErro('As senhas não conferem.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) {
        const msg = error.message
        if (msg.includes('different from the old password')) setErro('A nova senha deve ser diferente da senha atual.')
        else if (msg.includes('Password should be')) setErro('A senha deve ter no mínimo 8 caracteres, incluindo pelo menos uma letra, um número e um caractere especial.')
        else if (msg.includes('Auth session missing')) setErro('Sessão expirada. Solicite um novo link de recuperação.')
        else setErro('Erro ao salvar a senha. Tente novamente.')
        return
      }
      setOk(true)
      setTimeout(() => router.push('/'), 2500)
    } catch { setErro('Erro ao salvar. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.header}>
          <img src="/logo.png" height={36} alt="AIMÊ" style={{filter:'brightness(0) invert(1)'}} />
          <div style={{color:'white', fontSize:'13px', marginTop:'6px', fontWeight:700}}>Nova Senha</div>
        </div>
        <div style={S.body}>
          {ok ? (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'40px', marginBottom:'12px'}}>✅</div>
              <div style={{fontWeight:700, color:'#1E3A8A', fontSize:'15px', marginBottom:'8px'}}>Senha alterada!</div>
              <p style={{fontSize:'13px', color:'#374151'}}>Redirecionando para o login...</p>
            </div>
          ) : !pronto ? (
            <div style={{textAlign:'center'}}>
              {erro
                ? <>
                    <div style={{fontSize:'40px', marginBottom:'12px'}}>⚠️</div>
                    <p style={{color:'#DC2626', fontSize:'13px'}}>{erro}</p>
                    <button style={S.btn} onClick={() => router.push('/recuperar-senha')}>
                      Solicitar novo link
                    </button>
                  </>
                : <p style={{color:'#6b7280', fontSize:'13px'}}>Verificando link...</p>
              }
            </div>
          ) : (
            <>
              <p style={{fontSize:'13px', color:'#374151', marginBottom:'20px', lineHeight:1.6}}>
                Digite sua nova senha. Mínimo 8 caracteres, com letra, número e caractere especial.
              </p>
              <label style={S.label}>Nova senha</label>
              <input style={S.input} type="password" placeholder="••••••••"
                value={senha} onChange={e => setSenha(e.target.value)} />
              <label style={S.label}>Confirmar nova senha</label>
              <input style={S.input} type="password" placeholder="••••••••"
                value={confirma} onChange={e => setConfirma(e.target.value)}
                onKeyDown={e => e.key==='Enter' && salvar()} />
              {erro && <p style={{color:'#DC2626', fontSize:'12px', marginTop:'4px'}}>{erro}</p>}
              <button style={{...S.btn, opacity: loading ? 0.7 : 1}} onClick={salvar} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NovaSenhaPage() {
  return <Suspense fallback={<div/>}><NovaSenhaForm /></Suspense>
}
