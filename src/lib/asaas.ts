// src/lib/asaas.ts
// AIMÊ — Cliente da API do Asaas (gateway de pagamento: PIX e cartão).
//
// Ambiente sandbox x produção: controlado pela variável ASAAS_AMBIENTE.
//   * ausente, ou qualquer valor diferente de 'producao': usa o SANDBOX
//     (ambiente de testes do Asaas, chave ASAAS_API_KEY_SANDBOX) — padrão
//     seguro, para nunca gerar cobrança real por engano.
//   * 'producao': usa produção (chave ASAAS_API_KEY_PRODUCAO).
//
// https://docs.asaas.com/reference/comece-por-aqui

const BASE_URL_SANDBOX = 'https://sandbox.asaas.com/api/v3'
const BASE_URL_PRODUCAO = 'https://api.asaas.com/v3'

export function ambienteAsaas(): 'sandbox' | 'producao' {
  return process.env.ASAAS_AMBIENTE === 'producao' ? 'producao' : 'sandbox'
}

function baseUrl(): string {
  return ambienteAsaas() === 'producao' ? BASE_URL_PRODUCAO : BASE_URL_SANDBOX
}

function chaveApi(): string {
  const chave = ambienteAsaas() === 'producao'
    ? process.env.ASAAS_API_KEY_PRODUCAO
    : process.env.ASAAS_API_KEY_SANDBOX
  if (!chave) throw new Error(`Chave do Asaas ausente para o ambiente ${ambienteAsaas()}.`)
  return chave
}

async function chamar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      access_token: chaveApi(),
      ...(opcoes.headers ?? {}),
    },
  })
  const corpo = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = corpo?.errors?.[0]?.description ?? corpo?.message ?? `Asaas respondeu ${res.status}`
    throw new Error(msg)
  }
  return corpo as T
}

// ───────────────────────── Cliente (customer) ─────────────────────────

export type ClienteAsaas = { id: string; cpfCnpj: string }

export type DadosContatoCliente = { email?: string | null; telefone?: string | null }

/**
 * Campos de contato do cliente. Só entram se tiverem formato válido (um e-mail ou telefone
 * fora do padrão faria o Asaas recusar o cadastro inteiro). Com o e-mail preenchido, a página
 * de pagamento por cartão do Asaas tende a vir com ele já preenchido (confirmar no sandbox).
 * notificationDisabled: os avisos de cobrança ficam com o AIMÊ (e-mail da equipe); sem isto
 * o Asaas mandaria os dele em paralelo.
 */
function extrasDoCliente(c?: DadosContatoCliente): Record<string, unknown> {
  const extras: Record<string, unknown> = { notificationDisabled: true }
  const email = String(c?.email ?? '').trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) extras.email = email
  const tel = String(c?.telefone ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (tel.length === 11) extras.mobilePhone = tel
  else if (tel.length === 10) extras.phone = tel
  return extras
}

/**
 * Acha o cliente do Asaas pelo CPF (campo externReference, onde guardamos o
 * CPF do inspetor) ou cria um novo se não existir. Idempotente: chamar de
 * novo para o mesmo CPF sempre devolve o mesmo id do Asaas.
 */
export async function acharOuCriarCliente(cpf: string, nome: string, contato?: DadosContatoCliente): Promise<ClienteAsaas> {
  const extras = extrasDoCliente(contato)
  const busca = await chamar<{ data: ClienteAsaas[] }>(`/customers?cpfCnpj=${cpf}`)
  if (busca.data.length > 0) {
    const existente = busca.data[0]
    // Clientes criados antes desta melhoria não têm e-mail/telefone: completa o
    // cadastro (melhor esforço — nunca derruba a compra por causa disso).
    try { await chamar(`/customers/${existente.id}`, { method: 'PUT', body: JSON.stringify(extras) }) } catch { /* segue */ }
    return existente
  }
  const base = { name: nome, cpfCnpj: cpf, externalReference: cpf }
  try {
    return await chamar<ClienteAsaas>('/customers', { method: 'POST', body: JSON.stringify({ ...base, ...extras }) })
  } catch {
    // O Asaas pode recusar um contato que parece válido; volta ao cadastro
    // mínimo, que sempre funcionou, em vez de impedir a compra.
    return chamar<ClienteAsaas>('/customers', { method: 'POST', body: JSON.stringify(base) })
  }
}

// ───────────────────────── Cobrança (payment) ─────────────────────────

export type FormaPagamento = 'PIX' | 'CREDIT_CARD'

export type CobrancaCriada = {
  id: string
  status: string
  invoiceUrl: string          // link da fatura, funciona para qualquer forma de pagamento
  pixQrCode?: string          // só quando billingType = PIX (imagem base64)
  pixCopiaECola?: string      // só quando billingType = PIX (código "copia e cola")
}

