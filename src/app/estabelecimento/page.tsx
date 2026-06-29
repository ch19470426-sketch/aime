"use client"
export const dynamic = 'force-dynamic'
import { useState } from "react"
import Image from "next/image"

export default function CadastroEstabelecimento() {
  const [form, setForm] = useState({
    tipo_id: "",
    cnpjoucpf: "",
    razao_social_nome: "",
    cep: "",
    logradouro: "",
    numero_imovel: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  })
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  const formatarCNPJ = (valor: string) => {
    return valor.replace(/\D/g, "").slice(0, 14)
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
  }

  const formatarCPF = (valor: string) => {
    return valor.replace(/\D/g, "").slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }

  const formatarCEP = (valor: string) => {
    return valor.replace(/\D/g, "").slice(0, 8)
      .replace(/(\d{5})(\d{1,3})$/, "$1-$2")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "cnpjoucpf") {
      if (form.tipo_id === "1") setForm({ ...form, cnpjoucpf: formatarCNPJ(value) })
      else if (form.tipo_id === "2") setForm({ ...form, cnpjoucpf: formatarCPF(value) })
      else setForm({ ...form, cnpjoucpf: value })
    } else if (name === "tipo_id") {
      setForm({ ...form, tipo_id: value, cnpjoucpf: "" })
    } else if (name === "cep") {
      const cepFormatado = formatarCEP(value)
      setForm({ ...form, cep: cepFormatado })
      if (cepFormatado.replace(/\D/g, "").length === 8) buscarCep(cepFormatado.replace(/\D/g, ""))
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
        setForm(prev => ({ ...prev, logradouro: data.logradouro || "", bairro: data.bairro || "", cidade: data.localidade || "", uf: data.uf || "" }))
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
  const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"900px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"16px",flex:1,textAlign:"center"}}>
            Cadastro do Estabelecimento
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
                  <div style={{display:"grid", gridTemplateColumns:"160px 200px 1fr", gap:"12px"}}>
                    <div>
                      <label style={labelStyle}>Tipo de Documento *</label>
                      <select name="tipo_id" value={form.tipo_id} onChange={handleChange} required style={inputStyle}>
                        <option value="">Selecione...</option>
                        <option value="1">CNPJ</option>
                        <option value="2">CPF</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>{form.tipo_id === "2" ? "CPF *" : "CNPJ *"}</label>
                      <input
                        name="cnpjoucpf"
                        value={form.cnpjoucpf}
                        onChange={handleChange}
                        placeholder={form.tipo_id === "2" ? "000.000.000-00" : "00.000.000/0000-00"}
                        required
                        disabled={!form.tipo_id}
                        style={{...inputStyle, backgroundColor: !form.tipo_id ? "#F9FAFB" : "white"}}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Razao Social / Nome *</label>
                      <input name="razao_social_nome" value={form.razao_social_nome} onChange={handleChange} placeholder="Nome ou Razao Social completo" required style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}>
                  <span style={blocoTituloStyle}>Endereco</span>
                </div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={{display:"grid", gridTemplateColumns:"150px 1fr", gap:"12px"}}>
                    <div>
                      <label style={labelStyle}>CEP *</label>
                      <input name="cep" value={form.cep} onChange={handleChange} placeholder="00000-000" required style={inputStyle} />
                      {buscandoCep && <span style={{fontSize:"11px",color:"#6B7280"}}>Buscando...</span>}
                    </div>
                    <div>
                      <label style={labelStyle}>Logradouro *</label>
                      <input name="logradouro" value={form.logradouro} onChange={handleChange} placeholder="Rua, Avenida..." required style={inputStyle} />
                    </div>
                  </div>
                  <div style={{...grid3, marginTop:"12px"}}>
                    <div>
                      <label style={labelStyle}>Numero *</label>
                      <input name="numero_imovel" value={form.numero_imovel} onChange={handleChange} placeholder="123" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Complemento</label>
                      <input name="complemento" value={form.complemento} onChange={handleChange} placeholder="Sala, Andar..." style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Bairro *</label>
                      <input name="bairro" value={form.bairro} onChange={handleChange} placeholder="Bairro" required style={inputStyle} />
                    </div>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 80px", gap:"12px", marginTop:"12px"}}>
                    <div>
                      <label style={labelStyle}>Cidade *</label>
                      <input name="cidade" value={form.cidade} onChange={handleChange} placeholder="Cidade" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>UF *</label>
                      <input name="uf" value={form.uf} onChange={handleChange} placeholder="ES" maxLength={2} required style={inputStyle} />
                    </div>
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
