// src/app/api/gerar-plano/route.ts
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

function dataExtenso(d: Date) {
  return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear()
}

function fmtCNPJ(v: string): string {
  if (v.length === 14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (v.length === 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}
function fmtWpp(v: string): string {
  const d = String(v || '').replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return v || ''
}
function conselho(titulo: string): string {
  if (titulo === 'Arquiteto') return 'CAU'
  if (titulo === 'Corretor Imóvel') return 'CRECI'
  return 'CREA'
}
function tituloLimpo(titulo: string): string {
  return titulo.replace(/\s*(CREA|CAU|CRECI)\s*/gi,'').trim()
}
function numLimpo(num: string): string {
  return num.replace(/^(CREA|CAU|CRECI)[\s\-]*/gi,'').trim()
}

function gerarScriptDatas(_n: number): string {
  const linhas: string[] = []
  linhas.push('<script>')
  // Banner de mensagem estilizado
  linhas.push('function showMsg(msg){var el=document.getElementById("msgBanner");el.textContent=msg;el.style.display="block";setTimeout(function(){el.style.display="none";},4000);}')
  // Validação de datas
  linhas.push('function validarDatas(idx){')
  linhas.push('  var ini=document.getElementById("ini_"+idx);')
  linhas.push('  var fim=document.getElementById("fim_"+idx);')
  linhas.push('  if(ini&&fim&&ini.value&&fim.value&&fim.value<ini.value){showMsg("Data fim nao pode ser anterior a data inicio.");fim.value="";return;}')
  linhas.push('  if(idx>0){var ant=document.getElementById("ini_"+(idx-1));if(ant&&ini&&ini.value&&ant.value&&ini.value<ant.value){showMsg("Data inicio nao pode ser anterior a atividade anterior.");ini.value="";fim.value="";}}}')
  // Adicionar linha de documento
  linhas.push('function addDoc(){var tb=document.getElementById("tbDocs");var tr=tb.insertRow();var td1=tr.insertCell();var td2=tr.insertCell();var td3=tr.insertCell();var td4=tr.insertCell();')
  linhas.push('  var inp=document.createElement("input");inp.style.cssText="width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8.5pt;font-family:Arial";td1.appendChild(inp);')
  linhas.push('  function mk(opts){var s=document.createElement("select");s.style.cssText="width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial";opts.forEach(function(o){var op=document.createElement("option");op.textContent=o;s.appendChild(op);});return s;}')
  linhas.push('  td2.appendChild(mk(["—","Entregue","Pendente","Desnecessario"]));td3.appendChild(mk(["—","Conforme","Nao conforme","Nao se aplica"]));')
  linhas.push('  var btn=document.createElement("button");btn.textContent="X";btn.style.cssText="background:#DC2626;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:8pt";')
  linhas.push('  btn.onclick=function(){tr.parentNode.removeChild(tr);};td4.appendChild(btn);}')
  linhas.push('function remDoc(btn){btn.parentNode.parentNode.parentNode.removeChild(btn.parentNode.parentNode);}')
  // Listener postMessage para serializar e devolver HTML
  linhas.push('window.addEventListener("message",function(e){')
  linhas.push('  if(e.data==="serializarPlano"){')
  linhas.push('    // Gravar values nos atributos antes de serializar')
  linhas.push('    document.querySelectorAll("input").forEach(function(el){el.setAttribute("value",el.value);});')
  linhas.push('    document.querySelectorAll("select").forEach(function(sel){Array.from(sel.options).forEach(function(op,i){if(i===sel.selectedIndex)op.setAttribute("selected","selected");else op.removeAttribute("selected");});});')
  linhas.push('    var html="<!DOCTYPE html>\n"+document.documentElement.outerHTML;')
  linhas.push('    e.source.postMessage({type:"planoHtml",html:html},"*");')
  linhas.push('  }')
  linhas.push('});')
  linhas.push('</script>')
  return linhas.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipoServico, cpfInspetor, cnpjoucpf, ativos, datas, docs } = body
    const datasAtiv = (datas ?? []) as {ini: string; fim: string}[]
    const docsLista = (docs ?? []) as {doc: string; sit: string; res: string}[]

    const { data: insp } = await supabase.from('inspetor')
      .select('nome_inspetor,titulo_profissional,inscricao_crea_cau,especializacao,cabecalho_documentos,rodape_documentos')
      .eq('cpf_inspetor', cpfInspetor).single()
    if (!insp) return NextResponse.json({ erro: 'Inspetor não encontrado' }, { status: 404 })

    const { data: est } = await supabase.from('estabelecimento')
      .select('razao_social_nome,cep_estabelecimento,numero_imovel,complemento')
      .eq('cnpjoucpf', cnpjoucpf).single()
    if (!est) return NextResponse.json({ erro: 'Estabelecimento não encontrado' }, { status: 404 })

    let endereco = ''
    let municipioUF = ''
    try {
      const cep = (est.cep_estabelecimento ?? '').replace(/\D/g,'')
      if (cep.length === 8) {
        const vr = await fetch('https://viacep.com.br/ws/' + cep + '/json/')
        const vd = await vr.json()
        if (!vd.erro) {
          const partes = [vd.logradouro, est.numero_imovel||null, est.complemento||null, vd.bairro].filter(Boolean)
          endereco = partes.join(', ') + ', ' + vd.localidade + '/' + vd.uf
          municipioUF = vd.localidade + '/' + vd.uf
        }
      }
    } catch {}

    const plano = PLANOS[tipoServico] as Record<string, unknown>
    if (!plano) return NextResponse.json({ erro: 'Tipo não encontrado' }, { status: 400 })

    const atividades = plano.atividades as {horas: number; dias: number; descricao: string}[]
    const documentos = plano.documentos as string[]
    const dataHoje = dataExtenso(new Date())
    const municipio = municipioUF.split('/')[0]?.trim() ?? ''
    const siglaConselho = conselho(insp.titulo_profissional)

    // Linhas de ativos
    const linhasAtivos = (ativos as Record<string, string>[]).map((a, i) => [
      '<tr>',
      '<td>' + (i+1) + '</td>',
      '<td>' + (a.tipo_ativo ?? '') + '</td>',
      '<td>' + (a.tag_ativo_nr_serie ?? '') + '</td>',
      '<td>' + (a.nome_responsavel ?? '') + '</td>',
      '<td>' + (a.funcao_responsavel ?? '') + '</td>',
      '<td>' + fmtWpp(a.whatsapp_responsavel ?? '') + '</td>',
      '<td>' + (a.uso_ativo ?? '') + '</td>',
      '</tr>'
    ].join('')).join('')

    // Linhas de atividades
    const linhasAtiv = atividades.map((a, i) => {
      const ini = datasAtiv[i]?.ini ?? ''
      const fim = datasAtiv[i]?.fim ?? ''
      const stInp = 'width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial'
      return [
        '<tr>',
        '<td style="text-align:justify">' + a.descricao + '</td>',
        ini ? '<td>' + ini + '</td>' : '<td><input type="date" id="ini_' + i + '" style="' + stInp + '"></td>',
        fim ? '<td>' + fim + '</td>' : '<td><input type="date" id="fim_' + i + '" style="' + stInp + '"></td>',
        '</tr>'
      ].join('')
    }).join('')

    // Linhas de documentos
    const stSel = 'width:100%;border:none;border-bottom:1px solid #1E3A8A;font-size:8pt;font-family:Arial'
    const optSit = '<option value="">—</option><option>Entregue</option><option>Pendente</option><option>Desnecessário</option>'
    const optRes = '<option value="">—</option><option>Conforme</option><option>Não conforme</option><option>Não se aplica</option>'
    const listaFinal = docsLista.length > 0 ? docsLista : documentos.map(d => ({doc: d, sit: '', res: ''}))
    const linhasDocs = listaFinal.map((item) => {
      const doc = typeof item === 'string' ? item : item.doc
      const sit = typeof item === 'string' ? '' : item.sit
      const res = typeof item === 'string' ? '' : item.res
      return [
      '<tr>',
      '<td>' + doc + '</td>',
      '<td><select style="' + stSel + '"><option value="">—</option><option' + (sit==="Entregue"?" selected":"") + '>Entregue</option><option' + (sit==="Pendente"?" selected":"") + '>Pendente</option><option' + (sit==="Desnecessário"?" selected":"") + '>Desnecessário</option></select></td>',
      '<td><select style="' + stSel + '"><option value="">—</option><option' + (res==="Conforme"?" selected":"") + '>Conforme</option><option' + (res==="Não conforme"?" selected":"") + '>Não conforme</option><option' + (res==="Não se aplica"?" selected":"") + '>Não se aplica</option></select></td>',
      '<td style="text-align:center"><button onclick="remDoc(this)" style="background:#DC2626;color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:8pt">✕</button></td>',
      '</tr>'
    ].join('')
    }).join('')

    const css = [
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      'body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #000; padding: 16px 24px; max-width: 100%; }' ,
      '.cab { text-align: center; margin-bottom: 10pt; padding-bottom: 4pt; border-bottom: 2px solid #1E3A8A; font-size: 12pt; color: #374151; white-space: pre-line; }',
      'h1 { font-size: 13pt; font-weight: bold; color: #1E3A8A; text-align: center; margin: 12pt 0 4pt; }',
      'h2 { font-size: 11pt; font-weight: bold; color: #1E3A8A; margin: 14pt 0 6pt; }',
      'p { margin: 4pt 0; text-align: justify; }',
      '.row { display: flex; justify-content: space-between; margin: 4pt 0; }',
      'table { width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 8.5pt; }',
      'th { background: #1E3A8A; color: #fff; padding: 4pt 6pt; text-align: left; font-size: 8pt; }',
      'td { border: 1px solid #c3d4f0; padding: 3pt 6pt; vertical-align: middle; }',
      'tr:nth-child(even) { background: #f8fafc; }',
      '.info { background: #FFF9E6; border: 1px solid #F59E0B; border-radius: 4px; padding: 6pt 10pt; margin: 8pt 0; font-size: 8.5pt; color: #92400E; }',
      '.ass { margin-top: 30pt; padding-top: 10pt; border-top: 1px solid #ccc; line-height: 1; }',
      '.rod { margin-top: 10pt; padding-top: 4pt; border-top: 1px solid #ccc; font-size: 10pt; text-align: center; white-space: pre-line; color: #374151; }',
      'button.add { margin-top: 6pt; background: #1E3A8A; color: #fff; border: none; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 8pt; }',
    ].join('\n')

    const partes: string[] = []
    partes.push('<!DOCTYPE html>')
    partes.push('<html lang="pt-BR"><head><meta charset="UTF-8">')
    partes.push('<style>' + css + '</style>')
    partes.push(gerarScriptDatas(atividades.length))
    partes.push('</head><body>')
    partes.push('<div id="msgBanner" style="display:none;position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#1E3A8A;color:#fff;padding:10px 24px;border-radius:8px;font-size:10pt;font-family:Arial;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,0.3)"></div>')
    partes.push('<div class="cab">' + (insp.cabecalho_documentos || plano.titulo) + '</div>')
    partes.push('<h1>' + plano.titulo + '</h1>')
    partes.push('<p style="text-align:center;color:#374151;margin-bottom:10pt">' + municipio + ', ' + dataHoje + '</p>')
    partes.push('<div class="row"><span><strong>Estabelecimento:</strong> ' + est.razao_social_nome + '</span><span><strong>CNPJ/CPF:</strong> ' + fmtCNPJ(cnpjoucpf) + '</span></div>')
    partes.push('<p><strong>Endereço:</strong> ' + endereco + '</p>')
    partes.push('<h2>1.1.- Ativos a Vistoriar</h2>')
    partes.push('<table><thead><tr><th>#</th><th>Tipo</th><th>TAG/Série</th><th>Responsável</th><th>Função</th><th>WhatsApp</th><th>Uso</th></tr></thead>')
    partes.push('<tbody>' + linhasAtivos + '</tbody></table>')
    partes.push('<h2>1.2.- Plano de Trabalho — ' + plano.parceiro + '</h2>')
    partes.push('<div class="info">⚠️ Favor preencher as datas de início e fim de cada atividade.</div>')
    partes.push('<table><thead><tr><th style="width:60%">Atividades</th><th style="width:20%">Dt. Início</th><th style="width:20%">Dt. Fim</th></tr></thead>')
    partes.push('<tbody>' + linhasAtiv + '</tbody></table>')
    partes.push('<h2>1.3.- Relação de Documentos Solicitados</h2>')
    partes.push('<div class="info">⚠️ Favor verificar e ajustar a relação de documentos.</div>')
    partes.push('<table><thead><tr><th style="width:55%">Documento</th><th style="width:18%">Situação</th><th style="width:18%">Resultado</th><th style="width:9%">Ação</th></tr></thead>')
    partes.push('<tbody id="tbDocs">' + linhasDocs + '</tbody></table>')
    partes.push('<button class="add" onclick="addDoc()">+ Adicionar documento</button>')
    partes.push('<div class="ass">')
    partes.push('<p style="font-size:8pt">[Assinatura digital]</p>')
    partes.push('<p><strong>' + insp.nome_inspetor + '</strong></p>')
    partes.push('<p>' + tituloLimpo(insp.titulo_profissional) + ' — ' + siglaConselho + ' ' + numLimpo(insp.inscricao_crea_cau) + '</p>')
    if (insp.especializacao) partes.push('<p>Especialista ' + insp.especializacao + '</p>')
    partes.push('<p style="margin-top:20pt">De acordo: _____________________ CPF: _______________ Data: ___/___/______</p>')
    partes.push('<p>' + (String(plano.parceiro ?? '')).replace('Inspetor e ','') + '</p>')
    partes.push('</div>')
    partes.push('<div class="rod">' + (insp.rodape_documentos || 'Mapeamento Inteligente de Edificações e Equipamentos') + '</div>')
    partes.push('</body></html>')

    const html = partes.join('\n')
    const docInfo = {
      nome: insp.nome_inspetor,
      titulo: tituloLimpo(insp.titulo_profissional),
      cabecalho: insp.cabecalho_documentos ?? '',
      rodape: insp.rodape_documentos ?? '',
      conselho: siglaConselho,
      inscricao: numLimpo(insp.inscricao_crea_cau)
    }
    return NextResponse.json({ html, planoInfo: { titulo: String(plano.titulo), parceiro: String(plano.parceiro), atividades, documentos }, docInfo, endereco })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
