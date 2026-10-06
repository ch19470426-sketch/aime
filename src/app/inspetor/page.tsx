"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import BlocoAssinatura, { type AssinaturaStatus } from '@/components/BlocoAssinatura'
import { rodadaDeEspera } from '@/lib/esperaPagamento'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

/**
 * 'AAAA-MM-DD' -> 'DD/MM/AAAA', sem passar por new Date()/toLocaleDateString.
 * new Date('2026-10-01').toLocaleDateString('pt-BR') mostra "30/09/2026" no
 * fuso de Brasília (a string é interpretada como meia-noite UTC, e a
 * conversão para local -3h volta para o dia anterior). Achado real de
 * Celso, 01/10/2026 — mesmo tipo de bug já corrigido na exportação da
 * higienização.
 */
function fmtDataBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

export default function CadastroInspetorPage() {
  return (
    <Suspense fallback={<div style={{backgroundColor:"#E8EEF7",minHeight:"100vh"}} />}>
      <CadastroInspetor />
    </Suspense>
  )
}

function CadastroInspetor() {
  const params = useSearchParams()
  const cpfUrl = params.get('cpf') ?? ''
  const ehNovo = params.get('novo') === '1'
  const ehGestor = params.get('gestor') === '1'
  const ehVisualizar = params.get('visualizar') === '1'  // MG: gestor visualizando inspetor
  const ehConsulta = !!cpfUrl && !ehGestor && !ehVisualizar && !ehNovo  // item 62: inspetor vendo próprio cadastro

  const [form, setForm] = useState({
    cpf: "",
    nome: "",
    titulo: "",
    especializacao: "",
    inscricao_crea_cau: "",
    whatsapp: "",
    email: "",
    cep: "",
    logradouro: "",
    nr_imovel: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cabecalho: "",
    rodape: "",
  })
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [abaInspetor, setAbaInspetor] = useState<'dados'|'plano'>(params.get('aba') === 'plano' ? 'plano' : 'dados')
  const [contratos, setContratos] = useState<any[]>([])
  const [carregandoPlano, setCarregandoPlano] = useState(false)
  const [msgPlano, setMsgPlano] = useState('')
  const [solicitandoTroca, setSolicitandoTroca] = useState(false)
  const [planoDesejado, setPlanoDesejado] = useState('PLANO MENSAL')
  // Contratação de créditos / isenção de gestor
  const [statusCred, setStatusCred] = useState<{isento:boolean; cobrancaAtiva:boolean; avulsoLiberado?:boolean; assinatura?: AssinaturaStatus | null} | null>(null)
  const [pedidos, setPedidos] = useState<any[]>([])
  const [tipoPedido, setTipoPedido] = useState('PLANO MENSAL')
  const [qdeAvulso, setQdeAvulso] = useState(600)
  const [enviandoPedido, setEnviandoPedido] = useState(false)
  const [msgPedido, setMsgPedido] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<'PIX' | 'CREDIT_CARD'>('PIX')
  const [pagamentoInfo, setPagamentoInfo] = useState<{ invoiceUrl: string; forma?: string; pixQrCode?: string; pixCopiaECola?: string } | null>(null)

  const formatarCPF = (valor: string) => {
    return valor
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }

  useEffect(() => {
    const timeoutSeg = setTimeout(() => setCarregando(false), 8000)
    async function carregarInicial() {
      try {
        if (cpfUrl) setForm(prev => ({ ...prev, cpf: formatarCPF(cpfUrl) }))
        if (cpfUrl && !ehNovo) {
          try {
            const res = await fetch(`${SUPA_URL}/rest/v1/inspetor?cpf_inspetor=eq.${cpfUrl}&select=*`, {
              headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
            })
            const dados = await res.json()
            if (Array.isArray(dados) && dados.length > 0) {
              const d = dados[0]
              setForm(prev => ({
                ...prev,
                cpf: formatarCPF(cpfUrl),
                nome: d.nome_inspetor ?? "",
                titulo: d.titulo_profissional ?? "",
                especializacao: d.especializacao ?? "",
                inscricao_crea_cau: d.inscricao_crea_cau ?? "",
                whatsapp: d.inspetor_whatsapp ?? "",
                email: d.inspetor_email ?? "",
                cep: d.cep_inspetor ?? "",
                nr_imovel: d.nr_imovel ?? "",
                complemento: d.nr_ap_sala ?? "",
                cabecalho: d.cabecalho_documentos ?? "",
                rodape: d.rodape_documentos ?? "",
              }))
              // Buscar endereço pelo CEP após carregar dados
              const cepLimpo = (d.cep_inspetor ?? '').replace(/\D/g, '')
              if (cepLimpo.length === 8) buscarCep(cepLimpo)
            }
          } catch { /* segue com o formulário vazio se não conseguir carregar */ }
        }
      } finally {
        clearTimeout(timeoutSeg)
        setCarregando(false)
      }
    }
    carregarInicial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpfUrl])

  useEffect(() => {
    if (ehConsulta && abaInspetor === 'plano') carregarContratos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehConsulta])

  const formatarWhatsApp = (valor: string) => {
    return valor
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d{1,4})$/, "$1-$2")
  }

  const formatarCEP = (valor: string) => {
    return valor
      .replace(/\D/g, "")
      .slice(0, 8)
      .replace(/(\d{5})(\d{1,3})$/, "$1-$2")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "cpf") {
      setForm({ ...form, cpf: formatarCPF(value) })
    } else if (name === "whatsapp") {
      setForm({ ...form, whatsapp: formatarWhatsApp(value) })
    } else if (name === "cep") {
      const cepFormatado = formatarCEP(value)
      setForm({ ...form, cep: cepFormatado })
      if (cepFormatado.replace(/\D/g, "").length === 8) {
        buscarCep(cepFormatado.replace(/\D/g, ""))
      }
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  const buscarCep = async (cep: string) => {
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          uf: data.uf || "",
        }))
      }
    } catch (e) {}
    setBuscandoCep(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    if (form.whatsapp.replace(/\D/g,'').length < 10) {
      setErro('WhatsApp incompleto — informe DDD + número (10 ou 11 dígitos).')
      return
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErro('E-mail inválido — confira o formato digitado.')
      return
    }
    setSalvando(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const res = await fetch('/api/salvar-inspetor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          cpf: form.cpf.replace(/\D/g, ""),
          nome: form.nome,
          titulo: form.titulo,
          especializacao: form.especializacao,
          inscricao_crea_cau: form.inscricao_crea_cau,
          whatsapp: form.whatsapp,
          email: form.email,
          cep: form.cep,
          nr_imovel: form.nr_imovel,
          complemento: form.complemento,
          cabecalho: form.cabecalho,
          rodape: form.rodape,
        })
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (!res.ok || data.erro) {
        setErro(data.erro ?? 'Não foi possível salvar o cadastro.')
        setSalvando(false)
        return
      }
      const chaveGerada = data.chave ?? ''
      setSucesso(true)
      setTimeout(() => {
        const cpfLimpo = form.cpf.replace(/\D/g, '')
        if (ehNovo) {
          window.location.href = `/termo-aceite?cpf=${cpfLimpo}&chave=${encodeURIComponent(chaveGerada)}&proximo=/dashboard`
        } else if (ehVisualizar) {
          window.location.href = "/gestor"
        } else {
          window.location.href = "/dashboard"
        }
      }, 800)
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'AbortError') {
        setErro('O servidor demorou demais para responder. Tente novamente.')
        setSalvando(false)
        return
      }
      setErro('Não foi possível conectar. Tente novamente.')
      setSalvando(false)
    }
  }

  async function carregarContratos() {
    setCarregandoPlano(true)
    void carregarCreditos()
    try {
      const cli = createClient()
      const { data: { session } } = await cli.auth.getSession()
      const cpf = session?.user?.email?.split('@')[0] ?? ''
      const res = await fetch(
        `${SUPA_URL}/rest/v1/contratos_inspetor?cpf_inspetor=eq.${cpf}&order=data_inicio_contrato.desc`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session?.access_token}` } }
      )
      const data = await res.json()
      setContratos(Array.isArray(data) ? data : [])
    } catch { setContratos([]) }
    finally { setCarregandoPlano(false) }
  }

  // Situação de créditos e pedidos do usuário logado. O CPF é validado no
  // servidor pelo token da sessão (não vai no corpo da requisição).
  async function carregarCreditos() {
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const token = session?.access_token
      if (!token) return
      const h = { Authorization: `Bearer ${token}` }
      const [rs, rp] = await Promise.all([
        fetch('/api/creditos/status', { headers: h }),
        fetch('/api/creditos/pedido', { headers: h }),
      ])
      if (rs.ok) setStatusCred(await rs.json())
      if (rp.ok) { const lista = (await rp.json()).pedidos ?? []; setPedidos(lista); return lista as any[] }
    } catch { /* sem status: a aba continua funcionando como antes */ }
  }

  async function criarPedido() {
    setEnviandoPedido(true); setMsgPedido(''); setPagamentoInfo(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/creditos/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ tipo: tipoPedido, qdeAvulso: tipoPedido === 'AVULSO' ? qdeAvulso : undefined, forma: formaPagamento }),
      })
      const d = await res.json()
      if (res.ok) {
        const base = d.reaproveitado
          ? `Você já tem o pedido #${d.pedido.id} aguardando pagamento.`
          : `Pedido #${d.pedido.id} registrado.`
        if (d.pagamento && typeof d.pagamento === 'object') {
          setMsgPedido(base)
          setPagamentoInfo(d.pagamento)
        } else if (d.pagamento === 'erro') {
          setMsgPedido(`${base} O pedido ficou registrado, mas não foi possível gerar a cobrança agora (${d.avisoAsaas ?? 'erro desconhecido'}). Tente novamente em instantes.`)
        } else {
          setMsgPedido(`${base} O pagamento online ainda não está habilitado neste ambiente.`)
        }
        await carregarCreditos()
      } else {
        setMsgPedido(`Erro: ${d.erro ?? 'Não foi possível registrar o pedido.'}`)
      }
    } catch { setMsgPedido('Erro de conexão.') }
    finally { setEnviandoPedido(false) }
  }

  // Assinatura mensal (Mensal/Escritório): renovação automática no cartão, pelo Asaas.
  async function assinarPlano(tipo: string) {
    const atual = statusCred?.assinatura
    if (atual && atual.tipo !== tipo && atual.status !== 'aguardando_primeiro_pagamento'
        && !window.confirm(`Isto cancela a sua assinatura atual (${atual.tipo}) e começa a do ${tipo}. Os créditos que sobrarem do plano atual ficam com você, como créditos avulsos. Continuar?`)) return
    setEnviandoPedido(true); setMsgPedido(''); setPagamentoInfo(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/creditos/assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ tipo }),
      })
      const d = await res.json()
      if (res.ok && d.pagamento && typeof d.pagamento === 'object') {
        setMsgPedido(d.reaproveitada
          ? 'Sua assinatura está aguardando o primeiro pagamento. Conclua pelo link abaixo.'
          : 'Assinatura criada. Digite os dados do cartão na página de pagamento; a renovação passa a ser automática todo mês.')
        setPagamentoInfo(d.pagamento)
      } else if (res.ok) {
        setMsgPedido('Erro: a assinatura foi registrada, mas o link de pagamento não foi gerado agora. Tente de novo em instantes.')
      } else {
        setMsgPedido(`Erro: ${d.erro ?? 'Não foi possível iniciar a assinatura.'}`)
      }
      await carregarCreditos()
    } catch { setMsgPedido('Erro de conexão.') }
    finally { setEnviandoPedido(false) }
  }

  async function cancelarAssinatura() {
    if (!window.confirm('Cancelar a assinatura? Não haverá novas cobranças, e os créditos do período que você já pagou continuam valendo até o fim dele.')) return
    setEnviandoPedido(true); setMsgPedido(''); setPagamentoInfo(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/creditos/assinatura', { method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      const d = await res.json()
      setMsgPedido(res.ok ? 'Assinatura cancelada. Não haverá novas cobranças.' : `Erro: ${d.erro ?? 'Não foi possível cancelar agora.'}`)
      await carregarCreditos()
    } catch { setMsgPedido('Erro de conexão.') }
    finally { setEnviandoPedido(false) }
  }

  // Pedido pendente: o AIMÊ confere com o Asaas sozinho (agora e a cada 20 s, por ~10 minutos), sem
  // depender do aviso do Asaas nem de o usuário tocar em nada. A cada rodada o servidor pergunta
  // DIRETO ao Asaas E a lista de pedidos é recarregada: se o aviso do Asaas (webhook) chegou antes,
  // a lista já mostra o pedido pago e a tela se atualiza do mesmo jeito (06/10/2026: antes só
  // atualizava quando a conferência liberava, e ficava presa em "Aguardando" com o pedido já pago).
  const temPedidoPendente = pedidos.some((pd: any) => pd.status === 'aguardando_pagamento')
  useEffect(() => {
    if (!temPedidoPendente) return
    const pendentesIds = pedidos.filter((pd: any) => pd.status === 'aguardando_pagamento').map((pd: any) => pd.id)
    let ativo = true
    let ciclos = 0
    async function rodada() {
      try {
        const r = await rodadaDeEspera(
          pendentesIds,
          async () => {
            const { data: { session } } = await createClient().auth.getSession()
            if (!session?.access_token) return
            await fetch('/api/creditos/conferir-pagamento', {
              method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
            })
          },
          async () => ((await carregarCreditos()) ?? []) as any[],
        )
        if (!ativo) return
        if (r.confirmado) {
          ativo = false
          setPagamentoInfo(null)
          setMsgPedido('Pagamento confirmado! Os créditos já estão na sua conta.')
          // Os cartões de plano e de avulso vêm da lista de CONTRATOS (outra carga): sem recarregá-la
          // a confirmação aparecia e os créditos não (06/10/2026).
          await carregarContratos()
        } else if (!r.restaPendente) {
          ativo = false   // o pedido deixou de estar pendente por outro motivo (cancelado/removido)
        }
      } catch { /* tenta de novo no próximo ciclo */ }
    }
    rodada()
    const id = setInterval(() => {
      if (!ativo) return
      ciclos++
      if (ciclos > 30) { ativo = false; clearInterval(id); return }
      rodada()
    }, 20000)
    return () => { ativo = false; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temPedidoPendente])

  async function trocarPlano() {
    setSolicitandoTroca(true); setMsgPlano('')
    try {
      const res = await fetch('/api/trocar-plano', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: form.cpf, planoDesejado })
      })
      const d = await res.json()
      if (res.ok) {
        setMsgPlano(`Plano alterado para ${planoDesejado} com sucesso!`)
        await carregarContratos()
      } else {
        setMsgPlano(`Erro: ${d.erro ?? 'Não foi possível trocar o plano.'}`)
      }
    } catch { setMsgPlano('Erro de conexão.') }
    finally { setSolicitandoTroca(false) }
  }

    const labelStyle = { fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "3px", display: "block" }
  const inputStyle = { border: "1px solid #D1D5DB", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const blocoStyle = { backgroundColor: "white", borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E8F0", marginBottom: "8px" }
  const blocoHeaderStyle = { backgroundColor: "#1E3A8A", padding: "4px 12px" }
  const blocoTituloStyle = { color: "white", fontWeight: "bold", fontSize: "12px" }
  const blocoBodyStyle = { padding: "8px 12px" }
  const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }
  const grid3 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }

  if (carregando) {
    return (
      <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <p style={{color:"#4a6480",fontSize:"14px"}}>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"900px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"16px",flex:1,textAlign:"center"}}>
            {ehGestor ? 'Cadastro do Gestor' : params.get('visualizar') === '1' ? 'Cadastro Inspetor' : ehNovo ? 'Cadastro Inicial' : ehConsulta ? 'Meu Cadastro' : 'Cadastro do Inspetor'}
          </span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />

        {ehConsulta && (
          <div style={{ display:'flex', borderBottom:'2px solid #1E3A8A', backgroundColor:'white' }}>
            {(['dados','plano'] as const).map(ab => (
              <button key={ab}
                onClick={() => { setAbaInspetor(ab); if(ab==='plano') carregarContratos() }}
                style={{ padding:'8px 20px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700,
                  borderBottom: abaInspetor===ab ? '3px solid #1E3A8A' : '3px solid transparent',
                  color: abaInspetor===ab ? '#1E3A8A' : '#6B7280', backgroundColor:'transparent' }}>
                {ab === 'dados' ? '📋 Meus Dados' : '💳 Meu Plano'}
              </button>
            ))}
          </div>
        )}

        <div style={{padding:"10px"}}>
          {sucesso ? (
            <div style={{textAlign:"center",padding:"32px",color:"#1E3A8A",fontSize:"16px",fontWeight:"bold"}}>
              Cadastro realizado com sucesso!
            </div>
          ) : (
            <>
            {(abaInspetor === 'dados' || ehGestor) && <form onSubmit={handleSubmit}>
              

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}>
                  <span style={blocoTituloStyle}>Identificacao</span>
                </div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={grid3}>
                    <div>
                      <label style={labelStyle}>CPF *</label>
                      <input name="cpf" value={form.cpf} placeholder="000.000.000-00" required readOnly
                        style={{...inputStyle, backgroundColor: "#F3F4F6", color: "#6B7280"}} />
                    </div>
                    <div style={{gridColumn:"span 2"}}>
                      <label style={labelStyle}>Nome Completo *</label>
                      <input name="nome" value={form.nome} onChange={ehVisualizar ? undefined : handleChange} placeholder="Nome completo" required readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                  </div>
                  <div style={{...grid3, marginTop:"6px"}}>
                    <div>
                      <label style={labelStyle}>Titulo Profissional *</label>
                      <select name="titulo" value={form.titulo} onChange={ehConsulta ? undefined : handleChange} required disabled={ehConsulta} style={{...inputStyle,...(ehConsulta?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}}>
                        <option value="">Selecione...</option>
                        <option value="Arquiteto">Arquiteto</option>
                        <option value="Eng Civil">Eng Civil</option>
                        <option value="Eng Elétrico">Eng Elétrico</option>
                        <option value="Eng Mecânico">Eng Mecânico</option>
                        <option value="Técnico Edificação">Técnico Edificação</option>
                        <option value="Corretor Imóvel">Corretor Imóvel</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Inscricao CREA/CAU *</label>
                      <input name="inscricao_crea_cau" value={form.inscricao_crea_cau} onChange={ehVisualizar ? undefined : handleChange} placeholder="RS00000/D" required readOnly={ehVisualizar || ehConsulta} style={{...inputStyle,...((ehVisualizar || ehConsulta)?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Especializacao</label>
                      <input name="especializacao" value={form.especializacao} onChange={ehVisualizar ? undefined : handleChange} readOnly={ehVisualizar || ehConsulta} style={{...inputStyle,...((ehVisualizar || ehConsulta)?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}>
                  <span style={blocoTituloStyle}>Endereco e Contato</span>
                </div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={grid3}>
                    <div>
                      <label style={labelStyle}>CEP *</label>
                      <input name="cep" value={form.cep} onChange={ehVisualizar ? undefined : handleChange} placeholder="00000-000" readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                      {buscandoCep && <span style={{fontSize:"11px",color:"#6B7280"}}>Buscando...</span>}
                    </div>
                    <div style={{gridColumn:"span 2"}}>
                      <label style={labelStyle}>Logradouro *</label>
                      <input name="logradouro" value={form.logradouro} onChange={ehVisualizar ? undefined : handleChange} readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} required />
                    </div>
                  </div>
                  <div style={{...grid3, marginTop:"6px"}}>
                    <div>
                      <label style={labelStyle}>Numero *</label>
                      <input name="nr_imovel" value={form.nr_imovel} onChange={ehVisualizar ? undefined : handleChange} placeholder="123" readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Complemento</label>
                      <input name="complemento" value={form.complemento} onChange={ehVisualizar ? undefined : handleChange} readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Bairro *</label>
                      <input name="bairro" value={form.bairro} onChange={ehVisualizar ? undefined : handleChange} placeholder="Bairro" readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                  </div>
                  <div style={{...grid3, marginTop:"6px"}}>
                    <div style={{gridColumn:"span 2"}}>
                      <label style={labelStyle}>Cidade *</label>
                      <input name="cidade" value={form.cidade} onChange={ehVisualizar ? undefined : handleChange} placeholder="Cidade" readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                    <div>
                      <label style={labelStyle}>UF *</label>
                      <input name="uf" value={form.uf} onChange={ehVisualizar ? undefined : handleChange} readOnly={ehVisualizar} maxLength={2} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} required />
                    </div>
                  </div>
                  <div style={{...grid2, marginTop:"6px"}}>
                    <div>
                      <label style={labelStyle}>WhatsApp *</label>
                      <input name="whatsapp" value={form.whatsapp} onChange={ehVisualizar ? undefined : handleChange} readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} required />
                    </div>
                    <div>
                      <label style={labelStyle}>E-mail *</label>
                      <input name="email" type="email" value={form.email} onChange={ehVisualizar ? undefined : handleChange} placeholder="seu@email.com" readOnly={ehVisualizar} style={{...inputStyle,...(ehVisualizar?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}>
                  <span style={blocoTituloStyle}>Parametros para Documentos</span>
                </div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={{marginBottom:"12px"}}>
                    <label style={labelStyle}>Cabecalho dos Documentos</label>
                    <input name="cabecalho" value={form.cabecalho} onChange={ehVisualizar ? undefined : handleChange} readOnly={ehVisualizar} placeholder="Ex: Eng. Civil Joao Silva - CREA RS00000/D" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Rodape dos Documentos</label>
                    <input name="rodape" value={form.rodape} onChange={ehVisualizar ? undefined : handleChange} readOnly={ehVisualizar} placeholder="Ex: Rua das Flores, 123 - Porto Alegre/RS - (51) 99999-9999" style={inputStyle} />
                  </div>
                </div>
              </div>

              {erro && <p style={{color:"#DC2626",fontSize:"13px",textAlign:"center",marginBottom:"12px"}}>{erro}</p>}


              <div style={{display:"flex",gap:"12px",justifyContent:"flex-end"}}>
                <button type="button" onClick={() => window.location.href = ehVisualizar ? "/gestor" : "/dashboard"}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"1px solid #1E3A8A",backgroundColor:"white",color:"#1E3A8A",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>
                  Voltar
                </button>
                <button type="submit" disabled={salvando}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"none",backgroundColor:"#1E3A8A",color:"white",fontWeight:"600",fontSize:"13px",cursor:"pointer",opacity:salvando?0.7:1}}>
                  {salvando ? "Salvando..." : "Salvar Cadastro"}
                </button>
              </div>

            </form>}
            {abaInspetor === 'plano' && ehConsulta && (
              <div style={{paddingTop:'8px'}}>
                {carregandoPlano ? (
                  <div style={{textAlign:'center',padding:'32px',color:'#6B7280',fontSize:'13px'}}>Carregando...</div>
                ) : (
                  <>
                  {statusCred?.isento && (
                    <div style={{border:'1.5px solid #7C3AED',borderRadius:'8px',padding:'14px',backgroundColor:'#F5F3FF'}}>
                      <div style={{fontWeight:700,color:'#5B21B6',fontSize:'13px',marginBottom:'4px'}}>Perfil de gestor</div>
                      <p style={{fontSize:'12px',color:'#4C1D95',lineHeight:1.5,margin:0}}>Usuários gestores não precisam contratar plano nem créditos, e a execução de serviços não consome créditos do seu perfil.</p>
                    </div>
                  )}
                  {!statusCred?.isento && (
                  <>
                    <div style={{marginBottom:'12px'}}>
                      <div style={{...blocoHeaderStyle,borderRadius:'6px 6px 0 0'}}><span style={blocoTituloStyle}>Contratos e Saldo de Créditos</span></div>
                      <div style={{border:'1px solid #E2E8F0',borderTop:'none',borderRadius:'0 0 6px 6px',padding:'12px'}}>
                        {contratos.length === 0 ? (
                          <p style={{fontSize:'12px',color:'#9CA3AF'}}>Nenhum contrato encontrado.</p>
                        ) : contratos.flatMap((ct, i) => {
                          const vencido = new Date(ct.data_fim_contrato) < new Date()
                          const pct = ct.qde_contratada_plano > 0 ? Math.round((ct.saldo_quantidade_plano/ct.qde_contratada_plano)*100) : 0
                          const COR: Record<string,string> = {'PLANO CORTESIA':'#6B7280','PLANO SERVIÇO':'#0284C7','PLANO MENSAL':'#059669','PLANO ESCRITÓRIO':'#7C3AED'}
                          const cards = []
                          // Card do plano — so quando ha algo de plano contratado (o
                          // placeholder criado para uma compra de avulso sem plano
                          // vigente no momento usa qde_contratada_plano=0 e nao deve
                          // gerar um card de plano vazio)
                          if (ct.qde_contratada_plano > 0) {
                            cards.push(
                              <div key={`${i}-plano`} style={{border:`1.5px solid ${vencido?'#E5E7EB':'#1E3A8A'}`,borderRadius:'8px',padding:'12px',marginBottom:'8px',opacity:vencido?0.6:1}}>
                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                                  <span style={{padding:'2px 10px',borderRadius:'9999px',fontSize:'10px',fontWeight:700,backgroundColor:COR[ct.tipo_assinatura]??'#6B7280',color:'white'}}>{ct.tipo_assinatura}</span>
                                  <span style={{fontSize:'10px',fontWeight:700,color:vencido?'#DC2626':'#059669'}}>{vencido?'⚠ Plano vencido':`✓ Plano válido até ${fmtDataBR(ct.data_fim_contrato)}`}</span>
                                </div>
                                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:'12px'}}>
                                  <div><div style={{fontSize:'10px',color:'#6B7280'}}>CR Plano</div><div style={{fontWeight:700,color:'#1E3A8A',fontSize:'16px'}}>{ct.saldo_quantidade_plano}<span style={{fontSize:'10px',color:'#6B7280'}}>/{ct.qde_contratada_plano}</span></div><div style={{height:'4px',backgroundColor:'#E5E7EB',borderRadius:'2px',marginTop:'4px'}}><div style={{height:'4px',backgroundColor:'#1E3A8A',borderRadius:'2px',width:`${pct}%`}} /></div></div>
                                  <div><div style={{fontSize:'10px',color:'#6B7280'}}>Início</div><div style={{fontWeight:700,fontSize:'12px'}}>{fmtDataBR(ct.data_inicio_contrato)}</div></div>
                                </div>
                              </div>
                            )
                          }
                          // Card do avulso — proprio, igual aos demais, so quando
                          // houver avulso contratado nesta linha
                          if (ct.qde_contratada_avulso > 0) {
                            const hojeStrAvulso = new Date().toISOString().slice(0, 10)
                            const avulsoVencido = !!ct.data_fim_avulso && ct.data_fim_avulso < hojeStrAvulso
                            cards.push(
                              <div key={`${i}-avulso`} style={{border:`1.5px solid ${avulsoVencido?'#E5E7EB':'#7C3AED'}`,borderRadius:'8px',padding:'12px',marginBottom:'8px',opacity:avulsoVencido?0.6:1}}>
                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                                  <span style={{padding:'2px 10px',borderRadius:'9999px',fontSize:'10px',fontWeight:700,backgroundColor:'#7C3AED',color:'white'}}>CRÉDITOS AVULSOS</span>
                                  <span style={{fontSize:'10px',fontWeight:700,color:avulsoVencido?'#DC2626':'#059669'}}>{ct.data_fim_avulso ? (avulsoVencido ? '⚠ Avulso vencido' : `✓ Avulso válido até ${fmtDataBR(ct.data_fim_avulso)}`) : '✓ Sem vencimento'}</span>
                                </div>
                                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:'12px'}}>
                                  <div><div style={{fontSize:'10px',color:'#6B7280'}}>CR Avulso</div><div style={{fontWeight:700,color:'#7C3AED',fontSize:'16px'}}>{ct.saldo_quantidade_avulso}<span style={{fontSize:'10px',color:'#6B7280'}}>/{ct.qde_contratada_avulso}</span></div></div>
                                  <div><div style={{fontSize:'10px',color:'#6B7280'}}>Início</div><div style={{fontWeight:700,fontSize:'12px'}}>{fmtDataBR(ct.data_inicio_contrato)}</div></div>
                                </div>
                              </div>
                            )
                          }
                          return cards
                        })}
                      </div>
                    </div>
                    {!statusCred?.cobrancaAtiva && (
                    <div>
                      <div style={{...blocoHeaderStyle,borderRadius:'6px 6px 0 0'}}><span style={blocoTituloStyle}>Trocar Plano</span></div>
                      <div style={{border:'1px solid #E2E8F0',borderTop:'none',borderRadius:'0 0 6px 6px',padding:'12px'}}>
                        <p style={{fontSize:'11px',color:'#6B7280',marginBottom:'12px',lineHeight:1.5}}>Selecione o novo plano e confirme a troca. O novo contrato inicia hoje.</p>
                        <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
                          <div style={{flex:1}}>
                            <label style={labelStyle}>Plano desejado</label>
                            <select value={planoDesejado} onChange={e=>setPlanoDesejado(e.target.value)} style={inputStyle}>
                              {['PLANO CORTESIA','PLANO SERVIÇO','PLANO MENSAL','PLANO ESCRITÓRIO'].filter(pl => pl !== 'PLANO CORTESIA' || contratos.length === 0).map(pl=>(<option key={pl} value={pl}>{pl}</option>))}
                            </select>
                          </div>
                          <button onClick={trocarPlano} disabled={solicitandoTroca}
                            style={{backgroundColor:'#1E3A8A',color:'white',border:'none',borderRadius:'9999px',padding:'8px 20px',fontSize:'12px',fontWeight:700,cursor:'pointer',opacity:solicitandoTroca?0.7:1,whiteSpace:'nowrap' as const}}>
                            {solicitandoTroca?'Aguarde...':'Trocar Plano'}
                          </button>
                        </div>
                        {msgPlano&&(<div style={{marginTop:'10px',padding:'8px 12px',borderRadius:'6px',fontSize:'12px',backgroundColor:msgPlano.startsWith('Erro')?'#FEE2E2':'#D1FAE5',color:msgPlano.startsWith('Erro')?'#DC2626':'#059669'}}>{msgPlano}</div>)}
                      </div>
                    </div>
                    )}
                    <BlocoAssinatura assinatura={statusCred?.assinatura} ocupado={enviandoPedido}
                      onCancelar={cancelarAssinatura}
                      onRetomar={() => statusCred?.assinatura && assinarPlano(statusCred.assinatura.tipo)} />
                    <div style={{marginTop:'12px'}}>
                      <div style={{...blocoHeaderStyle,borderRadius:'6px 6px 0 0'}}><span style={blocoTituloStyle}>Contratar Créditos</span></div>
                      <div style={{border:'1px solid #E2E8F0',borderTop:'none',borderRadius:'0 0 6px 6px',padding:'12px'}}>
                        <p style={{fontSize:'11px',color:'#6B7280',marginBottom:'12px',lineHeight:1.5}}>Contrate um plano ou créditos avulsos a qualquer momento, inclusive quando seus créditos acabarem. O pedido fica registrado e é liberado após a confirmação do pagamento. O Plano Mensal e o Plano Escritório também podem ser <b>assinados</b>: a cobrança se renova sozinha todo mês no cartão, e você cancela quando quiser.</p>
                        <div style={{display:'flex',gap:'8px',alignItems:'flex-end',flexWrap:'wrap'}}>
                          <div style={{flex:1,minWidth:'180px'}}>
                            <label style={labelStyle}>O que deseja contratar</label>
                            <select value={tipoPedido} onChange={e=>setTipoPedido(e.target.value)} style={inputStyle}>
                              <option value="PLANO SERVIÇO">PLANO SERVIÇO (600 CR)</option>
                              <option value="PLANO MENSAL">PLANO MENSAL (1.200 CR)</option>
                              <option value="PLANO ESCRITÓRIO">PLANO ESCRITÓRIO (3.000 CR)</option>
                              {statusCred?.avulsoLiberado && <option value="AVULSO">CRÉDITOS AVULSOS (600 CR)</option>}
                            </select>
                          </div>
                          {tipoPedido === 'AVULSO' && (
                            <div style={{width:'140px'}}>
                              <label style={labelStyle}>Quantidade (CR)</label>
                              <select value={qdeAvulso} onChange={e=>setQdeAvulso(Number(e.target.value))} style={inputStyle}>
                                {[600,1200,1800,2400,3000,3600].map(q=>(<option key={q} value={q}>{q}</option>))}
                              </select>
                            </div>
                          )}
                          <div style={{width:'140px'}}>
                            <label style={labelStyle}>Forma de pagamento</label>
                            <select value={formaPagamento} onChange={e=>setFormaPagamento(e.target.value as 'PIX'|'CREDIT_CARD')} style={inputStyle}>
                              <option value="PIX">PIX</option>
                              <option value="CREDIT_CARD">Cartão de crédito</option>
                            </select>
                          </div>
                          <button type="button" onClick={() => window.location.href = "/dashboard"}
                            style={{padding:"8px 20px",borderRadius:"50px",border:"1px solid #1E3A8A",backgroundColor:"white",color:"#1E3A8A",fontWeight:"600",fontSize:"12px",cursor:"pointer"}}>
                            Voltar
                          </button>
                          <button onClick={criarPedido} disabled={enviandoPedido}
                            style={{backgroundColor:'#1E3A8A',color:'white',border:'none',borderRadius:'9999px',padding:'8px 20px',fontSize:'12px',fontWeight:700,cursor:enviandoPedido?'not-allowed':'pointer',opacity:enviandoPedido?0.6:1}}>
                            {enviandoPedido?'Aguarde...':((tipoPedido==='PLANO MENSAL'||tipoPedido==='PLANO ESCRITÓRIO')?'Pagar só este mês':'Contratar')}
                          </button>
                          {(tipoPedido==='PLANO MENSAL'||tipoPedido==='PLANO ESCRITÓRIO') && !(statusCred?.assinatura?.tipo===tipoPedido && statusCred.assinatura.status==='ativa') && (
                            <button onClick={() => assinarPlano(tipoPedido)} disabled={enviandoPedido}
                              style={{backgroundColor:'#059669',color:'white',border:'none',borderRadius:'9999px',padding:'8px 20px',fontSize:'12px',fontWeight:700,cursor:enviandoPedido?'not-allowed':'pointer',opacity:enviandoPedido?0.6:1}}>
                              {enviandoPedido?'Aguarde...':'Assinar — renova todo mês'}
                            </button>
                          )}
                        </div>
                        {msgPedido&&(<div style={{marginTop:'10px',padding:'8px 12px',borderRadius:'6px',fontSize:'12px',backgroundColor:msgPedido.startsWith('Erro')?'#FEE2E2':'#EFF6FF',color:msgPedido.startsWith('Erro')?'#DC2626':'#1E3A8A'}}>{msgPedido}</div>)}
                        {pagamentoInfo && (
                          <div style={{marginTop:'12px',padding:'14px',borderRadius:'8px',border:'1.5px solid #1E3A8A',backgroundColor:'#F8FAFC',textAlign:'center'}}>
                            {pagamentoInfo.forma && (
                              <div style={{fontSize:'10px',fontWeight:700,color:'#6B7280',textTransform:'uppercase' as const,letterSpacing:'0.04em',marginBottom:'8px'}}>
                                {pagamentoInfo.forma==='PIX'?'Pagamento por PIX':'Pagamento por cartão de crédito'}
                              </div>
                            )}
                            {pagamentoInfo.pixQrCode ? (
                              <>
                                <div style={{fontSize:'12px',fontWeight:700,color:'#1E3A8A',marginBottom:'8px'}}>Escaneie o QR Code para pagar via PIX</div>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`data:image/png;base64,${pagamentoInfo.pixQrCode}`} alt="QR Code PIX" style={{width:'200px',height:'200px',margin:'0 auto 8px'}} />
                                <div style={{fontSize:'10px',color:'#6B7280',marginBottom:'4px'}}>Ou copie o código:</div>
                                <textarea readOnly value={pagamentoInfo.pixCopiaECola} onClick={e=>(e.target as HTMLTextAreaElement).select()}
                                  style={{width:'100%',fontSize:'10px',padding:'6px',borderRadius:'6px',border:'1px solid #D1D5DB',resize:'none' as const}} rows={3} />
                              </>
                            ) : (
                              <div style={{fontSize:'12px',color:'#374151'}}>Cobrança gerada — conclua o pagamento pelo link abaixo.</div>
                            )}
                            {!pagamentoInfo.pixQrCode && (
                              <a href={pagamentoInfo.invoiceUrl} target="_blank" rel="noopener noreferrer"
                                style={{display:'inline-block',marginTop:'10px',backgroundColor:'#059669',color:'white',textDecoration:'none',borderRadius:'9999px',padding:'8px 20px',fontSize:'12px',fontWeight:700}}>
                                Abrir página de pagamento
                              </a>
                            )}
                            <button onClick={()=>{ setPagamentoInfo(null); setMsgPedido('') }}
                              style={{display:'block',margin:'10px auto 0',background:'none',border:'none',color:'#1E3A8A',textDecoration:'underline',fontSize:'11px',cursor:'pointer'}}>
                              Trocar forma de pagamento
                            </button>
                          </div>
                        )}
                        {pedidos.length > 0 && (
                          <div style={{marginTop:'12px'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                              <span style={{fontSize:'11px',fontWeight:700,color:'#374151'}}>Meus pedidos</span>
                              {temPedidoPendente && (
                                <span style={{fontSize:'10px',color:'#92400E'}}>Aguardando a confirmação do pagamento...</span>
                              )}
                            </div>
                            {pedidos.slice(0,5).map((pd:any)=>(
                              <div key={pd.id} style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#4B5563',padding:'4px 0',borderTop:'1px solid #F1F5F9'}}>
                                <span>#{pd.id} · {pd.tipo} · {pd.qde_creditos} CR</span>
                                <span style={{fontWeight:700,color:pd.status==='pago'?'#059669':pd.status==='cancelado'?'#9CA3AF':'#D97706'}}>{pd.status==='pago'?'Pago':pd.status==='cancelado'?'Cancelado':'Aguardando pagamento'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    </>
                    )}
                  </>
                )}
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
