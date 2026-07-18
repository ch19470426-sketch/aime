"use client"
export const dynamic = 'force-dynamic'
import { useState } from "react"
import Image from "next/image"

// ─── Regras dos planos ────────────────────────────────────────────────────────
// SM atual usado como base de cálculo
const SM = 1518.00

const PLANOS = {
  "PLANO MENSAL": {
    descricao: "6,5% do SM/mês · até 4 laudos/mês · válido até cancelamento",
    pct: 0.065,
    nr_laudos_mes: 4,
    prazo_fixo: false,       // sem prazo definido — válido até cancelar
    prazo_dias: null,
    desconto_promocao: 0.10, // 10% de desconto na promoção
    base_valor: "mes",
  },
  "PLANO SERVIÇO": {
    descricao: "2,5% do SM/laudo · desconto 10% para mais de 5 laudos contratados",
    pct: 0.025,
    nr_laudos_mes: null,     // sem limite mensal
    prazo_fixo: false,
    prazo_dias: null,
    desconto_qtd: { minimo: 5, desconto: 0.10 },
    base_valor: "laudo",
  },
  "PLANO ESCRITÓRIO": {
    descricao: "17% do SM/mês · até 12 laudos/mês · válido até cancelamento",
    pct: 0.17,
    nr_laudos_mes: 12,
    prazo_fixo: false,
    prazo_dias: null,
    desconto_promocao: 0.10,
    base_valor: "mes",
  },
  "PLANO CORTESIA": {
    descricao: "Gratuito · máximo 2 laudos · prazo de 15 dias",
    pct: 0,
    nr_laudos_mes: null,
    nr_laudos_total: 2,
    prazo_fixo: true,
    prazo_dias: 15,
    desconto_promocao: 0,
    base_valor: "contrato",
  },
}

const NOMES_PAGOS = ["PLANO MENSAL", "PLANO SERVIÇO", "PLANO ESCRITÓRIO"]

// ─── Utilitários ─────────────────────────────────────────────────────────────
const maskCPF = (v: string) =>
  v.replace(/\D/g,"").slice(0,11)
   .replace(/(\d{3})(\d)/,"$1.$2")
   .replace(/(\d{3})(\d)/,"$1.$2")
   .replace(/(\d{3})(\d{1,2})$/,"$1-$2")

const hoje = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
}

