// Fetch com timeout — evita lentidão em sinal fraco
// NC/CP: 10s | foto-nr: 8s | salvar-vistoria: 15s

export async function fetchTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (err: any) {
    clearTimeout(timer)
    if (err?.name === 'AbortError') {
      throw new Error('timeout')
    }
    throw err
  }
}
