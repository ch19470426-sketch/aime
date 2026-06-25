"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

const TIPOS: Record<string, { titulo: string; tipoServico: string; cnpjOnly: boolean; tagDefault: string }> = {
  "31": { titulo: "Autovistoria", tipoServico: "31 Autovistoria", cnpjOnly: true, tagDefault: "1" },
  "32": { titulo: "Vistoria Inspeção", tipoServico: "32 Vistoria inspeção", cnpjOnly: true, tagDefault: "1" },
  "33": { titulo: "Vistoria Imóvel Novo", tipoServico: "33 Vistoria imóvel novo", cnpjOnly: false, tagDefault: "1" },
  "34": { titulo: "Vistoria Fachada", tipoServico: "34 Vistoria fachada", cnpjOnly: true, tagDefault: "1" },
  "35": { titulo: "Vistoria Elevador", tipoServico: "35 Vistoria elevador", cnpjOnly: true, tagDefault: "" },
}

const ATIVOS: Record<string, string[]> = {
  "31": ["Prédio","Apartamento","Casa","Escritório/sala","Loja","Galpão","Hotel/motel","Hospital","Escola","Cinema/teatro","Clube recreativo","Prédio industrial","Outro"],
  "32": ["Prédio","Apartamento","Casa","Escritório/sala","Loja","Galpão","Hotel/motel","Hospital","Escola","Cinema/teatro","Clube recreativo","Prédio industrial","Outro"],
  "33": ["Prédio","Apartamento","Casa","Escritório/sala","Loja","Galpão","Hotel/motel","Hospital","Escola","Cinema/teatro","Clube recreativo","Prédio industrial","Outro"],
  "34": ["Fachada"],
  "35": ["Elevador"],
}

const ORIGENS = ["Exógena","Endógena","Funcional","Falha manutenção","Falha uso","Falha operação"]

const FOTO_KEY = (tipo: string) => `aime_foto_nr_${tipo}`

function getFotoNr(tipo: string): number {
  if (typeof window === "undefined") return 1
  return parseInt(localStorage.getItem(FOTO_KEY(tipo)) || "0") + 1
}

function salvarFotoNr(tipo: string, nr: number) {
  localStorage.setItem(FOTO_KEY(tipo), String(nr))
}

