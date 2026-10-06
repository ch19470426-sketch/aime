"use client"
export const dynamic = 'force-dynamic'
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import { precoPlanoCentavos, formatarReais } from "@/lib/precos"

export default function EscolherPlanoPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh" }} />}>
      <EscolherPlano />
    </Suspense>
  )
}

type Pagamento = { invoiceUrl: string; pixQrCode?: string; pixCopiaECola?: string } | null

const PLANOS = [
  { tipo: 'PLANO CORTESIA', nome: 'Cortesia', creditos: 600, preco: 'Grátis', cor: '#6B7280',
    descricao: 'Créditos de boas-vindas, concedidos uma única vez. Sem custo.' },
  { tipo: 'PLANO SERVIÇO', nome: 'Serviço', creditos: 600, preco: formatarReais(precoPlanoCentavos('PLANO SERVIÇO')!), cor: '#0284C7',
    descricao: 'Para quem realiza vistorias pontuais.' },
  { tipo: 'PLANO MENSAL', nome: 'Mensal', creditos: 1200, preco: formatarReais(precoPlanoCentavos('PLANO MENSAL')!), cor: '#059669',
    descricao: 'Para uso recorrente ao longo do mês.' },
  { tipo: 'PLANO ESCRITÓRIO', nome: 'Escritório', creditos: 3000, preco: formatarReais(precoPlanoCentavos('PLANO ESCRITÓRIO')!), cor: '#7C3AED',
    descricao: 'Maior volume, para equipes e escritórios.' },
]

