"use client"
export const dynamic = 'force-dynamic'
import { useState } from "react"
import Image from "next/image"

const SM = 1518.00 // Salario minimo vigente

const regras = {
  "PLANO MENSAL": {
    pct: 0.06,
    base: "mes",
    nr_laudos: 4,
    quantidades: [3, 6, 12],
    descontos: { 3: 0, 6: 0.05, 12: 0.10 },
    descricao: "4 laudos por mes",
  },
  "PLANO SERVICO": {
    pct: 0.03,
    base: "laudo",
    nr_laudos: 99,
    quantidades: [3, 6, 12],
    descontos: { 3: 0, 6: 0.05, 12: 0.10 },
    descricao: "Laudos ilimitados",
  },
  "PLANO ESCRITORIO": {
    pct: 0.15,
    base: "mes",
    nr_laudos: 12,
    quantidades: [3, 6, 12],
    descontos: { 3: 0, 6: 0.05, 12: 0.10 },
    descricao: "12 laudos por mes",
  },
  "PLANO CORTESIA": {
    pct: 0,
    base: "contrato",
    nr_laudos: 2,
    quantidades: [1],
    descontos: { 1: 0 },
    descricao: "2 laudos no periodo",
  },
}

const formInicial = {
  tipo_assinatura: "",
  quantidade_contratada: "",
  preco_assinatura: "",
  desconto_assinatura: "",
  nr_laudos_mes: "",
}

export default function PlanoAssinatura() {
  const [form, setForm] = useState({ ...formInicial })
  const [sucesso, setSucesso] = useState(false)

  const calcular = (tipo, qtd) => {
    if (!tipo || !qtd) return { preco: "", desconto: "", laudos: "" }
    const r = regras[tipo]
    if (!r) return { preco: "", desconto: "", laudos: "" }
    const descPct = r.descontos[Number(qtd)] || 0
    const precoBase = SM * r.pct * Number(qtd)
    const precoFinal = precoBase * (1 - descPct)
    return {
      preco: precoFinal.toFixed(2),
      desconto: (descPct * 100).toFixed(0),
      laudos: String(r.nr_laudos),
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let novoForm = { ...form, [name]: value }

    if (name === "tipo_assinatura") {
      novoForm = { ...formInicial, tipo_assinatura: value }
    }

    const tipo = name === "tipo_assinatura" ? value : novoForm.tipo_assinatura
    const qtd = name === "quantidade_contratada" ? value : novoForm.quantidade_contratada

    if (tipo && qtd) {
      const calc = calcular(tipo, qtd)
      novoForm.preco_assinatura = calc.preco
      novoForm.desconto_assinatura = calc.desconto
      novoForm.nr_laudos_mes = calc.laudos
    }

    setForm(novoForm)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSucesso(true)
  }

  const handleNovo = () => {
    setForm({ ...formInicial })
    setSucesso(false)
  }

  const regra = regras[form.tipo_assinatura]

  const labelStyle = { fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }
  const inputStyle = { border: "1px solid #D1D5DB", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const readonlyStyle = { ...inputStyle, backgroundColor: "#F9FAFB", color: "#374151", textAlign: "right" as const }
  const blocoStyle = { backgroundColor: "white", borderRadius: "10px", overflow: "hidden", border: "1px solid #E2E8F0", marginBottom: "16px" }
  const blocoHeaderStyle = { backgroundColor: "#1E3A8A", padding: "8px 16px" }
  const blocoTituloStyle = { color: "white", fontWeight: "bold", fontSize: "12px" }
  const blocoBodyStyle = { padding: "16px" }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"700px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"16px",flex:1,textAlign:"center"}}>
            Plano de Assinatura
          </span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />

        <div style={{padding:"16px"}}>
          {sucesso ? (
            <div style={{textAlign:"center",padding:"32px"}}>
              <p style={{color:"#1E3A8A",fontSize:"16px",fontWeight:"bold",marginBottom:"16px"}}>
                Plano cadastrado com sucesso!
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
                <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Plano, Valores e Condicoes</span></div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
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
                    <div>
                      <label style={labelStyle}>Quantidade Contratada (meses/laudos) *</label>
                      <select name="quantidade_contratada" value={form.quantidade_contratada} onChange={handleChange} required disabled={!form.tipo_assinatura} style={{...inputStyle, backgroundColor: !form.tipo_assinatura ? "#F9FAFB" : "white"}}>
                        <option value="">Selecione...</option>
                        {(regra?.quantidades || []).map(q => (
                          <option key={q} value={q}>{q} {regra?.base === "contrato" ? "contrato" : "meses/laudos"}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
                    <div>
                      <label style={labelStyle}>Preco da Assinatura (R$)</label>
                      <input value={form.preco_assinatura ? `R$ ${form.preco_assinatura}` : ""} readOnly style={readonlyStyle} placeholder="Automatico" />
                    </div>
                    <div>
                      <label style={labelStyle}>Desconto Aplicado (%)</label>
                      <input value={form.desconto_assinatura ? `${form.desconto_assinatura}%` : ""} readOnly style={readonlyStyle} placeholder="Automatico" />
                    </div>
                    <div>
                      <label style={labelStyle}>Laudos Autorizados no Periodo</label>
                      <input value={form.nr_laudos_mes === "99" ? "Ilimitado" : form.nr_laudos_mes} readOnly style={{...readonlyStyle, textAlign:"center"}} placeholder="Automatico" />
                    </div>
                  </div>

                  {regra && (
                    <div style={{marginTop:"12px",padding:"10px 12px",backgroundColor:"#EBF1FF",borderRadius:"8px",fontSize:"12px",color:"#1E3A8A"}}>
                      <strong>Resumo:</strong> {form.tipo_assinatura === "PLANO CORTESIA" ? "2 laudos no periodo de 15 dias" : regra.descricao}. Precos promocionais, que podem sofrer alteracao no futuro.
                    </div>
                  )}

                </div>
              </div>

              <div style={{display:"flex",gap:"12px",justifyContent:"flex-end"}}>
                <button type="button" onClick={() => window.location.href="/dashboard"}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"1px solid #1E3A8A",backgroundColor:"white",color:"#1E3A8A",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>
                  Cancelar
                </button>
                <button type="submit" disabled={!form.preco_assinatura}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"none",backgroundColor:"#1E3A8A",color:"white",fontWeight:"600",fontSize:"13px",cursor:"pointer",opacity:!form.preco_assinatura?0.5:1}}>
                  Salvar Plano
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
