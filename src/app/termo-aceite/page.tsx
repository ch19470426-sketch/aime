"use client"
export const dynamic = 'force-dynamic'
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import LinkSair from "@/components/LinkSair"
import { TERMO_BLOCOS, partesComNegrito, dataDoAceite, type BlocoTermo } from "@/lib/termoAceite"

export default function TermoAceitePage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh" }} />}>
      <TermoAceite />
    </Suspense>
  )
}


function TermoAceite() {
  const params = useSearchParams()
  const cpf = params.get('cpf') ?? ''
  const chave = params.get('chave') ?? ''
  const proximo = params.get('proximo') ?? '/dashboard'

  const [aceitando, setAceitando] = useState(false)
  const [erro, setErro] = useState("")
  // Macro Fluxo aparece PRIMEIRO agora (antes vinha depois do Termo) —
  // decisão de Celso, 30/09/2026: mostrar o contexto antes de pedir
  // qualquer compromisso (aceite do termo, escolha de plano) reduz atrito.
  const [mostrarDiagrama, setMostrarDiagrama] = useState(true)

  async function aceitar() {
    setErro("")
    setAceitando(true)
    try {
      const res = await fetch('/api/gerar-termo-aceite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfInspetor: cpf, chaveInspetor: chave })
      })
      const data = await res.json()
      if (!res.ok || data.erro) {
        setErro(data.erro ?? 'Não foi possível registrar o aceite. Tente novamente.')
        setAceitando(false)
        return
      }
      // Próxima etapa obrigatória: escolher um plano (mesmo que Cortesia) —
      // o "proximo" original (ex.: /dashboard) é repassado para DEPOIS
      // dessa escolha, não pulado.
      window.location.href = `/escolher-plano?cpf=${cpf}&chave=${encodeURIComponent(chave)}&proximo=${encodeURIComponent(proximo)}`
      return
    } catch {
      setErro('Não foi possível conectar. Tente novamente.')
      setAceitando(false)
    }
  }

  const S = {
    body: { backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" },
    page: { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", width: "100%", maxWidth: "780px", overflow: "hidden" },
    header: { backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" },
    divider: { height: "2px", backgroundColor: "#1E3A8A" },
    body2: { padding: "20px 24px" },
    titulo: { textAlign: "center" as const, fontWeight: "bold" as const, fontSize: "12pt", marginBottom: "12pt" },
    texto: { fontSize: "9pt", lineHeight: 1.6, color: "#1a1a1a", textAlign: "justify" as const, marginBottom: "6pt" },
    h2: { fontSize: "9pt", fontWeight: "bold" as const, marginTop: "10pt", marginBottom: "3pt" },
    rodape: { borderTop: "1px solid #ccc", marginTop: "16pt", paddingTop: "8pt", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
    btnAceitar: { backgroundColor: "#1E3A8A", color: "white", fontWeight: "600" as const, padding: "10px 28px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "13px" },
  }

  if (mostrarDiagrama) {
    return (
      <div style={S.body}>
        <div style={{ ...S.page, maxWidth: '780px' }}>
          <div style={S.header}>
            <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
            <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
              Bem-vindo ao AIMÊ
            </span>
            <LinkSair />
          </div>
          <div style={S.divider} />
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "10pt", fontWeight: "700", color: "#374151", marginBottom: "16pt", textAlign: "center" }}>
              Conheça o macro fluxo do processo — da contratação à entrega dos documentos.
            </p>
            <img src="/fluxo-aime.png" alt="Macro Fluxo no AIMÊ" style={{ width: "100%", borderRadius: "8px" }} />
            <div style={{ display: "flex", justifyContent: "center", marginTop: "20pt" }}>
              <button style={{ backgroundColor: "#1E3A8A", color: "white", fontWeight: "600", padding: "12px 36px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "13px" }}
                onClick={() => setMostrarDiagrama(false)}>
                Entendi, vamos começar!
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // Recuos do documento (1,2 cm): parágrafo numerado com a primeira linha à esquerda; itens a), b), c) mais recuados
  const RECUO = 34
  const estiloDoBloco = (b: BlocoTermo): React.CSSProperties => {
    if (b.t === 'clausula') return S.h2
    if (b.t === 'abertura') return { ...S.texto, marginBottom: '10pt' }
    if (b.nivel === 2) return { ...S.texto, paddingLeft: RECUO * 2, textIndent: -RECUO }
    if (b.nivel === 1) return { ...S.texto, paddingLeft: RECUO, textIndent: -RECUO }
    return S.texto
  }

  return (
    <div style={S.body}>
      <div style={S.page}>
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
            Termo de Aceite dos Serviços – Plataforma AIMÊ
          </span>
          <LinkSair />
        </div>
        <div style={S.divider} />
        <div style={S.body2}>

          {TERMO_BLOCOS.map((b, i) => (
            <p key={i} style={estiloDoBloco(b)}>
              {partesComNegrito(b.texto).map((parte, j) => (parte.b ? <strong key={j}>{parte.t}</strong> : <span key={j}>{parte.t}</span>))}
            </p>
          ))}
          <p style={{ ...S.texto, textAlign: "right", fontWeight: "bold", marginTop: "16pt", marginBottom: "2pt" }}>Data do aceite: {dataDoAceite()}.</p>
          <p style={{ fontSize: "8pt", color: "#6B7280", textAlign: "right", margin: 0 }}>(a data é registrada automaticamente ao aceitar)</p>

          {erro && <p style={{ color: "#DC2626", fontSize: "12px", marginTop: "8pt" }}>{erro}</p>}

          <div style={S.rodape}>
            <p style={{ fontSize: "9pt", color: "#374151", margin: 0 }}>
              Ao clicar em <strong>"Li e aceito os termos"</strong>, o aceite eletrônico fica registrado com a data de hoje.
            </p>
            <button style={{ ...S.btnAceitar, opacity: aceitando ? 0.7 : 1 }}
              onClick={aceitar} disabled={aceitando}>
              {aceitando ? "Registrando..." : "Li e aceito os termos"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
