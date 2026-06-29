"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect } from "react"
import Image from "next/image"

const planos: Record<string, any> = {
  "PLANO MENSAL": {
    base: "mes", quantidades: [3, 6, 12], nr_laudos: 4, pct: 0.06,
    descontos: { 3: 0, 6: 0.05, 12: 0.10 },
  },
  "PLANO SERVICO": {
    base: "laudo", quantidades: [3, 6, 12], nr_laudos: 99, pct: 0.03,
    descontos: { 3: 0, 6: 0.05, 12: 0.10 },
  },
  "PLANO ESCRITORIO": {
    base: "mes", quantidades: [3, 6, 12], nr_laudos: 12, pct: 0.15,
    descontos: { 3: 0, 6: 0.05, 12: 0.10 },
  },
  "PLANO CORTESIA": {
    base: "contrato", quantidades: [1], nr_laudos: 2, pct: 0,
    descontos: { 1: 0 },
  },
}

const SM = 1518.00

const formInicial = {
  cpf_inspetor: "",
  tipo_assinatura: "",
  qde_contratada: "",
  data_inicio_contrato: "",
  data_fim_contrato: "",
  valor_pago: "",
  saldo_quantidade: "",
}

export default function ContratosInspetor() {
  const [form, setForm] = useState({ ...formInicial })
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)

  const hoje = new Date().toLocaleDateString("pt-BR")

  const maskCPF = (v: string) => v.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")

  const calcularFim = (inicio: string, qtd: number, base: string) => {
    if (!inicio || inicio.length !== 10) return ""
    const [d, m, a] = inicio.split("/").map(Number)
    if (!d || !m || !a) return ""
    const data = new Date(a, m - 1, d)
    if (base === "mes") data.setMonth(data.getMonth() + Number(qtd))
    else if (base === "contrato") data.setDate(data.getDate() + 15)
    else data.setMonth(data.getMonth() + 3)
    return `${String(data.getDate()).padStart(2,"0")}/${String(data.getMonth()+1).padStart(2,"0")}/${data.getFullYear()}`
  }

  const calcularValor = (tipo: string, qtd: number) => {
    if (!tipo || !qtd) return ""
    const p = planos[tipo]
    if (!p) return ""
    const desc = p.descontos[Number(qtd)] || 0
    const valor = SM * p.pct * Number(qtd) * (1 - desc)
    return valor.toFixed(2)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    let novoForm = { ...form }

    if (name === "cpf_inspetor") {
      novoForm.cpf_inspetor = maskCPF(value)
    } else if (name === "tipo_assinatura") {
      const p = planos[value]
      const qtd = p?.quantidades[0] || 1
      const inicio = hoje
      const fim = calcularFim(inicio, qtd, p?.base)
      const valor = calcularValor(value, qtd)
      const saldo = p?.nr_laudos === 99 ? "Ilimitado" : String(p?.nr_laudos * qtd)
      novoForm = {
        ...formInicial,
        cpf_inspetor: form.cpf_inspetor,
        tipo_assinatura: value,
        qde_contratada: String(qtd),
        data_inicio_contrato: inicio,
        data_fim_contrato: fim,
        valor_pago: valor,
        saldo_quantidade: saldo,
      }
    } else if (name === "qde_contratada") {
      const tipo = form.tipo_assinatura
      const p = planos[tipo]
      const fim = calcularFim(form.data_inicio_contrato, value, p?.base)
      const valor = calcularValor(tipo, value)
      const saldo = p?.nr_laudos === 99 ? "Ilimitado" : String(p?.nr_laudos * Number(value))
      novoForm = { ...form, qde_contratada: value, data_fim_contrato: fim, valor_pago: valor, saldo_quantidade: saldo }
    } else {
      novoForm[name] = value
    }

    setForm(novoForm)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErro("")
    setSucesso(true)
  }

  const handleNovo = () => {
    setForm({ ...formInicial })
    setSucesso(false)
    setErro("")
  }

  const plano = planos[form.tipo_assinatura]

  const labelStyle = { fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }
  const inputStyle = { border: "1px solid #D1D5DB", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const readonlyStyle = { ...inputStyle, backgroundColor: "#F9FAFB", color: "#374151" }
  const blocoStyle = { backgroundColor: "white", borderRadius: "10px", overflow: "hidden", border: "1px solid #E2E8F0", marginBottom: "16px" }
  const blocoHeaderStyle = { backgroundColor: "#1E3A8A", padding: "8px 16px" }
  const blocoTituloStyle = { color: "white", fontWeight: "bold", fontSize: "12px" }
  const blocoBodyStyle = { padding: "16px" }
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }
  const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"800px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"16px",flex:1,textAlign:"center"}}>
            Contratos do Inspetor
          </span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />

        <div style={{padding:"16px"}}>
          {sucesso ? (
            <div style={{textAlign:"center",padding:"32px"}}>
              <p style={{color:"#1E3A8A",fontSize:"16px",fontWeight:"bold",marginBottom:"16px"}}>
                Contrato registrado com sucesso!
              </p>
              <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
                <button onClick={handleNovo}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"none",backgroundColor:"#1E3A8A",color:"white",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>
                  Novo Registro
                </button>
                <button onClick={() => window.location.href="/dashboard"}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"1px solid #1E3A8A",backgroundColor:"white",color:"#1E3A8A",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>
                  Voltar ao Menu
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Identificacao</span></div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={grid2}>
                    <div>
                      <label style={labelStyle}>CPF do Inspetor *</label>
                      <input name="cpf_inspetor" value={form.cpf_inspetor} onChange={handleChange} placeholder="000.000.000-00" required style={{...inputStyle, textAlign:"center"}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo de Assinatura *</label>
                      <select name="tipo_assinatura" value={form.tipo_assinatura} onChange={handleChange} required style={inputStyle}>
                        <option value="">Selecione...</option>
                        <option value="PLANO MENSAL">PLANO MENSAL</option>
                        <option value="PLANO SERVICO">PLANO SERVICO</option>
                        <option value="PLANO ESCRITORIO">PLANO ESCRITORIO</option>
                        <option value="PLANO CORTESIA">PLANO CORTESIA</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Condicoes do Contrato</span></div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={{...grid3, marginBottom:"12px"}}>
                    <div>
                      <label style={labelStyle}>Quantidade Contratada</label>
                      <select name="qde_contratada" value={form.qde_contratada} onChange={handleChange} disabled={!form.tipo_assinatura} style={{...inputStyle, backgroundColor: !form.tipo_assinatura ? "#F9FAFB" : "white"}}>
                        <option value="">Selecione...</option>
                        {(plano?.quantidades || []).map(q => (
                          <option key={q} value={q}>{q} {plano?.base === "contrato" ? "contrato" : "meses/laudos"}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Data Inicio do Contrato</label>
                      <input value={form.data_inicio_contrato} readOnly style={{...readonlyStyle, textAlign:"center"}} placeholder="Automatico" />
                    </div>
                    <div>
                      <label style={labelStyle}>Data Fim do Contrato</label>
                      <input value={form.data_fim_contrato} readOnly style={{...readonlyStyle, textAlign:"center"}} placeholder="Automatico" />
                    </div>
                  </div>
                  <div style={grid2}>
                    <div>
                      <label style={labelStyle}>Valor Pago (R$)</label>
                      <input value={form.valor_pago ? `R$ ${form.valor_pago}` : ""} readOnly style={{...readonlyStyle, textAlign:"right"}} placeholder="Automatico" />
                    </div>
                    <div>
                      <label style={labelStyle}>Saldo de Meses/Laudos</label>
                      <input value={form.saldo_quantidade} readOnly style={{...readonlyStyle, textAlign:"center"}} placeholder="Automatico" />
                    </div>
                  </div>

                  {form.tipo_assinatura && (
                    <div style={{marginTop:"12px",padding:"10px 12px",backgroundColor:"#EBF1FF",borderRadius:"8px",fontSize:"12px",color:"#1E3A8A"}}>
                      <strong>Atencao:</strong> Nao e permitido migrar de PLANO MENSAL, SERVICO ou ESCRITORIO para PLANO CORTESIA.
                    </div>
                  )}
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
                  Salvar Contrato
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
