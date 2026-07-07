// src/app/dashboard/page.tsx
// AIMÊ — Dashboard com sub-tela reorganizada conforme spec
//   - Bloco CNPJ/CPF compacto (altura -60%) no canto superior esquerdo
//   - Avatar mie_orienta no canto superior direito
//   - Título "Procedimento para Execução do Serviço" centralizado entre os dois
//   - Área reservada abaixo para descrição do procedimento (implementação futura)
//   - CPF coletado para tipos 13, 23, 33, 43 / CNPJ para os demais

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"

// TODO: buscar cpf_inspetor e titulo_profissional do perfil logado via Supabase auth
const cpfInspetor   = "12345678900"
const chaveInspetor = "INS-001"
const titulo        = "Eng Mecânico"

const permissoes: Record<string, number[]> = {
  "Arquiteto":          [11,12,13,19,21,22,23,29,31,32,33,40,41,42,43,49,61,62,99],
  "Eng Civil":          [11,12,13,14,19,21,22,23,24,29,31,32,33,34,40,41,42,43,44,49,61,62,99],
  "Eng Elétrico":       [16,26,36,40,46,61,62,99],
  "Eng Mecânico":       [15,17,18,25,27,28,35,37,38,40,45,47,48,61,62,99],
  "Técnico Edificação": [13,23,33,40,43,61,62,99],
}

const menuGrupos = [
  { grupo: "Propostas Comerciais", itens: [
    { codigo: 11, label: "Proposta Autovistoria" },
    { codigo: 12, label: "Proposta Inspeção" },
    { codigo: 13, label: "Proposta Imóvel Novo" },
    { codigo: 14, label: "Proposta Fachada" },
    { codigo: 15, label: "Proposta Elevador" },
    { codigo: 16, label: "Proposta NR-10" },
    { codigo: 17, label: "Proposta NR-12" },
    { codigo: 18, label: "Proposta NR-13" },
    { codigo: 19, label: "Proposta Plano Manutenção" },
  ]},
  { grupo: "Planos de Trabalho", itens: [
    { codigo: 21, label: "Plano Trabalho Autovistoria" },
    { codigo: 22, label: "Plano Trabalho Inspeção" },
    { codigo: 23, label: "Plano Trabalho Imóvel Novo" },
    { codigo: 24, label: "Plano Trabalho Fachada" },
    { codigo: 25, label: "Plano Trabalho Elevador" },
    { codigo: 26, label: "Plano Trabalho NR-10" },
    { codigo: 27, label: "Plano Trabalho NR-12" },
    { codigo: 28, label: "Plano Trabalho NR-13" },
    { codigo: 29, label: "Plano Trabalho Manutenção" },
  ]},
  { grupo: "Vistorias", itens: [
    { codigo: 31, label: "Autovistoria" },
    { codigo: 32, label: "Vistoria Inspeção" },
    { codigo: 33, label: "Vistoria Imóvel Novo" },
    { codigo: 34, label: "Vistoria Fachada" },
    { codigo: 35, label: "Vistoria Elevador" },
    { codigo: 36, label: "Vistoria NR-10" },
    { codigo: 37, label: "Vistoria NR-12" },
    { codigo: 38, label: "Vistoria NR-13" },
  ]},
  { grupo: "Laudos", itens: [
    { codigo: 40, label: "Homologar Vistoria" },
    { codigo: 41, label: "Laudo Autovistoria" },
    { codigo: 42, label: "Laudo Inspeção" },
    { codigo: 43, label: "Laudo Imóvel Novo" },
    { codigo: 44, label: "Laudo Fachada" },
    { codigo: 45, label: "Laudo Elevador" },
    { codigo: 46, label: "Laudo NR-10" },
    { codigo: 47, label: "Laudo NR-12" },
    { codigo: 48, label: "Laudo NR-13" },
    { codigo: 49, label: "Plano Manutenção Edificação" },
  ]},
  { grupo: "Outros", itens: [
    { codigo: 61, label: "Baixar Documentos" },
    { codigo: 62, label: "Situação do Contrato" },
    { codigo: 99, label: "Sair do Aplicativo" },
  ]},
]

// Tipos de serviço que são vistorias (abre tela de CNPJ/CPF)
const CODIGOS_VISTORIA = [31, 32, 33, 34, 35, 36, 37, 38]

// Tipos de serviço que coletam CPF (pessoa física) em vez de CNPJ
const CODIGOS_CPF = [13, 23, 33, 43]

