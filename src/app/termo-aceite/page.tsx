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


function MacroFluxoSVG() {
  const az50="#E6F1FB",az6="#185FA5",az8="#0C447C"
  const tl50="#E1F5EE",tl6="#0F6E56",tl8="#085041"
  const am50="#FAEEDA",am6="#854F0B",am8="#633806"
  const gr50="#EAF3DE",gr6="#3B6D11",gr8="#27500A"
  const pu50="#EEEDFE",pu6="#534AB7",pu8="#3C3489"
  const co50="#FAECE7",co6="#993C1D",co8="#712B13"
  const gy50="#F1EFE8",gy6="#5F5E5A",gy8="#444441"
  const F="Arial,sans-serif"
  const B=(x:number,y:number,w:number,h:number,f:string,s:string)=><rect x={x} y={y} width={w} height={h} rx={8} fill={f} stroke={s} strokeWidth={0.5}/>
  const L=(x:number,y:number,t:string,c:string,sz=11)=><text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={c} fontSize={sz} fontWeight={500} fontFamily={F}>{t}</text>
  const S=(x:number,y:number,t:string,c:string)=><text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={c} fontSize={9} fontFamily={F}>{t}</text>
  const a={fill:"none",stroke:"#888",strokeWidth:1,markerEnd:"url(#aM)"}
  return (
    <svg width="100%" viewBox="0 0 680 330" role="img">
      <title>Macro Fluxo no AIMÊ</title>
      <defs><marker id="aM" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      <text x="340" y="20" textAnchor="middle" fill="#1E3A8A" fontSize={13} fontWeight={700} fontFamily={F}>Macro Fluxo no AIMÊ</text>
      {B(14,38,72,52,az50,az6)}{L(50,56,"1",az8,9)}{L(50,70,"Login",az8)}{S(50,83,"Acesso",az6)}
      <line x1={86} y1={64} x2={98} y2={64} {...a}/>
      {B(98,38,72,52,az50,az6)}{L(134,56,"2",az8,9)}{L(134,70,"Cadastro",az8)}{S(134,83,"Profissional",az6)}
      <line x1={170} y1={64} x2={182} y2={64} {...a}/>
      {B(182,38,72,52,az50,az6)}{L(218,56,"3",az8,9)}{L(218,70,"Assinatura",az8)}{S(218,83,"Contrato",az6)}
      <line x1={254} y1={64} x2={266} y2={64} {...a}/>
      {B(266,38,72,52,az50,az6)}{L(302,56,"4",az8,9)}{L(302,70,"Serviço",az8)}{S(302,83,"Seleção",az6)}
      <line x1={338} y1={64} x2={350} y2={64} {...a}/>
      {B(350,38,88,52,tl50,tl6)}{L(394,56,"5",tl8,9)}{L(394,70,"Estabelec.",tl8)}{S(394,83,"Dados",tl6)}
      <line x1={438} y1={64} x2={450} y2={64} {...a}/>
      {B(450,38,80,52,tl50,tl6)}{L(490,56,"6",tl8,9)}{L(490,70,"Proposta",tl8)}{S(490,83,"Template",tl6)}
      <line x1={530} y1={64} x2={542} y2={64} {...a}/>
      {B(542,38,124,52,tl50,tl6)}{L(604,56,"7",tl8,9)}{L(604,70,"Plano Trabalho",tl8)}{S(604,83,"Template",tl6)}
      <path d="M604 90 L604 122 L50 122 L50 148" fill="none" stroke="#888" strokeWidth={1} markerEnd="url(#aM)"/>
      {B(14,148,96,72,am50,am6)}{L(62,162,"8",am8,9)}{L(62,178,"Vistoria",am8)}{S(62,192,"Form+fotos+IA",am6)}
      <line x1={110} y1={184} x2={122} y2={184} {...a}/>
      {B(122,148,104,72,gr50,gr6)}{L(174,162,"9",gr8,9)}{L(174,178,"Homologar",gr8)}{S(174,192,"Vistoria",gr6)}
      <line x1={226} y1={184} x2={238} y2={184} {...a}/>
      {B(238,148,104,72,pu50,pu6)}{L(290,162,"10",pu8,9)}{L(290,178,"Laudo",pu8)}{S(290,192,"Templ+compl+IA",pu6)}
      <line x1={342} y1={184} x2={354} y2={184} {...a}/>
      {B(354,148,104,72,co50,co6)}{L(406,162,"11",co8,9)}{L(406,178,"Plano Manut.",co8)}{S(406,192,"Templ+IA",co6)}
      <line x1={458} y1={184} x2={470} y2={184} {...a}/>
      {B(470,148,196,72,gy50,gy6)}{L(568,162,"12",gy8,9)}{L(568,178,"Homologar · Assinar",gy8)}{S(568,192,"Armazenar",gy6)}{S(568,204,"Download Docs",gy6)}
      <rect x={14} y={248} width={652} height={52} rx={8} fill="none" stroke="#E2E8F0" strokeWidth={0.5}/>
      <text x={340} y={263} textAnchor="middle" fill="#6B7280" fontSize={9} fontFamily={F}>Legenda</text>
      <rect x={30} y={273} width={10} height={10} rx={2} fill={az50} stroke={az6} strokeWidth={0.5}/><text x={46} y={281} fill={az8} fontSize={9} fontFamily={F}>Acesso</text>
      <rect x={105} y={273} width={10} height={10} rx={2} fill={tl50} stroke={tl6} strokeWidth={0.5}/><text x={121} y={281} fill={tl8} fontSize={9} fontFamily={F}>Doc. inicial</text>
      <rect x={210} y={273} width={10} height={10} rx={2} fill={am50} stroke={am6} strokeWidth={0.5}/><text x={226} y={281} fill={am8} fontSize={9} fontFamily={F}>Campo</text>
      <rect x={280} y={273} width={10} height={10} rx={2} fill={pu50} stroke={pu6} strokeWidth={0.5}/><text x={296} y={281} fill={pu8} fontSize={9} fontFamily={F}>Laudo/Manut.</text>
      <rect x={390} y={273} width={10} height={10} rx={2} fill={gy50} stroke={gy6} strokeWidth={0.5}/><text x={406} y={281} fill={gy8} fontSize={9} fontFamily={F}>Conclusão</text>
    </svg>
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
            <MacroFluxoSVG />
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
