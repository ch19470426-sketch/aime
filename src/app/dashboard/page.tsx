"use client"
export const dynamic = 'force-dynamic'
// src/app/dashboard/page.tsx
// AIMÊ — Dashboard
//   - Bloco CNPJ/CPF compacto (altura -60%) no canto superior esquerdo
//   - Avatar mie_orienta no canto superior direito
//   - Título "Procedimento para Execução do Serviço" centralizado entre os dois
//   - Área reservada abaixo para descrição do procedimento (implementação futura)
//   - CPF coletado para tipos 13, 23, 33, 43 / CNPJ para os demais

import { useState, useEffect } from "react"
import Banner from "@/components/Banner"
import { useBanner } from "@/hooks/useBanner"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

// Log síncrono no nível do módulo — aparece SEMPRE se o JS rodar no cliente
if (typeof window !== 'undefined') {
  console.log('[AIME-MODULE] Dashboard.tsx carregado no cliente')
}

const permissoes: Record<string, number[]> = {
  "Arquiteto":          [11,12,13,19,21,22,23,29,31,32,33,40,41,42,43,49,61,62,99],
  "Eng Civil":          [11,12,13,14,16,19,21,22,23,24,26,29,31,32,33,34,36,40,41,42,43,44,46,49,61,62,99],
  "Eng Elétrico":       [16,26,36,40,46,61,62,99],
  "Eng Mecânico":       [15,17,18,25,27,28,35,37,38,40,45,47,48,61,62,99],
  "Técnico Edificação": [13,23,33,40,43,61,62,99],
  "Corretor Imóvel":    [13,23,33,40,43,61,62,99],
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
    { codigo: 40, label: "Homologar vistoria e documentos solicitados" },
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
  { grupo: "Consultas e Relatórios", itens: [
    { codigo: 61, label: "Baixar Documentos" },
    { codigo: 62, label: "Situação do Contrato" },
    { codigo: 99, label: "Sair do Aplicativo" },
  ]},
]

// Tipos de serviço que são vistorias (abre tela de CNPJ/CPF)
const CODIGOS_VISTORIA = [11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,31,32,33,34,35,36,37,38,40]

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



