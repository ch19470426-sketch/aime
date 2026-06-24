"use client"
import { useState } from "react"
import Image from "next/image"

// TODO: buscar titulo_profissional do perfil do inspetor logado via Supabase
// const { data } = await supabase.from('inspetor').select('titulo_profissional').eq('cpf_inspetor', user.id).single()
const titulo = "Eng Civil"

const permissoes = {
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
    { codigo: 62, label: "Situacao do Contrato" },
    { codigo: 99, label: "Sair do Aplicativo" },
  ]},
]

export default function Dashboard() {
  const [tipoServico, setTipoServico] = useState(null)
  const [grupoAberto, setGrupoAberto] = useState("Vistorias")

  const permitidos = permissoes[titulo] || []

  const handleSelecionar = (codigo) => {
    if (!permitidos.includes(codigo)) return
    if (codigo === 99) { window.location.href = "/"; return }
    setTipoServico(codigo)
  }

  const itemSelecionado = menuGrupos.flatMap(g => g.itens).find(i => i.codigo === tipoServico)

  return (
    <div style={{backgroundColor:"#E8EEF7",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{backgroundColor:"white",borderRadius:"16px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",width:"100%",maxWidth:"1100px",overflow:"hidden"}}>

        <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <Image src="/logo.png" alt="AIME" width={80} height={32} priority style={{filter:"brightness(0) invert(1)"}} />
          <span style={{color:"white",fontWeight:"bold",fontSize:"12px",flex:1,textAlign:"center"}}>
            Mapeamento Inteligente de Edificacoes e Equipamentos
          </span>
        </div>
        <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />

        <div style={{display:"flex",minHeight:"500px"}}>
          <div style={{width:"220px",borderRight:"2px solid #1E3A8A",backgroundColor:"white",flexShrink:0}}>
            <div style={{backgroundColor:"#1E3A8A",padding:"8px 16px"}}>
              <span style={{color:"white",fontWeight:"bold",fontSize:"11px"}}>Selecionar Servico</span>
            </div>
            <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
            {menuGrupos.map(grupo => (
              <div key={grupo.grupo}>
                <button onClick={() => setGrupoAberto(grupoAberto === grupo.grupo ? null : grupo.grupo)}
                  style={{width:"100%",textAlign:"left",padding:"8px 12px",backgroundColor:"#F1F5F9",color:"#1E3A8A",fontWeight:"bold",fontSize:"11px",border:"none",borderBottom:"1px solid #E2E8F0",cursor:"pointer"}}>
                  {grupoAberto === grupo.grupo ? "v" : ">"} {grupo.grupo}
                </button>
                {grupoAberto === grupo.grupo && grupo.itens.map(item => {
                  const habilitado = permitidos.includes(item.codigo)
                  const selecionado = tipoServico === item.codigo
                  return (
                    <button key={item.codigo} onClick={() => handleSelecionar(item.codigo)}
                      title={!habilitado ? "Nao permitido para seu titulo profissional" : ""}
                      style={{
                        width:"100%", textAlign:"left", padding:"6px 12px 6px 20px",
                        backgroundColor: selecionado ? "#EBF1FF" : "white",
                        color: !habilitado ? "#C4C4C4" : selecionado ? "#1E3A8A" : "#374151",
                        fontWeight: selecionado ? "bold" : "normal",
                        fontSize:"11px", border:"none", borderBottom:"1px solid #F1F5F9",
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

          <div style={{flex:1,padding:"20px",backgroundColor:"#F8FAFC"}}>
            {!tipoServico ? (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#94A3B8",fontSize:"14px"}}>
                Selecione um servico no menu ao lado
              </div>
            ) : (
              <div style={{backgroundColor:"white",borderRadius:"10px",overflow:"hidden",border:"1px solid #E2E8F0"}}>
                <div style={{backgroundColor:"#1E3A8A",padding:"10px 20px"}}>
                  <span style={{color:"white",fontWeight:"bold",fontSize:"13px"}}>{itemSelecionado?.codigo} - {itemSelecionado?.label}</span>
                </div>
                <div style={{height:"2px",backgroundColor:"#1E3A8A"}} />
                <div style={{padding:"32px",color:"#94A3B8",fontSize:"14px",textAlign:"center"}}>
                  Funcionalidade em desenvolvimento
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
