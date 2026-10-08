'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Banner from '@/components/Banner'
import { useBanner } from '@/hooks/useBanner'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

/**
 * 'AAAA-MM-DD' -> 'DD/MM/AAAA', sem passar por new Date()/toLocaleDateString.
 * new Date('2026-10-01').toLocaleDateString('pt-BR') mostra "30/09/2026" no
 * fuso de Brasília (a string é interpretada como meia-noite UTC, e a
 * conversão para local -3h volta para o dia anterior). Achado real de
 * Celso, 01/10/2026 (mesmo bug encontrado em /inspetor).
 */
function fmtDataBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

const S = {
  page: { backgroundColor: '#E8EEF7', minHeight: '100vh', padding: '16px' } as React.CSSProperties,
  card: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', overflow: 'hidden', maxWidth: '1200px', margin: '0 auto', width: '100%' } as React.CSSProperties,
  header: { backgroundColor: '#1E3A8A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const } as React.CSSProperties,
  body: { display: 'flex', minHeight: '600px', flexWrap: 'wrap' as const } as React.CSSProperties,
  // Lista lateral
  lista: { width: '280px', minWidth: '180px', maxWidth: '100%', borderRight: '2px solid #1E3A8A', flexShrink: 0 } as React.CSSProperties,
  listaHeader: { backgroundColor: '#1E3A8A', padding: '8px 12px', color: 'white', fontWeight: 700, fontSize: '11px' } as React.CSSProperties,
  listaItem: (sel: boolean) => ({ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: sel ? '#EBF1FF' : 'white', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }) as React.CSSProperties,
  // Painel direito
  painel: { flex: 1, minWidth: '280px', padding: '20px', backgroundColor: '#F8FAFC', overflowY: 'auto' as const },
  secao: { marginBottom: '20px' } as React.CSSProperties,
  secaoTitulo: { fontSize: '12px', fontWeight: 700, color: '#1E3A8A', borderBottom: '2px solid #1E3A8A', paddingBottom: '4px', marginBottom: '12px' } as React.CSSProperties,
  label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' } as React.CSSProperties,
  input: { width: '100%', padding: '8px 10px', border: '1.5px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '8px 10px', border: '1.5px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' as const, backgroundColor: 'white' },
  btnPri: { backgroundColor: '#1E3A8A', color: 'white', border: 'none', borderRadius: '9999px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  btnSec: { backgroundColor: 'white', color: '#1E3A8A', border: '2px solid #1E3A8A', borderRadius: '9999px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' } as React.CSSProperties,
  badge: (cor: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, backgroundColor: cor, color: 'white' }) as React.CSSProperties,
  planoCard: (ativo: boolean) => ({ border: `2px solid ${ativo ? '#1E3A8A' : '#E2E8F0'}`, borderRadius: '8px', padding: '10px 12px', backgroundColor: ativo ? '#EBF1FF' : 'white' }) as React.CSSProperties,
}

type ComTotalEDesde<T> = { total: T; desde: T | null }
type MensagemSuporte = {
  id: number
  cpf_inspetor: string
  nome_inspetor: string
  assunto: string
  mensagem: string
  status: 'pendente' | 'respondido'
  criado_em: string
  respondido_em: string | null
  inspetor_whatsapp: string
  inspetor_email: string
  resposta?: string | null
}

type ResumoGestor = {
  totalInspetores: number
  inspetoresAtivos: number
  contratosVigentes: number
  totalCrPlano: number
  totalCrAvulso: number
  totalCrConsumo: number
  inspetoresSemContrato: string[]
  // Indicadores do Painel Geral (pedido de Celso, 28/09/2026)
  inspetores: ComTotalEDesde<number>
  porPlano: ComTotalEDesde<Record<string, number>>
  diasAtePrimeiraVistoria: ComTotalEDesde<number | null>
  vistoriasPorLaudo: ComTotalEDesde<number | null>
  laudosGerados: ComTotalEDesde<number>
  planosManutencaoGerados: ComTotalEDesde<number>
  creditos: { contratadosTotal: number; contratadosDesde: number | null; disponiveis: number }
}

type Estabelecimento = {
  cnpjoucpf: string
  razao_social_nome: string
  cep_estabelecimento: string
  numero_imovel: string
  complemento: string
  uso_estabelecimento: string
  tipo_id: number
  logradouro?: string
  bairro?: string
  cidade?: string
  uf?: string
}

type Inspetor = {
  cpf_inspetor: string
  nome_inspetor: string
  titulo_profissional: string
  inspetor_email: string
  inspetor_whatsapp: string
  is_gestor: boolean
}

type Contrato = {
  cpf_inspetor: string
  tipo_assinatura: string
  data_inicio_contrato: string
  data_fim_contrato: string
  qde_contratada_plano: number
  saldo_quantidade_plano: number
  qde_contratada_avulso: number
  saldo_quantidade_avulso: number
}

const PLANOS = ['PLANO CORTESIA', 'PLANO SERVIÇO', 'PLANO MENSAL', 'PLANO ESCRITÓRIO']
const PLANO_CR: Record<string, number> = {
  'PLANO CORTESIA': 600, 'PLANO SERVIÇO': 600, 'PLANO MENSAL': 1200, 'PLANO ESCRITÓRIO': 3000
}
const COR_PLANO: Record<string, string> = {
  'PLANO CORTESIA': '#6B7280', 'PLANO SERVIÇO': '#0284C7', 'PLANO MENSAL': '#059669', 'PLANO ESCRITÓRIO': '#7C3AED'
}

export default function GestorPage() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null)
  const [inspetores, setInspetores] = useState<Inspetor[]>([])
  const [selecionado, setSelecionado] = useState<Inspetor | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const { bannerProps, informa, solicita, fechar } = useBanner()
  const [contasBloqueadas, setContasBloqueadas] = useState<any[]>([])
  const [carregandoBloq, setCarregandoBloq] = useState(false)
  const [cpfConferencia, setCpfConferencia] = useState('')
  const [conferindo, setConferindo] = useState(false)
  const [resultadoConferencia, setResultadoConferencia] = useState<{ conferidos: number; tratados: number; itens: any[] } | null>(null)
  const [aba, setAba] = useState<'dados'|'plano'|'info'>('dados')
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const abaInicial = (searchParams?.get('aba') as any) || 'inspetores'
  const [abaGestor, setAbaGestor] = useState<'inspetores'|'estabelecimentos'|'visao-geral'|'configuracoes'|'suporte'|'bloqueadas'>(abaInicial)
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([])
  const [estabSel, setEstabSel] = useState<Estabelecimento | null>(null)
  const [buscaEstab, setBuscaEstab] = useState('')
  const [editEstab, setEditEstab] = useState<Estabelecimento | null>(null)
  const [salvandoEstab, setSalvandoEstab] = useState(false)
  const [msgEstab, setMsgEstab] = useState('')
  const [carregandoEstab, setCarregandoEstab] = useState(false)
  const [resumo, setResumo] = useState<ResumoGestor | null>(null)
  const [mensagensSuporte, setMensagensSuporte] = useState<MensagemSuporte[]>([])
  const [carregandoSuporte, setCarregandoSuporte] = useState(false)
  const [respondendoId, setRespondendoId] = useState<number | null>(null)
  const [textoResposta, setTextoResposta] = useState('')
  const [enviandoResposta, setEnviandoResposta] = useState(false)
  const [erroResposta, setErroResposta] = useState('')
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const [dataReferencia, setDataReferencia] = useState('')
  // Novo plano
  const [novoPlano, setNovoPlano] = useState('PLANO MENSAL')

  const supabase = createClient()

  async function alternarGestor(cpf: string, novoValor: boolean) {
    setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gestor/alternar-gestor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ cpf, novoValor }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg(`Erro: ${d.erro ?? 'Não foi possível alterar o status de gestor.'}`); return }
      setMsg(novoValor ? 'Inspetor promovido a gestor.' : 'Direito de gestor removido.')
      setSelecionado(prev => prev ? { ...prev, is_gestor: novoValor } : prev)
      setInspetores(prev => prev.map(i => i.cpf_inspetor === cpf ? { ...i, is_gestor: novoValor } : i))
    } catch { setMsg('Erro de conexão.') }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/'; return }
      const cpf = session.user.email?.split('@')[0] ?? ''
      const res = await fetch(`${SUPA_URL}/rest/v1/inspetor?cpf_inspetor=eq.${cpf}&select=is_gestor`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` }
      })
      const d = await res.json()
      if (!d[0]?.is_gestor) { window.location.href = '/dashboard'; return }
      setAutorizado(true)
      carregarInspetores()
    })
  }, [])

  async function carregarInspetores(_token?: string) {
    try {
      const res = await fetch('/api/gestor/listar-inspetores')
      const d = await res.json()
      setInspetores(Array.isArray(d) ? d : [])
    } catch { setInspetores([]) }
  }

  async function selecionarInspetor(insp: Inspetor) {
    setSelecionado(insp)
    setAba('dados')
    setMsg('')
    try {
      const r = await fetch(`/api/gestor/contratos?cpf=${insp.cpf_inspetor}`)
      const d = await r.json()
      setContratos(Array.isArray(d) ? d : [])
    } catch { setContratos([]) }
  }

  async function atribuirPlano() {
    if (!selecionado) return
    setSalvando(true); setMsg('')
    try {
      const res = await fetch('/api/gestor/atribuir-plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: selecionado.cpf_inspetor, tipo: novoPlano, qde: PLANO_CR[novoPlano] })
      })
      const d = await res.json()
      if (!res.ok) { setMsg(`Erro: ${d.erro}`); return }
      setMsg('Plano atribuído com sucesso!')
      await selecionarInspetor(selecionado)
      setAba('plano')
    } catch (e) { setMsg('Erro ao atribuir plano.') }
    finally { setSalvando(false) }
  }

  async function carregarResumo() {
    setCarregandoResumo(true)
    try {
      const qs = dataReferencia ? `?desde=${dataReferencia}` : ''
      const res = await fetch(`/api/gestor/resumo${qs}`)
      const data = await res.json()
      setResumo(data)
    } catch { setResumo(null) }
    finally { setCarregandoResumo(false) }
  }

  async function carregarMensagensSuporte() {
    setCarregandoSuporte(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/mensagens-suporte', {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const d = await res.json()
      setMensagensSuporte(res.ok ? (d.mensagens ?? []) : [])
    } catch { setMensagensSuporte([]) }
    finally { setCarregandoSuporte(false) }
  }

  async function enviarRespostaSuporte(id: number) {
    if (!textoResposta.trim()) { setErroResposta('Escreva a resposta antes de enviar.'); return }
    setEnviandoResposta(true); setErroResposta('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/mensagens-suporte/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ id, resposta: textoResposta }),
      })
      const d = await res.json()
      if (!res.ok) { setErroResposta(d.erro ?? 'Não foi possível enviar a resposta.'); return }
      setRespondendoId(null); setTextoResposta('')
      await carregarMensagensSuporte()
    } catch { setErroResposta('Erro de conexão. Tente novamente.') }
    finally { setEnviandoResposta(false) }
  }

  async function alternarStatusSuporte(id: number, statusAtual: 'pendente' | 'respondido') {
    const novoStatus = statusAtual === 'pendente' ? 'respondido' : 'pendente'
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/mensagens-suporte', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ id, status: novoStatus }),
      })
      if (res.ok) await carregarMensagensSuporte()
    } catch {}
  }

  // Carrega a lista sempre que esta aba estiver aberta (inclusive quando a página abre direto nela, por ?aba=bloqueadas).
  useEffect(() => { if (abaGestor === 'bloqueadas') carregarContasBloqueadas() }, [abaGestor]) // eslint-disable-line react-hooks/exhaustive-deps

  async function carregarContasBloqueadas() {
    setCarregandoBloq(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gestor/contas-bloqueadas', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      const d = await res.json()
      setContasBloqueadas(res.ok ? (d.contas ?? []) : [])
      if (!res.ok) informa('Não foi possível carregar', d.erro ?? 'Tente novamente em instantes.')
    } catch { setContasBloqueadas([]); informa('Não foi possível carregar', 'Erro de conexão. Tente novamente.') }
    finally { setCarregandoBloq(false) }
  }

  // Consulta o Asaas e trata os estornos/chargebacks das compras pagas recentes (não depende do aviso do Asaas).
  async function conferirEstornosAsaas() {
    const cpfLimpo = cpfConferencia.replace(/\D/g, '')
    if (cpfConferencia.trim() && cpfLimpo.length !== 11) {
      informa('CPF inválido', 'Informe os 11 dígitos do CPF ou deixe em branco para conferir todas as contas.')
      return
    }
    setConferindo(true); setResultadoConferencia(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gestor/conferir-estornos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify(cpfLimpo ? { cpf: cpfLimpo } : {}),
      })
      const d = await res.json()
      if (!res.ok) { informa('Não foi possível conferir', d.erro ?? 'Tente novamente em instantes.'); return }
      setResultadoConferencia(d)
      informa(d.tratados > 0 ? 'Estornos tratados' : 'Conferência concluída',
        d.tratados > 0
          ? `${d.tratados} estorno(s) tratado(s): créditos revogados e conta bloqueada. O detalhe está abaixo.`
          : `Conferi ${d.conferidos} compra(s) paga(s) no Asaas e nenhuma estava estornada. O status de cada uma está abaixo.`)
      await carregarContasBloqueadas()
    } catch { informa('Não foi possível conferir', 'Erro de conexão. Tente novamente.') }
    finally { setConferindo(false) }
  }

  function confirmarDesbloqueio(conta: any) {
    solicita('Desbloquear a conta?',
      `${conta.nome_inspetor ?? ''} (CPF ${conta.cpf_inspetor}) poderá voltar a usar o aplicativo e a contratar créditos. Confirme que a pendência foi regularizada.`,
      [
        { label: 'Desbloquear', acao: () => { fechar(); void desbloquearConta(conta) }, estilo: 'primario' },
        { label: 'Voltar', acao: fechar, estilo: 'secundario' },
      ])
  }

  async function desbloquearConta(conta: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gestor/desbloquear-conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ cpf: conta.cpf_inspetor }),
      })
      const d = await res.json()
      if (!res.ok) { informa('Não foi possível desbloquear', d.erro ?? 'Tente novamente.'); return }
      informa('Conta liberada', `${conta.nome_inspetor ?? 'O inspetor'} foi avisado por e-mail e já pode voltar a usar o aplicativo.`)
      await carregarContasBloqueadas()
    } catch { informa('Não foi possível desbloquear', 'Erro de conexão. Tente novamente.') }
  }

  async function carregarEstabelecimentos() {
    setCarregandoEstab(true)
    try {
      const res = await fetch('/api/gestor/listar-estabelecimentos')
      const data = await res.json()
      if (Array.isArray(data)) {
        setEstabelecimentos(data)
      } else {
        console.error('[AIMÊ] listar-estabelecimentos retornou:', data)
        setEstabelecimentos([])
        setMsgEstab(`Erro ao carregar: ${data?.erro ?? JSON.stringify(data)}`)
      }
    } catch (e) {
      console.error('[AIMÊ] erro carregarEstabelecimentos:', e)
      setEstabelecimentos([])
      setMsgEstab('Erro de conexão ao carregar estabelecimentos.')
    } finally {
      setCarregandoEstab(false)
    }
  }

  async function salvarEstab() {
    if (!editEstab) return
    setSalvandoEstab(true); setMsgEstab('')
    try {
      const res = await fetch('/api/salvar-estabelecimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEstab)
      })
      const d = await res.json()
      if (!res.ok) { setMsgEstab(`Erro: ${d.erro ?? 'Falha ao salvar.'}`); return }
      setMsgEstab('Estabelecimento atualizado com sucesso!')
      setEstabSel(editEstab)
      await carregarEstabelecimentos()
    } catch { setMsgEstab('Erro ao salvar.') }
    finally { setSalvandoEstab(false) }
  }

  async function novoInspetor() {
    const { data: { session } } = await supabase.auth.getSession()
    window.location.href = `/inspetor?gestor=1`
  }

  const inspFiltrados = inspetores.filter(i =>
    i.nome_inspetor?.toLowerCase().includes(busca.toLowerCase()) ||
    i.cpf_inspetor?.includes(busca.replace(/\D/g,''))
  )

  const contratoAtivo = contratos.find(c => new Date(c.data_fim_contrato) >= new Date())
  const saldoTotal = (contratoAtivo?.saldo_quantidade_plano ?? 0) + (contratos[0]?.saldo_quantidade_avulso ?? 0)

  if (autorizado === null) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#4a6480' }}>Verificando acesso...</p>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <img src="/logo.png" alt="AIMÊ" width={80} height={32} style={{ filter:'brightness(0) invert(1)', objectFit:'contain' }} />
          <span style={{ color:'white', fontWeight:700, fontSize:'13px', flex:1, textAlign:'center' }}>
            Painel do Gestor
          </span>
          <button onClick={() => window.location.href='/dashboard'}
            style={{ ...S.btnSec, padding:'4px 12px', fontSize:'11px', backgroundColor:'transparent', color:'white', borderColor:'white' }}>
            ← Voltar
          </button>
        </div>
        <div style={{ height:'2px', backgroundColor:'#1E3A8A' }} />

        <Banner {...bannerProps} />
        {/* Navegação principal */}
        <div style={{ display:'flex', gap:'0', borderBottom:'2px solid #1E3A8A', flexWrap:'wrap' as const }}>
          {(['inspetores','estabelecimentos','visao-geral','suporte','bloqueadas','configuracoes'] as const).map(ab => (
            <button key={ab} onClick={() => { setAbaGestor(ab); if(ab==='estabelecimentos') carregarEstabelecimentos(); if(ab==='visao-geral') carregarResumo(); if(ab==='suporte') carregarMensagensSuporte() }}
              style={{ padding:'8px 20px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700,
                borderBottom: abaGestor===ab ? '3px solid #1E3A8A' : '3px solid transparent',
                color: abaGestor===ab ? '#1E3A8A' : '#6B7280', backgroundColor:'white' }}>
              {ab === 'inspetores' ? '👤 Inspetores' : ab === 'estabelecimentos' ? '🏢 Estabelecimentos' : ab === 'visao-geral' ? '📊 Painel Geral' : ab === 'suporte' ? '💬 Fale Conosco' : ab === 'bloqueadas' ? '🔒 Contas bloqueadas' : '⚙️ Configurações'}
            </button>
          ))}
        </div>

        <div style={S.body}>
          {abaGestor === 'inspetores' && (<>
          {/* ── Lista de Inspetores ── */}
          <div style={S.lista}>
            <div style={{ ...S.listaHeader, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>Inspetores ({inspetores.length})</span>
            </div>
            <div style={{ padding:'8px' }}>
              <input
                placeholder="Buscar por nome ou CPF..."
                value={busca} onChange={e => setBusca(e.target.value)}
                style={{ ...S.input, marginBottom:'4px' }} />
            </div>
            <div style={{ overflowY:'auto', maxHeight:'500px' }}>
              {inspFiltrados.map(insp => (
                <div key={insp.cpf_inspetor}
                  onClick={() => selecionarInspetor(insp)}
                  style={S.listaItem(selecionado?.cpf_inspetor === insp.cpf_inspetor)}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'11px', color:'#1E3A8A' }}>
                      {insp.nome_inspetor}
                    </div>
                    <div style={{ fontSize:'10px', color:'#6B7280' }}>
                      {insp.titulo_profissional} · {insp.cpf_inspetor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')}
                    </div>
                  </div>
                  {insp.is_gestor && <span style={S.badge('#7C3AED')}>G</span>}
                </div>
              ))}
              {inspFiltrados.length === 0 && (
                <div style={{ padding:'20px', textAlign:'center', color:'#9CA3AF', fontSize:'11px' }}>
                  Nenhum inspetor encontrado
                </div>
              )}
            </div>
          </div>

          {/* ── Painel de Detalhes ── */}
          <div style={S.painel}>
            {!selecionado ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'400px', flexDirection:'column', gap:'12px' }}>
                <div style={{ fontSize:'40px' }}>👤</div>
                <p style={{ color:'#9CA3AF', fontSize:'13px' }}>Selecione um inspetor na lista</p>
              </div>
            ) : (
              <>
                {/* Nome e resumo */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:'16px', color:'#1E3A8A', fontWeight:900 }}>{selecionado.nome_inspetor}</h2>
                    <p style={{ margin:'2px 0 0', fontSize:'11px', color:'#6B7280' }}>{selecionado.titulo_profissional}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'11px', color:'#6B7280' }}>Saldo total</div>
                    <div style={{ fontSize:'20px', fontWeight:900, color: saldoTotal > 0 ? '#059669' : '#DC2626' }}>
                      {saldoTotal} CR
                    </div>
                  </div>
                </div>

                {/* Abas */}
                <div style={{ display:'flex', gap:'4px', marginBottom:'16px', borderBottom:'2px solid #E2E8F0', flexWrap:'wrap' as const }}>
                  {(['dados','plano','info'] as const).map(a => (
                    <button key={a} onClick={() => setAba(a)}
                      style={{ padding:'6px 16px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700,
                        borderBottom: aba===a ? '2px solid #1E3A8A' : '2px solid transparent',
                        color: aba===a ? '#1E3A8A' : '#6B7280', backgroundColor:'transparent' }}>
                      {a === 'dados' ? '📋 Dados' : a === 'plano' ? '📊 Plano' : 'ℹ️ Informações'}
                    </button>
                  ))}
                </div>

                {msg && (
                  <div style={{ padding:'8px 12px', borderRadius:'8px', marginBottom:'12px', fontSize:'12px',
                    backgroundColor: msg.startsWith('Erro') ? '#FEE2E2' : '#D1FAE5',
                    color: msg.startsWith('Erro') ? '#DC2626' : '#059669' }}>
                    {msg}
                  </div>
                )}

                {/* Aba Dados */}
                {aba === 'dados' && (
                  <div style={S.secao}>
                    <div style={S.secaoTitulo}>Dados Cadastrais</div>
                    <div style={S.grid2}>
                      <div>
                        <label style={S.label}>CPF</label>
                        <input style={S.input} readOnly value={selecionado.cpf_inspetor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')} />
                      </div>
                      <div>
                        <label style={S.label}>Título Profissional</label>
                        <input style={S.input} readOnly value={selecionado.titulo_profissional} />
                      </div>
                      <div>
                        <label style={S.label}>E-mail</label>
                        <input style={S.input} readOnly value={selecionado.inspetor_email} />
                      </div>
                      <div>
                        <label style={S.label}>WhatsApp</label>
                        <input style={S.input} readOnly value={selecionado.inspetor_whatsapp} />
                      </div>
                    </div>
                    <div style={{ marginTop:'12px', display:'flex', gap:'8px' }}>
                      <button onClick={() => window.location.href=`/inspetor?cpf=${selecionado.cpf_inspetor}&visualizar=1`}
                        style={S.btnPri}>
                        🔍 Visualizar Cadastro
                      </button>
                      <button onClick={() => alternarGestor(selecionado.cpf_inspetor, !selecionado.is_gestor)}
                        style={{ ...S.btnPri, backgroundColor: selecionado.is_gestor ? '#DC2626' : '#7C3AED' }}>
                        {selecionado.is_gestor ? '✕ Remover Gestor' : '★ Promover a Gestor'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Aba Plano */}
                {aba === 'plano' && (
                  <div>
                    <div style={S.secaoTitulo}>Contratos e Créditos</div>
                    {contratos.length === 0 ? (
                      <p style={{ color:'#9CA3AF', fontSize:'12px' }}>Nenhum contrato encontrado.</p>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                        {contratos.map((ct, i) => {
                          const vencido = new Date(ct.data_fim_contrato) < new Date()
                          const pct = ct.qde_contratada_plano > 0
                            ? Math.round((ct.saldo_quantidade_plano/ct.qde_contratada_plano)*100) : 0
                          return (
                            <div key={i} style={{ border:`1.5px solid ${vencido?'#E5E7EB':'#1E3A8A'}`, borderRadius:'8px', padding:'12px', opacity: vencido ? 0.6 : 1 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                                <span style={S.badge(COR_PLANO[ct.tipo_assinatura] ?? '#6B7280')}>{ct.tipo_assinatura}</span>
                                <span style={{ fontSize:'10px', color: vencido?'#DC2626':'#059669', fontWeight:700 }}>
                                  {vencido ? '⚠ Vencido' : `✓ Válido até ${fmtDataBR(ct.data_fim_contrato)}`}
                                </span>
                              </div>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginTop:'8px' }}>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>Início</div>
                                  <div style={{ fontWeight:700 }}>{fmtDataBR(ct.data_inicio_contrato)}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>Vencimento</div>
                                  <div style={{ fontWeight:700, color:vencido?'#DC2626':'#059669' }}>{fmtDataBR(ct.data_fim_contrato)}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Contratado</div>
                                  <div style={{ fontWeight:700, color:'#1E3A8A' }}>{ct.qde_contratada_plano}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Saldo Plano</div>
                                  <div style={{ fontWeight:700, color:'#1E3A8A' }}>{ct.saldo_quantidade_plano}</div>
                                  <div style={{ height:'4px', backgroundColor:'#E5E7EB', borderRadius:'2px', marginTop:'4px' }}>
                                    <div style={{ height:'4px', backgroundColor:'#1E3A8A', borderRadius:'2px', width:`${pct}%` }} />
                                  </div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Avulso Contratado</div>
                                  <div style={{ fontWeight:700, color:'#7C3AED' }}>{ct.qde_contratada_avulso}</div>
                                </div>
                                <div style={{ fontSize:'11px' }}>
                                  <div style={{ color:'#6B7280' }}>CR Saldo Avulso</div>
                                  <div style={{ fontWeight:700, color:'#7C3AED' }}>{ct.saldo_quantidade_avulso}</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Novo plano */}

                  </div>
                )}

              </>
            )}

                {/* Aba Informações */}
                {aba === 'info' && (
                  <div style={S.secao}>
                    <div style={S.secaoTitulo}>Dados do Contrato Vigente</div>
                    {contratos.length === 0 ? (
                      <p style={{ fontSize:'12px', color:'#9CA3AF' }}>Nenhum contrato encontrado.</p>
                    ) : contratos.map((ct, i) => {
                      const vencido = new Date(ct.data_fim_contrato) < new Date()
                      return (
                        <div key={i} style={{ border:`1.5px solid ${vencido?'#E5E7EB':'#1E3A8A'}`, borderRadius:'8px', padding:'14px', marginBottom:'10px', opacity:vencido?0.6:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                            <span style={{ padding:'2px 10px', borderRadius:'9999px', fontSize:'10px', fontWeight:700,
                              backgroundColor: vencido?'#6B7280':'#1E3A8A', color:'white' }}>
                              {ct.tipo_assinatura}
                            </span>
                            <span style={{ fontSize:'10px', fontWeight:700, color:vencido?'#DC2626':'#059669' }}>
                              {vencido?'⚠ Vencido':`✓ Vigente até ${fmtDataBR(ct.data_fim_contrato)}`}
                            </span>
                          </div>
                          <table style={{ width:'100%', fontSize:'11px', borderCollapse:'collapse' as const }}>
                            {[
                              ['Data Início Contrato', fmtDataBR(ct.data_inicio_contrato)],
                              ['Qtde Contratada Plano (CR)', ct.qde_contratada_plano],
                              ['Saldo Plano (CR)', ct.saldo_quantidade_plano],
                              ['Qtde Contratada Avulso (CR)', ct.qde_contratada_avulso],
                              ['Saldo Avulso (CR)', ct.saldo_quantidade_avulso],
                              ['Saldo Total (CR)', ct.saldo_quantidade_plano + ct.saldo_quantidade_avulso],
                            ].map(([label, valor]) => (
                              <tr key={label as string} style={{ borderBottom:'1px solid #F1F5F9' }}>
                                <td style={{ padding:'5px 4px', color:'#6B7280', fontWeight:600 }}>{label}</td>
                                <td style={{ padding:'5px 4px', fontWeight:700, color:'#1E3A8A', textAlign:'right' as const }}>{valor}</td>
                              </tr>
                            ))}
                          </table>
                        </div>
                      )
                    })}
                  </div>
                )}
          </div>
          </>)}
          {abaGestor === 'estabelecimentos' && (<>
          {/* ── Lista de Estabelecimentos ── */}
          <div style={S.lista}>
            <div style={S.listaHeader}>Estabelecimentos ({estabelecimentos.length})</div>
            <div style={{ padding:'8px' }}>
              <input placeholder="Buscar por nome ou CNPJ/CPF..."
                value={buscaEstab} onChange={e => setBuscaEstab(e.target.value)}
                style={{ ...S.input, marginBottom:'4px' }} />
              <button onClick={carregarEstabelecimentos} disabled={carregandoEstab}
                style={{ ...S.btnPri, width:'100%', borderRadius:'6px', marginBottom:'4px',
                  opacity: carregandoEstab ? 0.7 : 1 }}>
                {carregandoEstab ? 'Carregando...' : '🔍 Listar Estabelecimentos'}
              </button>
            </div>
            {msgEstab && !msgEstab.startsWith('Estabelecimento atualizado') && (
              <div style={{ margin:'4px 8px', padding:'6px 8px', borderRadius:'4px', fontSize:'10px',
                backgroundColor:'#FEE2E2', color:'#DC2626' }}>{msgEstab}</div>
            )}
            <div style={{ overflowY:'auto', maxHeight:'520px' }}>
              {estabelecimentos
                .filter(e => e.razao_social_nome?.toLowerCase().includes(buscaEstab.toLowerCase()) ||
                  e.cnpjoucpf?.includes(buscaEstab.replace(/\D/g,'')))
                .map(est => (
                  <div key={est.cnpjoucpf}
                    onClick={async () => {
                      setEstabSel(est); setEditEstab({...est}); setMsgEstab('')
                      const cep = (est.cep_estabelecimento ?? '').replace(/\D/g,'')
                      if (cep.length === 8) {
                        try {
                          const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
                          const d = await r.json()
                          if (!d.erro) {
                            setEstabSel(prev => prev ? {...prev, logradouro:d.logradouro||'', bairro:d.bairro||'', cidade:d.localidade||'', uf:d.uf||''} : prev)
                          }
                        } catch {}
                      }
                    }}
                    style={S.listaItem(estabSel?.cnpjoucpf === est.cnpjoucpf)}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'11px', color:'#1E3A8A' }}>{est.razao_social_nome}</div>
                      <div style={{ fontSize:'10px', color:'#6B7280' }}>{est.cnpjoucpf} · CEP {est.cep_estabelecimento}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ── Painel Estabelecimento ── */}
          <div style={S.painel}>
            {!estabSel ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'400px', flexDirection:'column', gap:'12px' }}>
                <div style={{ fontSize:'40px' }}>🏢</div>
                <p style={{ color:'#9CA3AF', fontSize:'13px' }}>Selecione um estabelecimento na lista</p>
              </div>
            ) : (
              <>
                <h2 style={{ margin:'0 0 16px', fontSize:'16px', color:'#1E3A8A', fontWeight:900 }}>{estabSel.razao_social_nome}</h2>

                {msgEstab && (
                  <div style={{ padding:'8px 12px', borderRadius:'8px', marginBottom:'12px', fontSize:'12px',
                    backgroundColor: msgEstab.startsWith('Erro') ? '#FEE2E2' : '#D1FAE5',
                    color: msgEstab.startsWith('Erro') ? '#DC2626' : '#059669' }}>
                    {msgEstab}
                  </div>
                )}

                <div style={{ ...S.secaoTitulo, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>Dados do Estabelecimento</span>
                  <span style={{ fontSize:'10px', color:'#6B7280', fontWeight:400 }}>somente consulta</span>
                </div>
                {/* L1: Razão Social + CNPJ/CPF */}
                <div style={S.grid2}>
                  <div>
                    <label style={S.label}>Razão Social / Nome</label>
                    <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.razao_social_nome ?? ''} />
                  </div>
                  <div>
                    <label style={S.label}>CNPJ / CPF</label>
                    <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly
                      value={(() => {
                        const v = editEstab?.cnpjoucpf?.replace(/\D/g,'') ?? ''
                        if (v.length === 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')
                        if (v.length === 14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5')
                        return v
                      })()} />
                  </div>
                </div>
                {/* L2: Uso */}
                <div style={{ marginTop:'8px' }}>
                  <label style={S.label}>Uso / Atividade</label>
                  <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.uso_estabelecimento ?? ''} />
                </div>
                {/* L3: CEP + Número + Complemento */}
                <div style={{ ...S.grid3, marginTop:'8px' }}>
                  <div>
                    <label style={S.label}>CEP</label>
                    <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.cep_estabelecimento ?? ''} />
                  </div>
                  <div>
                    <label style={S.label}>Número</label>
                    <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.numero_imovel ?? ''} />
                  </div>
                  <div>
                    <label style={S.label}>Complemento</label>
                    <input style={{ ...S.input, backgroundColor:'#F9FAFB' }} readOnly value={editEstab?.complemento ?? ''} />
                  </div>
                </div>
                {/* L4: Logradouro + Bairro */}
                <div style={{ ...S.grid2, marginTop:'8px' }}>
                  <div>
                    <label style={S.label}>Logradouro</label>
                    <input style={{...S.input, backgroundColor:'#F9FAFB'}} readOnly value={estabSel?.logradouro ?? ''} />
                  </div>
                  <div>
                    <label style={S.label}>Bairro</label>
                    <input style={{...S.input, backgroundColor:'#F9FAFB'}} readOnly value={estabSel?.bairro ?? ''} />
                  </div>
                </div>
                {/* L5: Cidade + UF */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:'12px', marginTop:'8px' }}>
                  <div>
                    <label style={S.label}>Cidade</label>
                    <input style={{...S.input, backgroundColor:'#F9FAFB'}} readOnly value={estabSel?.cidade ?? ''} />
                  </div>
                  <div>
                    <label style={S.label}>UF</label>
                    <input style={{...S.input, backgroundColor:'#F9FAFB'}} readOnly value={estabSel?.uf ?? ''} />
                  </div>
                </div>

              </>
            )}
          </div>
          </>)}
          {abaGestor === 'visao-geral' && (<>
          {/* ── Visão Geral ── */}
          <div style={{ flex:1, padding:'20px', backgroundColor:'#F8FAFC' }}>
            {carregandoResumo ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#6B7280', fontSize:'13px' }}>Carregando...</div>
            ) : !resumo ? (
              <div style={{ textAlign:'center', padding:'40px', flexDirection:'column', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ fontSize:'40px' }}>📊</div>
                <p style={{ color:'#9CA3AF', fontSize:'13px' }}>Clique para carregar o resumo</p>
                <button onClick={carregarResumo} style={S.btnPri}>Carregar Visão Geral</button>
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
                  <div>
                    <label style={S.label}>Data de referência (opcional)</label>
                    <input type="date" value={dataReferencia} onChange={e => setDataReferencia(e.target.value)} style={S.input} />
                  </div>
                  <button onClick={carregarResumo} style={{ ...S.btnPri, fontSize:'11px', padding:'9px 16px' }}>
                    {dataReferencia ? 'Aplicar data' : 'Ver só totais'}
                  </button>
                  {dataReferencia && (
                    <button onClick={() => { setDataReferencia(''); setTimeout(carregarResumo, 0) }}
                      style={{ ...S.btnSec, fontSize:'11px', padding:'9px 16px' }}>
                      Limpar data
                    </button>
                  )}
                </div>
                {dataReferencia && (
                  <p style={{ fontSize:'11px', color:'#6B7280', marginTop:'-8px', marginBottom:'16px' }}>
                    Os cards abaixo mostram o total desde sempre e, entre parênteses, o valor a partir de {new Date(dataReferencia+'T00:00:00').toLocaleDateString('pt-BR')}.
                  </p>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'12px', marginBottom:'24px' }}>
                  {[
                    { label:'Total de Inspetores', valor: resumo.totalInspetores, cor:'#1E3A8A', icon:'👤' },
                    { label:'Com Contrato Vigente', valor: resumo.contratosVigentes, cor:'#059669', icon:'✅' },
                    { label:'Sem Contrato', valor: resumo.totalInspetores - resumo.contratosVigentes, cor:'#DC2626', icon:'⚠️' },
                    { label:'CR Plano Disponível', valor: resumo.totalCrPlano, cor:'#0284C7', icon:'📦' },
                    { label:'CR Avulso Disponível', valor: resumo.totalCrAvulso, cor:'#7C3AED', icon:'➕' },
                    { label:'Total CR Disponível', valor: resumo.totalCrPlano + resumo.totalCrAvulso, cor:'#065F46', icon:'💎' },
                  ].map(({ label, valor, cor, icon }) => (
                    <div key={label} style={{ backgroundColor:'white', borderRadius:'10px', padding:'16px',
                      border:`2px solid ${cor}20`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize:'20px', marginBottom:'6px' }}>{icon}</div>
                      <div style={{ fontSize:'22px', fontWeight:900, color: cor }}>{valor.toLocaleString('pt-BR')}</div>
                      <div style={{ fontSize:'10px', color:'#6B7280', marginTop:'4px' }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={S.secaoTitulo}>Acompanhamento de uso</div>
                <div style={{ display:'flex', flexWrap:'nowrap', gap:'10px', marginBottom:'24px', overflowX:'auto', paddingBottom:'4px' }}>
                  {[
                    {
                      label: 'Inspetores cadastrados', cor:'#1E3A8A', icon:'👤',
                      valor: resumo.inspetores.total, desde: resumo.inspetores.desde,
                    },
                    {
                      label: 'Tempo médio até a 1ª vistoria', cor:'#0284C7', icon:'⏱️',
                      valor: resumo.diasAtePrimeiraVistoria.total !== null ? `${resumo.diasAtePrimeiraVistoria.total} dias` : '—',
                      desde: resumo.diasAtePrimeiraVistoria.desde !== null ? `${resumo.diasAtePrimeiraVistoria.desde} dias` : null,
                    },
                    {
                      label: 'Vistorias por laudo técnico', cor:'#7C3AED', icon:'🔎',
                      valor: resumo.vistoriasPorLaudo.total !== null ? resumo.vistoriasPorLaudo.total.toFixed(1) : '—',
                      desde: resumo.vistoriasPorLaudo.desde !== null ? resumo.vistoriasPorLaudo.desde.toFixed(1) : null,
                    },
                    {
                      label: 'Laudos técnicos gerados', cor:'#059669', icon:'📄',
                      valor: resumo.laudosGerados.total, desde: resumo.laudosGerados.desde,
                    },
                    {
                      label: 'Planos de manutenção gerados', cor:'#D97706', icon:'🛠️',
                      valor: resumo.planosManutencaoGerados.total, desde: resumo.planosManutencaoGerados.desde,
                    },
                    {
                      label: 'CR contratados', cor:'#065F46', icon:'💳',
                      valor: resumo.creditos.contratadosTotal, desde: resumo.creditos.contratadosDesde,
                    },
                    {
                      label: 'CR disponíveis agora', cor:'#0284C7', icon:'💎',
                      valor: resumo.creditos.disponiveis, desde: null,
                    },
                  ].map(({ label, valor, desde, cor, icon }) => (
                    <div key={label} style={{ backgroundColor:'white', borderRadius:'10px', padding:'14px 12px',
                      border:`2px solid ${cor}20`, boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
                      flex:'1 1 140px', minWidth:'140px' }}>
                      <div style={{ fontSize:'18px', marginBottom:'6px' }}>{icon}</div>
                      <div style={{ fontSize:'19px', fontWeight:900, color: cor }}>
                        {typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}
                      </div>
                      {dataReferencia && desde !== null && (
                        <div style={{ fontSize:'11px', fontWeight:700, color: cor, opacity:0.7 }}>
                          ({typeof desde === 'number' ? desde.toLocaleString('pt-BR') : desde} desde a data)
                        </div>
                      )}
                      <div style={{ fontSize:'10px', color:'#6B7280', marginTop:'4px' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {Object.keys(resumo.porPlano.total).length > 0 && (
                  <div style={{ marginBottom:'24px' }}>
                    <div style={S.secaoTitulo}>Inspetores por tipo de plano (contrato atual de cada um)</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                      {Object.entries(resumo.porPlano.total).map(([plano, qtd]) => (
                        <div key={plano} style={{ backgroundColor:'#EBF1FF', border:'1px solid #1E3A8A30', borderRadius:'8px',
                          padding:'8px 14px', fontSize:'12px' }}>
                          <strong style={{ color:'#1E3A8A' }}>{qtd}</strong> {plano}
                          {dataReferencia && resumo.porPlano.desde && (resumo.porPlano.desde[plano] ?? 0) > 0 && (
                            <span style={{ color:'#6B7280' }}> ({resumo.porPlano.desde[plano]} desde a data)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {resumo.inspetoresSemContrato.length > 0 && (
                  <div>
                    <div style={S.secaoTitulo}>Inspetores sem contrato vigente</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                      {resumo.inspetoresSemContrato.map(nome => (
                        <span key={nome} style={{ backgroundColor:'#FEE2E2', color:'#DC2626',
                          padding:'3px 10px', borderRadius:'9999px', fontSize:'11px', fontWeight:600 }}>
                          {nome}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop:'20px', textAlign:'right' }}>
                  <button onClick={carregarResumo} style={{ ...S.btnSec, fontSize:'11px', padding:'6px 14px' }}>
                    🔄 Atualizar
                  </button>
                </div>
              </div>
            )}
          </div>
          </>)}
          {abaGestor === 'bloqueadas' && (
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>Contas bloqueadas</div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '10px', lineHeight: 1.5 }}>
              Bloqueio automático por estorno, chargeback ou cartão recusado em 3 cobranças seguidas. Enquanto bloqueada, a conta não inicia serviços nem contrata créditos.
            </div>

            <div data-conferencia style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>Conferir estornos no Asaas</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px', lineHeight: 1.5 }}>
                Consulta o Asaas, mostra o status real de cada compra paga dos últimos 45 dias e trata as estornadas ou em chargeback (revoga o saldo restante da compra, bloqueia a conta). Não depende de o aviso do Asaas ter chegado.
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' as const }}>
                <input value={cpfConferencia} onChange={e => setCpfConferencia(e.target.value)} placeholder="CPF (opcional — vazio confere todas as contas)" inputMode="numeric"
                  style={{ flex: 1, minWidth: '220px', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '7px 10px', fontSize: '12px' }} />
                <button onClick={conferirEstornosAsaas} disabled={conferindo}
                  style={{ backgroundColor: '#1E3A8A', color: 'white', border: 'none', borderRadius: '9999px', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: conferindo ? 'not-allowed' : 'pointer', opacity: conferindo ? 0.6 : 1 }}>
                  {conferindo ? 'Conferindo...' : 'Conferir estornos'}
                </button>
              </div>
              {resultadoConferencia && (
                <div data-resultado-conferencia style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#374151', marginBottom: '4px' }}>
                    {resultadoConferencia.conferidos} compra(s) paga(s) conferida(s) · {resultadoConferencia.tratados} estorno(s) tratado(s)
                  </div>
                  {resultadoConferencia.itens.map((it: any) => (
                    <div key={it.pedidoId} data-item-conferencia style={{ fontSize: '11px', padding: '4px 0', borderTop: '1px solid #E2E8F0', color: it.acao === 'estornado' ? '#92400E' : it.acao === 'erro' ? '#DC2626' : '#374151' }}>
                      <b>#{it.pedidoId}</b> · {it.tipo}{it.tipo === 'AVULSO' ? ` ${it.qde} CR` : ''} · CPF {it.cpf} · Asaas: <b>{it.statusAsaas}</b>
                      {' → '}{it.acao === 'estornado' ? 'ESTORNO TRATADO' : it.acao === 'ja_estornado' ? 'já tratado' : it.acao === 'em_andamento' ? 'estorno em andamento' : it.acao === 'parcial' ? 'estorno PARCIAL (não tratado)' : it.acao === 'erro' ? 'erro' : 'sem estorno'}
                      {it.detalhe ? ` (${it.detalhe})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {carregandoBloq && <div style={{ fontSize: '12px', color: '#6B7280' }}>Carregando...</div>}
            {!carregandoBloq && contasBloqueadas.length === 0 && <div data-vazio style={{ fontSize: '12px', color: '#6B7280' }}>Nenhuma conta bloqueada.</div>}
            {contasBloqueadas.map(cb => (
              <div key={cb.cpf_inspetor} data-conta-bloqueada style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' as const }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px' }}>{cb.nome_inspetor} <span style={{ color: '#6B7280', fontWeight: 400 }}>· CPF {cb.cpf_inspetor}</span></div>
                  <div style={{ fontSize: '11px', color: '#92400E' }}>{cb.texto_motivo}</div>
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>Bloqueada em {cb.bloqueio_em ? new Date(cb.bloqueio_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</div>
                </div>
                <button onClick={() => confirmarDesbloqueio(cb)}
                  style={{ backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '9999px', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}

        {abaGestor === 'suporte' && (
          <div style={{ width:'100%', padding:'12px' }}>
            {carregandoSuporte ? (
              <p style={{ fontSize:'12px', color:'#9CA3AF' }}>Carregando...</p>
            ) : mensagensSuporte.length === 0 ? (
              <p style={{ fontSize:'12px', color:'#9CA3AF' }}>Nenhuma mensagem recebida ainda.</p>
            ) : (
              mensagensSuporte.map(m => (
                <div key={m.id} style={{ border:`1.5px solid ${m.status==='pendente'?'#F59E0B':'#E5E7EB'}`, borderRadius:'8px', padding:'12px', marginBottom:'8px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                    <div>
                      <span style={{ fontWeight:700, fontSize:'13px', color:'#1E3A8A' }}>{m.assunto}</span>
                      <div style={{ fontSize:'11px', color:'#6B7280' }}>{m.nome_inspetor} — CPF {m.cpf_inspetor}</div>
                    </div>
                    <span style={{ padding:'2px 10px', borderRadius:'9999px', fontSize:'10px', fontWeight:700, color:'white',
                      backgroundColor: m.status==='pendente' ? '#F59E0B' : '#059669' }}>
                      {m.status==='pendente' ? 'Pendente' : 'Respondido'}
                    </span>
                  </div>
                  <p style={{ fontSize:'12px', color:'#374151', whiteSpace:'pre-wrap', marginBottom:'8px' }}>{m.mensagem}</p>
                  <div style={{ display:'flex', gap:'8px', marginBottom:'8px', flexWrap:'wrap' as const }}>
                    {m.inspetor_whatsapp && (
                      <a href={`https://wa.me/55${m.inspetor_whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${m.nome_inspetor.split(' ')[0]}, aqui é o suporte AIMÊ, sobre sua mensagem "${m.assunto}":`)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:'10px', fontWeight:700, padding:'4px 12px', borderRadius:'4px', textDecoration:'none', backgroundColor:'#25D366', color:'white' }}>
                        💬 Responder no WhatsApp
                      </a>
                    )}
                    {m.inspetor_email && (
                      <button type="button"
                        onClick={() => { setRespondendoId(respondendoId === m.id ? null : m.id); setTextoResposta(''); setErroResposta('') }}
                        style={{ fontSize:'10px', fontWeight:700, padding:'4px 12px', borderRadius:'4px', cursor:'pointer', border:'1px solid #1E3A8A', color:'#1E3A8A', backgroundColor:'white' }}>
                        ✉️ {m.resposta ? 'Responder de novo por e-mail' : 'Responder por e-mail'}
                      </button>
                    )}
                  </div>
                  {respondendoId === m.id && (
                    <div style={{ marginBottom:'8px' }}>
                      <textarea value={textoResposta} onChange={e => setTextoResposta(e.target.value)} rows={5} maxLength={5000}
                        placeholder={`Resposta para ${m.nome_inspetor.split(' ')[0]} — vai por e-mail de suporte@aime.eng.br, com a assinatura da Equipe AIMÊ.`}
                        style={{ width:'100%', border:'1px solid #D1D5DB', borderRadius:'6px', padding:'8px 10px', fontSize:'12px', boxSizing:'border-box', resize:'vertical' as const, fontFamily:'inherit' }} />
                      {erroResposta && <div style={{ fontSize:'11px', color:'#DC2626', margin:'4px 0' }}>{erroResposta}</div>}
                      <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'6px' }}>
                        <button type="button" onClick={() => { setRespondendoId(null); setTextoResposta(''); setErroResposta('') }}
                          style={{ fontSize:'10px', fontWeight:700, padding:'5px 14px', borderRadius:'4px', border:'1px solid #9CA3AF', backgroundColor:'white', color:'#374151', cursor:'pointer' }}>
                          Cancelar
                        </button>
                        <button type="button" onClick={() => enviarRespostaSuporte(m.id)} disabled={enviandoResposta}
                          style={{ fontSize:'10px', fontWeight:700, padding:'5px 14px', borderRadius:'4px', border:'none', backgroundColor:'#1E3A8A', color:'white', cursor: enviandoResposta ? 'not-allowed' : 'pointer', opacity: enviandoResposta ? 0.6 : 1 }}>
                          {enviandoResposta ? 'Enviando...' : 'Enviar resposta'}
                        </button>
                      </div>
                    </div>
                  )}
                  {m.resposta && (
                    <div style={{ margin:'0 0 8px', padding:'8px 10px', background:'#F0FDF4', borderLeft:'3px solid #059669', borderRadius:'4px' }}>
                      <div style={{ fontSize:'10px', fontWeight:700, color:'#047857', marginBottom:'2px' }}>
                        Resposta enviada por e-mail{m.respondido_em ? ` em ${fmtDataBR(m.respondido_em.slice(0,10))} ${m.respondido_em.slice(11,16)}` : ''}
                      </div>
                      <div style={{ fontSize:'12px', color:'#374151', whiteSpace:'pre-wrap' }}>{m.resposta}</div>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'10px', color:'#9CA3AF' }}>{fmtDataBR(m.criado_em.slice(0,10))} {m.criado_em.slice(11,16)}</span>
                    <button onClick={() => alternarStatusSuporte(m.id, m.status)}
                      style={{ fontSize:'10px', fontWeight:700, padding:'4px 12px', borderRadius:'4px', border:'none', cursor:'pointer',
                        backgroundColor: m.status==='pendente' ? '#059669' : '#6B7280', color:'white' }}>
                      {m.status==='pendente' ? 'Marcar como respondido' : 'Marcar como pendente'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          )}

          {abaGestor === 'configuracoes' && (<>
          {/* ── Configurações ── */}
          <div style={{ flex:1, padding:'20px', backgroundColor:'#F8FAFC' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px' }}>
              {[
                { icon:'🏗️', titulo:'Sistemas Construtivos', desc:'Gerenciar sistemas, subsistemas e anomalias por tipo de vistoria', href:'/sistemas' },
                { icon:'⚙️', titulo:'Parâmetros', desc:'Gerenciar parâmetros de local de ocorrência por tipo de vistoria', href:'/parametros' },
                { icon:'💳', titulo:'Planos de Assinatura', desc:'Gerenciar tipos de plano, créditos e validade', href:'/planos-assinatura' },
                { icon:'⚖️', titulo:'Criticidade GUT', desc:'Gerenciar pesos e percentuais de Gravidade, Urgência, Abrangência e Exposição', href:'/criticidade-gut' },
              ].map(item => (
                <div key={item.titulo}
                  onClick={() => window.location.href = item.href}
                  style={{ backgroundColor:'white', border:'2px solid #1E3A8A', borderRadius:'12px',
                    padding:'20px', cursor:'pointer', transition:'box-shadow 0.2s',
                    boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize:'32px', marginBottom:'10px' }}>{item.icon}</div>
                  <div style={{ fontWeight:700, color:'#1E3A8A', fontSize:'13px', marginBottom:'6px' }}>{item.titulo}</div>
                  <div style={{ fontSize:'11px', color:'#6B7280', lineHeight:1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
          </>)}
        </div>
      </div>
    </div>
  )
}
