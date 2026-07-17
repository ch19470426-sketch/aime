// src/app/api/gerar-termo-aceite/route.ts
// AIMÊ — Gera o HTML do Termo de Aceite dos Serviços e salva em documentos_inspetor

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function dataExtenso(d: Date): string {
  const meses = ['janeiro','fevereiro','março','abril','maio','junho',
                 'julho','agosto','setembro','outubro','novembro','dezembro']
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

export async function POST(request: NextRequest) {
  try {
    const { cpfInspetor, chaveInspetor } = await request.json()
    if (!cpfInspetor || !chaveInspetor) {
      return NextResponse.json({ erro: 'cpfInspetor e chaveInspetor são obrigatórios' }, { status: 400 })
    }

    const agora = new Date()
    const dataBR = `${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${agora.getFullYear()}`
    const dataExt = dataExtenso(agora)

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Aceite dos Serviços – AIMÊ</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.6; color: #000; padding: 24px 32px; max-width: 800px; margin: 0 auto; }
    .cab { text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 4pt; padding-bottom: 4pt; border-bottom: 2px solid #1E3A8A; }
    .titulo { text-align: center; font-weight: bold; font-size: 11pt; margin: 12pt 0; }
    h2 { font-size: 10pt; font-weight: bold; margin: 12pt 0 4pt; }
    p { margin: 4pt 0; text-align: justify; }
    .assinatura { margin-top: 24pt; padding-top: 6pt; border-top: 1px solid #ccc; }
    .rod { margin-top: 16pt; padding-top: 4pt; border-top: 1px solid #ccc; text-align: center; font-size: 9pt; color: #555; }
  </style>
</head>
<body>
  <div class="cab">MAPEAMENTO INTELIGENTE DE EDIFICAÇÕES E EQUIPAMENTOS</div>
  <div class="titulo">Termo de Aceite dos Serviços – Plataforma AIMÊ (SaaS)</div>

  <p><strong>Pelo presente instrumento particular</strong>, de um lado, a <strong>PLATAFORMA AIMÊ</strong>, doravante denominada <strong>"CONTRATADA"</strong>, e, de outro, o usuário devidamente cadastrado no sistema, doravante denominado <strong>"USUÁRIO"</strong>, têm entre si justo e acordado o presente <strong>Termo de Aceite dos Serviços</strong>, que se regerá pelas cláusulas e condições abaixo.</p>

  <h2>1. OBJETO</h2>
  <p>1.1. O presente Termo tem por objeto a disponibilização, pela CONTRATADA ao USUÁRIO, de plataforma digital em modelo <strong>Software as a Service (SaaS)</strong> destinada ao apoio à execução de atividades relacionadas à <strong>engenharia diagnóstica</strong>, incluindo, mas não se limitando, à coleta, organização, processamento e emissão de dados técnicos oriundos de vistorias, inspeções e avaliações de edificações e de equipamentos.</p>
  <p>1.2. A plataforma AIMÊ constitui ferramenta de apoio técnico-operacional, não substituindo a atuação profissional especializada, nem assumindo responsabilidade técnica pelos serviços executados.</p>

  <h2>2. CONDIÇÕES DE USO E RESPONSABILIDADE PROFISSIONAL</h2>
  <p>2.1. O USUÁRIO declara estar ciente de que a utilização da plataforma para execução de atividades técnicas na área de engenharia diagnóstica <strong>exige obrigatoriamente a atuação de profissionais legalmente habilitados</strong>.</p>
  <p>2.2. O USUÁRIO compromete-se a:</p>
  <p>a) Utilizar a plataforma apenas quando possuir ou estiver vinculado a profissional devidamente habilitado e registrado no respectivo conselho profissional competente (CREA, CAU, CRECI ou equivalente);</p>
  <p>b) Assegurar que todos os serviços técnicos executados por meio da plataforma sejam conduzidos com observância às normas técnicas aplicáveis, legislação vigente e princípios éticos profissionais;</p>
  <p>c) Emitir os documentos técnicos (laudos, relatórios, pareceres) sob responsabilidade de profissional habilitado, com a devida <strong>Anotação de Responsabilidade Técnica (ART)</strong> ou <strong>Registro de Responsabilidade Técnica (RRT)</strong>, quando aplicável.</p>
  <p>2.3. O USUÁRIO reconhece que a responsabilidade técnica pelos serviços realizados é exclusiva do profissional habilitado responsável, o qual responderá civil, administrativa e criminalmente pelos atos praticados.</p>
  <p>2.4. A CONTRATADA não se responsabiliza por: a) Interpretações técnicas realizadas pelo USUÁRIO; b) Decisões profissionais baseadas nos dados inseridos na plataforma; c) Eventuais erros, omissões ou inconsistências decorrentes do uso inadequado da ferramenta.</p>

  <h2>3. ÉTICA E CONFORMIDADE</h2>
  <p>3.1. O USUÁRIO compromete-se a atuar em conformidade com os princípios éticos de sua profissão, observando as normas dos respectivos conselhos profissionais e a legislação vigente.</p>
  <p>3.2. É vedado o uso da plataforma para: a) Execução de serviços técnicos por profissionais não habilitados; b) Emissão de documentos técnicos sem responsabilidade formal; c) Inserção de dados falsos, incompletos ou que possam induzir terceiros a erro.</p>

  <h2>4. PROPRIEDADE DOS DADOS</h2>
  <p>4.1. O USUÁRIO reconhece e concorda que: a) Todos os dados, informações, registros de vistoria, relatórios, laudos e demais documentos técnicos gerados por meio da plataforma são de <strong>propriedade exclusiva dos condomínios, instituições ou contratantes</strong> para os quais os serviços foram realizados; b) A CONTRATADA não detém qualquer direito de propriedade sobre tais dados, atuando apenas como processadora e armazenadora das informações.</p>
  <p>4.2. Compete exclusivamente ao contratante dos serviços técnicos: a) Definir os critérios de acesso, compartilhamento e utilização dos dados; b) Autorizar ou restringir a divulgação dos documentos gerados; c) Garantir a conformidade com a legislação aplicável à proteção de dados.</p>
  <p>4.3. O USUÁRIO compromete-se a: a) Utilizar os dados apenas para os fins contratados; b) Respeitar as restrições impostas pelos proprietários das informações; c) Não divulgar, compartilhar ou comercializar os dados sem autorização expressa.</p>

  <h2>5. PROTEÇÃO DE DADOS</h2>
  <p>5.1. A CONTRATADA compromete-se a adotar boas práticas de segurança da informação, visando a proteção dos dados armazenados na plataforma, pelo prazo mínimo de 12 (doze) meses.</p>
  <p>5.2. O USUÁRIO é responsável pela veracidade, integridade e legalidade dos dados inseridos no sistema.</p>

  <h2>6. LIMITAÇÃO DE RESPONSABILIDADE</h2>
  <p>6.1. A CONTRATADA não responde por quaisquer danos diretos ou indiretos decorrentes: a) Do uso inadequado da plataforma; b) Da atuação profissional do USUÁRIO ou de terceiros; c) Da utilização dos dados gerados para finalidades diversas das previstas.</p>
  <p>6.2. A responsabilidade da CONTRATADA limita-se à disponibilização da plataforma em condições operacionais adequadas, conforme os níveis de serviço estabelecidos.</p>

  <h2>7. ACEITE</h2>
  <p>7.1. Ao acessar e utilizar a plataforma <strong>AIMÊ</strong>, o USUÁRIO declara que leu, compreendeu e concorda integralmente com os termos deste documento.</p>
  <p>7.2. O aceite eletrônico possui validade jurídica plena, nos termos da legislação vigente.</p>

  <h2>8. DISPOSIÇÕES GERAIS</h2>
  <p>8.1. Este Termo poderá ser atualizado pela CONTRATADA a qualquer tempo, sendo as alterações comunicadas ao USUÁRIO por meio da própria plataforma.</p>
  <p>8.2. O uso continuado da plataforma após alterações implica concordância com os novos termos.</p>
  <p>8.3. Fica eleito o foro da comarca do domicílio da CONTRATADA para dirimir quaisquer controvérsias oriundas deste Termo, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

  <div class="assinatura">
    <p><strong>Data do aceite: ${dataBR}.</strong></p>
    <p style="font-size:8pt;color:#555">${dataExt}.</p>
  </div>

  <div class="rod">Mapeamento Inteligente de Edificações e Equipamentos</div>
</body>
</html>`

    const nomeArquivo = `${chaveInspetor}_${cpfInspetor}_termo_de_aceite.html`
    const { error } = await supabase.storage
      .from('aime')
      .upload(`documentos_inspetor/${nomeArquivo}`, Buffer.from(html, 'utf-8'), {
        contentType: 'text/html',
        upsert: true,
      })

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, nomeArquivo })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
