"use client"
import { useState } from "react"
import Image from "next/image"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

export default function LoginPage() {
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
      const supabase = createClient(SUPA_URL, SUPA_KEY)
      const emailTecnico = `${cpfLimpo}@aime-app.com.br`

      // Verifica se já existe cadastro de inspetor para este CPF
      const res = await fetch(`${SUPA_URL}/rest/v1/inspetor?cpf_inspetor=eq.${cpfLimpo}&select=cpf_inspetor`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
      })
      const existentes = await res.json()
      const jaCadastrado = Array.isArray(existentes) && existentes.length > 0

      if (jaCadastrado) {
        // Login normal
        const { error } = await supabase.auth.signInWithPassword({ email: emailTecnico, password })
        setLoading(false)
        if (error) {
          console.error("Erro signIn Supabase:", error)
          setErro("CPF ou senha incorretos.")
          return
        }
        router.push("/dashboard")
      } else {
        // Primeiro acesso: cria a conta e envia para completar o cadastro
        const { error } = await supabase.auth.signUp({ email: emailTecnico, password })
        setLoading(false)
        if (error) {
          console.error("Erro signUp Supabase:", error)
          setErro(error.message.includes("Password") ? "A senha deve ter pelo menos 6 caracteres." : `Não foi possível criar sua conta: ${error.message}`)
          return
        }
        router.push(`/inspetor?cpf=${cpfLimpo}&novo=1`)
      }
    } catch {
      setLoading(false)
      setErro("Não foi possível conectar. Tente novamente.")
    }
  }

  return (
    <div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ backgroundColor: "white", borderRadius: "16px", boxShadow: "0 25px 50px rgba(0,0,0,0.15)", width: "100%", maxWidth: "448px", overflow: "hidden" }}>
        <div style={{ backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", textAlign: "center", flex: 1, lineHeight: "1.3" }}>
            Mapeamento Inteligente de Edificacoes e Equipamentos
          </span>
        </div>
        <div style={{ height: "2px", backgroundColor: "#1E3A8A" }} />
        <div style={{ padding: "24px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>CPF</label>
              <input type="text" required value={cpf} onChange={(e) => setCpf(formatarCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" name="cpf-inspetor"
                style={{ border: "1px solid #D1D5DB", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Senha</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********"
                style={{ border: "1px solid #D1D5DB", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", outline: "none" }} />
              <p style={{ fontSize: "11px", color: "#6B7280" }}>Primeiro acesso? Digite seu CPF e crie uma senha — sua conta será criada automaticamente.</p>
            </div>
            {erro && <p style={{ color: "#DC2626", fontSize: "13px", textAlign: "center" }}>{erro}</p>}
            <button type="submit" disabled={loading}
              style={{ backgroundColor: "#1E3A8A", color: "white", fontWeight: "600", padding: "12px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "14px", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Aguarde..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