const TIPO_SERVICO_BANCO: Record<number, string> = {
  31: "31 Autovistoria",
  32: "32 Vistoria inspeção",
  33: "33 Vistoria imóvel novo",
  34: "34 Vistoria fachada",
  35: "35 Vistoria elevador",
  36: "36 Vistoria nr-10",
  37: "37 Vistoria nr-12",
  38: "38 Vistoria nr-13",
}


const PROC_PROPOSTAS = (
  <div>
    <div style={{ fontSize: '11px', color: '#1E3A8A', fontWeight: 700, marginBottom: '8px' }}>Procedimento</div>
    <ul style={{ fontSize: '11px', color: '#374151', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
      <li>Informe o <strong>CNPJ do estabelecimento</strong> na tela ao lado e clique em <strong>Iniciar</strong>.</li>
      <li>Efetue o cadastro ou atualize os dados do estabelecimento.</li>
      <li>Será apresentada uma minuta da proposta comercial com cabeçalho e rodapé do inspetor.</li>
      <li>Informe o valor do serviço e o prazo para entrega do laudo.</li>
      <li>Revise integralmente e efetue ajustes técnicos antes da homologação.</li>
      <li>Homologue o documento em PDF com sua assinatura digital.</li>
      <li>O documento será armazenado em <strong>"Documentos inspetor"</strong>.</li>
    </ul>
  </div>
)

const PROC_PLANOS = (
  <div>
    <div style={{ fontSize: '11px', color: '#1E3A8A', fontWeight: 700, marginBottom: '8px' }}>Procedimento</div>
    <ul style={{ fontSize: '11px', color: '#374151', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
      <li>Informe o <strong>CNPJ do estabelecimento</strong> na tela ao lado e clique em <strong>Iniciar</strong>.</li>
      <li>Se não cadastrado, efetue o cadastro na proposta comercial primeiro.</li>
      <li>Cadastre todos os <strong>ativos a vistoriar</strong> nesta inspeção.</li>
      <li>Complete as datas previstas no item <strong>1.1 – Plano de Trabalho</strong>.</li>
      <li>Revise e ajuste a relação de documentos no item <strong>1.2 – Relação de Documentos</strong>.</li>
      <li>Homologue o documento em PDF com sua assinatura digital.</li>
      <li>O documento será armazenado em <strong>"Documentos inspetor"</strong>.</li>
    </ul>
  </div>
)

const PROC_LAUDOS = (
  <div>
    <div style={{ fontSize: '11px', color: '#1E3A8A', fontWeight: 700, marginBottom: '8px' }}>Homologar Vistoria (40)</div>
    <ul style={{ fontSize: '11px', color: '#374151', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
      <li>Informe o CNPJ e clique em <strong>Iniciar</strong>. Revise NC e CP de cada registro.</li>
      <li>Use <strong>Revisar Anterior / Próximo</strong> para navegar entre registros.</li>
      <li>Clique em <strong>Descartar Coleta</strong> para excluir registros indesejados.</li>
      <li>Alterações nos campos geram nova NC/CP automaticamente.</li>
    </ul>
    <div style={{ fontSize: '11px', color: '#1E3A8A', fontWeight: 700, margin: '8px 0 4px' }}>Laudos (41–49)</div>
    <ul style={{ fontSize: '11px', color: '#374151', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
      <li>Informe o CNPJ e clique em <strong>Iniciar</strong>. O AIMÊ prepara a minuta do laudo.</li>
      <li>Informe fotos e dados solicitados: fachada, descrição, ART/RRT e recomendações.</li>
      <li>Revise integralmente e homologue em PDF com assinatura digital.</li>
      <li>O documento será armazenado em <strong>"Documentos inspetor"</strong>.</li>
    </ul>
  </div>
)

const PROC_OUTROS = (
  <div>
    <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.6, marginBottom: '8px' }}>
      <strong style={{ color: '#1E3A8A' }}>Objetivo:</strong> Baixar documentos gerados anteriormente (disponíveis por 12 meses) e consultar dados armazenados.
    </div>
    <ul style={{ fontSize: '11px', color: '#374151', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
      <li>Informe o CNPJ ou CPF quando solicitado e acione <strong>Iniciar</strong>.</li>
      <li>Acesse a opção desejada e proceda conforme o procedimento apresentado.</li>
      <li>Para encerrar selecione <strong>Sair do Aplicativo</strong>.</li>
    </ul>
  </div>
)

export default function Dashboard() {
  const router = useRouter()

  const [tipoServico, setTipoServico] = useState<number | null>(null)
  const [grupoAberto, setGrupoAberto] = useState<string | null>("Vistorias")
  const [documento, setDocumento] = useState("")
  const [estadoDoc, setEstadoDoc] = useState<"aguardando" | "verificando" | "nao_cadastrado" | "erro">("aguardando")
  const [msgErro, setMsgErro] = useState("")

  const permitidos = permissoes[titulo] || []
  const itemSelecionado = menuGrupos.flatMap((g) => g.itens).find((i) => i.codigo === tipoServico)
  const ehVistoria = tipoServico !== null && CODIGOS_VISTORIA.includes(Number(tipoServico))
  const coletaCpf  = tipoServico !== null && CODIGOS_CPF.includes(Number(tipoServico))

  // Formata CNPJ (00.000.000/0000-00) ou CPF (000.000.000-00) conforme o tipo de serviço
  function formatarDocumento(valor: string): string {
    const nums = valor.replace(/\D/g, "")
    if (coletaCpf) {
      return nums.slice(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    }
    return nums.slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }

  function documentoSemMascara(valor: string): string {
    return valor.replace(/\D/g, "")
  }

  function handleSelecionar(codigo: number) {
    if (!permitidos.includes(codigo)) return
    if (codigo === 99) { window.location.href = "/"; return }
    setTipoServico(codigo)
    setDocumento("")
    setEstadoDoc("aguardando")
  }

  async function handleIniciarVistoria() {
    const docLimpo = documentoSemMascara(documento)
    const tamanhoEsperado = coletaCpf ? 11 : 14
    if (docLimpo.length < tamanhoEsperado) {
      setMsgErro(`${coletaCpf ? "CPF" : "CNPJ"} incompleto (${docLimpo.length}/${tamanhoEsperado} dígitos)`)
      return
    }
    const url = `/vistoria/tela${tipoServico}?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${docLimpo}&tipo_servico=${tipoServico}`
    window.location.href = url
  }

  return (
    <div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", width: "100%", maxWidth: "1100px", overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
            Mapeamento Inteligente de Edificações e Equipamentos
          </span>
        </div>
        <div style={{ height: "2px", backgroundColor: "#1E3A8A" }} />

        <div style={{ display: "flex", minHeight: "500px" }}>

          {/* ── Menu lateral ── */}
          <div style={{ width: "220px", borderRight: "2px solid #1E3A8A", backgroundColor: "white", flexShrink: 0 }}>
            <div style={{ backgroundColor: "#1E3A8A", padding: "8px 16px" }}>
              <span style={{ color: "white", fontWeight: "bold", fontSize: "11px" }}>Selecionar Serviço</span>
            </div>
            <div style={{ height: "2px", backgroundColor: "#1E3A8A" }} />
            {menuGrupos.map((grupo) => (
              <div key={grupo.grupo}>
                <button onClick={() => setGrupoAberto(grupoAberto === grupo.grupo ? null : grupo.grupo)}
                  style={{ width: "100%", textAlign: "left", padding: "8px 12px", backgroundColor: "#F1F5F9", color: "#1E3A8A", fontWeight: "bold", fontSize: "11px", border: "none", borderBottom: "1px solid #E2E8F0", cursor: "pointer" }}>
                  {grupoAberto === grupo.grupo ? "▼" : "▶"} {grupo.grupo}
                </button>
                {grupoAberto === grupo.grupo && grupo.itens.map((item) => {
                  const habilitado = permitidos.includes(item.codigo)
                  const selecionado = tipoServico === item.codigo
                  return (
                    <button key={item.codigo} onClick={() => handleSelecionar(item.codigo)}
                      title={!habilitado ? "Não permitido para seu título profissional" : ""}
                      style={{
                        width: "100%", textAlign: "left", padding: "6px 12px 6px 20px",
                        backgroundColor: selecionado ? "#EBF1FF" : "white",
                        color: !habilitado ? "#C4C4C4" : selecionado ? "#1E3A8A" : "#374151",
                        fontWeight: selecionado ? "bold" : "normal",
                        fontSize: "11px", border: "none", borderBottom: "1px solid #F1F5F9",
                        cursor: habilitado ? "pointer" : "not-allowed",
                        opacity: habilitado ? 1 : 0.45,
                      }}>
                      {item.codigo} - {item.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* ── Área de conteúdo ── */}
          <div style={{ flex: 1, padding: "16px", backgroundColor: "#F8FAFC" }}>

            {/* Nenhum serviço selecionado */}
            {!tipoServico && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: "14px" }}>
                Selecione um serviço no menu ao lado
              </div>
            )}

            {/* Serviço selecionado mas não é vistoria */}
            {tipoServico && !ehVistoria && (
              <div style={{ backgroundColor: "white", borderRadius: "10px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
                <div style={{ backgroundColor: "#1E3A8A", padding: "10px 20px" }}>
                  <span style={{ color: "white", fontWeight: "bold", fontSize: "13px" }}>{itemSelecionado?.codigo} - {itemSelecionado?.label}</span>
                </div>
                <div style={{ height: "2px", backgroundColor: "#1E3A8A" }} />
                <div style={{ padding: "16px" }}>
                  {menuGrupos.find(g => g.itens.some(i => i.codigo === tipoServico))?.grupo === "Propostas Comerciais" && (<>{PROC_PROPOSTAS}</>)}
                  {menuGrupos.find(g => g.itens.some(i => i.codigo === tipoServico))?.grupo === "Planos de Trabalho" && (<>{PROC_PLANOS}</>)}
                  {menuGrupos.find(g => g.itens.some(i => i.codigo === tipoServico))?.grupo === "Laudos" && (<>{PROC_LAUDOS}</>)}
                  {menuGrupos.find(g => g.itens.some(i => i.codigo === tipoServico))?.grupo === "Outros" && (<>{PROC_OUTROS}</>)}
                </div>
              </div>
            )}

            {/* ════════ Vistoria selecionada: layout 3 zonas ════════ */}
            {tipoServico && ehVistoria && (
              <div>

                {/* Título do serviço */}
                <div style={{ backgroundColor: "#1E3A8A", padding: "8px 16px", borderRadius: "8px 8px 0 0" }}>
                  <span style={{ color: "white", fontWeight: "bold", fontSize: "12px" }}>
                    {itemSelecionado?.codigo} - {itemSelecionado?.label}
                  </span>
                </div>

                <div style={{ backgroundColor: "white", border: "1px solid #E2E8F0", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "12px" }}>

                  {/* ── Linha superior: CNPJ/CPF (esquerda) | Título (centro) | Avatar (direita) ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 90px", gap: "12px", alignItems: "start" }}>

                    {/* Zona esquerda: bloco CNPJ/CPF — altura reduzida em 60% */}
                    <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px", background: "#F8FAFF" }}>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>
                        {coletaCpf ? "CPF" : "CNPJ"} *
                      </label>
                      <input
                        type="text"
                        value={documento}
                        onChange={(e) => {
                          setDocumento(formatarDocumento(e.target.value))
                          setEstadoDoc("aguardando")
                        }}
                        placeholder={coletaCpf ? "000.000.000-00" : "00.000.000/0000-00"}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "8px" }}
                        onKeyDown={(e) => e.key === "Enter" && handleIniciarVistoria()}
                      />

                      {msgErro && (
                        <div style={{ fontSize: "10px", color: "#DC2626", marginTop: "4px", wordBreak: "break-all", background: "#FEF2F2", padding: "4px 6px", borderRadius: "4px" }}>
                          {msgErro}
                        </div>
                      )}

                      {estadoDoc === "nao_cadastrado" && (
                        <div style={{ fontSize: "10px", color: "#B45309", marginBottom: "6px", lineHeight: 1.3 }}>
                          ⚠️ Não cadastrado. O cadastro é feito na proposta comercial.
                        </div>
                      )}

                      <button
                        onTouchEnd={(e) => { e.preventDefault(); handleIniciarVistoria() }}
                        onClick={handleIniciarVistoria}
                        style={{
                          backgroundColor: "#1E3A8A", color: "white", fontWeight: "bold",
                          padding: "12px 16px", borderRadius: "9999px", fontSize: "14px",
                          border: "none", cursor: "pointer", width: "100%",
                          minHeight: "48px", WebkitTapHighlightColor: "rgba(0,0,0,0.2)",
                          touchAction: "manipulation",
                        }}
                      >
                        {estadoDoc === "verificando" ? "Verificando..." : "Iniciar →"}
                      </button>
                    </div>

                    {/* Zona central: título do procedimento */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                      <h3 style={{ color: "#1E3A8A", fontWeight: 700, fontSize: "15px", textAlign: "center", margin: 0 }}>
                        Procedimento para Execução do Serviço
                      </h3>
                    </div>

                    {/* Zona direita: avatar mie_orienta */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Image src="/mie_orienta.png" alt="Mie orienta" width={80} height={80}
                        style={{ objectFit: "contain" }} />
                    </div>
                  </div>

                  {/* ── Área reservada: descrição do procedimento (implementação futura) ── */}
                  <div style={{ marginTop: "16px", padding: "20px", border: "1px dashed #CBD5E1", borderRadius: "8px", minHeight: "180px", color: "#94A3B8", fontSize: "13px", textAlign: "center" }}>
                    [Reservado para descrição do procedimento de execução do serviço]
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