function ProcedimentoGrupo({ codigo, grupo }: { codigo: number; grupo: string }) {
  const itemStyle: React.CSSProperties = { marginBottom: "4px" }
  const listStyle: React.CSSProperties = { paddingLeft: "16px", margin: "6px 0 0", fontSize: "11px", color: "#374151", lineHeight: 1.7 }
  const titleStyle: React.CSSProperties = { fontWeight: 700, color: "#1E3A8A", fontSize: "11px", marginBottom: "6px" }

  if (codigo === 40) return (
    <div>
      <p style={titleStyle}>Objetivo: Revisar, ajustar e homologar os dados coletados durante a vistoria.</p>
      <ul style={listStyle}>
        <li style={itemStyle}>▶ Informe o CNPJ e clique em <strong>Iniciar</strong>.</li>
        <li style={itemStyle}>▶ Revise NC e CP de cada registro. Use <strong>Revisar Anterior / Próximo</strong> para navegar.</li>
        <li style={itemStyle}>▶ Clique em <strong>Descartar Coleta</strong> para excluir registros indesejados.</li>
        <li style={itemStyle}>▶ Alterações nos campos geram nova NC/CP automaticamente.</li>
        <li style={itemStyle}>▶ Clique em <strong>Salvar dados</strong>. Repita até homologar todos os registros.</li>
      </ul>
    </div>
  )

  if (codigo === 61) return (
    <div>
      <p style={titleStyle}>Objetivo: Baixar documentos homologados (disponíveis por 12 meses).</p>
      <ul style={listStyle}>
        <li style={itemStyle}>▶ Informe o CNPJ do estabelecimento ou CPF do solicitante e clique em <strong>Iniciar</strong>.</li>
        <li style={itemStyle}>▶ Será apresentado o conjunto de documentos disponíveis para a chave informada.</li>
        <li style={itemStyle}>▶ Selecione o produto desejado e informe o diretório para download.</li>
        <li style={itemStyle}>▶ Após o download o AIMÊ retornará ao menu principal.</li>
      </ul>
    </div>
  )

  if (grupo === "Propostas Comerciais") return (
    <div>
      <p style={titleStyle}>Objetivo: Manter o cadastro do estabelecimento e preparar a proposta comercial.</p>
      <ul style={listStyle}>
        <li style={itemStyle}>▶ Informe o <strong>CNPJ do estabelecimento</strong> na tela ao lado e clique em <strong>Iniciar</strong>.</li>
        <li style={itemStyle}>▶ Efetue o cadastro ou atualize os dados do estabelecimento.</li>
        <li style={itemStyle}>▶ Será apresentada uma minuta da proposta com cabeçalho e rodapé do inspetor.</li>
        <li style={itemStyle}>▶ Informe o valor do serviço e o prazo para entrega do laudo.</li>
        <li style={itemStyle}>▶ Revise integralmente e efetue ajustes técnicos antes da homologação.</li>
        <li style={itemStyle}>▶ Homologue em PDF com assinatura digital. O documento será armazenado em <strong>"Documentos inspetor"</strong>.</li>
        <li style={itemStyle}>▶ Concluído, o AIMÊ retornará ao menu principal.</li>
      </ul>
    </div>
  )

  if (grupo === "Planos de Trabalho") return (
    <div>
      <p style={titleStyle}>Objetivo: Preparar o Plano de Trabalho e cadastrar os ativos a vistoriar.</p>
      <ul style={listStyle}>
        <li style={itemStyle}>▶ Informe o <strong>CNPJ do estabelecimento</strong> na tela ao lado e clique em <strong>Iniciar</strong>.</li>
        <li style={itemStyle}>▶ Se não cadastrado, efetue o cadastro na proposta comercial primeiro.</li>
        <li style={itemStyle}>▶ Cadastre todos os <strong>ativos a vistoriar</strong> nesta inspeção.</li>
        <li style={itemStyle}>▶ Complete as datas no item <strong>1.1 – Plano de Trabalho</strong>.</li>
        <li style={itemStyle}>▶ Revise e ajuste documentos no item <strong>1.2 – Relação de Documentos</strong>.</li>
        <li style={itemStyle}>▶ Homologue em PDF com assinatura digital. O documento será armazenado em <strong>"Documentos inspetor"</strong>.</li>
      </ul>
    </div>
  )

  if (grupo === "Laudos") return (
    <div>
      <p style={titleStyle}>Objetivo: Elaborar laudos complementando com fotos e dados do inspetor.</p>
      <ul style={listStyle}>
        <li style={itemStyle}>▶ Informe o CNPJ e clique em <strong>Iniciar</strong>. O AIMÊ prepara a minuta do laudo.</li>
        <li style={itemStyle}>▶ Informe fotos e dados: fachada, descrição, ART/RRT/CRECI, recomendações e conclusões.</li>
        <li style={itemStyle}>▶ O documento será gerado com tabelas por sistema e gráficos estatísticos.</li>
        <li style={itemStyle}>▶ Revise integralmente e homologue em PDF com assinatura digital.</li>
        <li style={itemStyle}>▶ O documento será armazenado em <strong>"Documentos inspetor"</strong>.</li>
        <li style={itemStyle}>▶ Concluído, o AIMÊ retornará ao menu principal.</li>
      </ul>
    </div>
  )

  // Outros (62, 99 e demais)
  return (
    <div>
      <p style={titleStyle}>Objetivo: Consultar dados e acessar recursos disponíveis no sistema.</p>
      <ul style={listStyle}>
        <li style={itemStyle}>▶ Informe o CNPJ ou CPF quando solicitado e acione <strong>Iniciar</strong>.</li>
        <li style={itemStyle}>▶ Acesse a opção desejada e proceda conforme o procedimento apresentado.</li>
        <li style={itemStyle}>▶ Para encerrar selecione <strong>Sair do Aplicativo</strong>.</li>
      </ul>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()

  const { bannerProps, orienta } = useBanner()
  const [tipoServico, setTipoServico] = useState<number | null>(null)
  const [grupoAberto, setGrupoAberto] = useState<string | null>("Vistorias")
  const [documento, setDocumento] = useState("")
  const [estadoDoc, setEstadoDoc] = useState<"aguardando" | "verificando" | "nao_cadastrado" | "erro">("aguardando")
  const [msgErro, setMsgErro] = useState("")

  // Sessão do inspetor logado (autenticação real via Supabase Auth, identidade por CPF)
  const [carregandoSessao, setCarregandoSessao] = useState(true)
  const [cpfInspetor, setCpfInspetor] = useState("")
  const [chaveInspetor, setChaveInspetor] = useState("")
  const [titulo, setTitulo] = useState("")

  useEffect(() => {
    console.log('[AIME] Dashboard montado, iniciando carregarSessao...')
    async function carregarSessao() {
      let deveRedirecionar = false
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[AIME] session:', session?.user?.email ?? 'nula')
        if (!session?.user?.email) {
          deveRedirecionar = true
          window.location.href = "/"
          return
        }
        const cpf = session.user.email.split("@")[0]
        const accessToken = session.access_token
        try {
          const res = await fetch(`${SUPA_URL}/rest/v1/inspetor?cpf_inspetor=eq.${cpf}&select=cpf_inspetor,chave_inspetor,titulo_profissional`, {
            headers: { apikey: SUPA_KEY, Authorization: `Bearer ${accessToken}` }
          })
          const dados = await res.json()
          console.log('[AIME] dados inspetor:', JSON.stringify(dados))
          if (!Array.isArray(dados) || dados.length === 0) {
            deveRedirecionar = true
            window.location.href = `/inspetor?cpf=${cpf}&novo=1`
            return
          }
          let chave = dados[0].chave_inspetor ?? ""
          console.log('[AIME] chave:', chave, '| titulo:', dados[0].titulo_profissional)
          if (!chave) {
            try {
              const chaveRes = await fetch('/api/gerar-chave-inspetor', { method: 'POST' })
              const chaveData = await chaveRes.json()
              if (chaveData.chave) {
                chave = chaveData.chave
                await fetch('/api/salvar-inspetor', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cpf, soAtualizarChave: true, chave })
                })
              }
            } catch { /* segue com chave vazia se falhar */ }
          }
          setCpfInspetor(dados[0].cpf_inspetor)
          setChaveInspetor(chave)
          setTitulo(dados[0].titulo_profissional ?? "")

          if (chave) {
            const nomeTermoEsperado = `${chave}_${cpf}_termo_de_aceite.html`
            console.log('[AIME] verificando termo:', nomeTermoEsperado)
            const termoRes = await fetch(`/api/ler-documento?nome=${encodeURIComponent(nomeTermoEsperado)}&pasta=documentos_inspetor`)
            const termoData = await termoRes.json()
            console.log('[AIME] termo existe:', termoData.existe)
            if (!termoData.existe) {
              deveRedirecionar = true
              window.location.href = `/termo-aceite?cpf=${cpf}&chave=${encodeURIComponent(chave)}&proximo=/dashboard`
              return
            }
          }
        } catch (e) {
          console.error('[AIME] erro no carregamento:', e)
          deveRedirecionar = true
          window.location.href = "/"
          return
        }
      } finally {
        console.log('[AIME] deveRedirecionar:', deveRedirecionar)
        if (!deveRedirecionar) setCarregandoSessao(false)
      }
    }
    carregarSessao()
  }, [])

  const permitidos = permissoes[titulo] || []
  const itemSelecionado = menuGrupos.flatMap((g) => g.itens).find((i) => i.codigo === tipoServico)
  const ehVistoria = tipoServico !== null && CODIGOS_VISTORIA.includes(Number(tipoServico))
  const coletaCpf  = tipoServico !== null && CODIGOS_CPF.includes(Number(tipoServico))
  // Código 40 (Homologar) não sabe de antemão se a vistoria é de CPF ou CNPJ: aceita os dois formatos
  const aceitaAmbos = tipoServico === 40

  // Formata CNPJ (00.000.000/0000-00) ou CPF (000.000.000-00) conforme o tipo de serviço
  function formatarDocumento(valor: string): string {
    const nums = valor.replace(/\D/g, "")
    // Código 40: formata como CPF enquanto tiver até 11 dígitos, e como CNPJ a partir do 12º
    const usarMascaraCpf = coletaCpf || (aceitaAmbos && nums.length <= 11)
    if (usarMascaraCpf) {
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
    if (codigo === 99) {
      createClient().auth.signOut().then(() => { window.location.href = "/" })
      return
    }
    setTipoServico(codigo)
    setDocumento("")
    setEstadoDoc("aguardando")
  }

  async function handleIniciarVistoria() {
    const docLimpo = documentoSemMascara(documento)
    if (aceitaAmbos) {
      if (docLimpo.length !== 11 && docLimpo.length !== 14) {
        setMsgErro(`CNPJ ou CPF incompleto (${docLimpo.length} dígitos — informe 11 para CPF ou 14 para CNPJ)`)
        return
      }
    } else {
      const tamanhoEsperado = coletaCpf ? 11 : 14
      if (docLimpo.length < tamanhoEsperado) {
        setMsgErro(`${coletaCpf ? "CPF" : "CNPJ"} incompleto (${docLimpo.length}/${tamanhoEsperado} dígitos)`)
        return
      }
    }
    // Códigos 21-29: Planos de Trabalho
    if (Number(tipoServico) >= 21 && Number(tipoServico) <= 29) {
      window.location.href = `/plano?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${docLimpo}&tipo_servico=${tipoServico}`
      return
    }
    // Códigos 11-19: Propostas
    if (Number(tipoServico) >= 11 && Number(tipoServico) <= 19) {
      window.location.href = `/proposta?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${docLimpo}&tipo_servico=${tipoServico}`
      return
    }
    // Código 40: Homologar Vistoria
    if (Number(tipoServico) === 40) {
      window.location.href = `/homologar?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${docLimpo}`
      return
    }
    const url = `/vistoria/tela${tipoServico}?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${docLimpo}&tipo_servico=${tipoServico}`
    window.location.href = url
  }

  if (carregandoSessao) {
    return (
      <div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#4a6480", fontSize: "14px" }}>Carregando...</p>
      </div>
    )
  }

  return (
    <>
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

            {/* Nenhum serviço selecionado - mostrar Macro Fluxo */}
            {!tipoServico && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
              <div style={{ padding: "16px", maxWidth: "600px" }}>
                <div style={{ backgroundColor: "#1E3A8A", color: "white", fontWeight: "bold", fontSize: "12px", padding: "8px 12px", borderRadius: "6px 6px 0 0" }}>
                  Macro Fluxo do Processo
                </div>
                <div style={{ border: "1px solid #1E3A8A", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "12px 16px", backgroundColor: "white", fontSize: "11px", color: "#374151", lineHeight: 1.8 }}>
                  <strong>Login → Pagamento → Selecionar Tipo Serviço →</strong>
                  <div style={{ paddingLeft: "12px", marginTop: "4px", fontFamily: "monospace", fontSize: "11px" }}>
                    <div>├── Proposta Comercial (Templates)</div>
                    <div>├── Plano de Trabalho (Templates)</div>
                    <div>├── Vistoria (Formulário + fotos + IA)</div>
                    <div>├── Homologação Vistoria (Formulário + NC + CP + IA)</div>
                    <div>├── Laudo (Templates + Complemento + Automação + IA)</div>
                    <div>├── Plano Manutenção (Templates + Automação + IA)</div>
                    <div>↓</div>
                  </div>
                  <strong>Homologar → Assinar → Armazenar → Download Documentos</strong>
                </div>
                <div style={{ marginTop: "12px", color: "#94A3B8", fontSize: "12px", textAlign: "center" }}>
                  Selecione um serviço no menu ao lado para iniciar
                </div>
              </div>
              </div>
            )}

                        {/* Serviço selecionado não-vistoria: procedimento por grupo ou específico */}
            {tipoServico && !ehVistoria && (
              <div style={{ backgroundColor: "white", borderRadius: "10px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
                <div style={{ backgroundColor: "#1E3A8A", padding: "10px 20px" }}>
                  <span style={{ color: "white", fontWeight: "bold", fontSize: "13px" }}>{itemSelecionado?.codigo} - {itemSelecionado?.label}</span>
                </div>
                <div style={{ height: "2px", backgroundColor: "#1E3A8A" }} />
                <div style={{ padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                  <p style={{ color: "#94A3B8", fontSize: "13px", textAlign: "center", margin: 0 }}>
                    Esta funcionalidade estará disponível em breve.
                  </p>
                  <button
                    onClick={() => orienta(
                      "Funcionalidade em desenvolvimento",
                      `O serviço "${itemSelecionado?.label}" estará disponível em breve. Por enquanto, utilize os serviços de Vistoria disponíveis no menu.`,
                      () => setTipoServico(null)
                    )}
                    style={{ backgroundColor: "#1E3A8A", color: "white", border: "none", borderRadius: "9999px", padding: "10px 24px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Saiba mais
                  </button>
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
                        {aceitaAmbos ? "CNPJ ou CPF" : coletaCpf ? "CPF" : "CNPJ"} *
                      </label>
                      <input
                        type="text"
                        value={documento}
                        onChange={(e) => {
                          setDocumento(formatarDocumento(e.target.value))
                          setEstadoDoc("aguardando")
                        }}
                        placeholder={aceitaAmbos ? "CPF ou CNPJ" : coletaCpf ? "000.000.000-00" : "00.000.000/0000-00"}
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
    <Banner {...bannerProps} />
    </>
  )
}
