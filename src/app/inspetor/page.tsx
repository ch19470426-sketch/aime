"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

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
  const ehConsulta = !!cpfUrl && !ehGestor && !ehVisualizar  // item 62: inspetor vendo próprio cadastro

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
  const [abaInspetor, setAbaInspetor] = useState<'dados'|'plano'>('dados')
  const [contratos, setContratos] = useState<any[]>([])
  const [carregandoPlano, setCarregandoPlano] = useState(false)
  const [msgPlano, setMsgPlano] = useState('')
  const [solicitandoTroca, setSolicitandoTroca] = useState(false)
  const [planoDesejado, setPlanoDesejado] = useState('PLANO MENSAL')

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
            {ehGestor ? 'Cadastro do Gestor' : params.get('visualizar') === '1' ? 'Cadastro Inspetor' : ehConsulta ? 'Meu Cadastro' : 'Cadastro do Inspetor'}
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
            {(abaInspetor === 'dados' || ehGestor) && <form onSubmit={ehVisualizar ? (e=>e.preventDefault()) : handleSubmit}>
              

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
                      <select name="titulo" value={form.titulo} onChange={(ehVisualizar || ehConsulta) ? undefined : handleChange} required disabled={ehVisualizar || ehConsulta} style={{...inputStyle,...((ehVisualizar || ehConsulta)?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}}>
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
                      <input name="inscricao_crea_cau" value={form.inscricao_crea_cau} onChange={(ehVisualizar || ehConsulta) ? undefined : handleChange} placeholder="RS00000/D" required readOnly={ehVisualizar || ehConsulta} style={{...inputStyle,...((ehVisualizar || ehConsulta)?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Especializacao</label>
                      <input name="especializacao" value={form.especializacao} onChange={(ehVisualizar || ehConsulta) ? undefined : handleChange} readOnly={ehVisualizar || ehConsulta} style={{...inputStyle,...((ehVisualizar || ehConsulta)?{backgroundColor:"#F3F4F6",color:"#6B7280"}:{})}} />
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
                {!ehVisualizar && <button type="submit" disabled={salvando}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"none",backgroundColor:"#1E3A8A",color:"white",fontWeight:"600",fontSize:"13px",cursor:"pointer",opacity:salvando?0.7:1}}>
                  {salvando ? "Salvando..." : "Salvar Cadastro"}
                </button>}
              </div>

            </form>}
            {abaInspetor === 'plano' && ehConsulta && (
              <div style={{paddingTop:'8px'}}>
                {carregandoPlano ? (
                  <div style={{textAlign:'center',padding:'32px',color:'#6B7280',fontSize:'13px'}}>Carregando...</div>
                ) : (
                  <>
                    <div style={{marginBottom:'12px'}}>
                      <div style={{...blocoHeaderStyle,borderRadius:'6px 6px 0 0'}}><span style={blocoTituloStyle}>Contratos e Saldo de Créditos</span></div>
                      <div style={{border:'1px solid #E2E8F0',borderTop:'none',borderRadius:'0 0 6px 6px',padding:'12px'}}>
                        {contratos.length === 0 ? (
                          <p style={{fontSize:'12px',color:'#9CA3AF'}}>Nenhum contrato encontrado.</p>
                        ) : contratos.map((ct, i) => {
                          const vencido = new Date(ct.data_fim_contrato) < new Date()
                          const pct = ct.qde_contratada_plano > 0 ? Math.round((ct.saldo_quantidade_plano/ct.qde_contratada_plano)*100) : 0
                          const COR: Record<string,string> = {'PLANO CORTESIA':'#6B7280','PLANO SERVIÇO':'#0284C7','PLANO MENSAL':'#059669','PLANO ESCRITÓRIO':'#7C3AED'}
                          return (
                            <div key={i} style={{border:`1.5px solid ${vencido?'#E5E7EB':'#1E3A8A'}`,borderRadius:'8px',padding:'12px',marginBottom:'8px',opacity:vencido?0.6:1}}>
                              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                                <span style={{padding:'2px 10px',borderRadius:'9999px',fontSize:'10px',fontWeight:700,backgroundColor:COR[ct.tipo_assinatura]??'#6B7280',color:'white'}}>{ct.tipo_assinatura}</span>
                                <span style={{fontSize:'10px',fontWeight:700,color:vencido?'#DC2626':'#059669'}}>{vencido?'⚠ Vencido':`✓ Válido até ${new Date(ct.data_fim_contrato).toLocaleDateString('pt-BR')}`}</span>
                              </div>
                              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:'12px'}}>
                                <div><div style={{fontSize:'10px',color:'#6B7280'}}>CR Plano</div><div style={{fontWeight:700,color:'#1E3A8A',fontSize:'16px'}}>{ct.saldo_quantidade_plano}<span style={{fontSize:'10px',color:'#6B7280'}}>/{ct.qde_contratada_plano}</span></div><div style={{height:'4px',backgroundColor:'#E5E7EB',borderRadius:'2px',marginTop:'4px'}}><div style={{height:'4px',backgroundColor:'#1E3A8A',borderRadius:'2px',width:`${pct}%`}} /></div></div>
                                <div><div style={{fontSize:'10px',color:'#6B7280'}}>CR Avulso</div><div style={{fontWeight:700,color:'#7C3AED',fontSize:'16px'}}>{ct.saldo_quantidade_avulso}<span style={{fontSize:'10px',color:'#6B7280'}}>/{ct.qde_contratada_avulso}</span></div></div>
                                <div><div style={{fontSize:'10px',color:'#6B7280'}}>Início</div><div style={{fontWeight:700,fontSize:'12px'}}>{new Date(ct.data_inicio_contrato).toLocaleDateString('pt-BR')}</div></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={{...blocoHeaderStyle,borderRadius:'6px 6px 0 0'}}><span style={blocoTituloStyle}>Trocar Plano</span></div>
                      <div style={{border:'1px solid #E2E8F0',borderTop:'none',borderRadius:'0 0 6px 6px',padding:'12px'}}>
                        <p style={{fontSize:'11px',color:'#6B7280',marginBottom:'12px',lineHeight:1.5}}>Selecione o novo plano e confirme a troca. O novo contrato inicia hoje.</p>
                        <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
                          <div style={{flex:1}}>
                            <label style={labelStyle}>Plano desejado</label>
                            <select value={planoDesejado} onChange={e=>setPlanoDesejado(e.target.value)} style={inputStyle}>
                              {['PLANO CORTESIA','PLANO SERVIÇO','PLANO MENSAL','PLANO ESCRITÓRIO'].map(pl=>(<option key={pl} value={pl}>{pl}</option>))}
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
