"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

export default function BaixarDocumentosPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh" }} />}>
      <BaixarDocumentos />
    </Suspense>
  )
}

interface Doc {
  nome: string
  label: string
  url: string
}

function BaixarDocumentos() {
  const params = useSearchParams()
  const cpfInspetor   = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor = params.get('chave_inspetor')  ?? ''
  const cnpjoucpfUrl  = params.get('cnpjoucpf')       ?? ''

  const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
  const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

  const [cnpjoucpf, setCnpjoucpf]   = useState(cnpjoucpfUrl)
  const [docs, setDocs]             = useState<Doc[]>([])
  const [buscando, setBuscando]     = useState(false)
  const [erro, setErro]             = useState("")
  const [buscou, setBuscou]         = useState(false)
  const [razaoSocial, setRazaoSocial] = useState("")

  useEffect(() => {
    if (cnpjoucpfUrl) {
      // Busca razão social/nome do estabelecimento
      const limpo = cnpjoucpfUrl.replace(/\D/g, '')
      fetch(`${SUPA_URL}/rest/v1/estabelecimento?cnpjoucpf=eq.${limpo}&select=razao_social_nome`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
      }).then(r => r.json()).then(d => {
        if (Array.isArray(d) && d.length > 0) setRazaoSocial(d[0].razao_social_nome ?? '')
      }).catch(() => {})
      buscar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatarDoc = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 14)
    if (nums.length <= 11)
      return nums.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    return nums.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }

  async function buscar() {
    setErro("")
    const limpo = cnpjoucpf.replace(/\D/g, '')
    if (limpo.length !== 11 && limpo.length !== 14) {
      setErro("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.")
      return
    }
    setBuscando(true)
    try {
      const res = await fetch(`/api/listar-documentos?chave_inspetor=${encodeURIComponent(chaveInspetor)}&cnpjoucpf=${limpo}`)
      const data = await res.json()
      if (!res.ok || data.erro) {
        setErro(data.erro ?? 'Não foi possível buscar os documentos.')
        setBuscando(false)
        return
      }
      setDocs(data.docs ?? [])
      setBuscou(true)
    } catch {
      setErro('Não foi possível conectar. Tente novamente.')
    } finally {
      setBuscando(false)
    }
  }

  function baixar(doc: Doc) {
    const a = document.createElement('a')
    a.href = doc.url
    a.download = doc.nome
    a.target = '_blank'
    a.click()
  }

  const S = {
    body: { backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" },
    card: { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", width: "100%", maxWidth: "680px", overflow: "hidden" },
    header: { backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" },
    divider: { height: "2px", backgroundColor: "#1E3A8A" },
    body2: { padding: "24px" },
    label: { fontSize: "12px", fontWeight: "600" as const, color: "#374151", display: "block", marginBottom: "4px" },
    input: { border: "1px solid #D1D5DB", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", width: "100%", boxSizing: "border-box" as const, outline: "none" },
    btn: { backgroundColor: "#1E3A8A", color: "white", fontWeight: "600" as const, padding: "10px 24px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "13px" },
    btnSec: { backgroundColor: "white", color: "#1E3A8A", border: "2px solid #1E3A8A", fontWeight: "600" as const, padding: "10px 24px", borderRadius: "50px", cursor: "pointer", fontSize: "13px" },
  }

  return (
    <div style={S.body}>
      <div style={S.card}>
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
            61 – Baixar Documentos
          </span>
        </div>
        <div style={S.divider} />
        <div style={S.body2}>

          {/* Identificação do estabelecimento */}
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", fontSize: "13px", color: "#374151", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>{razaoSocial || "Estabelecimento"}</span>
            <span style={{ color: "#6B7280", fontSize: "12px" }}>{cnpjoucpf || "—"}</span>
          </div>
          {buscando && <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "16px" }}>Buscando documentos...</p>}

          {erro && <p style={{ color: "#DC2626", fontSize: "13px", marginBottom: "16px" }}>{erro}</p>}

          {/* Lista de documentos */}
          {buscou && docs.length === 0 && (
            <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "13px", padding: "32px 0" }}>
              Nenhum documento encontrado para este CNPJ/CPF.
            </div>
          )}

          {docs.length > 0 && (
            <div>
              <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "12px" }}>
                {docs.length} documento{docs.length > 1 ? 's' : ''} encontrado{docs.length > 1 ? 's' : ''}. Clique para baixar.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {docs.map((doc) => (
                  <button key={doc.nome} onClick={() => baixar(doc)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", border: "1px solid #E2E8F0", borderRadius: "8px", backgroundColor: "white", cursor: "pointer", textAlign: "left" as const, transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F0F4FF")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "white")}>
                    <span style={{ fontSize: "20px" }}>
                      {doc.nome.endsWith('.pdf') ? '📄' : '📋'}
                    </span>
                    <span style={{ flex: 1, fontSize: "13px", color: "#374151" }}>{doc.label}</span>
                    <span style={{ fontSize: "11px", color: "#1E3A8A", fontWeight: 600 }}>↓ Baixar</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botão voltar */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
            <button style={S.btnSec} onClick={() => window.location.href = '/dashboard'}>
              Voltar ao Menu
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
