"use client"
export const dynamic = 'force-dynamic'
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import Banner from '@/components/Banner'
import { useBanner } from '@/hooks/useBanner'

export default function FaleConoscoPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh" }} />}>
      <FaleConosco />
    </Suspense>
  )
}

const WHATSAPP_SUPORTE = '5527999544362' // (27) 99954-4362
const EMAIL_SUPORTE = 'suporte@aime.eng.br'

function FaleConosco() {
  const params = useSearchParams()
  const cpfInspetor = params.get('cpf_inspetor') ?? ''

  const { bannerProps, informa, solicita, fechar } = useBanner()
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!assunto.trim() || !mensagem.trim()) {
      informa('Atenção', 'Preencha o assunto e a mensagem antes de enviar.')
      return
    }
    setEnviando(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/enviar-suporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ assunto, mensagem }),
      })
      const d = await res.json()
      if (!res.ok) { informa('Erro', d.erro ?? 'Não foi possível enviar sua mensagem.'); setEnviando(false); return }
      solicita('Mensagem enviada!',
        'Recebemos sua mensagem e vamos responder em breve.',
        [{ label: 'Voltar ao Menu', acao: () => { fechar(); window.location.href = `/dashboard?cpf_inspetor=${cpfInspetor}` }, estilo: 'primario' }]
      )
      setAssunto(''); setMensagem('')
    } catch {
      informa('Erro', 'Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const S = {
    body: { backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" },
    page: { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", width: "100%", maxWidth: "560px", overflow: "hidden" },
    header: { backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" },
    divider: { height: "2px", backgroundColor: "#1E3A8A" },
    body2: { padding: "24px" },
  }

  return (
    <div style={S.body}>
      <Banner {...bannerProps} />
      <div style={S.page}>
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
            Fale Conosco
          </span>
        </div>
        <div style={S.divider} />
        <div style={S.body2}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
            <a href={`https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent('Olá! Preciso de ajuda com o AIMÊ.')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "14px", borderRadius: "10px", border: "1.5px solid #25D366", textDecoration: "none" }}>
              <span style={{ fontSize: "22px" }}>💬</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#128C4A" }}>WhatsApp</span>
              <span style={{ fontSize: "10px", color: "#6B7280" }}>(27) 99954-4362</span>
            </a>
            <a href={`mailto:${EMAIL_SUPORTE}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "14px", borderRadius: "10px", border: "1.5px solid #1E3A8A", textDecoration: "none" }}>
              <span style={{ fontSize: "22px" }}>✉️</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#1E3A8A" }}>E-mail</span>
              <span style={{ fontSize: "10px", color: "#6B7280" }}>{EMAIL_SUPORTE}</span>
            </a>
          </div>

          <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "16px" }}>
            <p style={{ fontSize: "12px", color: "#374151", marginBottom: "14px" }}>
              Ou envie sua mensagem por aqui — fica registrada e nossa equipe responde pelo seu e-mail cadastrado.
            </p>

            <label style={{ fontSize: "11px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "4px" }}>Assunto</label>
            <input value={assunto} onChange={e => setAssunto(e.target.value)} maxLength={200}
              placeholder="Ex: Dúvida sobre créditos"
              style={{ width: "100%", border: "1px solid #D1D5DB", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", marginBottom: "12px", boxSizing: "border-box" }} />

            <label style={{ fontSize: "11px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "4px" }}>Mensagem</label>
            <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={5}
              placeholder="Descreva sua dúvida ou solicitação..."
              style={{ width: "100%", border: "1px solid #D1D5DB", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", marginBottom: "16px", boxSizing: "border-box", resize: "vertical" as const, fontFamily: "inherit" }} />

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => window.location.href = `/dashboard?cpf_inspetor=${cpfInspetor}`}
                style={{ padding: "9px 20px", borderRadius: "50px", border: "1px solid #1E3A8A", backgroundColor: "white", color: "#1E3A8A", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                Voltar
              </button>
              <button onClick={enviar} disabled={enviando}
                style={{ backgroundColor: "#1E3A8A", color: "white", fontWeight: 600, padding: "9px 24px", borderRadius: "50px", border: "none", cursor: enviando ? "not-allowed" : "pointer", fontSize: "12px", opacity: enviando ? 0.6 : 1 }}>
                {enviando ? "Enviando..." : "Enviar Mensagem"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
