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

/**
 * Acha o cliente do Asaas pelo CPF (campo externReference, onde guardamos o
 * CPF do inspetor) ou cria um novo se não existir. Idempotente: chamar de
 * novo para o mesmo CPF sempre devolve o mesmo id do Asaas.
 */
export async function acharOuCriarCliente(cpf: string, nome: string): Promise<ClienteAsaas> {
  const busca = await chamar<{ data: ClienteAsaas[] }>(`/customers?cpfCnpj=${cpf}`)
  if (busca.data.length > 0) return busca.data[0]
  return chamar<ClienteAsaas>('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: nome, cpfCnpj: cpf, externalReference: cpf }),
  })
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
export async function consultarCobranca(id: string): Promise<{ id: string; status: string; invoiceUrl: string }> {
  return chamar(`/payments/${id}`)
}

/**
 * Status do Asaas que consideramos "pago" — PIX/cartão à vista chegam em
 * RECEIVED ou CONFIRMED dependendo do meio; nunca tratamos boleto
 * compensado aqui porque boleto não é uma forma de pagamento oferecida
 * (decisão de Celso, 29/09/2026: só PIX e cartão).
 */
export const STATUS_PAGO = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])
