// src/lib/tipoVistoria.ts
// AIMÊ — Serviço de VISTORIA (como gravado em dados_vistoria.tipo_servico) a partir do serviço do LAUDO: 41→31, 42→32, ... 48→38.
// Outros valores seguem como estão.
const LAUDO_PARA_VISTORIA: Record<string, string> = {
  '41': '31', '42': '32', '43': '33', '44': '34',
  '45': '35', '46': '36', '47': '37', '48': '38',
}
export function tipoDeVistoriaDoLaudo(tipoServico: unknown): string {
  const t = String(tipoServico ?? '').trim()
  return LAUDO_PARA_VISTORIA[t] ?? t
}
