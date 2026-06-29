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
  sistema: "",
  descricao_sistema: "",
  subsistema: "",
  anomalias: "",
}

export default function SistemasConstrutivos() {
  const [form, setForm] = useState({ ...formInicial })
  const [sistemas, setSistemas] = useState<string[]>([])
  const [subsistemas, setSubsistemas] = useState<string[]>([])
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [registroId, setRegistroId] = useState<number | null>(null)
  const [novoSistema, setNovoSistema] = useState(false)
  const [novoSubsistema, setNovoSubsistema] = useState(false)



  useEffect(() => { const supabase = createClient()
    if (!form.tipo_servico) { setSistemas([]); setSubsistemas([]); return }
    const buscar = async () => {
      setCarregando(true)
      const { data, error } = await supabase
        .from("sistemas_construtivos")
        .select("sistema")
        .eq("tipo_servico", form.tipo_servico)
        .order("sistema")
      console.log("sistemas:", data, error)
      if (data) setSistemas([...new Set(data.map((r: any) => r.sistema))])
      setCarregando(false)
    }
    buscar()
  }, [form.tipo_servico])

  useEffect(() => { const supabase = createClient()
    if (!form.sistema || !form.tipo_servico || novoSistema) { setSubsistemas([]); return }
    const buscar = async () => {
      setCarregando(true)
      const { data } = await supabase
        .from("sistemas_construtivos")
        .select("subsistema, descricao_sistema")
        .eq("tipo_servico", form.tipo_servico)
        .eq("sistema", form.sistema)
        .order("subsistema")
      if (data && data.length > 0) {
        setSubsistemas(data.map((r: any) => r.subsistema))
        setForm(f => ({ ...f, descricao_sistema: data[0].descricao_sistema || "" }))
      }
      setCarregando(false)
    }
    buscar()
  }, [form.sistema, novoSistema])

  useEffect(() => { const supabase = createClient()
    if (!form.subsistema || !form.sistema || !form.tipo_servico || novoSubsistema) {
      setModoEdicao(false); setRegistroId(null); return
    }
    const buscar = async () => {
      const { data } = await supabase
        .from("sistemas_construtivos")
        .select("id, anomalias, descricao_sistema")
        .eq("tipo_servico", form.tipo_servico)
        .eq("sistema", form.sistema)
        .eq("subsistema", form.subsistema)
        .single()
      if (data) {
        setForm(f => ({ ...f, anomalias: data.anomalias || "", descricao_sistema: data.descricao_sistema || "" }))
        setRegistroId(data.id)
        setModoEdicao(true)
      }
    }
    buscar()
  }, [form.subsistema, novoSubsistema])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === "tipo_servico") {
      setForm({ ...formInicial, tipo_servico: value })
      setModoEdicao(false); setRegistroId(null)
      setNovoSistema(false); setNovoSubsistema(false)
      setSistemas([]); setSubsistemas([])
    } else if (name === "sistema_select") {
      if (value === "__novo__") {
        setNovoSistema(true)
        setForm(f => ({ ...f, sistema: "", subsistema: "", anomalias: "", descricao_sistema: "" }))
      } else {
        setNovoSistema(false)
        setForm(f => ({ ...f, sistema: value, subsistema: "", anomalias: "", descricao_sistema: "" }))
      }
      setNovoSubsistema(false); setModoEdicao(false)
    } else if (name === "subsistema_select") {
      if (value === "__novo__") {
        setNovoSubsistema(true)
        setForm(f => ({ ...f, subsistema: "", anomalias: "" }))
        setModoEdicao(false)
      } else {
        setNovoSubsistema(false)
        setForm(f => ({ ...f, subsistema: value, anomalias: "" }))
      }
    } else {
      setForm(f => ({ ...f, [name]: value }))
    }
  }

  const handleSubmit = async (e) => { const supabase = createClient()
    e.preventDefault()
    setErro("")
    if (form.descricao_sistema.length > 300) {
      setErro("Descricao do sistema nao pode ultrapassar 300 caracteres."); return
    }
    if (modoEdicao && registroId) {
      const { error } = await supabase
        .from("sistemas_construtivos")
        .update({ anomalias: form.anomalias, descricao_sistema: form.descricao_sistema })
        .eq("id", registroId)
      if (error) { setErro("Erro ao atualizar: " + error.message); return }
    } else {
      const { error } = await supabase
        .from("sistemas_construtivos")
        .insert({
          tipo_servico: form.tipo_servico,
          sistema: form.sistema,
          descricao_sistema: form.descricao_sistema,
          subsistema: form.subsistema,
          anomalias: form.anomalias,
        })
      if (error) { setErro("Erro ao salvar: " + error.message); return }
    }
    setSucesso(true)
  }

  const handleNovo = () => {
    setForm({ ...formInicial })
    setSucesso(false); setErro(""); setModoEdicao(false); setRegistroId(null)
    setSistemas([]); setSubsistemas([])
    setNovoSistema(false); setNovoSubsistema(false)
  }

  const labelStyle = { fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }
  const inputStyle = { border: "1px solid #D1D5DB", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const blocoStyle = { backgroundColor: "white", borderRadius: "10px", overflow: "hidden", border: "1px solid #E2E8F0", marginBottom: "16px" }
  const blocoHeaderStyle = { backgroundColor: "#1E3A8A", padding: "8px 16px" }
  const blocoTituloStyle = { color: "white", fontWeight: "bold", fontSize: "12px" }
  const blocoBodyStyle = { padding: "16px" }
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"900px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"16px",flex:1,textAlign:"center"}}>
            Sistemas Construtivos
          </span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />

        <div style={{padding:"16px"}}>
          {sucesso ? (
            <div style={{textAlign:"center",padding:"32px"}}>
              <p style={{color:"#1E3A8A",fontSize:"16px",fontWeight:"bold",marginBottom:"16px"}}>
                {modoEdicao ? "Registro atualizado com sucesso!" : "Registro salvo com sucesso!"}
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
                      <label style={labelStyle}>Tipo de Servico *</label>
                      <select name="tipo_servico" value={form.tipo_servico} onChange={handleChange} required style={inputStyle}>
                        <option value="">Selecione...</option>
                        {tiposServico.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Sistema *</label>
                      {!novoSistema ? (
                        <select name="sistema_select" value={form.sistema} onChange={handleChange} required style={inputStyle}
                          disabled={!form.tipo_servico}>
                          <option value="">{carregando ? "Carregando..." : "Selecione..."}</option>
                          {sistemas.map(s => <option key={s} value={s}>{s}</option>)}
                          {sistemas.length > 0 && <option value="__novo__">+ Novo sistema</option>}
                        </select>
                      ) : (
                        <div style={{display:"flex",gap:"8px"}}>
                          <input name="sistema" value={form.sistema} onChange={handleChange}
                            placeholder="Nome do novo sistema" required maxLength={64} style={inputStyle} />
                          <button type="button" onClick={() => { setNovoSistema(false); setForm(f => ({...f, sistema:""})) }}
                            style={{padding:"8px 12px",borderRadius:"8px",border:"1px solid #D1D5DB",backgroundColor:"white",fontSize:"12px",cursor:"pointer",whiteSpace:"nowrap"}}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Descricao do Sistema</span></div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <label style={labelStyle}>
                    Descricao *
                    <span style={{color: form.descricao_sistema.length > 300 ? "#DC2626" : "#6B7280", marginLeft:"8px"}}>
                      ({form.descricao_sistema.length}/300 caracteres)
                    </span>
                  </label>
                  <textarea name="descricao_sistema" value={form.descricao_sistema} onChange={handleChange} required
                    placeholder="Descricao resumida do sistema (max. 300 caracteres)"
                    rows={3} style={{...inputStyle, resize:"vertical"}} />
                </div>
              </div>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}>
                  <span style={blocoTituloStyle}>
                    Subsistema e Anomalias
                    {modoEdicao && <span style={{marginLeft:"8px",fontSize:"11px",opacity:0.8}}>(modo edicao)</span>}
                  </span>
                </div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={{marginBottom:"12px"}}>
                    <label style={labelStyle}>Subsistema *</label>
                    {!novoSubsistema ? (
                      <select name="subsistema_select" value={form.subsistema} onChange={handleChange} required style={inputStyle}
                        disabled={!form.sistema}>
                        <option value="">{carregando ? "Carregando..." : "Selecione..."}</option>
                        {subsistemas.map(s => <option key={s} value={s}>{s}</option>)}
                        {subsistemas.length > 0 && <option value="__novo__">+ Novo subsistema</option>}
                      </select>
                    ) : (
                      <div style={{display:"flex",gap:"8px"}}>
                        <input name="subsistema" value={form.subsistema} onChange={handleChange}
                          placeholder="Nome do novo subsistema" required maxLength={64} style={inputStyle} />
                        <button type="button" onClick={() => { setNovoSubsistema(false); setForm(f => ({...f, subsistema:""})) }}
                          style={{padding:"8px 12px",borderRadius:"8px",border:"1px solid #D1D5DB",backgroundColor:"white",fontSize:"12px",cursor:"pointer",whiteSpace:"nowrap"}}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Anomalias e Falhas *</label>
                    <textarea name="anomalias" value={form.anomalias} onChange={handleChange} required
                      placeholder="Liste as anomalias e falhas separadas por ponto e virgula"
                      rows={5} style={{...inputStyle, resize:"vertical"}} />
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
                  {modoEdicao ? "Atualizar Registro" : "Salvar Registro"}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
