// src/app/vistoria/tela31/page.tsx
// AIMÊ — Tela 31: Autovistoria Predial
// Portado fielmente do HTML aprovado (31_Autovistoria.html)
// Layout A4 compacto, blocos com cabeçalho azul, GR com barra de progresso

'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useVistoria31 } from '@/hooks/useVistoria31'
import type { FormVistoria, FeedbackIa } from '@/hooks/useVistoria31'

interface ItemSistema    { sistema: string }
interface ItemSubsistema { sistema: string; subsistema: string }
interface ItemAnomalia   { sistema: string; subsistema: string; anomalias: string }
interface ItemAtivo      { tipo_ativo: string; tag_ativo_nr_serie: string; finalidade_vistoria: string | null }

// Chaves compostas (campo:descricao) para evitar conflito entre valores repetidos
// como "Alta" que aparece tanto em Gravidade (=4) quanto em Exposição (=5)
const VALOR_GUT: Record<string, number> = {
  'gravidade:Estética': 1, 'gravidade:Leve': 2, 'gravidade:Moderada': 3, 'gravidade:Alta': 4, 'gravidade:Crítica': 5,
  'urgencia:Pode aguardar': 1, 'urgencia:Planejar': 3, 'urgencia:Imediata': 5,
  'abrangencia:Ponto isolado': 1, 'abrangencia:Vários pontos': 3, 'abrangencia:Sistema completo': 5,
  'exposicao:Baixa': 1, 'exposicao:Média': 3, 'exposicao:Alta': 5,
}

const TEXTO_FEEDBACK: Record<NonNullable<FeedbackIa>, string> = {
  avaliando_ambiente:  '⏳ Avaliando características do ambiente...',
  analisando_anomalia: '⏳ Analisando anomalia/falha...',
  cruzando_parametros: '⏳ Cruzando parâmetros...',
  gerando_nc:          '⏳ Gerando não conformidade...',
  gerando_cp:          '⏳ Gerando causa provável...',
  concluido:           '',
  erro:                '⚠️ Erro ao gerar com IA.',
}

const TITULO_TELA: Record<string, { titulo: string; subtitulo: string }> = {
  '31': { titulo: 'Autovistoria', subtitulo: 'Formulário para registro de manifestações patológicas e classificação de riscos' },
  '32': { titulo: 'Vistoria Inspeção', subtitulo: 'Formulário para registro de manifestações patológicas e classificação de riscos' },
  '33': { titulo: 'Vistoria Imóvel Novo', subtitulo: 'Formulário para registro de manifestações patológicas e classificação de riscos' },
  '34': { titulo: 'Vistoria Fachada', subtitulo: 'Formulário para registro de manifestações patológicas e classificação de riscos' },
  '35': { titulo: 'Vistoria Elevador', subtitulo: 'Formulário para registro de manifestações patológicas e classificação de riscos' },
  '36': { titulo: 'Vistoria NR-10', subtitulo: 'Formulário para registro de manifestações patológicas e classificação de riscos' },
  '37': { titulo: 'Vistoria NR-12', subtitulo: 'Formulário para registro de manifestações patológicas e classificação de riscos' },
  '38': { titulo: 'Vistoria NR-13', subtitulo: 'Formulário para registro de manifestações patológicas e classificação de riscos' },
}

const TIPO_SERVICO_BANCO: Record<string, string> = {
  '31': '31 Autovistoria', '32': '32 Vistoria inspeção',
  '33': '33 Vistoria imóvel novo', '34': '34 Vistoria fachada',
  '35': '35 Vistoria elevador', '36': '36 Vistoria nr-10',
  '37': '37 Vistoria nr-12', '38': '38 Vistoria nr-13',
}

export default function Tela31Page() {
  return (
    <Suspense fallback={
      <div style={S.body}>
        <div style={S.page}>
          <div style={S.header}>
            <span style={S.headerTitle}>Carregando...</span>
          </div>
        </div>
      </div>
    }>
      <Tela31Inner />
    </Suspense>
  )
}

