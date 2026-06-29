"use client"
export const dynamic = 'force-dynamic'
import { useState, useEffect } from "react"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"

const tiposServico = [
  { label: "31 Autovistoria", value: "31 Autovistoria" },
  { label: "32 Vistoria inspeção", value: "32 Vistoria inspeção" },
  { label: "33 Vistoria imóvel novo", value: "33 Vistoria imóvel novo" },
  { label: "34 Vistoria fachada", value: "34 Vistoria fachada" },
  { label: "35 Vistoria elevador", value: "35 Vistoria elevador" },
  { label: "36 Vistoria nr-10", value: "36 Vistoria nr-10" },
  { label: "37 Vistoria nr-12", value: "37 Vistoria nr-12" },
  { label: "38 Vistoria nr-13", value: "38 Vistoria nr-13" },
]

const formInicial = {
  tipo_servico: "",
  descricao_parametros: "",
}

export default function TabelaParametros() {
  const [form, setForm] = useState({ ...formInicial })
  const [modoEdicao, setModoEdicao] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)



  useEffect(() => { const supabase = createClient()
    if (!form.tipo_servico) {
      setForm(f => ({ ...f, descricao_parametros: "" }))
      setModoEdicao(false)
      return
    }
    const buscar = async () => {
      setCarregando(true)
      const { data } = await supabase
        .from("tabela_parametros")
        .select("descricao_parametros")
        .eq("tipo_servico", form.tipo_servico)
        .eq("tipo_parametro", "Local ocorrência")
        .order("descricao_parametros")
      if (data && data.length > 0) {
        const valores = data.map(r => r.descricao_parametros).join("; ")
        setForm(f => ({ ...f, descricao_parametros: valores }))
        setModoEdicao(true)
      } else {
        setForm(f => ({ ...f, descricao_parametros: "" }))
        setModoEdicao(false)
      }
      setCarregando(false)
    }
    buscar()
  }, [form.tipo_servico])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === "tipo_servico") {
      setForm({ ...formInicial, tipo_servico: value })
      setModoEdicao(false)
    } else {
      setForm(f => ({ ...f, [name]: value }))
    }
  }

  const handleSubmit = async (e) => { const supabase = createClient()
    e.preventDefault()
    setErro("")
    const valores = form.descricao_parametros
      .split(";")
      .map(v => v.trim())
      .filter(v => v.length > 0)
    if (valores.length === 0) {
      setErro("Informe ao menos um valor."); return
    }
    if (modoEdicao) {
      await supabase
        .from("tabela_parametros")
        .delete()
        .eq("tipo_servico", form.tipo_servico)
        .eq("tipo_parametro", "Local ocorrência")
    }
    const registros = valores.map(v => ({
      tipo_servico: form.tipo_servico,
      tipo_parametro: "Local ocorrência",
      descricao_parametros: v,
    }))
    const { error } = await supabase.from("tabela_parametros").insert(registros)
    if (error) { setErro("Erro ao salvar: " + error.message); return }
    setSucesso(true)
  }

  const handleNovo = () => {
    setForm({ ...formInicial })
    setSucesso(false); setErro(""); setModoEdicao(false)
  }

  const labelStyle = { fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }
  const inputStyle = { border: "1px solid #D1D5DB", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const blocoStyle = { backgroundColor: "white", borderRadius: "10px", overflow: "hidden", border: "1px solid #E2E8F0", marginBottom: "16px" }
  const blocoHeaderStyle = { backgroundColor: "#1E3A8A", padding: "8px 16px" }
  const blocoTituloStyle = { color: "white", fontWeight: "bold", fontSize: "12px" }
  const blocoBodyStyle = { padding: "16px" }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"800px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"16px",flex:1,textAlign:"center"}}>
            Tabela de Parametros
          </span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />

        <div style={{padding:"16px"}}>
          {sucesso ? (
            <div style={{textAlign:"center",padding:"32px"}}>
              <p style={{color:"#1E3A8A",fontSize:"16px",fontWeight:"bold",marginBottom:"16px"}}>
                {modoEdicao ? "Parametros atualizados com sucesso!" : "Parametros salvos com sucesso!"}
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
                <div style={blocoHeaderStyle}>
                  <span style={blocoTituloStyle}>
                    Local de Ocorrencia por Tipo de Servico
                    {modoEdicao && <span style={{marginLeft:"8px",fontSize:"11px",opacity:0.8}}>(modo edicao)</span>}
                  </span>
                </div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={{marginBottom:"12px"}}>
                    <label style={labelStyle}>Tipo de Servico *</label>
                    <select name="tipo_servico" value={form.tipo_servico} onChange={handleChange} required style={inputStyle}>
                      <option value="">Selecione...</option>
                      {tiposServico.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Locais de Ocorrencia *
                      <span style={{color:"#6B7280",marginLeft:"8px",fontWeight:"normal"}}>
                        {carregando ? "Carregando..." : "(separe cada local com ponto e virgula)"}
                      </span>
                    </label>
                    <textarea
                      name="descricao_parametros"
                      value={form.descricao_parametros}
                      onChange={handleChange}
                      required
                      rows={6}
                      placeholder="Ex: Academia; Garagem; Corredor; Escada; Hall de entrada"
                      style={{...inputStyle, resize:"vertical"}}
                    />
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
                  {modoEdicao ? "Atualizar Parametros" : "Salvar Parametros"}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
