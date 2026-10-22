"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { encerrarSessao } from '@/lib/encerrarSessao'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co' // ainda usado para busca REST direta
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

export default function LoginPage() {
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const [verSenha, setVerSenha] = useState(false)
  const [verificandoSessao, setVerificandoSessao] = useState(true)

  const supabase = createClient()
  const cpfRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Verificar sessão primeiro
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Verificar se a sessão é válida antes de ir para o dashboard
        // Saídas anormais podem deixar sessão inválida no localStorage
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          if (user && !error) {
            router.replace('/dashboard')
          } else {
            // Sessão inválida — limpar e mostrar login
            encerrarSessao().then(() => {
              setVerificandoSessao(false)
            })
          }
        })
      } else {
        // Sem sessão — mostrar capa com login
        setVerificandoSessao(false)
      }
    }).catch(() => {
      setVerificandoSessao(false)
    })
    // Limpar campos
    const t = setTimeout(() => {
      if (cpfRef.current) cpfRef.current.value = ""
      setCpf("")
    }, 100)
    return () => clearTimeout(t)
  }, [])

  const formatarCPF = (valor: string) => {
    return valor
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    const cpfLimpo = cpf.replace(/\D/g, "")
    if (cpfLimpo.length !== 11) {
      setErro("Informe um CPF válido (11 dígitos).")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const emailTecnico = `${cpfLimpo}@aime-app.com.br`

      // Verifica se já existe cadastro de inspetor para este CPF
      const res = await fetch('/api/verificar-inspetor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf: cpfLimpo }) })
      const { existe: jaCadastrado } = await res.json()

      if (jaCadastrado) {
        // Login normal — tenta autenticar com a senha fornecida
        const { error } = await supabase.auth.signInWithPassword({ email: emailTecnico, password })
        if (!error) {
          setLoading(false)
          router.push("/dashboard")
          return
        }
        // Se o erro for de credenciais inválidas, pode ser que a conta no Auth
        // tenha sido deletada mas o registro na tabela inspetor ainda existe
        // (ex: usuário deletado manualmente no painel do Supabase). Tenta recriar.
        if (error.message.includes("Invalid login") || error.message.includes("Email not confirmed") || error.message.includes("invalid_credentials")) {
          const criarRes = await fetch('/api/auth-criar-conta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailTecnico, password })
          })
          const criarData = await criarRes.json()
          if (!criarRes.ok || criarData.erro) {
            setLoading(false)
            setErro("CPF ou senha incorretos.")
            return
          }
          const { error: errLogin } = await supabase.auth.signInWithPassword({ email: emailTecnico, password })
          setLoading(false)
          if (errLogin) { setErro("CPF ou senha incorretos."); return }
          router.push("/dashboard")
          return
        }
        setLoading(false)
        setErro("CPF ou senha incorretos.")
      } else {
        // Primeiro acesso: cria a conta (via rota administrativa, sem e-mail de
        // confirmação) e já faz login, enviando para completar o cadastro
        const criarRes = await fetch('/api/auth-criar-conta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailTecnico, password })
        })
        const criarData = await criarRes.json()
        if (!criarRes.ok || criarData.erro) {
          setLoading(false)
          console.error("Erro ao criar conta:", criarData.erro)
          setErro(String(criarData.erro ?? '').includes("no mínimo 8 caracteres") ? String(criarData.erro) : `Não foi possível criar sua conta: ${criarData.erro}`)
          return
        }
        const { error } = await supabase.auth.signInWithPassword({ email: emailTecnico, password })
        setLoading(false)
        if (error) {
          console.error("Erro ao logar apos criar conta:", error)
          setErro("Conta criada, mas não foi possível entrar automaticamente. Tente fazer login novamente.")
          return
        }
        router.push(`/meu-cadastro?novo=1`)
      }
    } catch {
      setLoading(false)
      setErro("Não foi possível conectar. Tente novamente.")
    }
  }

  // Verificando sessão — tela em branco (evita flash)
  if (verificandoSessao) return (
    <div style={{ backgroundColor:'#DCE8F7', minHeight:'100vh' }} />
  )

  // Capa + login numa tela só (22/10/2026). A arte (public/capa-login.jpg) tem a área do cartão
  // apagada; o cartão abaixo é HTML de verdade, posicionado sobre ela. Largura da arte: ocupa a altura
  // da tela no computador e a largura toda no celular. Unidades "cqw" = % da largura da arte.
  const campo: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", border: "1px solid #C7D5EA",
    borderRadius: "10px", backgroundColor: "#EEF3FA", padding: "0 12px", height: "46px" }
  const entrada: React.CSSProperties = { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
    fontSize: "16px", color: "#111827", height: "100%" }
  const rotulo: React.CSSProperties = { fontSize: "14px", fontWeight: 700, color: "#0F1E4A" }

  return (
    <div style={{ backgroundColor: "#DCE8F7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <div style={{ position: "relative", width: "min(100vw, 680px, max(420px, 66.6vh))", containerType: "inline-size" }}>
        <img src="/capa-login.jpg" alt="AIMÊ — Mapeamento Inteligente de Edificações e Equipamentos"
          style={{ width: "100%", display: "block" }} />
        <div style={{ position: "absolute", top: "63.7cqw", left: "50%", transform: "translateX(-50%)",
          width: "max(64.2cqw, min(92cqw, 380px))", minHeight: "57.1cqw", boxSizing: "border-box",
          backgroundColor: "#F8FBFE", borderRadius: "16px", boxShadow: "0 10px 30px rgba(15,30,74,0.12)",
          padding: "22px 22px 20px", marginBottom: "16px" }}>
          <h1 style={{ margin: 0, textAlign: "center", color: "#0F1E4A", fontWeight: 800, fontSize: "22px" }}>
            Efetuar Login e Cadastro
          </h1>
          <p style={{ margin: "6px 0 16px", textAlign: "center", color: "#1F2937", fontSize: "13px", lineHeight: 1.4 }}>
            Entre com seu CPF e senha para acessar o AIMÊ e gerenciar seus serviços de engenharia diagnóstica.
          </p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="cpf-inspetor" style={rotulo}>CPF</label>
              <div style={campo}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
                <input id="cpf-inspetor" ref={cpfRef} type="text" required value={cpf} onChange={(e) => setCpf(formatarCPF(e.target.value))}
                  placeholder="000.000.000-00" inputMode="numeric" autoComplete="new-password" name="cpf-inspetor" style={entrada} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="senha-inspetor" style={rotulo}>Senha</label>
              <div style={campo}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="1.6" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                <input id="senha-inspetor" type={verSenha ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" style={entrada} />
                <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  style={{ background: "none", border: "none", padding: "4px", cursor: "pointer", display: "flex" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>{verSenha && <path d="M4 4l16 16"/>}</svg>
                </button>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "12px", fontWeight: 700, textAlign: "center", color: "#0F2A6B", lineHeight: 1.35 }}>
                Ao criar uma conta: senha com no mínimo 8 caracteres, incluindo uma letra, um número e um caractere especial.
              </p>
              <div style={{ textAlign: "right" }}>
                <a href="/recuperar-senha" style={{ fontSize: "12px", color: "#1E40AF", textDecoration: "underline" }}>Esqueci minha senha</a>
              </div>
            </div>
            {erro && <p style={{ margin: 0, color: "#DC2626", fontSize: "13px", textAlign: "center" }}>{erro}</p>}
            <button type="submit" disabled={loading}
              style={{ background: "linear-gradient(180deg, #1E4FBF 0%, #0B2E86 100%)", color: "white", fontWeight: 600,
                height: "48px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "16px",
                boxShadow: "0 6px 14px rgba(11,46,134,0.3)", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Aguarde..." : "Acessar conta  ›"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
