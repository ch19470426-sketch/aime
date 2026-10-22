"use client"
// AIMÊ — Painel de créditos no topo do menu do Dashboard (22/10/2026): plano(s) vigente(s) com vencimento e saldo,
// créditos avulsos e, havendo mais de uma linha, o total. Os saldos vêm de /api/creditos/status (mesma conta que o
// servidor usa para cobrar: soma dos planos vigentes + avulso do contrato mais recente); os nomes e vencimentos vêm de
// contratos_inspetor, lido com o login do usuário. Recarrega ao voltar para a aba (ex.: depois de pagar).
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { credencialDoBanco } from "@/lib/bancoNavegador"

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'
const MINIMO_VISTORIA = 100
const COR: Record<string, string> = { 'PLANO CORTESIA': '#6B7280', 'PLANO SERVIÇO': '#0284C7', 'PLANO MENSAL': '#059669', 'PLANO ESCRITÓRIO': '#7C3AED' }

function dataBR(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}
// Data de hoje no horário de Brasília (AAAA-MM-DD), sem depender do fuso do aparelho
function hojeBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}
// Vence em até 7 dias (inclui hoje)? Compara só as datas (AAAA-MM-DD), sem fuso.
function venceEmBreve(fim: string | null | undefined, hoje: string): boolean {
  if (!fim) return false
  const dias = (Date.parse(fim.slice(0, 10) + 'T00:00:00Z') - Date.parse(hoje + 'T00:00:00Z')) / 86400000
  return dias <= 7
}

type Linha = { chave: string; rotulo: string; cor: string; validade: string; saldo: number; breve: boolean }
type Dados = { linhas: Linha[]; total: number; semVigente: boolean } | null

export default function PainelCreditos() {
  const [dados, setDados] = useState<Dados>(null)
  const [oculto, setOculto] = useState(false)

  async function carregar() {
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session?.access_token) return
      const cpf = session.user?.email?.split('@')[0] ?? ''
      const [rs, rc] = await Promise.all([
        fetch('/api/creditos/status', { cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` } }),
        credencialDoBanco().then(tk => fetch(
          `${SUPA_URL}/rest/v1/contratos_inspetor?cpf_inspetor=eq.${cpf}&order=data_inicio_contrato.desc`,
          { cache: 'no-store', headers: { apikey: SUPA_KEY, Authorization: `Bearer ${tk}` } })),
      ])
      if (!rs.ok) return
      const st = await rs.json()
      // Gestor (isento) ou cobrança desligada: não há saldo a mostrar
      if (st.isento || !st.cobrancaAtiva) { setOculto(true); return }
      const cts = rc.ok ? await rc.json() : []
      const lista: any[] = Array.isArray(cts) ? cts : []
      const hoje = hojeBrasilia()

      const linhas: Linha[] = lista
        .filter(c => c.qde_contratada_plano > 0 && c.data_fim_contrato >= hoje)
        .map((c, i) => ({
          chave: `p${i}`, rotulo: String(c.tipo_assinatura ?? 'PLANO').replace(/^PLANO /, 'Plano '),
          cor: COR[c.tipo_assinatura] ?? '#1E3A8A', validade: `até ${dataBR(c.data_fim_contrato)}`,
          saldo: Number(c.saldo_quantidade_plano) || 0, breve: venceEmBreve(c.data_fim_contrato, hoje),
        }))
      const semVigente = linhas.length === 0

      const saldoAvulso = Number(st.saldoAvulso) || 0
      if (saldoAvulso > 0) {
        const r = lista[0] // avulso vale do contrato mais recente
        linhas.push({ chave: 'av', rotulo: 'Avulsos', cor: '#7C3AED',
          validade: r?.data_fim_avulso ? `até ${dataBR(r.data_fim_avulso)}` : 'sem vencimento', saldo: saldoAvulso,
          breve: venceEmBreve(r?.data_fim_avulso, hoje) })
      }
      setDados({ linhas, total: Number(st.saldoTotal) || 0, semVigente })
    } catch { /* sem painel: o menu segue normal */ }
  }

  useEffect(() => {
    carregar()
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [])

  if (oculto || !dados) return null
  const baixo = dados.total < MINIMO_VISTORIA
  const mostrarTotal = dados.linhas.length > 1

  return (
    <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderBottom: '2px solid #1E3A8A' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Meus créditos
      </div>
      {dados.linhas.length === 0 && (
        <div style={{ fontSize: '11px', color: '#B45309', marginBottom: '4px' }}>Sem plano vigente.</div>
      )}
      {dados.linhas.map(l => (
        <div key={l.chave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', padding: '3px 0' }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: '9999px', fontSize: '9px', fontWeight: 700, color: 'white', backgroundColor: l.cor }}>{l.rotulo}</span>
            <div style={{ fontSize: '9px', color: l.breve ? '#B45309' : '#64748B', fontWeight: l.breve ? 700 : 400, marginTop: '1px' }}>{l.breve ? '⚠ vence ' : ''}{l.validade}</div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap' }}>{l.saldo}<span style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}> CR</span></div>
        </div>
      ))}
      {mostrarTotal && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #CBD5E1', marginTop: '3px', paddingTop: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Total</span>
          <span style={{ fontSize: '15px', fontWeight: 800, color: baixo ? '#B45309' : '#1E3A8A' }}>{dados.total}<span style={{ fontSize: '9px', fontWeight: 600 }}> CR</span></span>
        </div>
      )}
      {(baixo || dados.semVigente) && (
        <a href="/meu-plano" style={{ display: 'block', marginTop: '5px', fontSize: '10px', fontWeight: 700, color: '#B45309', textDecoration: 'underline' }}>
          {baixo ? 'Saldo baixo: contratar créditos' : 'Contratar plano'}
        </a>
      )}
    </div>
  )
}