function Tela31Inner() {
  const router   = useRouter()
  const params   = useSearchParams()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cpfInspetor      = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor    = params.get('chave_inspetor') ?? cpfInspetor
  const cnpjoucpf        = params.get('cnpjoucpf')      ?? ''
  const tipoServico      = params.get('tipo_servico')   ?? '31'
  const tipoServicoBanco = TIPO_SERVICO_BANCO[tipoServico] ?? `${tipoServico} Autovistoria`
  const infoTela         = TITULO_TELA[tipoServico] ?? { titulo: `Vistoria ${tipoServico}`, subtitulo: '' }

  const [sistemas,     setSistemas]     = useState<ItemSistema[]>([])
  const [subsistemas,  setSubsistemas]  = useState<ItemSubsistema[]>([])
  const [anomalias,    setAnomalias]    = useState<ItemAnomalia[]>([])
  const [origens,      setOrigens]      = useState<string[]>([])
  const [locais,       setLocais]       = useState<string[]>([])
  const [gravidades,   setGravidades]   = useState<string[]>([])
  const [urgencias,    setUrgencias]    = useState<string[]>([])
  const [abrangencias, setAbrangencias] = useState<string[]>([])
  const [exposicoes,   setExposicoes]   = useState<string[]>([])
  const [ativos,       setAtivos]       = useState<ItemAtivo[]>([])
  const [carregando,   setCarregando]   = useState(true)
  const [finalidade,   setFinalidade]   = useState('')
  const [descGUT, setDescGUT] = useState({ gravidade: '', urgencia: '', abrangencia: '', exposicao: '' })

  const {
    form, estado,
    atualizar, inicializarIdentificacao,
    tirarFotoEGerarNcCp, salvarDados,
    encerrarVistoria, resetarSucesso, podeEncerrar,
  } = useVistoria31(cpfInspetor, chaveInspetor, cnpjoucpf, tipoServico)

  const subsistemasFiltrados = [...new Set(
    subsistemas.filter((s) => s.sistema === form.sistema).map((s) => s.subsistema)
  )]
  const anomaliasFiltradas = anomalias
    .filter((a) => a.sistema === form.sistema && a.subsistema === form.subsistema)
    .flatMap((a) => a.anomalias.split(';').map((x) => x.trim()).filter(Boolean))
  const tiposAtivo    = [...new Set(ativos.map((a) => a.tipo_ativo))]
  const tagsFiltradas = ativos
    .filter((a) => a.tipo_ativo === form.tipoAtivo)
    .map((a) => a.tag_ativo_nr_serie)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)

      if (cnpjoucpf) {
        const { data } = await supabase
          .from('estabelecimento')
          .select('cnpjoucpf, razao_social_nome')
          .eq('cnpjoucpf', cnpjoucpf)
          .single()
        if (data) inicializarIdentificacao(data.cnpjoucpf, data.razao_social_nome)
      }

      if (cpfInspetor) {
        const { data } = await supabase
          .from('ativos_a_vistoriar')
          .select('tipo_ativo, tag_ativo_nr_serie, finalidade_vistoria, data_cadastro')
          .eq('cpf_inspetor', cpfInspetor)
          .order('data_cadastro', { ascending: false })
        if (data) setAtivos(data)
      }

      const { data: sis } = await supabase
        .from('sistemas_construtivos')
        .select('sistema')
        .eq('tipo_servico', tipoServicoBanco)
        .order('sistema')
      if (sis) setSistemas([...new Map(sis.map((s) => [s.sistema, s])).values()])

      const { data: sub } = await supabase
        .from('sistemas_construtivos')
        .select('sistema, subsistema')
        .eq('tipo_servico', tipoServicoBanco)
        .not('subsistema', 'is', null)
      if (sub) setSubsistemas(sub)

      const { data: ano } = await supabase
        .from('sistemas_construtivos')
        .select('sistema, subsistema, anomalias')
        .eq('tipo_servico', tipoServicoBanco)
        .not('anomalias', 'is', null)
      if (ano) setAnomalias(ano)

      const { data: par } = await supabase
        .from('tabela_parametros')
        .select('tipo_parametro, descricao_parametros')
        .eq('tipo_servico', tipoServicoBanco)
        .order('tipo_parametro')
        .order('descricao_parametros')
      if (par) {
        const f = (tipo: string) =>
          par.filter((p) => p.tipo_parametro === tipo).map((p) => p.descricao_parametros)
        setOrigens(f('Origem'))
        setLocais(f('Local ocorrência'))
        setGravidades(f('Gravidade'))
        setUrgencias(f('Urgência'))
        setAbrangencias(f('Abrangência'))
        setExposicoes(f('Exposição'))
      }

      setCarregando(false)
    }
    carregar()
  }, [cpfInspetor, cnpjoucpf, tipoServico])

  function onSistemaChange(v: string) {
    atualizar('sistema', v); atualizar('subsistema', ''); atualizar('anomalia', '')
  }
  function onSubsistemaChange(v: string) {
    atualizar('subsistema', v); atualizar('anomalia', '')
  }
  function onGutChange(campo: 'gravidade'|'urgencia'|'abrangencia'|'exposicao', desc: string) {
    console.log('DEBUG Campo:', campo, '| Desc recebida:', JSON.stringify(desc), '| Chave buscada:', `${campo}:${desc}`, '| Valor encontrado:', VALOR_GUT[`${campo}:${desc}`])
    setDescGUT((prev) => ({ ...prev, [campo]: desc }))
    atualizar(campo, (VALOR_GUT[`${campo}:${desc}`] ?? 1) as FormVistoria[typeof campo])
  }

  // ── Cor e largura da barra de risco (igual ao HTML aprovado) ──
  function corBarraGR(gr: number): { bar: string; badgeBg: string; badgeColor: string; label: string } {
    if (gr >= 64) return { bar: '#E24B4A', badgeBg: '#FCEBEB', badgeColor: '#CC0000', label: '▲ Alta' }
    if (gr >= 35) return { bar: '#E8A000', badgeBg: '#FFF0C2', badgeColor: '#8A5C00', label: '● Média' }
    return { bar: '#1A7A3C', badgeBg: '#E6F5EE', badgeColor: '#1A7A3C', label: '▼ Baixa' }
  }
  const corGR = corBarraGR(form.grauRisco)

  // ── Captura e compressão de foto (igual lógica do HTML: canvas 480x360, jpeg 0.5) ──
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX_W = 480, MAX_H = 360
      let w = img.width, h = img.height
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const compressed = canvas.toDataURL('image/jpeg', 0.5)
      atualizar('fotoBase64', compressed)
      tirarFotoEGerarNcCp()
    }
    img.src = url
  }

  if (carregando) return (
    <div style={S.body}>
      <div style={S.page}>
        <CabecalhoHTML titulo={infoTela.titulo} subtitulo={infoTela.subtitulo} />
        <div style={S.divider} />
        <p style={{ textAlign: 'center', padding: '40px', color: '#4a6480', fontSize: '9pt' }}>
          Carregando dados da vistoria...
        </p>
      </div>
    </div>
  )

  if (estado.sucesso) return (
    <div style={S.body}>
      <div style={S.page}>
        <CabecalhoHTML titulo={infoTela.titulo} subtitulo={infoTela.subtitulo} />
        <div style={S.divider} />
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
          <h2 style={{ color: '#1E3A8A', fontSize: '13pt', fontWeight: 700, marginBottom: '6px' }}>
            Registro salvo com sucesso!
          </h2>
          <p style={{ color: '#4a6480', fontSize: '8pt', marginBottom: '16px' }}>
            Arquivo: <code>{estado.ultimoArquivoSalvo}</code>
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={resetarSucesso} style={{ ...S.btn, ...S.btnPri }}>
              ➕ Nova Manifestação
            </button>
            <button onClick={() => encerrarVistoria(() => router.push('/dashboard'))} style={{ ...S.btn, ...S.btnSec }}>
              Encerrar vistoria
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.body}>
      <div style={S.page}>

        {/* ── Header (igual HTML aprovado) ── */}
        <CabecalhoHTML titulo={infoTela.titulo} subtitulo={infoTela.subtitulo} />
        <div style={S.divider} />

        <div style={S.formBody}>

          {/* ── BLOCO: Identificação ── */}
          <div style={S.block}>
            <div style={S.blockTitle}>Identificação</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c2 }}>
                <Field label="CNPJ">
                  <input style={S.input} value={form.cnpjoucpf} readOnly placeholder="00.000.000/0000-00" />
                </Field>
                <Field label="Razão social">
                  <input style={S.input} value={form.razaoSocialNome} readOnly placeholder="Nome do estabelecimento" />
                </Field>
              </div>
              <div style={{ ...S.row, ...S.c3 }}>
                <Field label="Ativo a vistoriar">
                  <select style={S.input} value={form.tipoAtivo}
                    onChange={(e) => { atualizar('tipoAtivo', e.target.value); atualizar('tagAtivoNrSerie', '') }}>
                    <option value="">Selecione...</option>
                    {tiposAtivo.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Tag / Nr série">
                  <select style={S.input} value={form.tagAtivoNrSerie}
                    onChange={(e) => {
                      atualizar('tagAtivoNrSerie', e.target.value)
                      const ativo = ativos.find(
                        (a) => a.tipo_ativo === form.tipoAtivo && a.tag_ativo_nr_serie === e.target.value
                      )
                      setFinalidade(ativo?.finalidade_vistoria ?? '')
                    }} disabled={!form.tipoAtivo}>
                    <option value="">Selecione...</option>
                    {tagsFiltradas.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Finalidade da vistoria">
                  <input style={{ ...S.input, background: '#f5f7fc', color: '#4a6480' }} value={finalidade} readOnly placeholder="Selecione a TAG/Nº Série" />
                </Field>
              </div>
            </div>
          </div>

          {/* ── BLOCO: Manifestação Patológica ── */}
          <div style={S.block}>
            <div style={S.blockTitle}>Manifestação Patológica</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c3 }}>
                <Field label="Sistema">
                  <select style={S.input} value={form.sistema} onChange={(e) => onSistemaChange(e.target.value)}>
                    <option value="">Selecione...</option>
                    {sistemas.map((s) => <option key={s.sistema} value={s.sistema}>{s.sistema}</option>)}
                  </select>
                </Field>
                <Field label="Subsistema">
                  <select style={S.input} value={form.subsistema}
                    onChange={(e) => onSubsistemaChange(e.target.value)} disabled={!form.sistema}>
                    <option value="">Selecione...</option>
                    {subsistemasFiltrados.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Anomalia / Falha">
                  <select style={S.input} value={form.anomalia}
                    onChange={(e) => atualizar('anomalia', e.target.value)} disabled={!form.subsistema}>
                    <option value="">Selecione...</option>
                    {anomaliasFiltradas.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ ...S.row, ...S.c3 }}>
                <Field label="Origem">
                  <select style={S.input} value={form.origem} onChange={(e) => atualizar('origem', e.target.value)}>
                    <option value="">Selecione...</option>
                    {origens.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Local de ocorrência">
                  <select style={S.input} value={form.local} onChange={(e) => atualizar('local', e.target.value)}>
                    <option value="">Selecione...</option>
                    {locais.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Complemento do local">
                  <input style={S.input} value={form.complemento}
                    onChange={(e) => atualizar('complemento', e.target.value)}
                    placeholder="Ex: Pavimento 3, Apto 42" />
                </Field>
              </div>
            </div>
          </div>

          {/* ── BLOCO: Classificação de Risco ── */}
          <div style={S.block}>
            <div style={S.blockTitle}>Classificação de Risco</div>
            <div style={S.blockBody}>
              <div style={{ ...S.row, ...S.c4 }}>
                {[
                  { label: 'Gravidade',   lista: gravidades,   campo: 'gravidade'   as const },
                  { label: 'Urgência',    lista: urgencias,    campo: 'urgencia'    as const },
                  { label: 'Abrangência', lista: abrangencias, campo: 'abrangencia' as const },
                  { label: 'Exposição',   lista: exposicoes,   campo: 'exposicao'   as const },
                ].map(({ label, lista, campo }) => (
                  <Field key={campo} label={label}>
                    <select style={S.input} value={descGUT[campo]} onChange={(e) => onGutChange(campo, e.target.value)}>
                      <option value="">Sel...</option>
                      {lista.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                ))}
              </div>
              <div style={S.riskMetrics}>
                <div style={S.metric}>
                  <span style={S.metricLbl}>Grau de Risco</span>
                  <span style={S.metricVal}>{form.grauRisco}</span>
                  <div style={S.barWrap}>
                    <div style={{ ...S.bar, width: `${form.grauRisco}%`, background: corGR.bar }} />
                  </div>
                </div>
                <div style={{ ...S.metric, justifyContent: 'center', gap: '8px' }}>
                  <span style={S.metricLbl}>Prioridade</span>
                  <span style={{ ...S.badge, background: corGR.badgeBg, color: corGR.badgeColor }}>
                    {corGR.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── BLOCO: Evidência Fotográfica ── */}
          {/* Botão "Adicionar foto" na mesma linha de Foto Nº e Data (igual HTML aprovado) */}
          <div style={S.block}>
            <div style={S.blockTitle}>Evidência Fotográfica</div>
            <div style={S.blockBody}>
              <div style={S.photoControls}>
                <Field label="Foto nº">
                  <input style={{ ...S.input, textAlign: 'center', background: '#f5f7fc', color: '#1E3A8A', fontWeight: 700 }}
                    value={form.fotoNr} readOnly />
                </Field>
                <Field label="Data da vistoria">
                  <div style={S.dataDisplay}>{form.dataVistoria}</div>
                </Field>
                <button
                  style={S.photoBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!form.sistema || !form.subsistema || !form.anomalia}
                >
                  📷 Adicionar foto
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFotoChange}
                />
              </div>

              <div
                style={S.photoArea}
                onClick={() => fileInputRef.current?.click()}
              >
                {form.fotoBase64 && (
                  <img src={form.fotoBase64} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                {!form.fotoBase64 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8aa3c4', fontSize: '8pt' }}>
                    Clique para adicionar a foto da anomalia
                  </div>
                )}
              </div>

              {estado.feedbackIa && estado.feedbackIa !== 'concluido' && estado.feedbackIa !== 'erro' && (
                <div style={S.aiStatus}>{TEXTO_FEEDBACK[estado.feedbackIa]}</div>
              )}
              {estado.feedbackIa === 'erro' && (
                <div style={{ ...S.aiStatus, color: '#CC0000', background: '#FCEBEB' }}>
                  {TEXTO_FEEDBACK.erro} {estado.erroIa}
                </div>
              )}
            </div>
          </div>

          {/* ── BLOCO: Resultado da Análise e Avaliação ── */}
          <div style={S.block}>
            <div style={S.blockTitle}>Resultado da Análise e Avaliação</div>
            <div style={S.blockBody}>
              <Field label="Descrição da não conformidade (NC)">
                <textarea
                  style={{ ...S.input, ...S.textarea, minHeight: '32px' }}
                  value={form.nc}
                  maxLength={200}
                  onChange={(e) => atualizar('nc', e.target.value)}
                  placeholder="Gerado por IA após adicionar foto..."
                />
              </Field>
              <Field label="Descrição da causa provável (CP)">
                <textarea
                  style={{ ...S.input, ...S.textarea, minHeight: '32px' }}
                  value={form.cp}
                  maxLength={200}
                  onChange={(e) => atualizar('cp', e.target.value)}
                  placeholder="Gerado por IA após adicionar foto..."
                />
              </Field>
            </div>
          </div>

          {estado.erroSave && (
            <div style={{ color: '#CC0000', fontSize: '8pt', textAlign: 'center', marginBottom: '6px' }}>
              ⚠️ {estado.erroSave}
            </div>
          )}

          {/* ── Footer: 2 botões (igual HTML aprovado) ── */}
          <div style={S.footer}>
            <button
              style={{ ...S.btn, ...S.btnSec, opacity: podeEncerrar ? 1 : 0.5, cursor: podeEncerrar ? 'pointer' : 'not-allowed' }}
              onClick={() => encerrarVistoria(() => router.push('/dashboard'))}
              disabled={!podeEncerrar}
            >
              Encerrar vistoria
            </button>
            <button
              style={{ ...S.btn, ...S.btnPri, opacity: (estado.salvando || !form.fotoNr) ? 0.6 : 1 }}
              onClick={salvarDados}
              disabled={estado.salvando || !form.fotoNr}
            >
              {estado.salvando ? 'Salvando...' : 'Salvar dados'}
            </button>
          </div>

          {!podeEncerrar && (
            <p style={{ textAlign: 'center', fontSize: '7pt', color: '#8A5C00', marginTop: '4px' }}>
              ⚠️ Salve o último registro antes de encerrar a vistoria.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CabecalhoHTML({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div style={S.header}>
      <div style={S.logo}>
        <img src="/logo.png" alt="AIMÊ" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={S.headerText}>
        <h1 style={S.headerH1}>{titulo}</h1>
        <p style={S.headerP}>{subtitulo}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

// ─── Estilos (fiéis ao CSS do HTML aprovado) ──────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  body: {
    background: '#E8EEF7',
    display: 'flex',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'Arial, Helvetica, sans-serif',
    minHeight: '100vh',
  },
  page: {
    width: '210mm',
    maxWidth: '100%',
    minHeight: 'fit-content',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,.15)',
    overflow: 'hidden',
  },
  header: {
    background: '#1E3A8A',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    width: '80px',
    height: '36px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
  },
  headerH1: {
    fontSize: '11pt',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  headerP: {
    fontSize: '7pt',
    color: '#B5D4F4',
    marginTop: '2px',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: '11pt',
    fontWeight: 700,
  },
  divider: {
    height: '2px',
    background: '#1E3A8A',
  },
  formBody: {
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  block: {
    border: '1px solid #c3d4f0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  blockTitle: {
    background: '#1E3A8A',
    color: '#ffffff',
    fontSize: '7.5pt',
    fontWeight: 700,
    padding: '3px 10px',
  },
  blockBody: {
    padding: '5px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  row: {
    display: 'grid',
    gap: '4px',
  },
  c2: { gridTemplateColumns: '1fr 1fr' },
  c3: { gridTemplateColumns: '1fr 1fr 1fr' },
  c4: { gridTemplateColumns: '1fr 1fr 1fr 1fr' },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  fieldLabel: {
    fontSize: '6.5pt',
    fontWeight: 600,
    color: '#4a6480',
  },
  input: {
    width: '100%',
    border: '1px solid #c3d4f0',
    borderRadius: '4px',
    padding: '2px 5px',
    fontSize: '7.5pt',
    color: '#1a1a2e',
    fontFamily: 'inherit',
    background: '#ffffff',
    boxSizing: 'border-box',
  },
  textarea: {
    resize: 'vertical',
    lineHeight: 1.35,
  },
  riskMetrics: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px',
  },
  metric: {
    background: '#E8EEF7',
    border: '1px solid #c3d4f0',
    borderRadius: '5px',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metricLbl: {
    fontSize: '6.5pt',
    color: '#4a6480',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  metricVal: {
    fontSize: '13pt',
    fontWeight: 700,
    color: '#1E3A8A',
    lineHeight: 1,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 10px',
    borderRadius: '99px',
    fontSize: '7.5pt',
    fontWeight: 700,
  },
  barWrap: {
    flex: 1,
    height: '5px',
    background: '#c3d4f0',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: '99px',
    transition: 'width 0.3s',
  },
  photoControls: {
    display: 'grid',
    gridTemplateColumns: '70px 1fr auto',
    gap: '6px',
    alignItems: 'end',
    marginBottom: '4px',
  },
  photoBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 12px',
    height: '24px',
    background: '#E8EEF7',
    border: '1px solid #c3d4f0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '7pt',
    color: '#1E3A8A',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  dataDisplay: {
    fontSize: '7.5pt',
    color: '#1E3A8A',
    fontWeight: 600,
    textAlign: 'center',
    padding: '2px 5px',
    border: '1px solid #c3d4f0',
    borderRadius: '4px',
    background: '#f5f7fc',
  },
  photoArea: {
    border: '1.5px dashed #c3d4f0',
    borderRadius: '5px',
    background: '#E8EEF7',
    height: '60mm',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  aiStatus: {
    fontSize: '6.5pt',
    color: '#1E3A8A',
    padding: '2px 6px',
    background: '#E8EEF7',
    borderRadius: '4px',
    marginTop: '2px',
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '4px',
  },
  btn: {
    padding: '8px 0',
    fontSize: '8pt',
    fontWeight: 700,
    borderRadius: '50px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'inherit',
  },
  btnSec: {
    background: '#ffffff',
    border: '2px solid #1E3A8A',
    color: '#1E3A8A',
  },
  btnPri: {
    background: '#1E3A8A',
    border: '2px solid #1E3A8A',
    color: '#ffffff',
  },
}
