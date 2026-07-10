// src/app/api/gerar-plano/route.ts
// AIMÊ — Gera HTML do Plano de Trabalho

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLANOS: Record<string, Record<string, unknown>> = {
  "21": {
    "titulo": "Plano de Trabalho — Autovistoria",
    "parceiro": "Inspetor e Síndico",
    "atividades": [
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Análise técnica inicial da edificação para conhecer as características básicas da edificação a ser estudada."
      },
      {
        "horas": 3,
        "dias": 1,
        "descricao": "Entrevista Inicial para coletar dados históricos do prédio e pedido de documentos legais"
      },
      {
        "horas": 3,
        "dias": 3,
        "descricao": "Entrega documentos pelo síndico para o inspetor predial e análise pelo inspetor"
      },
      {
        "horas": 6,
        "dias": 5,
        "descricao": "Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas"
      },
      {
        "horas": 24,
        "dias": 6,
        "descricao": "Elaboração laudo efetuando análise, classificação, recomendações e consolidação do documento"
      },
      {
        "horas": 1,
        "dias": 1,
        "descricao": "Entrega do Laudo de Inspeção Predial ao Síndico"
      }
    ],
    "documentos": [
      "Auto de Conclusão da Edificação (HABITE-SE)",
      "Convenção do Condomínio",
      "Alvará de Funcionamento de Elevadores",
      "Relatório de Inspeção Anual dos Elevadores (RIA)",
      "Auto de Vistoria do Corpo de Bombeiros (AVCB)",
      "Atestado do Sistema de Proteção a Descarga Atmosférica (SPDA)",
      "Avaliação da Rede de Distribuição Interna de Gás",
      "Contrato de Manutenção de Elevadores",
      "Certificado de Desratização e Desinsetização",
      "Relatório de Manutenção e Limpeza das Caixas de Água",
      "Certificado do reservatório de GLP",
      "Laudo de autovistoria anterior",
      "Projeto Arquitetônico Aprovado na Prefeitura",
      "Projetos Elétrico e Hidrossanitário Aprovados na Prefeitura",
      "Manual de Uso, Operação e Manutenção da Edificação",
      "Atestado de Brigada de Incêndio (Imóveis não Residenciais)",
      "Alvará de Funcionamento (Imóveis não Residenciais)",
      "Licenças Ambientais (Imóveis não Residenciais)",
      "Outorga e Licença de Estação de Tratamento de Efluentes",
      "Outorga e Licença de Poço Profundo de Captação de Água",
      "Relatório das Análises de Potabilidade de Água - Captação Própria",
      "Relatório de Reuso de Água (Físico-químicos e Bacteriológicos)",
      "Relatórios Manutenções Específicas - Ar Condicionado, Bombas"
    ]
  },
  "22": {
    "titulo": "Plano de Trabalho — Inspeção Predial",
    "parceiro": "Inspetor e Síndico",
    "atividades": [
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Análise técnica inicial da edificação para conhecer as características básicas da edificação a ser estudada."
      },
      {
        "horas": 3,
        "dias": 1,
        "descricao": "Entrevista Inicial para coletar dados históricos do prédio e pedido de documentos legais"
      },
      {
        "horas": 3,
        "dias": 3,
        "descricao": "Entrega documentos pelo síndico para o inspetor predial e análise pelo inspetor"
      },
      {
        "horas": 6,
        "dias": 5,
        "descricao": "Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas"
      },
      {
        "horas": 24,
        "dias": 6,
        "descricao": "Elaboração laudo efetuando análise, classificação, recomendações e consolidação do documento"
      },
      {
        "horas": 1,
        "dias": 1,
        "descricao": "Entrega do Laudo de Inspeção Predial ao Síndico"
      }
    ],
    "documentos": [
      "Auto de Conclusão da Edificação (HABITE-SE)",
      "Convenção do Condomínio",
      "Alvará de Funcionamento de Elevadores",
      "Relatório de Inspeção Anual dos Elevadores (RIA)",
      "Auto de Vistoria do Corpo de Bombeiros (AVCB)",
      "Atestado do Sistema de Proteção a Descarga Atmosférica (SPDA)",
      "Avaliação da Rede de Distribuição Interna de Gás",
      "Contrato de Manutenção de Elevadores",
      "Certificado de Desratização e Desinsetização",
      "Relatório de Manutenção e Limpeza das Caixas de Água",
      "Certificado do reservatório de GLP",
      "Laudo de autovistoria anterior",
      "Projeto Arquitetônico Aprovado na Prefeitura",
      "Projetos Elétrico e Hidrossanitário Aprovados na Prefeitura",
      "Manual de Uso, Operação e Manutenção da Edificação",
      "Atestado de Brigada de Incêndio (Imóveis não Residenciais)",
      "Alvará de Funcionamento (Imóveis não Residenciais)",
      "Licenças Ambientais (Imóveis não Residenciais)",
      "Outorga e Licença de Estação de Tratamento de Efluentes",
      "Outorga e Licença de Poço Profundo de Captação de Água",
      "Relatório das Análises de Potabilidade de Água - Captação Própria",
      "Relatório de Reuso de Água (Físico-químicos e Bacteriológicos)",
      "Relatórios Manutenções Específicas - Ar Condicionado, Bombas"
    ]
  },
  "23": {
    "titulo": "Plano de Trabalho — Vistoria Imóvel Novo",
    "parceiro": "Inspetor e Proprietário",
    "atividades": [
      {
        "horas": 1,
        "dias": 1,
        "descricao": "Entrevista Inicial para coletar documentos legais"
      },
      {
        "horas": 4,
        "dias": 1,
        "descricao": "Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas"
      },
      {
        "horas": 4,
        "dias": 4,
        "descricao": "Elaboração laudo efetuando análise, classificação, recomendações e consolidação do documento"
      },
      {
        "horas": 1,
        "dias": 1,
        "descricao": "Entrega do Laudo de imóvel novo ao proprietário"
      }
    ],
    "documentos": [
      "Auto de Conclusão da Edificação (HABITE-SE)",
      "Contrato de compra/venda ou escritura",
      "Memorial descritivo do imóvel",
      "Projeto Arquitetônico Aprovado na Prefeitura",
      "Projetos elétrico/hidrossanitário aprovados na Prefeitura",
      "Manual de Uso, Operação e Manutenção da Edificação",
      "Alvará de Funcionamento (Imóveis não Residenciais)"
    ]
  },
  "24": {
    "titulo": "Plano de Trabalho — Inspeção de Fachada",
    "parceiro": "Inspetor e Síndico",
    "atividades": [
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrevista Inicial para coletar documentos legais"
      },
      {
        "horas": 18,
        "dias": 3,
        "descricao": "Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas"
      },
      {
        "horas": 8,
        "dias": 1,
        "descricao": "Execução de ensaios complementares caso necessário."
      },
      {
        "horas": 12,
        "dias": 4,
        "descricao": "Elaboração laudo efetuando análise, classificação, recomendações e consolidação do documento"
      },
      {
        "horas": 1,
        "dias": 1,
        "descricao": "Entrega do Laudo de fachada ao síndico"
      }
    ],
    "documentos": [
      "Auto de Conclusão da Edificação (HABITE-SE)",
      "Convenção do Condomínio",
      "Laudo de inspeção de fachada anterior",
      "Projeto Arquitetônico Aprovado na Prefeitura",
      "Manual de Uso, Operação e Manutenção da Edificação",
      "Plano de Manutenção Preventiva da Edificação",
      "Alvará de Funcionamento (Imóveis não Residenciais)",
      "Licenças Ambientais (Imóveis não Residenciais)"
    ]
  },
  "25": {
    "titulo": "Plano de Trabalho — Inspeção de Elevadores",
    "parceiro": "Inspetor e Síndico",
    "atividades": [
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrevista Inicial com o síndico para coletar histórico e documentos legais"
      },
      {
        "horas": 6,
        "dias": 3,
        "descricao": "Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas"
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Execução de testes complementares caso necessário."
      },
      {
        "horas": 12,
        "dias": 4,
        "descricao": "Elaboração laudo efetuando análise, classificação, recomendações e consolidação do documento"
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrega do Laudo de elevador ao proprietário"
      }
    ],
    "documentos": [
      "Auto de Conclusão da Edificação (HABITE-SE)",
      "Convenção do Condomínio",
      "Alvará de Funcionamento de Elevadores",
      "Relatório de Inspeção Anual dos Elevadores (RIA)",
      "Contrato de Manutenção de Elevadores",
      "Laudo de inspeção de elevador anterior",
      "Projeto de instalação dos elevadores aprovado na Prefeitura"
    ]
  },
  "26": {
    "titulo": "Plano de Trabalho — Inspeção NR-10",
    "parceiro": "Inspetor e Responsável",
    "atividades": [
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrevista Inicial com o responsável para coletar histórico e documentos legais"
      },
      {
        "horas": 4,
        "dias": 1,
        "descricao": "Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas"
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Execução de testes complementares caso necessário."
      },
      {
        "horas": 8,
        "dias": 2,
        "descricao": "Elaboração do laudo efetuando análise, classificação, recomendações e consolidação do documento"
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrega do Laudo das instalações ao responsável."
      }
    ],
    "documentos": [
      "Prontuário das Instalações Elétricas (PIE)",
      "Alvará de Funcionamento da Instituição",
      "Contrato de Manutenção das Instalações Elétricas",
      "Laudo de inspeção das instalações anterior"
    ]
  },
  "27": {
    "titulo": "Plano de Trabalho — Inspeção NR-12",
    "parceiro": "Inspetor e Responsável",
    "atividades": [
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrevista Inicial com o responsável para coletar histórico e documentos legais"
      },
      {
        "horas": 4,
        "dias": 2,
        "descricao": "Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas"
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Execução de testes complementares caso necessário."
      },
      {
        "horas": 6,
        "dias": 2,
        "descricao": "Elaboração do laudo efetuando análise, classificação, recomendações e consolidação do documento"
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrega do Laudo das instalações ao responsável."
      }
    ],
    "documentos": [
      "Inventário de máquinas",
      "Planta baixa",
      "Manuais de operação e segurança das máquinas",
      "Laudo da última inspeção realizada",
      "Alvará de funcionamento da instituição"
    ]
  },
  "28": {
    "titulo": "Plano de Trabalho — Inspeção NR-13",
    "parceiro": "Inspetor e Responsável",
    "atividades": [
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrevista Inicial com o responsável para coletar histórico e documentos legais"
      },
      {
        "horas": 4,
        "dias": 2,
        "descricao": "Execução da vistoria com levantamento das anomalias e falhas e coleta de evidências fotográficas"
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Execução de testes complementares caso necessário."
      },
      {
        "horas": 6,
        "dias": 2,
        "descricao": "Elaboração do laudo efetuando análise, classificação, recomendações e consolidação do documento"
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrega do Laudo das instalações ao responsável."
      }
    ],
    "documentos": [
      "Prontuários dos equipamentos",
      "Registros de segurança",
      "Projetos de instalação",
      "Relatórios de inspeção com ART's",
      "Certificados de calibração",
      "Manual de procedimentos operacionais",
      "Registros de treinamento dos operadores",
      "Laudo de inspeção anterior",
      "Documentação de alterações e reparos"
    ]
  },
  "29": {
    "titulo": "Plano de Trabalho — Plano de Manutenção",
    "parceiro": "Inspetor e Síndico",
    "atividades": [
      {
        "horas": 1,
        "dias": 1,
        "descricao": "Análise técnica inicial da edificação para conhecer as características básicas da edificação a ser planejada."
      },
      {
        "horas": 2,
        "dias": 1,
        "descricao": "Entrevista Inicial para coletar dados históricos do prédio e pedido de documentos legais"
      },
      {
        "horas": 1,
        "dias": 2,
        "descricao": "Entrega documentos pelo síndico para o inspetor predial e análise pelo inspetor"
      },
      {
        "horas": 8,
        "dias": 4,
        "descricao": "Execução da vistoria e coleta de dados e evidências fotográficas (Caso necessário)"
      },
      {
        "horas": 12,
        "dias": 3,
        "descricao": "Elaboração do plano de manutenção"
      },
      {
        "horas": 1,
        "dias": 1,
        "descricao": "Entrega do plano ao Síndico"
      }
    ],
    "documentos": [
      "Auto de Conclusão da Edificação (HABITE-SE)",
      "Convenção do Condomínio",
      "Manual de Uso, Operação e Manutenção da Edificação",
      "Plano de Manutenção Preventiva da Edificação",
      "Laudo de Inspeção Predial - Último"
    ]
  }
}

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
function dataExtenso(d: Date) { return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}` }


function conselho(titulo: string): string {
  if (titulo === 'Arquiteto') return 'CAU'
  if (titulo === 'Corretor Imóvel') return 'CRECI'
  return 'CREA'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipoServico, cpfInspetor, cnpjoucpf, ativos } = body

    // Buscar inspetor
    const { data: insp } = await supabase.from('inspetor')
      .select('nome_inspetor,titulo_profissional,inscricao_crea_cau,especializacao,cabecalho_documentos,rodape_documentos')
      .eq('cpf_inspetor', cpfInspetor).single()
    if (!insp) return NextResponse.json({ erro: 'Inspetor não encontrado' }, { status: 404 })

    // Buscar estabelecimento
    const { data: est } = await supabase.from('estabelecimento')
      .select('razao_social_nome,cep_estabelecimento,numero_imovel,complemento')
      .eq('cnpjoucpf', cnpjoucpf).single()
    if (!est) return NextResponse.json({ erro: 'Estabelecimento não encontrado' }, { status: 404 })

    // Buscar endereço via ViaCEP
    let endereco = ''
    let municipioUF = ''
    try {
      const cep = (est.cep_estabelecimento ?? '').replace(/\D/g,'')
      if (cep.length === 8) {
        const vr = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
        const vd = await vr.json()
        if (!vd.erro) {
          const partes = [vd.logradouro, est.numero_imovel||null, est.complemento||null, vd.bairro].filter(Boolean)
          endereco = partes.join(', ') + `, ${vd.localidade}/${vd.uf}`
          municipioUF = `${vd.localidade}/${vd.uf}`
        }
      }
    } catch {}

    const plano = PLANOS[tipoServico] as Record<string, unknown>
    if (!plano) return NextResponse.json({ erro: 'Tipo de serviço não encontrado' }, { status: 400 })

    const atividades = plano.atividades as {horas: number; dias: number; descricao: string}[]
    const documentos = plano.documentos as string[]
    const dataHoje = dataExtenso(new Date())
    const municipio = municipioUF.split('/')[0]?.trim() ?? ''

    // Gerar linhas de ativos
    const linhasAtivos = (ativos as Record<string, string>[]).map((a, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${a.tipo_ativo ?? ''}</td>
        <td>${a.tag_ativo_nr_serie ?? ''}</td>
        <td>${a.nome_responsavel ?? ''}</td>
        <td>${a.funcao_responsavel ?? ''}</td>
        <td>${a.whatsapp_responsavel ?? ''}</td>
        <td>${a.uso_ativo ?? ''}</td>
      </tr>`).join('')

    // Gerar linhas de atividades com campos editáveis
    const linhasAtiv = atividades.map((a, i) => `
      <tr>
        <td>${a.descricao}</td>
        <td><input type="date" id="ini_${i}" name="ini_${i}" onchange="validarDatas(${i})" style="width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial"></td>
        <td><input type="date" id="fim_${i}" name="fim_${i}" onchange="validarDatas(${i})" style="width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial"></td>
      </tr>`).join('')

    // Gerar linhas de documentos com selects
    const linhasDocs = documentos.map((doc, i) => `
      <tr>
        <td>${doc}</td>
        <td><select name="sit_${i}" style="width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial">
          <option value="">—</option><option>Entregue</option><option>Pendente</option><option>Desnecessário</option>
        </select></td>
        <td><select name="res_${i}" style="width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial">
          <option value="">—</option><option>Conforme</option><option>Não conforme</option><option>Não se aplica</option>
        </select></td>
        <td style="text-align:center"><button onclick="remLinha(this)" style="background:#DC2626;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:8pt">✕</button></td>
      </tr>`).join('')

  
  const scriptJs = `
function validarDatas(idx) {
  const ini = document.getElementById('ini_' + idx)
  const fim = document.getElementById('fim_' + idx)
  if (ini && fim && ini.value && fim.value && fim.value < ini.value) {
    alert('A data fim nao pode ser anterior a data inicio.')
    fim.value = ''
    return
  }
  if (idx > 0) {
    const iniAnterior = document.getElementById('ini_' + (idx - 1))
    if (iniAnterior && ini && ini.value && iniAnterior.value && ini.value < iniAnterior.value) {
      alert('A data inicio nao pode ser anterior a data inicio da atividade anterior.')
      ini.value = ''
      fim.value = ''
      return
    }
  }
}
function addLinha() {
  const tbody = document.getElementById('tbodyDocs')
  const tr = document.createElement('tr')
  const sel1 = document.createElement('select')
  sel1.style = 'width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial'
  sel1.innerHTML = '<option value="">—</option><option>Entregue</option><option>Pendente</option><option>Desnecessario</option>'
  const sel2 = document.createElement('select')
  sel2.style = 'width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial'
  sel2.innerHTML = '<option value="">—</option><option>Conforme</option><option>Nao conforme</option><option>Nao se aplica</option>'
  const inp = document.createElement('input')
  inp.placeholder = 'Documento...'
  inp.style = 'width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8.5pt;font-family:Arial'
  const btn = document.createElement('button')
  btn.textContent = 'X'
  btn.style = 'background:#DC2626;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:8pt'
  btn.onclick = function(){ this.closest('tr').remove() }
  const td1 = document.createElement('td'); td1.appendChild(inp)
  const td2 = document.createElement('td'); td2.appendChild(sel1)
  const td3 = document.createElement('td'); td3.appendChild(sel2)
  const td4 = document.createElement('td'); td4.style.textAlign='center'; td4.appendChild(btn)
  tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4)
  tbody.appendChild(tr)
}
function remLinha(btn) { btn.closest('tr').remove() }
`

  const html = \`<!DOCTYPE html\`
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #000; padding: 1.5cm 2cm 1.5cm 2.5cm; }
.cab { text-align: center; margin-bottom: 16pt; padding-bottom: 8pt; border-bottom: 2px solid #1E3A8A; font-size: 9pt; color: #374151; white-space: pre-line; }
h1 { font-size: 13pt; font-weight: bold; color: #1E3A8A; text-align: center; margin: 12pt 0 4pt; }
h2 { font-size: 11pt; font-weight: bold; color: #1E3A8A; margin: 14pt 0 6pt; }
h3 { font-size: 10pt; font-weight: bold; margin: 10pt 0 4pt; }
p { margin: 4pt 0; text-align: justify; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 8.5pt; }
th { background: #1E3A8A; color: #fff; padding: 4pt 6pt; text-align: left; font-size: 8pt; }
td { border: 1px solid #c3d4f0; padding: 3pt 6pt; vertical-align: middle; }
tr:nth-child(even) { background: #f8fafc; }
.ass { margin-top: 30pt; padding-top: 10pt; border-top: 1px solid #ccc; line-height: 1.8; }
.rod { margin-top: 20pt; padding-top: 8pt; border-top: 1px solid #ccc; font-size: 8pt; text-align: center; white-space: pre-line; color: #374151; }
.info { background: #FFF9E6; border: 1px solid #F59E0B; border-radius: 4px; padding: 6pt 10pt; margin: 8pt 0; font-size: 8.5pt; color: #92400E; }
</style>
<script>\${scriptJs}</script>
</head>
<body>
${insp.cabecalho_documentos ? `<div class="cab">${insp.cabecalho_documentos}</div>` : ''}
<h1>${plano.titulo}</h1>
<p style="text-align:center;color:#374151;margin-bottom:10pt">${municipio}, ${dataHoje}</p>
<p style="display:flex;justify-content:space-between"><span><strong>Estabelecimento:</strong> ${est.razao_social_nome}</span><span><strong>CNPJ/CPF:</strong> ${cnpjoucpf}</span></p>
<p><strong>Endereço:</strong> ${endereco}</p>

<h2>Ativos a Vistoriar</h2>
<table>
  <thead><tr>
    <th>#</th><th>Tipo</th><th>TAG/Nº Série</th><th>Responsável</th><th>Função</th><th>WhatsApp</th><th>Uso</th>
  </tr></thead>
  <tbody>${linhasAtivos}</tbody>
</table>

<h2>1.1.- Plano de Trabalho — ${plano.parceiro}</h2>
<div class="info">⚠️ Favor preencher as datas de início e fim de cada atividade abaixo.</div>
<table>
  <thead><tr>
    <th style="width:60%">Atividades</th>
    <th style="width:20%">Dt. Início</th>
    <th style="width:20%">Dt. Fim</th>
  </tr></thead>
  <tbody>${linhasAtiv}</tbody>
</table>

<h2>1.2.- Relação de Documentos Solicitados</h2>
<div class="info">⚠️ Favor verificar e ajustar a relação de documentos abaixo.</div>
<table>
  <thead><tr>
    <th style="width:55%">Documento</th>
    <th style="width:18%">Situação</th>
    <th style="width:18%">Resultado</th>
    <th style="width:9%">Ação</th>
  </tr></thead>
  <tbody id="tbodyDocs">${linhasDocs}</tbody>
</table>
<button onclick="addLinha()" style="margin-top:6pt;background:#1E3A8A;color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:8pt">+ Adicionar documento</button>

<div class="ass">
  <p><strong>${insp.nome_inspetor}</strong></p>
  <p>${insp.titulo_profissional} — ${conselho(insp.titulo_profissional)} ${insp.inscricao_crea_cau}</p>
  ${insp.especializacao ? `<p>Especialista ${insp.especializacao}</p>` : ''}
  <p style="margin-top:20pt">De acordo: _____________________ CPF: _______________ Data: ___/___/______</p>
  <p>${plano.parceiro?.toString().replace('Inspetor e ','') ?? 'Responsável'}</p>
</div>

${insp.rodape_documentos ? `<div class="rod">${insp.rodape_documentos}</div>` : ''}
</body>
</html>`

    return NextResponse.json({ html })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