const addDias = (dataStr: string, dias: number) => {
  const [d,m,a] = dataStr.split("/").map(Number)
  const dt = new Date(a, m-1, d)
  dt.setDate(dt.getDate() + dias)
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`
}

const brToIso = (br: string) => {
  const [d,m,a] = br.split("/")
  return `${a}-${m}-${d}`
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function ContratosInspetor() {
  const [cpf, setCpf]                     = useState("")
  const [tipoPlano, setTipoPlano]         = useState("")
  const [emPromocao, setEmPromocao]       = useState(false)
  const [qtdLaudos, setQtdLaudos]         = useState("")  // só para PLANO SERVIÇO
  const [salvando, setSalvando]           = useState(false)
  const [erro, setErro]                   = useState("")
  const [sucesso, setSucesso]             = useState(false)

  const plano = PLANOS[tipoPlano as keyof typeof PLANOS]

  // Calcular valor
  const calcValor = () => {
    if (!plano || plano.pct === 0) return "Gratuito"
    if (tipoPlano === "PLANO SERVIÇO") {
      const qtd = Number(qtdLaudos) || 1
      const desc = (plano as any).desconto_qtd?.minimo <= qtd ? (plano as any).desconto_qtd?.desconto : 0
      const valor = SM * plano.pct * qtd * (1 - desc)
      return `R$ ${valor.toFixed(2).replace(".", ",")}${desc > 0 ? ` (${(desc*100).toFixed(0)}% desc.)` : ""}`
    }
    const desc = emPromocao ? (plano as any).desconto_promocao ?? 0 : 0
    const valor = SM * plano.pct * (1 - desc)
    return `R$ ${valor.toFixed(2).replace(".", ",")}${desc > 0 ? ` (${(desc*100).toFixed(0)}% desc. promoção)` : ""}/mês`
  }

  const calcDataFim = () => {
    if (!plano) return ""
    if (!plano.prazo_fixo) return "Válido até cancelamento"
    return addDias(hoje(), plano.prazo_dias ?? 15)
  }

  const calcSaldo = () => {
    if (!plano) return ""
    if (tipoPlano === "PLANO CORTESIA") return "2 laudos"
    if (tipoPlano === "PLANO SERVIÇO") return qtdLaudos ? `${qtdLaudos} laudo(s)` : "—"
    if (tipoPlano === "PLANO MENSAL") return "4 laudos/mês"
    if (tipoPlano === "PLANO ESCRITÓRIO") return "12 laudos/mês"
    return ""
  }

  const handleSalvar = async () => {
    setErro("")
    const cpfLimpo = cpf.replace(/\D/g,"")
    if (cpfLimpo.length !== 11) { setErro("Informe um CPF válido."); return }
    if (!tipoPlano) { setErro("Selecione o tipo de plano."); return }
    if (tipoPlano === "PLANO SERVIÇO" && (!qtdLaudos || Number(qtdLaudos) < 1)) {
      setErro("Informe a quantidade de laudos contratados.")
      return
    }
    setSalvando(true)
    try {
      const dataInicio = hoje()
      const dataFim = plano.prazo_fixo ? brToIso(calcDataFim()) : null
      const qtd = tipoPlano === "PLANO SERVIÇO" ? Number(qtdLaudos) : null
      const descQtd = tipoPlano === "PLANO SERVIÇO" && qtd && qtd > 5 ? 0.10 : 0
      const descPromo = emPromocao && (plano as any).desconto_promocao ? (plano as any).desconto_promocao : 0
      const descAplicado = Math.max(descQtd, descPromo)
      const valorMes = (tipoPlano === "PLANO MENSAL" || tipoPlano === "PLANO ESCRITÓRIO")
        ? SM * plano.pct * (1 - descAplicado)
        : null
      const valorLaudo = tipoPlano === "PLANO SERVIÇO"
        ? SM * plano.pct * (1 - descAplicado)
        : null

      const res = await fetch("/api/salvar-contrato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf_inspetor:          cpfLimpo,
          tipo_assinatura:       tipoPlano,
          data_inicio_contrato:  brToIso(dataInicio),
          data_fim_contrato:     dataFim,
          nr_laudos_contratados: qtd,
          valor_mensal:          valorMes ? Number(valorMes.toFixed(2)) : null,
          valor_por_laudo:       valorLaudo ? Number(valorLaudo.toFixed(2)) : null,
          desconto_aplicado:     descAplicado,
          em_promocao:           emPromocao,
        })
      })
      const data = await res.json()
      if (!res.ok || data.erro) { setErro(data.erro ?? "Não foi possível salvar."); setSalvando(false); return }
      setSucesso(true)
    } catch { setErro("Não foi possível conectar. Tente novamente."); setSalvando(false) }
  }

  // ── Estilos ──
  const S = {
    label:  { fontSize:"12px", fontWeight:"600" as const, color:"#374151", display:"block", marginBottom:"3px" },
    input:  { border:"1px solid #D1D5DB", borderRadius:"6px", padding:"6px 10px", fontSize:"13px", width:"100%", outline:"none", boxSizing:"border-box" as const },
    ro:     { border:"1px solid #E2E8F0", borderRadius:"6px", padding:"6px 10px", fontSize:"13px", width:"100%", backgroundColor:"#F8FAFC", color:"#374151", boxSizing:"border-box" as const },
    bloco:  { border:"1px solid #E2E8F0", borderRadius:"8px", overflow:"hidden", marginBottom:"10px" },
    bHead:  { backgroundColor:"#1E3A8A", padding:"4px 12px" },
    bTitle: { color:"white", fontWeight:"bold" as const, fontSize:"11px" },
    bBody:  { padding:"10px 12px" },
    g2:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" },
    g3:     { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px" },
    btn:    { padding:"10px 24px", borderRadius:"50px", border:"none", backgroundColor:"#1E3A8A", color:"white", fontWeight:"600" as const, fontSize:"13px", cursor:"pointer" },
    btnSec: { padding:"10px 24px", borderRadius:"50px", border:"2px solid #1E3A8A", backgroundColor:"white", color:"#1E3A8A", fontWeight:"600" as const, fontSize:"13px", cursor:"pointer" },
  }

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"720px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"14px",flex:1,textAlign:"center"}}>Contratos do Inspetor</span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
        <div style={{padding:"16px"}}>

          {sucesso ? (
            <div style={{textAlign:"center",padding:"32px"}}>
              <p style={{color:"#1E3A8A",fontSize:"15px",fontWeight:"bold",marginBottom:"16px"}}>Contrato registrado com sucesso!</p>
              <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
                <button style={S.btn} onClick={() => { setSucesso(false); setCpf(""); setTipoPlano(""); setEmPromocao(false); setQtdLaudos("") }}>
                  Novo Registro
                </button>
                <button style={S.btnSec} onClick={() => window.location.href="/dashboard"}>
                  Voltar ao Menu
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Identificação */}
              <div style={S.bloco}>
                <div style={S.bHead}><span style={S.bTitle}>Identificação</span></div>
                <div style={S.bBody}>
                  <div style={S.g2}>
                    <div>
                      <label style={S.label}>CPF do Inspetor *</label>
                      <input style={{...S.input,textAlign:"center"}} value={cpf}
                        onChange={e => setCpf(maskCPF(e.target.value))}
                        placeholder="000.000.000-00" inputMode="numeric" />
                    </div>
                    <div>
                      <label style={S.label}>Data de início</label>
                      <input style={{...S.ro,textAlign:"center"}} value={hoje()} readOnly />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipo de Plano */}
              <div style={S.bloco}>
                <div style={S.bHead}><span style={S.bTitle}>Plano Contratado</span></div>
                <div style={S.bBody}>
                  <div style={{marginBottom:"8px"}}>
                    <label style={S.label}>Tipo de Plano *</label>
                    <select style={S.input} value={tipoPlano}
                      onChange={e => { setTipoPlano(e.target.value); setEmPromocao(false); setQtdLaudos("") }}>
                      <option value="">Selecione...</option>
                      {Object.keys(PLANOS).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  {plano && (
                    <div style={{backgroundColor:"#F0F4FF",border:"1px solid #C7D7FF",borderRadius:"6px",padding:"8px 10px",fontSize:"11px",color:"#1E3A8A",marginBottom:"8px"}}>
                      {plano.descricao}
                    </div>
                  )}

                  {/* Quantidade de laudos — só para PLANO SERVIÇO */}
                  {tipoPlano === "PLANO SERVIÇO" && (
                    <div style={{marginBottom:"8px"}}>
                      <label style={S.label}>Quantidade de laudos contratados *</label>
                      <input style={{...S.input,width:"120px"}} type="number" min="1"
                        value={qtdLaudos} onChange={e => setQtdLaudos(e.target.value)}
                        placeholder="Ex: 6" />
                      {Number(qtdLaudos) > 5 && (
                        <span style={{marginLeft:"8px",fontSize:"11px",color:"#059669"}}>✓ Desconto de 10% aplicado</span>
                      )}
                    </div>
                  )}

                  {/* Promoção — para MENSAL e ESCRITÓRIO */}
                  {(tipoPlano === "PLANO MENSAL" || tipoPlano === "PLANO ESCRITÓRIO") && (
                    <div style={{marginBottom:"8px",display:"flex",alignItems:"center",gap:"8px"}}>
                      <input type="checkbox" id="promo" checked={emPromocao}
                        onChange={e => setEmPromocao(e.target.checked)} />
                      <label htmlFor="promo" style={{...S.label,marginBottom:0,cursor:"pointer"}}>
                        Aplicar desconto de promoção (10%)
                      </label>
                    </div>
                  )}

                  {/* Resumo calculado */}
                  {plano && (
                    <div style={{...S.g3,marginTop:"8px"}}>
                      <div>
                        <label style={S.label}>Valor</label>
                        <div style={{...S.ro,textAlign:"right"}}>{calcValor()}</div>
                      </div>
                      <div>
                        <label style={S.label}>Saldo de laudos</label>
                        <div style={{...S.ro,textAlign:"center"}}>{calcSaldo()}</div>
                      </div>
                      <div>
                        <label style={S.label}>Vigência</label>
                        <div style={{...S.ro,textAlign:"center",fontSize:"11px"}}>{calcDataFim()}</div>
                      </div>
                    </div>
                  )}

                  {/* Aviso migração */}
                  {tipoPlano === "PLANO CORTESIA" && (
                    <div style={{marginTop:"8px",padding:"8px 10px",backgroundColor:"#FFF9E6",border:"1px solid #F59E0B",borderRadius:"6px",fontSize:"11px",color:"#92400E"}}>
                      ⚠️ Não é permitido migrar de PLANO MENSAL, PLANO SERVIÇO ou PLANO ESCRITÓRIO para PLANO CORTESIA.
                    </div>
                  )}
                </div>
              </div>

              {erro && <p style={{color:"#DC2626",fontSize:"12px",textAlign:"center",marginBottom:"10px"}}>{erro}</p>}

              <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
                <button style={S.btnSec} onClick={() => window.location.href="/dashboard"}>Cancelar</button>
                <button style={{...S.btn,opacity:salvando?0.7:1}} onClick={handleSalvar} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar Contrato"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
