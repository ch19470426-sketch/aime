"use client"
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import LinkSair from "@/components/LinkSair"
import Banner from "@/components/Banner"
import { useBanner } from "@/hooks/useBanner"
import { createClient } from "@/utils/supabase/client"
import { precoPlanoCentavos, formatarReais } from "@/lib/precos"

export default function EscolherPlanoPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh" }} />}>
      <EscolherPlano />
    </Suspense>
  )
}

type Pagamento = { invoiceUrl: string; forma?: string; pixQrCode?: string; pixCopiaECola?: string } | null

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
  // O CPF vem da URL, mas a SESSÃO é a fonte confiável (é a que o dashboard usa): se a URL não
  // trouxer o CPF, a tela antes ficava presa em "Aguardando..." sem conferir nada.
  const cpfUrl = params.get('cpf') ?? ''
  const [cpfSessao, setCpfSessao] = useState('')
  const cpf = cpfSessao || cpfUrl
  const chave = params.get('chave') ?? ''
  const proximo = params.get('proximo') ?? '/dashboard'

  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [forma, setForma] = useState<'PIX' | 'CREDIT_CARD'>('PIX')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [pagamento, setPagamento] = useState<Pagamento>(null)
  const [cortesiaConcedida, setCortesiaConcedida] = useState(false)
  const [ehAssinatura, setEhAssinatura] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [esperouMuito, setEsperouMuito] = useState(false)
  // Mensagens no banner do Miê (como no resto do aplicativo), em vez de texto solto na tela.
  const { bannerProps, informa, agradece, solicita, fechar } = useBanner()
  useEffect(() => { if (erro) informa('Não foi possível concluir', erro) }, [erro]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (confirmado) agradece('Pedido efetuado e créditos concedidos', 'Pagamento confirmado e créditos liberados. Levando você ao menu...', continuar)
  }, [confirmado]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (esperouMuito && !confirmado) solicita(
      'Ainda aguardando o pagamento',
      'Se você já pagou, a confirmação pode levar alguns instantes: seus créditos serão liberados automaticamente. Você pode seguir para o menu e continuar usando o AIMÊ enquanto isso.',
      [
        { label: 'Seguir para o menu', acao: continuar, estilo: 'primario' },
        { label: 'Continuar aguardando', acao: fechar, estilo: 'secundario' },
      ],
    )
  }, [esperouMuito]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email
      if (email) setCpfSessao(email.split('@')[0])
    }).catch(() => { /* segue com o CPF da URL */ })
  }, [])

  // Com a cobrança na tela, espera a confirmação sozinho: confere rápido a cada 4 s e, a cada
  // 20 s, pede ao servidor que pergunte ao Asaas. Para sozinho depois de ~10 minutos.
  // Reconhecido: mostra a confirmação e leva ao menu sozinho. Demorou (~30 s): avisa que os créditos
  // serão liberados automaticamente e deixa seguir para o menu (o portão do dashboard aceita quem
  // está com pagamento em andamento).
  useEffect(() => {
    if (!pagamento) return
    setConfirmado(false); setEsperouMuito(false)
    let ativo = true
    let ciclos = 0
    // A SAÍDA para o menu NÃO depende de a conferência funcionar: temporizador próprio de 30 s.
    const aviso = setTimeout(() => { if (ativo) setEsperouMuito(true) }, 30000)
    const id = setInterval(async () => {
      if (!ativo) return
      ciclos++
      try {
        // Sem CPF conhecido, só a conferência do servidor (que usa a sessão) pode confirmar.
        const pronto = (!cpf || ciclos % 5 === 0) ? await conferirNoServidor() : await temContratoRapido()
        if (pronto && ativo) {
          ativo = false; clearInterval(id)
          setConfirmado(true)
          setTimeout(continuar, 2000)
          return
        }
      } catch { /* tenta de novo no próximo ciclo */ }
      if (ciclos >= 150 && ativo) { ativo = false; clearInterval(id) }
    }, 4000)
    return () => { ativo = false; clearInterval(id); clearTimeout(aviso) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamento, cpf])
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
        setErro('Pedido efetuado, mas a cobrança falhou. Tente novamente em instantes.')
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
  // explicar. Aqui a tela espera a confirmação sozinha e diz o que está acontecendo.
  //
  // Duas formas de conferir: a rápida (só olha se já há contrato) e a do servidor, que pergunta
  // DIRETO ao Asaas se o pedido foi pago e libera os créditos — assim não depende de o aviso do
  // Asaas (webhook) ter chegado (06/10/2026: um PIX confirmado no Asaas deixou a tela esperando).
  async function temContratoRapido(): Promise<boolean> {
    const res = await fetch(`/api/tem-contrato?cpf_inspetor=${cpf}&_=${Date.now()}`, { cache: 'no-store' })
    const d = await res.json()
    return d.temContrato === true
  }
  async function conferirNoServidor(): Promise<boolean> {
    const res = await fetch('/api/creditos/conferir-pagamento', {
      method: 'POST', cache: 'no-store',
      headers: { Authorization: `Bearer ${await tokenSessao()}` },
    })
    const d = await res.json()
    return d.temContrato === true
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
      <Banner {...bannerProps} />
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
      <Banner {...bannerProps} />
      <div style={S.page}>
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
            Escolha seu plano para começar
          </span>
          <LinkSair />
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
              {pagamento.forma && (
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "8px" }}>
                  {pagamento.forma === 'PIX' ? 'Pagamento por PIX' : 'Pagamento por cartão de crédito'}
                </div>
              )}
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
              {/* No PIX o QR Code e o "copia e cola" bastam; a página do Asaas só é necessária no cartão
                  (onde o cartão é digitado) ou se o QR não veio. */}
              {!pagamento.pixQrCode && (
                <a href={pagamento.invoiceUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: "10px", backgroundColor: "#059669", color: "white", textDecoration: "none", borderRadius: "9999px", padding: "8px 20px", fontSize: "12px", fontWeight: 700 }}>
                  Abrir página de pagamento
                </a>
              )}
              {!ehAssinatura && (
                <button onClick={() => { setPagamento(null); setErro('') }}
                  style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "#1E3A8A", textDecoration: "underline", fontSize: "11px", cursor: "pointer" }}>
                  Trocar forma de pagamento
                </button>
              )}
              {ehAssinatura && (
                <p style={{ fontSize: "11px", color: "#047857", marginTop: "10px", fontWeight: 600 }}>
                  Digite os dados do cartão na página de pagamento. A assinatura renova todo mês no mesmo cartão e pode ser cancelada em Meu Plano e Créditos.
                </p>
              )}
              {!confirmado && (
                <>
                  <p style={{ fontSize: "11px", color: "#6B7280", marginTop: "12px" }}>
                    Aguardando a confirmação do pagamento... Esta tela avança sozinha assim que ele for confirmado.
                  </p>
                  {esperouMuito && (
                    <button onClick={continuar}
                      style={{ display: "block", margin: "10px auto 0", backgroundColor: "#1E3A8A", color: "white", fontWeight: 600, padding: "8px 24px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "12px" }}>
                      Seguir para o menu
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
