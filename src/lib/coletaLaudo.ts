// src/lib/coletaLaudo.ts
// AIMÊ — Validação da tela "Coleta de Dados Básicos para Geração de Laudos" (src/app/laudo/page.tsx).
//
// REGRA (Celso, 07/10/2026): TODOS os campos da tela são obrigatórios. Única exceção: no serviço 42 (laudo de
// inspeção predial) a ART do engenheiro elétrico e a do engenheiro mecânico são facultativas — por isso elas
// nem entram aqui. A ART/RRT do responsável técnico continua obrigatória em todos os tipos, inclusive no 42.
//
// HISTÓRICO: a validação do item 3.3 foi desligada em 28/07/2026 ("temporariamente", commit 063a3f5). A versão
// original conferia risco/desempenho/manut/uso/desempGeral para TODOS os tipos, mas os laudos de NR (45 a 48)
// usam outros cinco campos (nrManut, nrOp, ...), então ficariam bloqueados para sempre; e nos tipos 43 e 44 o
// campo "a)" (nivel) nunca era conferido. Aqui cada tipo confere exatamente os campos que a tela mostra.
//
// Sem dependências: a tela e o teste usam a mesma função.

export type EstadoColeta = {
  tipoServico: string
  sinteseEdif: string; nivelInspecao: string; dadosVistoria: string
  nivel: string; risco: string; desempenho: string; manut: string; uso: string; desempGeral: string
  nrManut: string; nrOp: string; nrFisico: string; nrSeg: string; nrDoc: string
  croqui: string; fotoFachada: string; artRrt: string
  docs: Record<string, { situacao: string; resultado: string }>
}

const NR = ['45', '46', '47', '48']
type Campo = { rotulo: string; chave: keyof EstadoColeta }

/** Os rótulos são os mesmos da tela (sem o " *"); há um teste que confere isso contra o código da tela. */
export const CAMPOS_3_3: Record<string, Campo[]> = {
  padrao: [ // 41 e 42 — classificação padrão NBR 16.747
    { rotulo: 'a) Grau de risco', chave: 'risco' }, { rotulo: 'b) Desempenho', chave: 'desempenho' },
    { rotulo: 'c) Qualidade da manutenção', chave: 'manut' }, { rotulo: 'd) Condições de uso', chave: 'uso' },
    { rotulo: 'e) Desempenho geral', chave: 'desempGeral' },
  ],
  '43': [
    { rotulo: 'a) Conformidade construtiva', chave: 'nivel' }, { rotulo: 'b) Qualidade de acabamento', chave: 'risco' },
    { rotulo: 'c) Funcionalidade', chave: 'desempenho' }, { rotulo: 'd) Habitabilidade', chave: 'manut' },
    { rotulo: 'e) Classe do imóvel', chave: 'uso' }, { rotulo: 'f) Grau de satisfação no recebimento', chave: 'desempGeral' },
  ],
  '44': [
    { rotulo: 'a) Estado de conservação', chave: 'nivel' }, { rotulo: 'b) Histórico de manutenção', chave: 'risco' },
    { rotulo: 'c) Exposição ambiental', chave: 'desempenho' }, { rotulo: 'd) Risco de desprendimento', chave: 'manut' },
    { rotulo: 'e) Desempenho do sistema', chave: 'uso' }, { rotulo: 'f) Prioridade de intervenção', chave: 'desempGeral' },
  ],
  nr: [ // 45 a 48 — 5 critérios
    { rotulo: 'Manutenção', chave: 'nrManut' }, { rotulo: 'Operação', chave: 'nrOp' },
    { rotulo: 'Condições Físicas', chave: 'nrFisico' }, { rotulo: 'Segurança', chave: 'nrSeg' },
    { rotulo: 'Documentação', chave: 'nrDoc' },
  ],
}

export const ROTULO_CROQUI = 'Croqui de localização (mapa)'
export const ROTULO_FOTO = 'Foto da fachada principal'
export const ROTULO_ART = 'ART / RRT do Responsável Técnico'
export const ROTULO_NIVEL = 'Nível da Inspeção'

const vazio = (v: unknown) => typeof v !== 'string' || v.trim() === ''

export function camposFaltantes(e: EstadoColeta): string[] {
  const falta: string[] = []
  const ehNR = NR.includes(e.tipoServico)

  // 1.1
  if (!ehNR && vazio(e.nivelInspecao)) falta.push(`1.1 — ${ROTULO_NIVEL}`)
  if (vazio(e.sinteseEdif)) falta.push(ehNR ? '1.1 — Descrição do estabelecimento e dos ativos' : '1.1 — Descrição da edificação')
  // 3.1
  if (vazio(e.dadosVistoria)) falta.push('3.1 — Descrição da vistoria técnica')
  // 3.3 — cada tipo confere os campos que a tela mostra para ele
  const lista = ehNR ? CAMPOS_3_3.nr : (CAMPOS_3_3[e.tipoServico === '43' || e.tipoServico === '44' ? e.tipoServico : 'padrao'])
  for (const c of lista) if (vazio(e[c.chave] as string)) falta.push(`3.3 — ${c.rotulo}`)
  // Localização e Anexo 3
  if (vazio(e.croqui)) falta.push(ROTULO_CROQUI)
  if (vazio(e.fotoFachada)) falta.push(ROTULO_FOTO)
  if (vazio(e.artRrt)) falta.push(ROTULO_ART)   // obrigatória em TODOS os tipos, inclusive no 42 (só a elétrica e a mecânica são facultativas)
  // Anexo 1 — situação e resultado de cada documento solicitado
  const docsIncompletos = Object.entries(e.docs ?? {}).filter(([, d]) => vazio(d?.situacao) || vazio(d?.resultado)).map(([nome]) => nome)
  if (docsIncompletos.length > 0) {
    const nomes = docsIncompletos.slice(0, 3).join(', ') + (docsIncompletos.length > 3 ? ` e mais ${docsIncompletos.length - 3}` : '')
    falta.push(`Anexo 1 — situação e resultado de ${docsIncompletos.length === 1 ? '1 documento' : `${docsIncompletos.length} documentos`} (${nomes})`)
  }
  return falta
}
