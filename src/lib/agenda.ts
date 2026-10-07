// src/lib/agenda.ts
// AIMÊ — Validação da agenda do Plano de Trabalho (item 1.2). Regra de Celso (07/10/2026): TODOS os dados
// da agenda são obrigatórios — toda atividade precisa de data de início e de data de fim, e o fim não pode ser
// anterior ao início. Sem dependências: a tela e o teste usam a mesma função.

export type DataAtividade = { ini: string; fim: string }
export type ResultadoAgenda = { ok: true } | { ok: false; titulo: string; mensagem: string }

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/

export function validarAgenda(qtdAtividades: number, datas: Array<DataAtividade | undefined>): ResultadoAgenda {
  const faltando: number[] = []
  for (let i = 0; i < qtdAtividades; i++) {
    const d = datas[i]
    if (!d || !DATA_VALIDA.test(d.ini ?? '') || !DATA_VALIDA.test(d.fim ?? '')) faltando.push(i + 1)
  }
  if (faltando.length > 0) {
    return {
      ok: false, titulo: 'Preencha todas as datas da agenda',
      mensagem: `Informe a data de início e a data de fim de todas as atividades (item 1.2). Faltam as datas ${faltando.length === 1 ? 'da atividade' : 'das atividades'} ${faltando.join(', ')}.`,
    }
  }
  const invertidas: number[] = []
  for (let i = 0; i < qtdAtividades; i++) if ((datas[i] as DataAtividade).fim < (datas[i] as DataAtividade).ini) invertidas.push(i + 1)
  if (invertidas.length > 0) {
    return { ok: false, titulo: 'Datas inválidas', mensagem: `A data de fim não pode ser anterior à data de início (${invertidas.length === 1 ? 'atividade' : 'atividades'} ${invertidas.join(', ')}).` }
  }
  return { ok: true }
}
