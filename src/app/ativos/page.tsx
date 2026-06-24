"use client"
import { useState, useEffect } from "react"
import Image from "next/image"

const tiposAtivo = {
  "31": ["Predio","Apartamento","Casa","Escritorio / sala","Loja","Galpao","Hotel / motel","Hospital","Escola","Cinema / teatro","Clube recreativo","Predio industrial","Outro"],
  "32": ["Predio","Apartamento","Casa","Escritorio / sala","Loja","Galpao","Hotel / motel","Hospital","Escola","Cinema / teatro","Clube recreativo","Predio industrial","Outro"],
  "33": ["Predio","Apartamento","Casa","Escritorio / sala","Loja","Galpao","Hotel / motel","Hospital","Escola","Cinema / teatro","Clube recreativo","Predio industrial","Outro"],
  "34": ["Fachada"],
  "35": ["Elevador"],
  "36": ["Subestacao MT","Transformador","Quadro QGBT","Gerador","SPDA","Linha BT/MT","Outro"],
  "37": ["Prensa","Guilhotina","Serra","Injetora","Torno","Extrusora","Transportador","Empilhadeira","Outro"],
  "38": ["Caldeira flamotubular","Caldeira aquatubular","Caldeira mista","Vaso de processo","Vaso de armazenamento","Compressor","Autoclave","Tubulacao de processo","Tanque metalico","Outro"],
}

const subtipos = {
  "35": ["Baixa tensao","Media tensao","Alta tensao"],
  "36": ["Baixa tensao","Media tensao","Alta tensao"],
  "37": ["Prensa mecanica excentrica","Freio-embreagem","Hidraulica","Pneumatica"],
  "38": ["Cat. A (>=1.960kPa)","Cat. B (<1.960kPa)","Grupo 1","Grupo 2","Grupo 3","Grupo 4","Grupo 5","Classe A","Classe B","Classe C","Classe D"],
}

const formInicial = {
  cpf_inspetor: "",
  cnpjoucpf: "",
  tipo_servico: "",
  data_cadastro: "",
  tipo_ativo: "",
  tag_ativo: "",
  finalidade: "",
  data_op: "",
  cpf_responsavel: "",
  nome_responsavel: "",
  funcao_responsavel: "",
  uso_ativo: "",
  whatsapp: "",
  email: "",
  nr_pavimentos: "",
  nr_unidades: "",
  area_terreno: "",
  area_construida: "",
  nr_fachadas: "",
  perimetro: "",
  fabricante: "",
  subtipo: "",
  tensao: "",
  capacidade: "",
  fluido: "",
  volume: "",
}

