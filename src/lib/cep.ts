// src/lib/cep.ts
// AIMÊ — CEP: o estado guarda só os 8 dígitos; a tela mostra "00000-000". Quem digita (ou cola) com hífen, ponto ou
// espaço não perde o último dígito.
// (Bug de 08/10/2026 na tela da Proposta: o campo tinha maxLength=8 sobre o texto cru, então "29000-123" virava
// "29000-12", a busca do endereço nunca disparava e a proposta saía sem endereço.)

export function digitosDoCep(valor: string): string {
  return (valor ?? '').replace(/\D/g, '').slice(0, 8)
}

export function formatarCep(valor: string): string {
  const d = digitosDoCep(valor)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}