function EscolherPlano() {
  const params = useSearchParams()
  const cpf = params.get('cpf') ?? ''
  const chave = params.get('chave') ?? ''
  const proximo = params.get('proximo') ?? '/dashboard'

  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [forma, setForma] = useState<'PIX' | 'CREDIT_CARD'>('PIX')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [pagamento, setPagamento] = useState<Pagamento>(null)
  const [cortesiaConcedida, setCortesiaConcedida] = useState(false)
  const [ehAssinatura, setEhAssinatura] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [avisoPagamento, setAvisoPagamento] = useState('')
  // Só Mensal e Escritório podem ser assinados (renovação automática no cartão).
  const assinavel = selecionado === 'PLANO MENSAL' || selecionado === 'PLANO ESCRITÓRIO'

  async function tokenSessao() {
    const { data: { session } } = await createClient().auth.getSession()
    return session?.access_token ?? ''
  }

  async function escolherCortesia() {
    setEnviando(true); setErro('')
    try {
      const res = await fetch('/api/creditos/escolher-cortesia', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await tokenSessao()}` },
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.erro ?? 'Não foi possível conceder o Cortesia.'); setEnviando(false); return }
      setCortesiaConcedida(true)
      setEnviando(false)
    } catch { setErro('Erro de conexão.'); setEnviando(false) }
  }

  async function contratarPago(tipo: string) {
    setEnviando(true); setErro(''); setPagamento(null)
    try {
      const res = await fetch('/api/creditos/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenSessao()}` },
        body: JSON.stringify({ tipo, forma }),
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.erro ?? 'Não foi possível gerar a cobrança.'); setEnviando(false); return }
      if (d.pagamento && typeof d.pagamento === 'object') {
        setPagamento(d.pagamento)
      } else {
        setErro('Pedido registrado, mas a cobrança falhou. Tente novamente em instantes.')
      }
      setEnviando(false)
    } catch { setErro('Erro de conexão.'); setEnviando(false) }
  }

  async function assinar(tipo: string) {
    setEnviando(true); setErro(''); setPagamento(null); setEhAssinatura(false)
    try {
      const res = await fetch('/api/creditos/assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenSessao()}` },
        body: JSON.stringify({ tipo }),
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.erro ?? 'Não foi possível iniciar a assinatura.'); setEnviando(false); return }
      if (d.pagamento && typeof d.pagamento === 'object') {
        setPagamento(d.pagamento); setEhAssinatura(true)
      } else {
        setErro('Assinatura registrada, mas o link de pagamento não foi gerado agora. Toque em Assinar de novo em instantes.')
      }
      setEnviando(false)
    } catch { setErro('Erro de conexão.'); setEnviando(false) }
  }

  // Quem ainda não pagou não tem contrato, e o dashboard devolveria à escolha de plano sem
  // explicar. Aqui o app confere antes e diz o que está acontecendo.
  async function jaPaguei() {
    setVerificando(true); setAvisoPagamento('')
    try {
      const res = await fetch(`/api/tem-contrato?cpf_inspetor=${cpf}`)
      const d = await res.json()
      if (d.temContrato) { continuar(); return }
      setAvisoPagamento('Ainda não recebemos a confirmação do pagamento. Isso pode levar alguns segundos depois de pagar: aguarde um pouco e toque de novo.')
    } catch { setAvisoPagamento('Não foi possível verificar agora. Tente de novo em instantes.') }
    setVerificando(false)
  }

  function continuar() {
    window.location.href = `${proximo}${proximo.includes('?') ? '&' : '?'}cpf_inspetor=${cpf}&chave_inspetor=${encodeURIComponent(chave)}`
  }

  const S = {
    body: { backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" },
    page: { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", width: "100%", maxWidth: "900px", overflow: "hidden" },
    header: { backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" },
    divider: { height: "2px", backgroundColor: "#1E3A8A" },
    body2: { padding: "24px" },
  }

  if (cortesiaConcedida) {
    return (
      <div style={S.body}>
        <div style={{ ...S.page, maxWidth: '480px' }}>
          <div style={S.header}>
            <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <div style={S.divider} />
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>Plano Cortesia concedido!</p>
            <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "20px" }}>Você já tem 600 CR disponíveis para começar.</p>
            <button onClick={continuar}
              style={{ backgroundColor: "#1E3A8A", color: "white", fontWeight: 600, padding: "10px 28px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "13px" }}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.body}>
      <div style={S.page}>
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
            Escolha seu plano para começar
          </span>
        </div>
        <div style={S.divider} />
        <div style={S.body2}>
          <p style={{ fontSize: "12px", color: "#374151", textAlign: "center", marginBottom: "20px" }}>
            Para usar o AIMÊ, escolha um dos planos abaixo — mesmo o Cortesia (gratuito) exige essa etapa.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            {PLANOS.map(p => (
              <button key={p.tipo} onClick={() => { setSelecionado(p.tipo); setErro(''); setPagamento(null); setEhAssinatura(false) }}
                style={{
                  textAlign: "left", cursor: "pointer", padding: "14px", borderRadius: "10px",
                  border: `2px solid ${selecionado === p.tipo ? p.cor : '#E5E7EB'}`,
                  backgroundColor: selecionado === p.tipo ? `${p.cor}10` : 'white',
                }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: p.cor }}>{p.nome}</div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827", margin: "4px 0" }}>{p.preco}</div>
                <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "6px" }}>{p.creditos.toLocaleString('pt-BR')} CR</div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>{p.descricao}</div>
              </button>
            ))}
          </div>

          {erro && <div style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "12px", backgroundColor: "#FEE2E2", color: "#DC2626", marginBottom: "12px" }}>{erro}</div>}

          {selecionado === 'PLANO CORTESIA' && (
            <div style={{ textAlign: "center" }}>
              <button onClick={escolherCortesia} disabled={enviando}
                style={{ backgroundColor: "#1E3A8A", color: "white", fontWeight: 600, padding: "10px 28px", borderRadius: "50px", border: "none", cursor: enviando ? "not-allowed" : "pointer", fontSize: "13px", opacity: enviando ? 0.6 : 1 }}>
                {enviando ? "Aguarde..." : "Confirmar Plano Cortesia"}
              </button>
            </div>
          )}

          {selecionado && selecionado !== 'PLANO CORTESIA' && !pagamento && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ width: "160px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "4px" }}>Forma de pagamento</label>
                <select value={forma} onChange={e => setForma(e.target.value as 'PIX' | 'CREDIT_CARD')}
                  style={{ border: "1px solid #D1D5DB", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", width: "100%" }}>
                  <option value="PIX">PIX</option>
                  <option value="CREDIT_CARD">Cartão de crédito</option>
                </select>
              </div>
              <button onClick={() => contratarPago(selecionado)} disabled={enviando}
                style={{ backgroundColor: "#1E3A8A", color: "white", fontWeight: 600, padding: "9px 24px", borderRadius: "50px", border: "none", cursor: enviando ? "not-allowed" : "pointer", fontSize: "12px", opacity: enviando ? 0.6 : 1 }}>
                {enviando ? "Aguarde..." : (assinavel ? "Pagar só este mês" : "Contratar")}
              </button>
              {assinavel && (
                <button onClick={() => assinar(selecionado!)} disabled={enviando}
                  style={{ backgroundColor: "#059669", color: "white", fontWeight: 600, padding: "9px 24px", borderRadius: "50px", border: "none", cursor: enviando ? "not-allowed" : "pointer", fontSize: "12px", opacity: enviando ? 0.6 : 1 }}>
                  {enviando ? "Aguarde..." : "Assinar — renova todo mês"}
                </button>
              )}
            </div>
          )}
          {assinavel && !pagamento && (
            <p style={{ fontSize: "11px", color: "#6B7280", textAlign: "center", margin: "10px auto 0", maxWidth: "520px", lineHeight: 1.5 }}>
              <b>Assinar</b>: cobrança automática todo mês no cartão de crédito; você cancela quando quiser, e os créditos do período pago continuam valendo.{" "}
              <b>Pagar só este mês</b>: PIX ou cartão, sem renovação automática.
            </p>
          )}

          {pagamento && (
            <div style={{ padding: "16px", borderRadius: "8px", border: "1.5px solid #1E3A8A", backgroundColor: "#F8FAFC", textAlign: "center" }}>
              {pagamento.pixQrCode ? (
                <>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E3A8A", marginBottom: "8px" }}>Escaneie o QR Code para pagar via PIX</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${pagamento.pixQrCode}`} alt="QR Code PIX" style={{ width: "200px", height: "200px", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: "10px", color: "#6B7280", marginBottom: "4px" }}>Ou copie o código:</div>
                  <textarea readOnly value={pagamento.pixCopiaECola} onClick={e => (e.target as HTMLTextAreaElement).select()}
                    style={{ width: "100%", fontSize: "10px", padding: "6px", borderRadius: "6px", border: "1px solid #D1D5DB", resize: "none" as const }} rows={3} />
                </>
              ) : (
                <div style={{ fontSize: "12px", color: "#374151" }}>Cobrança gerada — conclua o pagamento pelo link abaixo.</div>
              )}
              <a href={pagamento.invoiceUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: "10px", backgroundColor: "#059669", color: "white", textDecoration: "none", borderRadius: "9999px", padding: "8px 20px", fontSize: "12px", fontWeight: 700 }}>
                Abrir página de pagamento
              </a>
              {ehAssinatura && (
                <p style={{ fontSize: "11px", color: "#047857", marginTop: "10px", fontWeight: 600 }}>
                  Digite os dados do cartão na página de pagamento. A assinatura renova todo mês no mesmo cartão e pode ser cancelada em Meu Plano e Créditos.
                </p>
              )}
              <p style={{ fontSize: "10px", color: "#6B7280", marginTop: "12px" }}>
                Assim que o pagamento for confirmado, os créditos aparecem automaticamente. Depois de pagar, toque em &quot;Já paguei&quot; para entrar no AIMÊ.
              </p>
              {avisoPagamento && (
                <div style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "11px", backgroundColor: "#FFFBEB", color: "#92400E", margin: "10px 0 0", lineHeight: 1.5 }}>{avisoPagamento}</div>
              )}
              <button onClick={jaPaguei} disabled={verificando}
                style={{ display: "block", margin: "12px auto 0", backgroundColor: "#1E3A8A", color: "white", fontWeight: 600, padding: "8px 24px", borderRadius: "50px", border: "none", cursor: verificando ? "not-allowed" : "pointer", fontSize: "12px", opacity: verificando ? 0.6 : 1 }}>
                {verificando ? "Verificando..." : "Já paguei — continuar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