export default function VistoriaPage() {
  const params = useParams()
  const tipo = (params?.tipo as string) || "31"
  const config = TIPOS[tipo] || TIPOS["31"]
  const supabase = createClient()

  const [sistemas, setSistemas] = useState<string[]>([])
  const [subsistemas, setSubsistemas] = useState<string[]>([])
  const [anomalias, setAnomalias] = useState<string[]>([])
  const [locais, setLocais] = useState<string[]>([])
  const [fotoNr, setFotoNr] = useState(1)
  const [fotoNrDisplay, setFotoNrDisplay] = useState("001")
  const [foto, setFoto] = useState<string | null>(null)
  const [statusIA, setStatusIA] = useState("")
  const [sucesso, setSucesso] = useState(false)

  const hoje = new Date().toLocaleDateString("pt-BR")

  const [form, setForm] = useState({
    cnpj: "", razao: "", ativo: "", tag: config.tagDefault,
    finalidade: "", cpf: "",
    sistema: "", subsistema: "", anomalia: "",
    origem: "", local: "", complemento: "",
    gravidade: "1", urgencia: "1", abrangencia: "1", exposicao: "1",
    gr: 20, prioridade: "Baixa",
    nc: "", cp: "",
  })

  useEffect(() => {
    const tipoServico = config.tipoServico
    const buscar = async () => {
      const { data: sc } = await supabase
        .from("sistemas_construtivos")
        .select("sistema")
        .eq("tipo_servico", tipoServico)
        .order("sistema")
      if (sc) setSistemas([...new Set(sc.map((r: any) => r.sistema))] as string[])

      const { data: tp } = await supabase
        .from("tabela_parametros")
        .select("descricao_parametros")
        .eq("tipo_servico", tipoServico)
        .eq("tipo_parametro", "Local ocorrência")
        .order("descricao_parametros")
      if (tp) setLocais(tp.map((r: any) => r.descricao_parametros))
    }
    buscar()
    const nr = getFotoNr(tipo)
    setFotoNr(nr)
    setFotoNrDisplay(String(nr).padStart(3, "0"))
  }, [tipo])

  useEffect(() => {
    if (!form.sistema) { setSubsistemas([]); setAnomalias([]); return }
    const tipoServico = config.tipoServico
    const buscar = async () => {
      const { data } = await supabase
        .from("sistemas_construtivos")
        .select("subsistema")
        .eq("tipo_servico", tipoServico)
        .eq("sistema", form.sistema)
        .order("subsistema")
      if (data) setSubsistemas(data.map((r: any) => r.subsistema))
    }
    buscar()
    setForm(f => ({ ...f, subsistema: "", anomalia: "" }))
    setAnomalias([])
  }, [form.sistema])

  useEffect(() => {
    if (!form.subsistema || !form.sistema) { setAnomalias([]); return }
    const tipoServico = config.tipoServico
    const buscar = async () => {
      const { data } = await supabase
        .from("sistemas_construtivos")
        .select("anomalias")
        .eq("tipo_servico", tipoServico)
        .eq("sistema", form.sistema)
        .eq("subsistema", form.subsistema)
        .single()
      if (data?.anomalias) {
        setAnomalias(data.anomalias.split(";").map((a: string) => a.trim()).filter(Boolean))
      }
    }
    buscar()
    setForm(f => ({ ...f, anomalia: "" }))
  }, [form.subsistema])

  const calcRisk = (f: typeof form) => {
    const gr = Math.round((0.4 * +f.gravidade + 0.3 * +f.urgencia + 0.2 * +f.abrangencia + 0.1 * +f.exposicao) * 20)
    const prioridade = gr >= 64 ? "Alta" : gr >= 35 ? "Média" : "Baixa"
    return { gr, prioridade }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(f => {
      const novo = { ...f, [name]: value }
      if (["gravidade","urgencia","abrangencia","exposicao"].includes(name)) {
        const { gr, prioridade } = calcRisk(novo)
        novo.gr = gr; novo.prioridade = prioridade
      }
      return novo
    })
  }

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Usar URL temporária sem canvas para evitar problema de memória
    const url = URL.createObjectURL(file)
    setFoto(url)
    gerarIA()
  }

  const gerarIA = async () => {
    if (!form.sistema || !form.subsistema || !form.anomalia) return
    const sistemaLimpo = form.sistema.replace(/^\d+[_\s—\-]+/, "")
    const abrEl = document.getElementById("abrangencia") as HTMLSelectElement
    const abrangencia = abrEl?.options[abrEl.selectedIndex]?.text || ""
    setStatusIA("Avaliando características do ambiente...")
    const pNC = `Como engenheiro diagnóstico especialista em patologia de edificações, descreva a Não conformidade: Sistema: ${sistemaLimpo}, Subsistema: ${form.subsistema}, Anomalia: ${form.anomalia}, Local: ${form.local} ${form.complemento}. Máximo 200 caracteres, sem causa ou solução. Responda apenas a descrição.`
    const pCP = `Como engenheiro diagnóstico especialista em patologia de edificações, descreva a Causa provável: Sistema: ${sistemaLimpo}, Subsistema: ${form.subsistema}, Anomalia: ${form.anomalia}, Origem: ${form.origem}, Abrangência: ${abrangencia}. Máximo 200 caracteres. Responda apenas a descrição.`
    try {
      setStatusIA("Cruzando parâmetros...")
      const [r1, r2] = await Promise.all([
        fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: pNC }] }) }),
        fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: pCP }] }) }),
      ])
      setStatusIA("Gerando descrições...")
      const d1 = await r1.json(); const d2 = await r2.json()
      setForm(f => ({ ...f, nc: d1.content?.[0]?.text || "", cp: d2.content?.[0]?.text || "" }))
      setStatusIA("")
    } catch { setStatusIA("") }
  }

  const handleSalvar = () => {
    if (!foto) { alert("Adicione uma foto antes de salvar."); return }
    salvarFotoNr(tipo, fotoNr)
    const proximo = fotoNr + 1
    setFotoNr(proximo)
    setFotoNrDisplay(String(proximo).padStart(3, "0"))
    setTimeout(() => window.print(), 300)
    setTimeout(() => setSucesso(true), 800)
  }

  const handleNovo = () => {
    setForm(f => ({ ...f, sistema: "", subsistema: "", anomalia: "", origem: "", local: "", complemento: "", gravidade: "1", urgencia: "1", abrangencia: "1", exposicao: "1", gr: 20, prioridade: "Baixa", nc: "", cp: "", finalidade: "" }))
    setFoto(null)
    setSucesso(false)
    setStatusIA("")
  }

  const priorCor = form.prioridade === "Alta" ? "#CC0000" : form.prioridade === "Média" ? "#8A5C00" : "#1A7A3C"
  const priorBg = form.prioridade === "Alta" ? "#FCEBEB" : form.prioridade === "Média" ? "#FFF0C2" : "#E6F5EE"
  const barCor = form.prioridade === "Alta" ? "#E24B4A" : form.prioridade === "Média" ? "#E8A000" : "#1A7A3C"

  const s: Record<string, React.CSSProperties> = {
    page: { backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" },
    card: { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,.15)", width: "100%", maxWidth: "210mm", overflow: "hidden" },
    header: { backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" },
    body: { padding: "10px 14px", display: "flex", flexDirection: "column", gap: "6px" },
    block: { border: "1px solid #c3d4f0", borderRadius: "6px", overflow: "hidden" },
    blockTitle: { backgroundColor: "#1E3A8A", color: "white", fontSize: "7.5pt", fontWeight: 600, padding: "3px 10px" },
    blockBody: { padding: "5px 10px", display: "flex", flexDirection: "column", gap: "4px" },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" },
    row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" },
    row4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px" },
    field: { display: "flex", flexDirection: "column", gap: "1px" },
    label: { fontSize: "6.5pt", fontWeight: 600, color: "#4a6480" },
    input: { width: "100%", border: "1px solid #c3d4f0", borderRadius: "4px", padding: "2px 5px", fontSize: "7.5pt", fontFamily: "inherit", backgroundColor: "white" },
    readonly: { width: "100%", border: "1px solid #c3d4f0", borderRadius: "4px", padding: "2px 5px", fontSize: "7.5pt", fontFamily: "inherit", backgroundColor: "#f5f7fc", color: "#888", textAlign: "center" as const },
    metric: { backgroundColor: "#E8EEF7", border: "1px solid #c3d4f0", borderRadius: "5px", padding: "3px 8px", display: "flex", alignItems: "center", gap: "8px" },
    photoArea: { border: "1.5px dashed #c3d4f0", borderRadius: "5px", backgroundColor: "#E8EEF7", height: "90mm", position: "relative" as const, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    footer: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" },
    btnSec: { padding: "6px 0", fontSize: "8pt", fontWeight: 700, borderRadius: "50px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "white", border: "2px solid #1E3A8A", color: "#1E3A8A", fontFamily: "inherit" },
    btnPri: { padding: "6px 0", fontSize: "8pt", fontWeight: 700, borderRadius: "50px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1E3A8A", border: "2px solid #1E3A8A", color: "white", fontFamily: "inherit" },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "11pt", fontWeight: 700, color: "white" }}>{config.titulo}</div>
            <div style={{ fontSize: "7pt", color: "rgba(255,255,255,0.75)", marginTop: "2px" }}>Formulário para registro de manifestações patológicas e classificação de riscos</div>
          </div>
        </div>
        <div style={{ height: "2px", backgroundColor: "#1E3A8A" }} />

        {sucesso ? (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <p style={{ color: "#1E3A8A", fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>Registro salvo com sucesso!</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={handleNovo} style={s.btnPri}>Nova manifestação</button>
              <button onClick={() => window.location.href = "/dashboard"} style={s.btnSec}>Voltar ao menu</button>
            </div>
          </div>
        ) : (
          <div style={s.body}>
            <div style={s.block}>
              <div style={s.blockTitle}>Identificação</div>
              <div style={s.blockBody}>
                <div style={s.row2}>
                  <div style={s.field}>
                    <label style={s.label}>{config.cnpjOnly ? "CNPJ" : "CNPJ / CPF"}</label>
                    <input name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" style={s.input} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Razão social</label>
                    <input name="razao" value={form.razao} onChange={handleChange} placeholder="Nome do estabelecimento" style={s.input} />
                  </div>
                </div>
                <div style={s.row3}>
                  <div style={s.field}>
                    <label style={s.label}>Ativo a vistoriar</label>
                    <select name="ativo" value={form.ativo} onChange={handleChange} style={s.input}>
                      <option value="">Selecione...</option>
                      {(ATIVOS[tipo] || []).map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Tag / Nr série</label>
                    <input name="tag" value={form.tag} readOnly style={s.readonly} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Finalidade da vistoria</label>
                    <input name="finalidade" value={form.finalidade} onChange={handleChange} placeholder="Descreva" style={s.input} />
                  </div>
                </div>
              </div>
            </div>

            <div style={s.block}>
              <div style={s.blockTitle}>Manifestação Patológica</div>
              <div style={s.blockBody}>
                <div style={s.row3}>
                  <div style={s.field}>
                    <label style={s.label}>Sistema</label>
                    <select name="sistema" value={form.sistema} onChange={handleChange} style={s.input}>
                      <option value="">Selecione...</option>
                      {sistemas.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Subsistema</label>
                    <select name="subsistema" value={form.subsistema} onChange={handleChange} style={s.input}>
                      <option value="">Selecione...</option>
                      {subsistemas.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Anomalia / Falha</label>
                    <select name="anomalia" value={form.anomalia} onChange={handleChange} style={s.input}>
                      <option value="">Selecione...</option>
                      {anomalias.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div style={s.row3}>
                  <div style={s.field}>
                    <label style={s.label}>Origem</label>
                    <select name="origem" value={form.origem} onChange={handleChange} style={s.input}>
                      <option value="">Selecione...</option>
                      {ORIGENS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Local de ocorrência</label>
                    <select name="local" value={form.local} onChange={handleChange} style={s.input}>
                      <option value="">Selecione...</option>
                      {locais.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Complemento do local</label>
                    <input name="complemento" value={form.complemento} onChange={handleChange} placeholder="Ex: Apto 42" style={s.input} />
                  </div>
                </div>
              </div>
            </div>

            <div style={s.block}>
              <div style={s.blockTitle}>Classificação de Risco</div>
              <div style={s.blockBody}>
                <div style={s.row4}>
                  {[
                    { name: "gravidade", label: "Gravidade", opts: [["1","Estética"],["2","Leve"],["3","Moderada"],["4","Alta"],["5","Crítica"]] },
                    { name: "urgencia", label: "Urgência", opts: [["1","Pode aguardar"],["3","Planejar"],["5","Imediata"]] },
                    { name: "abrangencia", label: "Abrangência", opts: [["1","Ponto isolado"],["3","Vários pontos"],["5","Sistema completo"]] },
                    { name: "exposicao", label: "Exposição", opts: [["1","Baixa"],["3","Média"],["5","Alta"]] },
                  ].map(f => (
                    <div key={f.name} style={s.field}>
                      <label style={s.label}>{f.label}</label>
                      <select id={f.name} name={f.name} value={(form as any)[f.name]} onChange={handleChange} style={s.input}>
                        {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  <div style={s.metric}>
                    <span style={{ fontSize: "6.5pt", color: "#4a6480", fontWeight: 600 }}>Grau de Risco</span>
                    <span style={{ fontSize: "13pt", fontWeight: 700, color: "#1E3A8A" }}>{form.gr}</span>
                    <div style={{ flex: 1, height: "5px", backgroundColor: "#c3d4f0", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${form.gr}%`, backgroundColor: barCor, borderRadius: "99px" }} />
                    </div>
                  </div>
                  <div style={{ ...s.metric, justifyContent: "center", gap: "8px" }}>
                    <span style={{ fontSize: "6.5pt", color: "#4a6480", fontWeight: 600 }}>Prioridade</span>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "99px", fontSize: "7.5pt", fontWeight: 700, backgroundColor: priorBg, color: priorCor }}>
                      {form.prioridade === "Alta" ? "▲" : form.prioridade === "Média" ? "●" : "▼"} {form.prioridade}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={s.block}>
              <div style={s.blockTitle}>Evidência Fotográfica</div>
              <div style={s.blockBody}>
                <div style={{ display: "grid", gridTemplateColumns: "70px 1fr auto", gap: "6px", alignItems: "end", marginBottom: "4px" }}>
                  <div style={s.field}>
                    <label style={s.label}>Foto nº</label>
                    <input value={fotoNrDisplay} readOnly style={s.readonly} />
                  </div>
                  <div style={{ ...s.field, alignItems: "center" }}>
                    <label style={{ ...s.label, textAlign: "center" }}>Data da vistoria</label>
                    <div style={{ fontSize: "7.5pt", color: "#1E3A8A", fontWeight: 600, textAlign: "center", padding: "2px 5px", border: "1px solid #c3d4f0", borderRadius: "4px", backgroundColor: "#f5f7fc", width: "100%" }}>{hoje}</div>
                  </div>
                  <label htmlFor="file-input" style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 12px", height: "24px", backgroundColor: "#E8EEF7", border: "1px solid #c3d4f0", borderRadius: "4px", cursor: "pointer", fontSize: "7pt", color: "#1E3A8A", whiteSpace: "nowrap" as const, fontFamily: "inherit" }}>
                    📷 Adicionar foto
                  </label>
                  <input id="file-input" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFoto} />
                </div>
                <label htmlFor="file-input" style={{...s.photoArea}}>
                  {foto
                    ? <img src={foto} alt="Foto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: "7pt", color: "#4a6480" }}>Clique para adicionar foto</span>
                  }
                </label>
              </div>
            </div>

            <div style={s.block}>
              <div style={s.blockTitle}>Resultado da Análise e Avaliação</div>
              <div style={s.blockBody}>
                {statusIA && <div style={{ fontSize: "6.5pt", color: "#1E3A8A", padding: "2px 6px", backgroundColor: "#E8EEF7", borderRadius: "4px" }}>⏳ {statusIA}</div>}
                <div style={s.field}>
                  <label style={s.label}>Descrição da não conformidade (NC)</label>
                  <textarea name="nc" value={form.nc} onChange={handleChange} placeholder="Gerado por IA após adicionar foto..." rows={2} style={{ ...s.input, resize: "vertical" }} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Descrição da causa provável (CP)</label>
                  <textarea name="cp" value={form.cp} onChange={handleChange} placeholder="Gerado por IA após adicionar foto..." rows={2} style={{ ...s.input, resize: "vertical" }} />
                </div>
              </div>
            </div>

            <div style={s.footer}>
              <button onClick={() => window.location.href = "/dashboard"} style={s.btnSec}>Encerrar vistoria</button>
              <button onClick={handleSalvar} style={s.btnPri}>Salvar dados</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
