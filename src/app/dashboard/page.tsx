// src/app/dashboard/page.tsx
// AIMÊ — Dashboard com fluxo de entrada de CNPJ para vistorias

"use client"



import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"

// TODO: buscar cpf_inspetor e titulo_profissional do perfil logado via Supabase auth
const cpfInspetor   = "12345678900"   // provisório até integrar auth
const chaveInspetor = "INS-001"       // provisório
const titulo        = "Eng Civil"

const permissoes: Record<string, number[]> = {
  "Arquiteto":          [11,12,13,19,21,22,23,29,31,32,33,40,41,42,43,49,61,62,99],
  "Eng Civil":          [11,12,13,14,19,21,22,23,24,29,31,32,33,34,40,41,42,43,44,49,61,62,99],
  "Eng Eletrico":       [16,26,36,40,46,61,62,99],
  "Eng Mecanico":       [15,17,18,25,27,28,35,37,38,40,45,47,48,61,62,99],
  "Tecnico Edificacao": [13,23,33,40,43,61,62,99],
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

// Tipos de serviço que são vistorias (abre tela de CNPJ)
const CODIGOS_VISTORIA = [31, 32, 33, 34, 35, 36, 37, 38]

// Mapa de código para tipo_servico no banco
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

type EstadoCnpj = "aguardando" | "verificando" | "nao_cadastrado" | "erro"

export default function Dashboard() {
  const router = useRouter()
  
  const [tipoServico,  setTipoServico]  = useState<number | null>(null)
  const [grupoAberto,  setGrupoAberto]  = useState<string | null>("Vistorias")
  const [cnpj,         setCnpj]         = useState("")
  const [estadoCnpj,   setEstadoCnpj]   = useState<EstadoCnpj>("aguardando")

  const permitidos = permissoes[titulo] || []
  const itemSelecionado = menuGrupos.flatMap((g) => g.itens).find((i) => i.codigo === tipoServico)
  const ehVistoria = tipoServico !== null && CODIGOS_VISTORIA.includes(tipoServico)

  // Formata CNPJ enquanto digita: 00.000.000/0000-00
  function formatarCnpj(valor: string): string {
    const nums = valor.replace(/\D/g, "").slice(0, 14)
    return nums
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }

  // Remove formatação para salvar/buscar
  function cnpjSemMascara(cnpj: string): string {
    return cnpj.replace(/\D/g, "")
  }

  function handleSelecionar(codigo: number) {
    console.log("Selecionado codigo:", codigo, "ehVistoria:", CODIGOS_VISTORIA.includes(Number(codigo)))
    if (!permitidos.includes(codigo)) return
    if (codigo === 99) { window.location.href = "/"; return }
    setTipoServico(codigo)
    setCnpj("")
    setEstadoCnpj("aguardando")
  }

  async function handleIniciarVistoria() {
    const cnpjLimpo = cnpjSemMascara(cnpj)
    if (cnpjLimpo.length < 11) {
      alert("Informe um CNPJ ou CPF válido.")
      return
    }
    console.log('CNPJ limpo:', cnpjLimpo)
    console.log('Iniciando vistoria, CNPJ:', cnpj)
 const supabase = createClient()

    setEstadoCnpj("verificando")

    // a) Verifica se o estabelecimento está cadastrado
    const { data: estabelecimento, error } = await supabase
      .from("estabelecimento")
      .select("cnpjoucpf, razao_social_nome")
      .eq("cnpjoucpf", cnpjLimpo)
      .single()
      console.log('Resultado busca:', estabelecimento, 'Erro:', error)

    // b) Estabelecimento não cadastrado
    if (error || !estabelecimento) {
      setEstadoCnpj("nao_cadastrado")
      return
    }

    // Cadastrado → navega para a tela de vistoria
    const tipoServicoBanco = TIPO_SERVICO_BANCO[tipoServico!]
    router.push(
      `/vistoria/tela${tipoServico}?cpf_inspetor=${cpfInspetor}&chave_inspetor=${chaveInspetor}&cnpjoucpf=${cnpjLimpo}&tipo_servico=${tipoServico}`
    )
  }

  return (
    <div className="min-h-screen bg-[#E8EEF7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#1E3A8A] px-4 py-2 flex items-center gap-3">
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority
            style={{ filter: "brightness(0) invert(1)" }} />
          <span className="text-white font-bold text-xs flex-1 text-center">
            Mapeamento Inteligente de Edificações e Equipamentos
          </span>
        </div>
        <div className="h-0.5 bg-[#1E3A8A]" />

        <div className="flex min-h-[500px]">

          {/* Menu lateral */}
          <div className="w-56 border-r-2 border-[#1E3A8A] bg-white flex-shrink-0">
            <div className="bg-[#1E3A8A] px-4 py-2">
              <span className="text-white font-bold text-xs">Selecionar Serviço</span>
            </div>
            <div className="h-0.5 bg-[#1E3A8A]" />

            {menuGrupos.map((grupo) => (
              <div key={grupo.grupo}>
                <button
                  onClick={() => setGrupoAberto(grupoAberto === grupo.grupo ? null : grupo.grupo)}
                  className="w-full text-left px-3 py-2 bg-slate-100 text-[#1E3A8A] font-bold text-xs border-b border-slate-200 hover:bg-slate-200"
                >
                  {grupoAberto === grupo.grupo ? "▼" : "▶"} {grupo.grupo}
                </button>

                {grupoAberto === grupo.grupo && grupo.itens.map((item) => {
                  const habilitado  = permitidos.includes(item.codigo)
                  const selecionado = tipoServico === item.codigo
                  return (
                    <button
                      key={item.codigo}
                      onClick={() => handleSelecionar(item.codigo)}
                      title={!habilitado ? "Não permitido para seu título profissional" : ""}
                      className={`w-full text-left px-3 py-1.5 pl-5 text-xs border-b border-slate-100
                        ${selecionado ? "bg-blue-50 text-[#1E3A8A] font-bold" : ""}
                        ${!habilitado ? "text-slate-300 cursor-not-allowed opacity-50" : "text-slate-700 hover:bg-slate-50 cursor-pointer"}
                      `}
                    >
                      {item.codigo} - {item.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Área de conteúdo */}
          <div className="flex-1 p-5 bg-slate-50">

            {/* Nenhum serviço selecionado */}
            {!tipoServico && (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Selecione um serviço no menu ao lado
              </div>
            )}

            {/* Serviço selecionado mas não é vistoria */}
            {tipoServico && !ehVistoria && (
              <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                <div className="bg-[#1E3A8A] px-5 py-2.5">
                  <span className="text-white font-bold text-sm">
                    {itemSelecionado?.codigo} - {itemSelecionado?.label}
                  </span>
                </div>
                <div className="h-0.5 bg-[#1E3A8A]" />
                <div className="p-8 text-slate-400 text-sm text-center">
                  Funcionalidade em desenvolvimento
                </div>
              </div>
            )}

            {/* Vistoria selecionada → tela de entrada de CNPJ */}
            {tipoServico && ehVistoria && (
              <div className="bg-white rounded-xl overflow-hidden border border-slate-200">

                {/* Título */}
                <div className="bg-[#1E3A8A] px-5 py-2.5">
                  <span className="text-white font-bold text-sm">
                    {itemSelecionado?.codigo} - {itemSelecionado?.label}
                  </span>
                </div>
                <div className="h-0.5 bg-[#1E3A8A]" />

                <div className="p-6">
                  <h3 className="text-[#1E3A8A] font-bold text-sm mb-1">
                    Identificar Estabelecimento
                  </h3>
                  <p className="text-slate-500 text-xs mb-5">
                    Informe CNPJ ou CPF
                  </p>

                  {/* Campo CNPJ */}
                  <div className="mb-4 max-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      CNPJ ou CPF *
                    </label>
                    <input
                      type="text"
                      value={cnpj}
                      onChange={(e) => {
                        setCnpj(formatarCnpj(e.target.value))
                        setEstadoCnpj("aguardando")
                      }}
                      placeholder="00.000.000/0000-00"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100"
                      onKeyDown={(e) => e.key === "Enter" && handleIniciarVistoria()}
                    />
                  </div>

                  {/* Mensagem: não cadastrado */}
                  {estadoCnpj === "nao_cadastrado" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 max-w-md">
                      <p className="text-amber-800 font-semibold text-sm mb-1">
                        ⚠️ Para o CNPJ/CPF informado não há Estabelecimento cadastrado.
                      </p>
                      <p className="text-amber-700 text-xs">
                        O cadastro do Estabelecimento é efetuado na geração da proposta comercial.
                      </p>
                      <button
                        onClick={() => { setTipoServico(null); setCnpj(""); setEstadoCnpj("aguardando") }}
                        className="mt-3 text-xs text-[#1E3A8A] font-semibold underline"
                      >
                        ← Voltar para Selecionar Serviço
                      </button>
                    </div>
                  )}

                  {/* Botão iniciar */}
                  <button
                    onClick={handleIniciarVistoria}
                    disabled={estadoCnpj === "verificando" || cnpjSemMascara(cnpj).length < 11}
                    className="bg-[#1E3A8A] text-white font-bold px-6 py-2.5 rounded-full text-sm disabled:opacity-50 hover:opacity-90"
                  >
                    {estadoCnpj === "verificando" ? "⏳ Verificando..." : "Iniciar Vistoria →"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
