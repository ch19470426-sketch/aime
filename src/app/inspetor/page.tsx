"use client"
export const dynamic = 'force-dynamic'
import { useState } from "react"
import Image from "next/image"

export default function CadastroInspetor() {
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
  const [buscandoCep, setBuscandoCep] = useState(false)

  const formatarCPF = (valor: string) => {
    return valor
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    setSucesso(true)
  }

  const labelStyle = { fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }
  const inputStyle = { border: "1px solid #D1D5DB", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const blocoStyle = { backgroundColor: "white", borderRadius: "10px", overflow: "hidden", border: "1px solid #E2E8F0", marginBottom: "16px" }
  const blocoHeaderStyle = { backgroundColor: "#1E3A8A", padding: "8px 16px" }
  const blocoTituloStyle = { color: "white", fontWeight: "bold", fontSize: "12px" }
  const blocoBodyStyle = { padding: "16px" }
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }
  const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"900px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"16px",flex:1,textAlign:"center"}}>
            Cadastro do Inspetor
          </span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />

        <div style={{padding:"16px"}}>
          {sucesso ? (
            <div style={{textAlign:"center",padding:"32px",color:"#1E3A8A",fontSize:"16px",fontWeight:"bold"}}>
              Cadastro realizado com sucesso!
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}>
                  <span style={blocoTituloStyle}>Identificacao</span>
                </div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={grid3}>
                    <div>
                      <label style={labelStyle}>CPF *</label>
                      <input name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" required style={inputStyle} />
                    </div>
                    <div style={{gridColumn:"span 2"}}>
                      <label style={labelStyle}>Nome Completo *</label>
                      <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome completo" required style={inputStyle} />
                    </div>
                  </div>
                  <div style={{...grid3, marginTop:"12px"}}>
                    <div>
                      <label style={labelStyle}>Titulo Profissional *</label>
                      <select name="titulo" value={form.titulo} onChange={handleChange} required style={inputStyle}>
                        <option value="">Selecione...</option>
                        <option value="Arquiteto">Arquiteto</option>
                        <option value="Eng Civil">Eng Civil</option>
                        <option value="Eng Eletrico">Eng Eletrico</option>
                        <option value="Eng Mecanico">Eng Mecanico</option>
                        <option value="Tecnico Edificacao">Tecnico Edificacao</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Inscricao CREA/CAU *</label>
                      <input name="inscricao_crea_cau" value={form.inscricao_crea_cau} onChange={handleChange} placeholder="RS00000/D" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Especializacao</label>
                      <input name="especializacao" value={form.especializacao} onChange={handleChange} placeholder="Ex: Eng. Diagnostica" style={inputStyle} />
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
                      <input name="cep" value={form.cep} onChange={handleChange} placeholder="00000-000" required style={inputStyle} />
                      {buscandoCep && <span style={{fontSize:"11px",color:"#6B7280"}}>Buscando...</span>}
                    </div>
                    <div style={{gridColumn:"span 2"}}>
                      <label style={labelStyle}>Logradouro *</label>
                      <input name="logradouro" value={form.logradouro} onChange={handleChange} placeholder="Rua, Avenida..." required style={inputStyle} />
                    </div>
                  </div>
                  <div style={{...grid3, marginTop:"12px"}}>
                    <div>
                      <label style={labelStyle}>Numero *</label>
                      <input name="nr_imovel" value={form.nr_imovel} onChange={handleChange} placeholder="123" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Complemento</label>
                      <input name="complemento" value={form.complemento} onChange={handleChange} placeholder="Ap, Sala..." style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Bairro *</label>
                      <input name="bairro" value={form.bairro} onChange={handleChange} placeholder="Bairro" required style={inputStyle} />
                    </div>
                  </div>
                  <div style={{...grid3, marginTop:"12px"}}>
                    <div style={{gridColumn:"span 2"}}>
                      <label style={labelStyle}>Cidade *</label>
                      <input name="cidade" value={form.cidade} onChange={handleChange} placeholder="Cidade" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>UF *</label>
                      <input name="uf" value={form.uf} onChange={handleChange} placeholder="ES" maxLength={2} required style={inputStyle} />
                    </div>
                  </div>
                  <div style={{...grid2, marginTop:"12px"}}>
                    <div>
                      <label style={labelStyle}>WhatsApp *</label>
                      <input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="(00) 00000-0000" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>E-mail *</label>
                      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required style={inputStyle} />
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
                    <input name="cabecalho" value={form.cabecalho} onChange={handleChange} placeholder="Ex: Eng. Civil Joao Silva - CREA RS00000/D" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Rodape dos Documentos</label>
                    <input name="rodape" value={form.rodape} onChange={handleChange} placeholder="Ex: Rua das Flores, 123 - Porto Alegre/RS - (51) 99999-9999" style={inputStyle} />
                  </div>
                </div>
              </div>

              {erro && <p style={{color:"#DC2626",fontSize:"13px",textAlign:"center",marginBottom:"12px"}}>{erro}</p>}

              <div style={{display:"flex",gap:"12px",justifyContent:"flex-end"}}>
                <button type="button" onClick={() => window.location.href="/dashboard"}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"1px solid #1E3A8A",backgroundColor:"white",color:"#1E3A8A",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{padding:"10px 24px",borderRadius:"50px",border:"none",backgroundColor:"#1E3A8A",color:"white",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>
                  Salvar Cadastro
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
