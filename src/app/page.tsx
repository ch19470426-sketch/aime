"use client"
import { useState } from "react"
import Image from "next/image"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setErro("E-mail ou senha incorretos.")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ backgroundColor: "white", borderRadius: "16px", boxShadow: "0 25px 50px rgba(0,0,0,0.15)", width: "100%", maxWidth: "448px", overflow: "hidden" }}>
        <div style={{ backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", textAlign: "center", flex: 1, lineHeight: "1.3" }}>
            Mapeamento Inteligente de Edificações e Equipamentos
          </span>
        </div>
        <div style={{ height: "2px", backgroundColor: "#1E3A8A" }} />
        <div style={{ padding: "24px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
                style={{ border: "1px solid #D1D5DB", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Senha</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                style={{ border: "1px solid #D1D5DB", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", outline: "none" }} />
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
