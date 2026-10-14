// src/lib/nomeArquivo.ts
// AIMÊ — Nome de arquivo entregue ao USUÁRIO (download, anexo, PDF).
//
// No armazenamento, o nome do arquivo começa pela chave do inspetor, que é o CPF dele ("<cpf>_<cnpj>_<serviço>.html"). Esse prefixo
// existe para a checagem de dono (src/lib/autorizacao.ts) e NÃO pode sair no arquivo que o inspetor baixa e envia ao cliente: seria
// entregar o CPF dele. O que o usuário recebe leva o nome sem o primeiro trecho.
//   "05491239704_12345678000190_proposta.html"  ->  "12345678000190_proposta.html"
//   "05491239704_termo_de_aceite.html"          ->  "termo_de_aceite.html"
export const nomeSemChave = (nome: string): string => String(nome ?? '').replace(/^[^_]+_/, '')

/**
 * Chave a usar no NOME do arquivo ao sincronizar uma vistoria salva SEM internet. Até 13/10/2026 a chave do inspetor era um código
 * sequencial (INS-001...); agora é o CPF. Uma vistoria salva offline antes da migração (ou num aparelho que não atualizou o cadastro)
 * carrega a chave antiga, e o servidor recusa arquivo cujo nome não comece pela chave atual (o CPF): sem esta troca, ela ficaria
 * presa na fila para sempre. A chave antiga INS-nnn vira o CPF do DONO da chave (o eletricista, no fluxo elétrico; senão o inspetor);
 * qualquer outra chave é mantida. Há uma cópia desta regra em public/sw.js, que não importa módulos: manter as duas iguais.
 */
export function chaveParaSincronizar(chaveSalva: unknown, cpfDoDono: unknown): string {
  const chave = String(chaveSalva ?? '')
  const cpf = String(cpfDoDono ?? '').replace(/\D/g, '')
  return /^INS-\d+$/i.test(chave) && cpf ? cpf : chave
}

/**
 * Nome do PDF ASSINADO, montado pelo SISTEMA a partir do nome do documento (HTML) que ele assina: "<chave>_<cnpj>_laudo.html" vira
 * "<chave>_<cnpj>_laudo_assinado.pdf". O nome NÃO vem do arquivo que o usuário escolhe no aparelho: o nome do arquivo baixado já não leva a chave
 * (o CPF), e um PDF gravado sem a chave não aparece em Baixar documentos (a lista só mostra nomes que começam pela chave do inspetor) e ainda
 * poderia sobrescrever o de outro inspetor com o mesmo CNPJ. SEM o nome do documento devolve null: nunca adivinha um nome (um nome padrão
 * "laudo" gravou o PDF do plano de manutenção por cima do PDF assinado do laudo).
 */
export function nomePdfAssinado(nomeDocumento: string | null | undefined): string | null {
  const base = String(nomeDocumento ?? '').trim().replace(/\.html$/i, '')
  return base ? base + '_assinado.pdf' : null
}

// ── Versões do PDF assinado ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Cada envio do PDF assinado é GUARDADO como uma versão nova, com data e hora (horário de Brasília, relógio do SERVIDOR, nunca o do aparelho) no
// nome: "<chave>_<cnpj>_laudo_assinado.pdf" vira "<chave>_<cnpj>_laudo_assinado_20261014-094600.pdf". Assim um novo envio não sobrescreve o anterior
// e a lista de Baixar documentos mostra todas as versões, a mais recente primeiro. O HTML do documento segue com uma versão só (é regerado).
const VERSAO_NO_NOME = /_assinado_(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.pdf$/i

function partesEmSaoPaulo(data: Date) {
  const p: Record<string, string> = {}
  for (const parte of new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(data)) p[parte.type] = parte.value
  return p
}

/** Acrescenta a data e a hora ao nome de um PDF assinado ("..._assinado.pdf"). Qualquer outro nome volta igual. */
export function versaoPdfAssinado(nome: string, agora: Date = new Date()): string {
  if (!/_assinado\.pdf$/i.test(nome)) return nome
  const p = partesEmSaoPaulo(agora)
  return nome.replace(/\.pdf$/i, `_${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}.pdf`)
}

/** Se o nome é de uma versão de PDF assinado, devolve o nome SEM a versão, o instante em ISO (UTC) e a data e hora de Brasília para exibir. */
export function lerVersaoPdfAssinado(nome: string): { nomeSemVersao: string; iso: string; exibicao: string } | null {
  const m = nome.match(VERSAO_NO_NOME)
  if (!m) return null
  const [, aaaa, mm, dd, hh, mi, ss] = m
  const instante = new Date(`${aaaa}-${mm}-${dd}T${hh}:${mi}:${ss}-03:00`)     // o Brasil não tem horário de verão desde 2019
  if (Number.isNaN(instante.getTime())) return null
  return { nomeSemVersao: nome.replace(VERSAO_NO_NOME, '_assinado.pdf'), iso: instante.toISOString(), exibicao: `${dd}/${mm}/${aaaa} ${hh}:${mi}` }
}

/** Nome-base do DOCUMENTO: tira a extensão e, se houver, o "_assinado" com a versão. As versões e o HTML contam como UM documento só. */
export function baseDoDocumento(nome: string): string {
  return nome.replace(/(_assinado(_\d{8}-\d{6})?)?\.(html|pdf|json)$/i, '')
}
