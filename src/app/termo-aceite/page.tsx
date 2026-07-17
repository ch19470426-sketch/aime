"use client"
export const dynamic = 'force-dynamic'
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

export default function TermoAceitePage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#E8EEF7", minHeight: "100vh" }} />}>
      <TermoAceite />
    </Suspense>
  )
}


function TermoAceite() {
  const params = useSearchParams()
  const cpf = params.get('cpf') ?? ''
  const chave = params.get('chave') ?? ''
  const proximo = params.get('proximo') ?? '/dashboard'

  const [aceitando, setAceitando] = useState(false)
  const [erro, setErro] = useState("")
  const [mostrarDiagrama, setMostrarDiagrama] = useState(false)

  async function aceitar() {
    setErro("")
    setAceitando(true)
    try {
      const res = await fetch('/api/gerar-termo-aceite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfInspetor: cpf, chaveInspetor: chave })
      })
      const data = await res.json()
      if (!res.ok || data.erro) {
        setErro(data.erro ?? 'Não foi possível registrar o aceite. Tente novamente.')
        setAceitando(false)
        return
      }
      setAceitando(false)
      setMostrarDiagrama(true)
      return
    } catch {
      setErro('Não foi possível conectar. Tente novamente.')
      setAceitando(false)
    }
  }

  const S = {
    body: { backgroundColor: "#E8EEF7", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" },
    page: { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", width: "100%", maxWidth: "780px", overflow: "hidden" },
    header: { backgroundColor: "#1E3A8A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px" },
    divider: { height: "2px", backgroundColor: "#1E3A8A" },
    body2: { padding: "20px 24px" },
    titulo: { textAlign: "center" as const, fontWeight: "bold" as const, fontSize: "12pt", marginBottom: "12pt" },
    texto: { fontSize: "9pt", lineHeight: 1.6, color: "#1a1a1a", textAlign: "justify" as const, marginBottom: "6pt" },
    h2: { fontSize: "9pt", fontWeight: "bold" as const, marginTop: "10pt", marginBottom: "3pt" },
    rodape: { borderTop: "1px solid #ccc", marginTop: "16pt", paddingTop: "8pt", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
    btnAceitar: { backgroundColor: "#1E3A8A", color: "white", fontWeight: "600" as const, padding: "10px 28px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "13px" },
  }

  if (mostrarDiagrama) {
    return (
      <div style={S.body}>
        <div style={{ ...S.page, maxWidth: '780px' }}>
          <div style={S.header}>
            <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
            <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
              Bem-vindo ao AIMÊ
            </span>
          </div>
          <div style={S.divider} />
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "10pt", color: "#374151", marginBottom: "16pt", textAlign: "center" }}>
              Conheça o macro fluxo do processo — da contratação à entrega dos documentos.
            </p>
            <img src="/fluxo-aime.png" alt="Macro Fluxo no AIMÊ" style={{ width: "100%", borderRadius: "8px" }} />
            <div style={{ display: "flex", justifyContent: "center", marginTop: "20pt" }}>
              <button style={{ backgroundColor: "#1E3A8A", color: "white", fontWeight: "600", padding: "12px 36px", borderRadius: "50px", border: "none", cursor: "pointer", fontSize: "13px" }}
                onClick={() => { window.location.href = proximo }}>
                Entendi, vamos começar!
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div style={S.body}>
      <div style={S.page}>
        <div style={S.header}>
          <Image src="/logo.png" alt="AIMÊ" width={80} height={32} priority style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", flex: 1, textAlign: "center" }}>
            Termo de Aceite dos Serviços – Plataforma AIMÊ
          </span>
        </div>
        <div style={S.divider} />
        <div style={S.body2}>

          <p style={{ ...S.texto, marginBottom: "10pt" }}>
            <strong>Pelo presente instrumento particular</strong>, de um lado, a <strong>PLATAFORMA AIMÊ</strong>, doravante denominada <strong>"CONTRATADA"</strong>, e, de outro, o usuário devidamente cadastrado no sistema, doravante denominado <strong>"USUÁRIO"</strong>, têm entre si justo e acordado o presente <strong>Termo de Aceite dos Serviços</strong>, que se regerá pelas cláusulas e condições abaixo.
          </p>

          <p style={S.h2}>1. OBJETO</p>
          <p style={S.texto}>1.1. O presente Termo tem por objeto a disponibilização, pela CONTRATADA ao USUÁRIO, de plataforma digital em modelo <strong>Software as a Service (SaaS)</strong> destinada ao apoio à execução de atividades relacionadas à <strong>engenharia diagnóstica</strong>, incluindo, mas não se limitando, à coleta, organização, processamento e emissão de dados técnicos oriundos de vistorias, inspeções e avaliações de edificações e de equipamentos.</p>
          <p style={S.texto}>1.2. A plataforma AIMÊ constitui ferramenta de apoio técnico-operacional, não substituindo a atuação profissional especializada, nem assumindo responsabilidade técnica pelos serviços executados.</p>

          <p style={S.h2}>2. CONDIÇÕES DE USO E RESPONSABILIDADE PROFISSIONAL</p>
          <p style={S.texto}>2.1. O USUÁRIO declara estar ciente de que a utilização da plataforma para execução de atividades técnicas na área de engenharia diagnóstica <strong>exige obrigatoriamente a atuação de profissionais legalmente habilitados</strong>.</p>
          <p style={S.texto}>2.2. O USUÁRIO compromete-se a: a) Utilizar a plataforma apenas quando possuir ou estiver vinculado a profissional devidamente habilitado e registrado no respectivo conselho profissional competente (CREA, CAU, CRECI ou equivalente); b) Assegurar que todos os serviços técnicos executados por meio da plataforma sejam conduzidos com observância às normas técnicas aplicáveis, legislação vigente e princípios éticos profissionais; c) Emitir os documentos técnicos (laudos, relatórios, pareceres) sob responsabilidade de profissional habilitado, com a devida <strong>Anotação de Responsabilidade Técnica (ART)</strong> ou <strong>Registro de Responsabilidade Técnica (RRT)</strong>, quando aplicável.</p>
          <p style={S.texto}>2.3. O USUÁRIO reconhece que a responsabilidade técnica pelos serviços realizados é exclusiva do profissional habilitado responsável, o qual responderá civil, administrativa e criminalmente pelos atos praticados.</p>
          <p style={S.texto}>2.4. A CONTRATADA não se responsabiliza por: a) Interpretações técnicas realizadas pelo USUÁRIO; b) Decisões profissionais baseadas nos dados inseridos na plataforma; c) Eventuais erros, omissões ou inconsistências decorrentes do uso inadequado da ferramenta.</p>

          <p style={S.h2}>3. ÉTICA E CONFORMIDADE</p>
          <p style={S.texto}>3.1. O USUÁRIO compromete-se a atuar em conformidade com os princípios éticos de sua profissão, observando as normas dos respectivos conselhos profissionais e a legislação vigente.</p>
          <p style={S.texto}>3.2. É vedado o uso da plataforma para: a) Execução de serviços técnicos por profissionais não habilitados; b) Emissão de documentos técnicos sem responsabilidade formal; c) Inserção de dados falsos, incompletos ou que possam induzir terceiros a erro.</p>

          <p style={S.h2}>4. PROPRIEDADE DOS DADOS</p>
          <p style={S.texto}>4.1. O USUÁRIO reconhece e concorda que: a) Todos os dados, informações, registros de vistoria, relatórios, laudos e demais documentos técnicos gerados por meio da plataforma são de <strong>propriedade exclusiva dos condomínios, instituições ou contratantes</strong> para os quais os serviços foram realizados; b) A CONTRATADA não detém qualquer direito de propriedade sobre tais dados, atuando apenas como processadora e armazenadora das informações.</p>
          <p style={S.texto}>4.2. Compete exclusivamente ao contratante dos serviços técnicos: a) Definir os critérios de acesso, compartilhamento e utilização dos dados; b) Autorizar ou restringir a divulgação dos documentos gerados; c) Garantir a conformidade com a legislação aplicável à proteção de dados.</p>
          <p style={S.texto}>4.3. O USUÁRIO compromete-se a: a) Utilizar os dados apenas para os fins contratados; b) Respeitar as restrições impostas pelos proprietários das informações; c) Não divulgar, compartilhar ou comercializar os dados sem autorização expressa.</p>

          <p style={S.h2}>5. PROTEÇÃO DE DADOS</p>
          <p style={S.texto}>5.1. A CONTRATADA compromete-se a adotar boas práticas de segurança da informação, visando a proteção dos dados armazenados na plataforma, pelo prazo mínimo de 12 (doze) meses.</p>
          <p style={S.texto}>5.2. O USUÁRIO é responsável pela veracidade, integridade e legalidade dos dados inseridos no sistema.</p>

          <p style={S.h2}>6. LIMITAÇÃO DE RESPONSABILIDADE</p>
          <p style={S.texto}>6.1. A CONTRATADA não responde por quaisquer danos diretos ou indiretos decorrentes: a) Do uso inadequado da plataforma; b) Da atuação profissional do USUÁRIO ou de terceiros; c) Da utilização dos dados gerados para finalidades diversas das previstas.</p>
          <p style={S.texto}>6.2. A responsabilidade da CONTRATADA limita-se à disponibilização da plataforma em condições operacionais adequadas, conforme os níveis de serviço estabelecidos.</p>

          <p style={S.h2}>7. ACEITE</p>
          <p style={S.texto}>7.1. Ao acessar e utilizar a plataforma <strong>AIMÊ</strong>, o USUÁRIO declara que leu, compreendeu e concorda integralmente com os termos deste documento.</p>
          <p style={S.texto}>7.2. O aceite eletrônico possui validade jurídica plena, nos termos da legislação vigente.</p>

          <p style={S.h2}>8. DISPOSIÇÕES GERAIS</p>
          <p style={S.texto}>8.1. Este Termo poderá ser atualizado pela CONTRATADA a qualquer tempo, sendo as alterações comunicadas ao USUÁRIO por meio da própria plataforma.</p>
          <p style={S.texto}>8.2. O uso continuado da plataforma após alterações implica concordância com os novos termos.</p>
          <p style={S.texto}>8.3. Fica eleito o foro da comarca do domicílio da CONTRATADA para dirimir quaisquer controvérsias oriundas deste Termo, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

          {erro && <p style={{ color: "#DC2626", fontSize: "12px", marginTop: "8pt" }}>{erro}</p>}

          <div style={S.rodape}>
            <p style={{ fontSize: "9pt", color: "#374151", margin: 0 }}>
              Ao clicar em <strong>"Li e aceito os termos"</strong>, o aceite eletrônico fica registrado com a data de hoje.
            </p>
            <button style={{ ...S.btnAceitar, opacity: aceitando ? 0.7 : 1 }}
              onClick={aceitar} disabled={aceitando}>
              {aceitando ? "Registrando..." : "Li e aceito os termos"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