/**
 * Cria uma cobrança avulsa (não recorrente) para um cliente já existente no
 * Asaas. `valorCentavos` é convertido para reais (formato que o Asaas
 * espera) só aqui, na borda — o resto do sistema trabalha só em centavos.
 */
export async function criarCobranca(params: {
  clienteId: string
  forma: FormaPagamento
  valorCentavos: number
  descricao: string
  referenciaExterna: string   // usamos o id do pedido_credito, para casar no webhook
}): Promise<CobrancaCriada> {
  const pagamento = await chamar<CobrancaCriada>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: params.clienteId,
      billingType: params.forma,
      value: params.valorCentavos / 100,
      description: params.descricao,
      externalReference: params.referenciaExterna,
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), // vence em 3 dias
    }),
  })

  if (params.forma === 'PIX') {
    try {
      const pix = await chamar<{ encodedImage: string; payload: string }>(`/payments/${pagamento.id}/pixQrCode`)
      pagamento.pixQrCode = pix.encodedImage
      pagamento.pixCopiaECola = pix.payload
    } catch {
      // Se o QR Code falhar por qualquer motivo, a cobrança em si já foi
      // criada — o usuário ainda consegue pagar pelo invoiceUrl.
    }
  }
  return pagamento
}

/** Consulta o status atual de uma cobrança (usado como reforço do webhook, e para reexibir o link de pagamento de um pedido já criado). */
export async function consultarCobranca(id: string): Promise<{
  id: string; status: string; invoiceUrl: string
  subscription?: string | null   // id da assinatura, quando a cobrança nasceu de uma
  value?: number                 // em reais
  dueDate?: string               // 'AAAA-MM-DD'
  billingType?: string           // 'PIX' | 'CREDIT_CARD' | ...: a forma com que a cobrança foi criada
}> {
  return chamar(`/payments/${id}`)
}

/** Remove uma cobrança AINDA NÃO PAGA (o Asaas recusa remover uma já paga). */
export async function cancelarCobranca(id: string): Promise<void> {
  await chamar(`/payments/${id}`, { method: 'DELETE' })
}

/**
 * Status do Asaas que consideramos "pago" — PIX/cartão à vista chegam em
 * RECEIVED ou CONFIRMED dependendo do meio; nunca tratamos boleto
 * compensado aqui porque boleto não é uma forma de pagamento oferecida
 * (decisão de Celso, 29/09/2026: só PIX e cartão).
 */
export const STATUS_PAGO = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])

// ───────────────────────── Assinatura (subscription) ─────────────────────────
// PLANO MENSAL e PLANO ESCRITÓRIO podem ser assinados: o Asaas gera uma cobrança por mês,
// sozinho, e o webhook (/api/asaas-webhook) libera os créditos de cada uma.

export type AssinaturaAsaas = { id: string; status?: string; nextDueDate?: string }

export async function criarAssinatura(params: {
  clienteId: string
  valorCentavos: number
  descricao: string
  referenciaExterna: string       // id da linha em `assinaturas`
  primeiroVencimento: string      // 'AAAA-MM-DD', hoje ou futuro
}): Promise<AssinaturaAsaas> {
  return chamar<AssinaturaAsaas>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: params.clienteId,
      billingType: 'CREDIT_CARD',   // renovação automática só no cartão (decisão de Celso, 05/10/2026)
      value: params.valorCentavos / 100,
      nextDueDate: params.primeiroVencimento,
      cycle: 'MONTHLY',
      description: params.descricao,
      externalReference: params.referenciaExterna,
    }),
  })
}

/** Consulta a assinatura: nextDueDate é o próximo vencimento exato (não depende do nosso cálculo de calendário). */
export async function consultarAssinatura(id: string): Promise<{ id: string; status?: string; nextDueDate?: string }> {
  return chamar(`/subscriptions/${id}`)
}

export type CobrancaDaAssinatura = { id: string; status: string; invoiceUrl: string; dueDate?: string }

/** Cobranças geradas por uma assinatura (a primeira traz o link para digitar o cartão). */
export async function listarCobrancasDaAssinatura(id: string): Promise<CobrancaDaAssinatura[]> {
  const r = await chamar<{ data?: CobrancaDaAssinatura[] }>(`/subscriptions/${id}/payments`)
  return r.data ?? []
}

/** Cancela a assinatura no Asaas (cobranças futuras param; as cobranças pendentes são removidas por ele). */
export async function cancelarAssinaturaNoAsaas(id: string): Promise<void> {
  await chamar(`/subscriptions/${id}`, { method: 'DELETE' })
}

/** Reajuste de valor (ex.: salário mínimo novo): vale para as próximas cobranças e as pendentes. */
export async function atualizarValorAssinaturaNoAsaas(id: string, valorCentavos: number): Promise<void> {
  await chamar(`/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ value: valorCentavos / 100, updatePendingPayments: true }),
  })
}