export default function AtivosVistoriar() {
  const [form, setForm] = useState({ ...formInicial })
  const [sucesso, setSucesso] = useState(false)

  const hoje = new Date().toLocaleDateString("pt-BR")

  useEffect(() => {
    setForm(f => ({ ...f, data_cadastro: hoje }))
  }, [])

  const maskCPF = (v) => v.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")
  const maskCNPJ = (v) => {
    const d = v.replace(/\D/g,"").slice(0,14)
    if (d.length <= 11) return d.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")
    return d.replace(/(\d{2})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1/$2").replace(/(\d{4})(\d{1,2})$/,"$1-$2")
  }
  const maskPhone = (v) => v.replace(/\D/g,"").slice(0,11).replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d{1,4})$/,"$1-$2")
  const maskDate = (v) => v.replace(/\D/g,"").slice(0,8).replace(/(\d{2})(\d)/,"$1/$2").replace(/(\d{2})(\d)/,"$1/$2")

  const handleChange = (e) => {
    const { name, value } = e.target
    let v = value
    if (name === "cpf_inspetor" || name === "cpf_responsavel") v = maskCPF(value)
    else if (name === "cnpjoucpf") v = maskCNPJ(value)
    else if (name === "whatsapp") v = maskPhone(value)
    else if (name === "data_op") v = maskDate(value)

    if (name === "tipo_servico") {
      const tagDefault = ["31","32","33","34","36"].includes(value) ? "1" : ""
      setForm(f => ({
        ...formInicial,
        data_cadastro: hoje,
        cpf_inspetor: f.cpf_inspetor,
        cnpjoucpf: f.cnpjoucpf,
        tipo_servico: value,
        tag_ativo: tagDefault,
      }))
    } else {
      setForm(f => ({ ...f, [name]: v }))
    }
  }

  const ts = form.tipo_servico
  const showImovel = ["31","32","33"].includes(ts)
  const showFachada = ts === "34"
  const showElevador = ts === "35"
  const showNRs = ["36","37","38"].includes(ts)
  const showNR13 = ts === "38"
  const showTensao = ["36","38"].includes(ts)
  const tagReadonly = ["31","32","33","34","36"].includes(ts)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSucesso(true)
  }

  const handleNovo = () => {
    setForm({ ...formInicial, data_cadastro: hoje })
    setSucesso(false)
  }

  const labelStyle = { fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" }
  const inputStyle = { border: "1px solid #D1D5DB", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const readonlyStyle = { ...inputStyle, backgroundColor: "#F9FAFB", color: "#6B7280" }
  const blocoStyle = { backgroundColor: "white", borderRadius: "10px", overflow: "hidden", border: "1px solid #E2E8F0", marginBottom: "16px" }
  const blocoHeaderStyle = { backgroundColor: "#1E3A8A", padding: "8px 16px" }
  const blocoTituloStyle = { color: "white", fontWeight: "bold", fontSize: "12px" }
  const blocoBodyStyle = { padding: "16px" }
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }
  const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }
  const grid4 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"960px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"16px",flex:1,textAlign:"center"}}>
            Ativos a Vistoriar
          </span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />

        <div style={{padding:"16px"}}>
          {sucesso ? (
            <div style={{textAlign:"center",padding:"32px"}}>
              <p style={{color:"#1E3A8A",fontSize:"16px",fontWeight:"bold",marginBottom:"16px"}}>
                Ativo registrado com sucesso!
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
                  <div style={grid4}>
                    <div>
                      <label style={labelStyle}>CPF do Inspetor *</label>
                      <input name="cpf_inspetor" value={form.cpf_inspetor} onChange={handleChange} placeholder="000.000.000-00" required style={{...inputStyle, textAlign:"center"}} />
                    </div>
                    <div>
                      <label style={labelStyle}>CNPJ / CPF Estabelecimento *</label>
                      <input name="cnpjoucpf" value={form.cnpjoucpf} onChange={handleChange} placeholder="00.000.000/0000-00" required style={{...inputStyle, textAlign:"center"}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo de Servico *</label>
                      <select name="tipo_servico" value={form.tipo_servico} onChange={handleChange} required style={inputStyle}>
                        <option value="">Selecione...</option>
                        <option value="31">31 - Autovistoria</option>
                        <option value="32">32 - Vistoria inspecao</option>
                        <option value="33">33 - Vistoria imovel novo</option>
                        <option value="34">34 - Vistoria fachada</option>
                        <option value="35">35 - Vistoria elevador</option>
                        <option value="36">36 - Vistoria NR-10</option>
                        <option value="37">37 - Vistoria NR-12</option>
                        <option value="38">38 - Vistoria NR-13</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Data do Cadastro</label>
                      <input value={form.data_cadastro} readOnly style={{...readonlyStyle, textAlign:"center"}} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={blocoStyle}>
                <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Dados Comuns</span></div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={blocoBodyStyle}>
                  <div style={{...grid4, marginBottom:"12px"}}>
                    <div>
                      <label style={labelStyle}>Tipo do Ativo *</label>
                      <select name="tipo_ativo" value={form.tipo_ativo} onChange={handleChange} required style={inputStyle}>
                        <option value="">Selecione...</option>
                        {(tiposAtivo[ts] || []).map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Tag Ativo / Nr Serie *</label>
                      <input name="tag_ativo" value={form.tag_ativo} onChange={handleChange} placeholder="Ex: TQ-101" required readOnly={tagReadonly} style={tagReadonly ? readonlyStyle : inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Finalidade da Vistoria *</label>
                      <input name="finalidade" value={form.finalidade} onChange={handleChange} placeholder="Descreva" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Data Inicio de Operacao *</label>
                      <input name="data_op" value={form.data_op} onChange={handleChange} placeholder="dd/mm/aaaa" required style={{...inputStyle, textAlign:"center"}} />
                    </div>
                  </div>
                  <div style={{...grid4, marginBottom:"12px"}}>
                    <div>
                      <label style={labelStyle}>CPF do Responsavel</label>
                      <input name="cpf_responsavel" value={form.cpf_responsavel} onChange={handleChange} placeholder="000.000.000-00" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Nome do Responsavel *</label>
                      <input name="nome_responsavel" value={form.nome_responsavel} onChange={handleChange} placeholder="Nome completo" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Funcao do Responsavel *</label>
                      <select name="funcao_responsavel" value={form.funcao_responsavel} onChange={handleChange} required style={inputStyle}>
                        <option value="">Selecione...</option>
                        <option>Administrador</option>
                        <option>Sindico</option>
                        <option>Proprietario</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Uso do Ativo *</label>
                      <select name="uso_ativo" value={form.uso_ativo} onChange={handleChange} required style={inputStyle}>
                        <option value="">Selecione...</option>
                        <option>Producao / processo</option>
                        <option>Transporte</option>
                        <option>Residencial</option>
                        <option>Comercial</option>
                        <option>Industrial</option>
                        <option>Institucional</option>
                        <option>Misto</option>
                      </select>
                    </div>
                  </div>
                  <div style={grid2}>
                    <div>
                      <label style={labelStyle}>WhatsApp do Responsavel *</label>
                      <input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="(00) 00000-0000" required style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>E-mail do Responsavel *</label>
                      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="responsavel@email.com" required style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              {showImovel && (
                <div style={blocoStyle}>
                  <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Dados do Imovel</span></div>
                  <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                  <div style={blocoBodyStyle}>
                    <div style={grid4}>
                      <div>
                        <label style={labelStyle}>Nr Pavimentos *</label>
                        <input name="nr_pavimentos" type="number" value={form.nr_pavimentos} onChange={handleChange} min="1" placeholder="Qtd" required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Nr Unidades / Salas *</label>
                        <input name="nr_unidades" type="number" value={form.nr_unidades} onChange={handleChange} min="1" placeholder="Qtd" required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Area Terreno (m2) *</label>
                        <input name="area_terreno" type="number" value={form.area_terreno} onChange={handleChange} step="0.01" min="0" placeholder="0,00" required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Area Construida (m2) *</label>
                        <input name="area_construida" type="number" value={form.area_construida} onChange={handleChange} step="0.01" min="0" placeholder="0,00" required style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showFachada && (
                <div style={blocoStyle}>
                  <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Dados da Fachada</span></div>
                  <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                  <div style={blocoBodyStyle}>
                    <div style={grid3}>
                      <div>
                        <label style={labelStyle}>Nr Pavimentos *</label>
                        <input name="nr_pavimentos" type="number" value={form.nr_pavimentos} onChange={handleChange} min="1" placeholder="Qtd" required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Nr Fachadas *</label>
                        <input name="nr_fachadas" type="number" value={form.nr_fachadas} onChange={handleChange} min="1" placeholder="Qtd" required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Perimetro Fachadas (m) *</label>
                        <input name="perimetro" type="number" value={form.perimetro} onChange={handleChange} step="0.01" min="0" placeholder="0,00" required style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showElevador && (
                <div style={blocoStyle}>
                  <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Dados do Elevador</span></div>
                  <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                  <div style={blocoBodyStyle}>
                    <div style={{display:"grid", gridTemplateColumns:"120px 1fr 1fr 150px", gap:"12px"}}>
                      <div>
                        <label style={labelStyle}>Nr Pavimentos *</label>
                        <input name="nr_pavimentos" type="number" value={form.nr_pavimentos} onChange={handleChange} min="1" placeholder="Qtd" required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Fabricante / Marca *</label>
                        <input name="fabricante" value={form.fabricante} onChange={handleChange} placeholder="Ex: Atlas Schindler" required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Subtipo *</label>
                        <select name="subtipo" value={form.subtipo} onChange={handleChange} required style={inputStyle}>
                          <option value="">Selecione...</option>
                          {(subtipos[ts] || []).map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Capacidade (kg) *</label>
                        <input name="capacidade" type="number" value={form.capacidade} onChange={handleChange} step="0.01" min="0" placeholder="0,00" required style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showNRs && (
                <div style={blocoStyle}>
                  <div style={blocoHeaderStyle}><span style={blocoTituloStyle}>Dados NRs</span></div>
                  <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                  <div style={blocoBodyStyle}>
                    <div style={{...grid4, marginBottom: showNR13 ? "12px" : "0"}}>
                      {["37","38"].includes(ts) && (
                        <div>
                          <label style={labelStyle}>Fabricante / Marca *</label>
                          <input name="fabricante" value={form.fabricante} onChange={handleChange} placeholder="Ex: WEG" required style={inputStyle} />
                        </div>
                      )}
                      <div>
                        <label style={labelStyle}>Subtipo *</label>
                        <select name="subtipo" value={form.subtipo} onChange={handleChange} required style={inputStyle}>
                          <option value="">Selecione...</option>
                          {(subtipos[ts] || []).map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      {showTensao && (
                        <div>
                          <label style={labelStyle}>Tensao / Pressao (kV ou kPa) *</label>
                          <input name="tensao" type="number" value={form.tensao} onChange={handleChange} step="0.01" min="0" placeholder="0,00" required style={inputStyle} />
                        </div>
                      )}
                      <div>
                        <label style={labelStyle}>Capacidade / Potencia *</label>
                        <input name="capacidade" type="number" value={form.capacidade} onChange={handleChange} step="0.01" min="0" placeholder="0,00" required style={inputStyle} />
                      </div>
                    </div>
                    {showNR13 && (
                      <div style={grid2}>
                        <div>
                          <label style={labelStyle}>Fluido / Classe do Fluido *</label>
                          <select name="fluido" value={form.fluido} onChange={handleChange} required style={inputStyle}>
                            <option value="">Selecione...</option>
                            <option>Classe A</option><option>Classe B</option>
                            <option>Classe C</option><option>Classe D</option>
                            <option>Vapor</option><option>Ar comprimido</option>
                            <option>GLP</option><option>Nitrogenio</option><option>Outro</option>
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Volume Interno (m3) *</label>
                          <input name="volume" type="number" value={form.volume} onChange={handleChange} step="0.0001" min="0" placeholder="0,0000" required style={inputStyle} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{display:"flex",gap:"12px",justifyContent:"flex-end"}}>
                <button type="button" onClick={() => window.location.href="/dashboard"}
                  style={{padding:"10px 24px",borderRadius:"50px",border:"1px solid #1E3A8A",backgroundColor:"white",color:"#1E3A8A",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{padding:"10px 24px",borderRadius:"50px",border:"none",backgroundColor:"#1E3A8A",color:"white",fontWeight:"600",fontSize:"13px",cursor:"pointer"}}>
                  Salvar Registro
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
