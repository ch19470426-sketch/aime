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
