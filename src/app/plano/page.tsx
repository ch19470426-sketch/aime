// src/app/plano/page.tsx
// AIMÊ — Tela Plano de Trabalho (tipos 21-29)

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Banner from '@/components/Banner'
import { useBanner } from '@/hooks/useBanner'

const SUPA_URL = 'https://asgorarunzhiojqioxzq.supabase.co'
const SUPA_KEY = 'sb_publishable_dH85HYKGxv3X0te627VfOw_OGaPoNMF'

const TITULO_TIPO: Record<string, string> = {
  '21': 'Plano de Trabalho — Autovistoria',
  '22': 'Plano de Trabalho — Inspeção Predial',
  '23': 'Plano de Trabalho — Vistoria Imóvel Novo',
  '24': 'Plano de Trabalho — Inspeção de Fachada',
  '25': 'Plano de Trabalho — Inspeção de Elevadores',
  '26': 'Plano de Trabalho — Inspeção NR-10',
  '27': 'Plano de Trabalho — Inspeção NR-12',
  '28': 'Plano de Trabalho — Inspeção NR-13',
  '29': 'Plano de Trabalho — Plano de Manutenção',
}

// Correlação tipo plano → tipo vistoria
const TIPO_VISTORIA: Record<string, string> = {
  '21': '31 Autovistoria', '22': '32 Vistoria inspeção',
  '23': '33 Vistoria imóvel novo', '24': '34 Vistoria fachada',
  '25': '35 Vistoria elevador', '26': '36 Vistoria nr-10',
  '27': '37 Vistoria nr-12', '28': '38 Vistoria nr-13',
  '29': '32 Vistoria inspeção',
}

const TIPOS_ATIVO: Record<string, string[]> = {
  '31': ['Prédio','Apartamento','Casa','Escritório, sala, Loja','Galpão','Hotéis e motéis','Hospitais','Escolas','Cinemas e teatros','Clubes recreativos','Prédios industriais','Outro'],
  '32': ['Prédio','Apartamento','Casa','Escritório, sala, Loja','Galpão','Hotéis e motéis','Hospitais','Escolas','Cinemas e teatros','Clubes recreativos','Prédios industriais','Outro'],
  '33': ['Prédio','Apartamento','Casa','Escritório, sala, Loja','Galpão','Hotéis e motéis','Hospitais','Escolas','Cinemas e teatros','Clubes recreativos','Prédios industriais','Outro'],
  '34': ['Fachada'],
  '35': ['Elevador'],
  '36': ['Subestação MT','Transformador','Quadro QGBT','Gerador','SPDA','Linha BT/MT','Outro'],
  '37': ['Prensa','Guilhotina','Serra','Injetora','Torno','Extrusora','Transportador','Empilhadeira','Outro'],
  '38': ['Caldeira flamotubular','Caldeira aquatubular','Caldeira mista','Vaso de processo','Vaso de armazenamento','Compressor','Autoclave','Tubulação de processo','Tanque metálico','Outro'],
}

const SUBTIPOS: Record<string, string[]> = {
  '36': ['Baixa tensão','Média tensão','Alta tensão'],
  '37': ['Prensa mecânica excêntrica','Freio-embreagem','Hidráulica','Pneumática'],
  '38': ['Cat. A (≥1.960kPa)','Cat. B (<1.960kPa)','Grupo 1–5','Classe A–D'],
}

const FLUIDOS = ['Classe A','Classe B','Classe C','Classe D','Vapor','Ar comprimido','GLP','Nitrogênio','Outro']
const USOS = ['Produção/processo','Transporte','Residencial','Comercial','Industrial','Institucional','Misto']
const FUNCOES = ['Administrador','Síndico','Proprietário']

interface Ativo {
  tipo_ativo: string; tag_ativo_nr_serie: string; cpf_responsavel: string
  nome_responsavel: string; funcao_responsavel: string; whatsapp_responsavel: string
  email_responsavel: string; finalidade_vistoria: string; data_inicio_operacao: string
  uso_ativo: string; numero_pavimentos: string; numero_unidades_salas: string
  area_terreno: string; area_construida: string; numero_fachadas: string
  perimetro_fachadas: string; fabricante_marca: string; subtipo: string
  tensao_pressao_kv_kpa: string; capacidade_potencia: string; fluido_classe_fluido: string
  volume_interno_m3: string
}

const ATIVO_VAZIO: Ativo = {
  tipo_ativo: '', tag_ativo_nr_serie: '1', cpf_responsavel: '', nome_responsavel: '',
  funcao_responsavel: '', whatsapp_responsavel: '', email_responsavel: '',
  finalidade_vistoria: '', data_inicio_operacao: '', uso_ativo: '',
  numero_pavimentos: '', numero_unidades_salas: '', area_terreno: '', area_construida: '',
  numero_fachadas: '', perimetro_fachadas: '', fabricante_marca: '', subtipo: '',
  tensao_pressao_kv_kpa: '', capacidade_potencia: '', fluido_classe_fluido: '',
  volume_interno_m3: '',
}

export default function PlanoPage() {
  return (
    <Suspense fallback={
      <div style={S.body}><div style={S.page}>
        <HeaderBar titulo="Carregando..." subtitulo="" />
        <div style={S.divider} />
      </div></div>
    }>
      <PlanoInner />
    </Suspense>
  )
}

function PlanoInner() {
  const params        = useSearchParams()
  const cpfInspetor   = params.get('cpf_inspetor')   ?? ''
  const chaveInspetor = params.get('chave_inspetor') ?? ''
  const cnpjoucpf     = params.get('cnpjoucpf')      ?? ''
  const tipoServico   = params.get('tipo_servico')   ?? '21'

  const { bannerProps, informa, agradece, solicita, fechar } = useBanner()

  const tsVistoria = TIPO_VISTORIA[tipoServico] ?? '31 Autovistoria'
  const tsNum      = tsVistoria.split(' ')[0] // "31", "32" etc
  const titulo     = TITULO_TIPO[tipoServico] ?? 'Plano de Trabalho'

  // Grupos de tipo de serviço
  const isPredial  = ['31','32','33'].includes(tsNum)
  const isFachada  = tsNum === '34'
  const isElevador = tsNum === '35'
  const isNR10     = tsNum === '36'
  const isNR12     = tsNum === '37'
  const isNR13     = tsNum === '38'
  const isNR       = isNR10 || isNR12 || isNR13
  const needsTag   = isElevador || isNR12 || isNR13

  const [etapa,      setEtapa]      = useState<'ativo' | 'plano'>('ativo')
  const [carregando, setCarregando] = useState(true)
  const [salvando,   setSalvando]   = useState(false)
  const [ativos,     setAtivos]     = useState<Ativo[]>([])
  const [ativoAtual, setAtivoAtual] = useState<Ativo>({ ...ATIVO_VAZIO })
  const [est,        setEst]        = useState<Record<string,string> | null>(null) // eslint-disable-line
  const [insp,       setInsp]       = useState<Record<string,string> | null>(null)
  const [htmlPlano,  setHtmlPlano]  = useState('')

  // Dados do documento — editáveis pelo inspetor

  async function query(table: string, qparams: string) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${qparams}`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    })
    return res.json()
  }

  useEffect(() => {
    carregar()
  }, [cnpjoucpf, cpfInspetor])

  async function carregar() {
    setCarregando(true)
    try {
      // Verificar estabelecimento
      const estData = await query('estabelecimento', `cnpjoucpf=eq.${cnpjoucpf}&select=*`)
      if (!Array.isArray(estData) || !estData[0]) {
        informa(
          'Estabelecimento não cadastrado',
          'Para o CNPJ/CPF informado não há Estabelecimento cadastrado. O cadastro do Estabelecimento deve ser efetuado na geração da proposta comercial.',
          () => window.location.href = '/dashboard'
        )
        setCarregando(false)
        return
      }
      setEst(estData[0])

      // Buscar inspetor
      const inspData = await query('inspetor', `cpf_inspetor=eq.${cpfInspetor}&select=*`)
      if (Array.isArray(inspData) && inspData[0]) setInsp(inspData[0])

      // Buscar ativos já cadastrados
      const ativoData = await query('ativos_a_vistoriar',
        `cpf_inspetor=eq.${cpfInspetor}&cnpjoucpf=eq.${cnpjoucpf}&tipo_servico=eq.${encodeURIComponent(tsVistoria)}&select=*&order=data_cadastro`)
      if (Array.isArray(ativoData)) setAtivos(ativoData)

    } catch(e) {
      informa('Erro', 'Não foi possível carregar os dados.')
    } finally {
      setCarregando(false)
    }
  }

  function atualizarAtivo(campo: keyof Ativo, valor: string) {
    setAtivoAtual(prev => ({ ...prev, [campo]: valor }))
  }

  function validarAtivo(): string | null {
    if (!ativoAtual.tipo_ativo) return 'Selecione o Tipo de ativo'
    if (needsTag && !ativoAtual.tag_ativo_nr_serie) return 'Informe o TAG / Nº Série'
    if (!ativoAtual.nome_responsavel) return 'Informe o Nome do responsável'
    if (!ativoAtual.funcao_responsavel) return 'Selecione a Função do responsável'
    if (!ativoAtual.finalidade_vistoria) return 'Informe a Finalidade da vistoria'
    if (!ativoAtual.data_inicio_operacao) return 'Informe a Data de início de operação'
    if (!ativoAtual.uso_ativo) return 'Selecione o Uso do ativo'
    if (isPredial && !ativoAtual.numero_pavimentos) return 'Informe o Número de pavimentos'
    if (isPredial && !ativoAtual.area_construida) return 'Informe a Área construída'
    if (isFachada && !ativoAtual.numero_fachadas) return 'Informe o Número de fachadas'
    if ((isElevador || isNR12 || isNR13) && !ativoAtual.fabricante_marca) return 'Informe o Fabricante/Marca'
    if (isNR && !ativoAtual.subtipo) return 'Selecione o Subtipo'
    if ((isNR10 || isNR13) && !ativoAtual.tensao_pressao_kv_kpa) return 'Informe a Tensão/Pressão'
    if (isNR13 && !ativoAtual.fluido_classe_fluido) return 'Selecione o Fluido'
    return null
  }

  async function salvarAtivo() {
    const erro = validarAtivo()
    if (erro) { informa('Atenção', erro); return }
    setSalvando(true)
    try {
      const tag = needsTag ? ativoAtual.tag_ativo_nr_serie : '1'
      const payload = {
        cpf_inspetor: cpfInspetor, cnpjoucpf, tipo_servico: tsVistoria,
        data_cadastro: new Date().toISOString(),
        tipo_ativo: ativoAtual.tipo_ativo,
        tag_ativo_nr_serie: tag,
        cpf_responsavel: ativoAtual.cpf_responsavel || null,
        nome_responsavel: ativoAtual.nome_responsavel,
        funcao_responsavel: ativoAtual.funcao_responsavel,
        whatsapp_responsavel: ativoAtual.whatsapp_responsavel || null,
        email_responsavel: ativoAtual.email_responsavel || null,
        finalidade_vistoria: ativoAtual.finalidade_vistoria,
        data_inicio_operacao: ativoAtual.data_inicio_operacao || null,
        uso_ativo: ativoAtual.uso_ativo,
        numero_pavimentos: ativoAtual.numero_pavimentos ? parseInt(ativoAtual.numero_pavimentos) : null,
        numero_unidades_salas: ativoAtual.numero_unidades_salas ? parseInt(ativoAtual.numero_unidades_salas) : null,
        area_terreno: ativoAtual.area_terreno ? parseFloat(ativoAtual.area_terreno) : null,
        area_construida: ativoAtual.area_construida ? parseFloat(ativoAtual.area_construida) : null,
        numero_fachadas: ativoAtual.numero_fachadas ? parseInt(ativoAtual.numero_fachadas) : null,
        perimetro_fachadas: ativoAtual.perimetro_fachadas ? parseInt(ativoAtual.perimetro_fachadas) : null,
        fabricante_marca: ativoAtual.fabricante_marca || null,
        subtipo: ativoAtual.subtipo || null,
        tensao_pressao_kv_kpa: ativoAtual.tensao_pressao_kv_kpa ? parseFloat(ativoAtual.tensao_pressao_kv_kpa) : null,
        capacidade_potencia: ativoAtual.capacidade_potencia ? parseFloat(ativoAtual.capacidade_potencia) : null,
        fluido_classe_fluido: ativoAtual.fluido_classe_fluido || null,
        volume_interno_m3: ativoAtual.volume_interno_m3 ? parseFloat(ativoAtual.volume_interno_m3) : null,
      }
      const res = await fetch(`${SUPA_URL}/rest/v1/ativos_a_vistoriar`, {
        method: 'POST',
        headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const novos = [...ativos, { ...ativoAtual, tag_ativo_nr_serie: tag }]
        setAtivos(novos)
        setAtivoAtual({ ...ATIVO_VAZIO })
        informa('Ativo cadastrado', `${ativoAtual.tipo_ativo} cadastrado com sucesso. Deseja cadastrar outro ativo?`)
      } else {
        informa('Erro', 'Não foi possível cadastrar o ativo.')
      }
    } finally {
      setSalvando(false)
    }
  }

  async function gerarPlano() {
    setSalvando(true)
    try {
      const res = await fetch('/api/gerar-plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoServico, cpfInspetor, cnpjoucpf, ativos })
      })
      const data = await res.json()
      if (data.html) {
        setHtmlPlano(data.html)
        setEtapa('plano')
      } else {
        informa('Erro', data.erro ?? 'Não foi possível gerar o plano.')
      }
    } finally {
      setSalvando(false)
    }
  }

  async function salvarPlano() {
    setSalvando(true)
    try {
      const nomeArq = `${chaveInspetor}_plano_${tipoServico}_${cnpjoucpf}.html`
      const res = await fetch('/api/salvar-vistoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeArquivo: nomeArq, pasta: 'documentos_inspetor', payload: htmlPlano, contentType: 'application/json' })
      })
      const data = await res.json()
      if (data.sucesso) {
        agradece('Plano de trabalho salvo!', `O plano foi salvo em "Documentos inspetor" como ${nomeArq}.`, () => window.location.href = '/dashboard')
      } else {
        informa('Erro', data.erro ?? 'Não foi possível salvar.')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return (
    <div style={S.body}><div style={S.page}>
      <HeaderBar titulo={titulo} subtitulo="Carregando..." />
      <div style={S.divider} />
      <Banner {...bannerProps} />
    </div></div>
  )

  return (
    <div style={S.body}>
      <div style={S.page}>
        <HeaderBar titulo={titulo}
          subtitulo={etapa === 'ativo' ? 'Cadastrar ativos a vistoriar' : 'Revisar e salvar plano de trabalho'} />
        <div style={S.divider} />
        <div style={S.formBody}>

          {/* ── ETAPA 1: CADASTRO DE ATIVOS ── */}
          {etapa === 'ativo' && (<>

            {/* Ativos já cadastrados */}
            {ativos.length > 0 && (
              <div style={S.block}>
                <div style={S.blockTitle}>Ativos cadastrados ({ativos.length})</div>
                <div style={S.blockBody}>
                  {ativos.map((a, i) => (
                    <div key={i} style={{ fontSize: '7.5pt', padding: '3px 0', borderBottom: '1px solid #f1f5f9', color: '#374151' }}>
                      <b>{i+1}. {a.tipo_ativo}</b>{needsTag ? ` — TAG: ${a.tag_ativo_nr_serie}` : ''} — {a.nome_responsavel} ({a.funcao_responsavel})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário novo ativo */}
            <div style={S.block}>
              <div style={S.blockTitle}>Dados do ativo a vistoriar</div>
              <div style={S.blockBody}>

                <div style={{ ...S.row, ...S.c2 }}>
                  <Field label="Tipo de ativo *">
                    <select style={S.input} value={ativoAtual.tipo_ativo} onChange={e => atualizarAtivo('tipo_ativo', e.target.value)}>
                      <option value="">Selecione...</option>
                      {(TIPOS_ATIVO[tsNum] ?? []).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  {needsTag ? (
                    <Field label="TAG / Nº Série *">
                      <input style={S.input} value={ativoAtual.tag_ativo_nr_serie}
                        onChange={e => atualizarAtivo('tag_ativo_nr_serie', e.target.value)} placeholder="Ex: ELV-01" />
                    </Field>
                  ) : (
                    <Field label="Finalidade da vistoria *">
                      <input style={S.input} value={ativoAtual.finalidade_vistoria}
                        onChange={e => atualizarAtivo('finalidade_vistoria', e.target.value)} placeholder="Ex: Inspeção predial periódica" />
                    </Field>
                  )}
                </div>

                {needsTag && (
                  <Field label="Finalidade da vistoria *">
                    <input style={S.input} value={ativoAtual.finalidade_vistoria}
                      onChange={e => atualizarAtivo('finalidade_vistoria', e.target.value)} placeholder="Ex: Inspeção de segurança" />
                  </Field>
                )}

                <div style={S.sectionTitle}>Responsável pelo ativo</div>
                <div style={{ ...S.row, ...S.c3 }}>
                  <Field label="Nome *">
                    <input style={S.input} value={ativoAtual.nome_responsavel}
                      onChange={e => atualizarAtivo('nome_responsavel', e.target.value)} />
                  </Field>
                  <Field label="Função *">
                    <select style={S.input} value={ativoAtual.funcao_responsavel}
                      onChange={e => atualizarAtivo('funcao_responsavel', e.target.value)}>
                      <option value="">Selecione...</option>
                      {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                  <Field label="CPF">
                    <input style={S.input} value={ativoAtual.cpf_responsavel} maxLength={11}
                      onChange={e => atualizarAtivo('cpf_responsavel', e.target.value.replace(/\D/g,''))} placeholder="Somente dígitos" />
                  </Field>
                </div>
                <div style={{ ...S.row, ...S.c2 }}>
                  <Field label="WhatsApp">
                    <input style={S.input} value={
                      ativoAtual.whatsapp_responsavel.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
                        .replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
                    }
                      maxLength={15}
                      onChange={e => atualizarAtivo('whatsapp_responsavel', e.target.value.replace(/\D/g,''))}
                      placeholder="(27) 99999-9999" />
                  </Field>
                  <Field label="E-mail">
                    <input style={S.input} value={ativoAtual.email_responsavel}
                      onChange={e => atualizarAtivo('email_responsavel', e.target.value)} placeholder="email@dominio.com" />
                  </Field>
                </div>

                <div style={S.sectionTitle}>Características do ativo</div>
                <div style={{ ...S.row, ...S.c2 }}>
                  <Field label="Data de início de operação *">
                    <input style={S.input} type="date" value={ativoAtual.data_inicio_operacao}
                      onChange={e => atualizarAtivo('data_inicio_operacao', e.target.value)} />
                  </Field>
                  <Field label="Uso do ativo *">
                    <select style={S.input} value={ativoAtual.uso_ativo}
                      onChange={e => atualizarAtivo('uso_ativo', e.target.value)}>
                      <option value="">Selecione...</option>
                      {USOS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Campos predial */}
                {isPredial && (
                  <div style={{ ...S.row, ...S.c4 }}>
                    <Field label="Pavimentos *">
                      <input style={S.input} type="number" min="1" value={ativoAtual.numero_pavimentos}
                        onChange={e => atualizarAtivo('numero_pavimentos', e.target.value)} />
                    </Field>
                    <Field label="Unidades/salas">
                      <input style={S.input} type="number" min="1" value={ativoAtual.numero_unidades_salas}
                        onChange={e => atualizarAtivo('numero_unidades_salas', e.target.value)} />
                    </Field>
                    <Field label="Área terreno (m²)">
                      <input style={S.input} type="number" step="0.01" value={ativoAtual.area_terreno}
                        onChange={e => atualizarAtivo('area_terreno', e.target.value)} />
                    </Field>
                    <Field label="Área construída (m²) *">
                      <input style={S.input} type="number" step="0.01" value={ativoAtual.area_construida}
                        onChange={e => atualizarAtivo('area_construida', e.target.value)} />
                    </Field>
                  </div>
                )}

                {/* Campos fachada */}
                {isFachada && (
                  <div style={{ ...S.row, ...S.c3 }}>
                    <Field label="Pavimentos *">
                      <input style={S.input} type="number" min="1" value={ativoAtual.numero_pavimentos}
                        onChange={e => atualizarAtivo('numero_pavimentos', e.target.value)} />
                    </Field>
                    <Field label="Número de fachadas *">
                      <input style={S.input} type="number" min="1" value={ativoAtual.numero_fachadas}
                        onChange={e => atualizarAtivo('numero_fachadas', e.target.value)} />
                    </Field>
                    <Field label="Perímetro fachadas (m)">
                      <input style={S.input} type="number" value={ativoAtual.perimetro_fachadas}
                        onChange={e => atualizarAtivo('perimetro_fachadas', e.target.value)} />
                    </Field>
                  </div>
                )}

                {/* Campos elevador/NR */}
                {(isElevador || isNR) && (
                  <div style={{ ...S.row, ...(isElevador ? S.c2 : S.c3) }}>
                    <Field label="Fabricante/Marca *">
                      <input style={S.input} value={ativoAtual.fabricante_marca}
                        onChange={e => atualizarAtivo('fabricante_marca', e.target.value)} />
                    </Field>
                    {isElevador && (
                      <Field label="Pavimentos *">
                        <input style={S.input} type="number" min="1" value={ativoAtual.numero_pavimentos}
                          onChange={e => atualizarAtivo('numero_pavimentos', e.target.value)} />
                      </Field>
                    )}
                    <Field label="Capacidade/Potência *">
                      <input style={S.input} type="number" step="0.01" value={ativoAtual.capacidade_potencia}
                        onChange={e => atualizarAtivo('capacidade_potencia', e.target.value)} placeholder="kW/kVA/kg/h/m³" />
                    </Field>
                  </div>
                )}

                {/* Campos NR específicos */}
                {isNR && (
                  <div style={{ ...S.row, ...S.c2 }}>
                    <Field label="Subtipo *">
                      <select style={S.input} value={ativoAtual.subtipo}
                        onChange={e => atualizarAtivo('subtipo', e.target.value)}>
                        <option value="">Selecione...</option>
                        {(SUBTIPOS[tsNum] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    {(isNR10 || isNR13) && (
                      <Field label={isNR10 ? 'Tensão (kV) *' : 'Pressão (kPa) *'}>
                        <input style={S.input} type="number" step="0.01" value={ativoAtual.tensao_pressao_kv_kpa}
                          onChange={e => atualizarAtivo('tensao_pressao_kv_kpa', e.target.value)} />
                      </Field>
                    )}
                  </div>
                )}

                {/* Campos NR-13 específicos */}
                {isNR13 && (
                  <div style={{ ...S.row, ...S.c2 }}>
                    <Field label="Fluido/Classe *">
                      <select style={S.input} value={ativoAtual.fluido_classe_fluido}
                        onChange={e => atualizarAtivo('fluido_classe_fluido', e.target.value)}>
                        <option value="">Selecione...</option>
                        {FLUIDOS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </Field>
                    <Field label="Volume interno (m³) *">
                      <input style={S.input} type="number" step="0.0001" value={ativoAtual.volume_interno_m3}
                        onChange={e => atualizarAtivo('volume_interno_m3', e.target.value)} />
                    </Field>
                  </div>
                )}

                <div style={{ ...S.footer, gridTemplateColumns: '1fr 1fr 1fr', marginTop: '8px' }}>
                  <button style={{ ...S.btn, background: '#DC2626', color: '#fff', border: 'none' }}
                    onClick={() => window.location.href = '/dashboard'}>Cancelar</button>
                  <button style={{ ...S.btn, ...S.btnSec, opacity: salvando ? 0.6 : 1 }}
                    onClick={salvarAtivo} disabled={salvando}>
                    {salvando ? 'Salvando...' : '+ Cadastrar ativo'}
                  </button>
                  <button style={{ ...S.btn, ...S.btnPri }}
                    onClick={gerarPlano} disabled={ativos.length === 0 || salvando}>
                    {ativos.length === 0 ? 'Cadastre um ativo' : `Gerar plano (${ativos.length} ativo${ativos.length > 1 ? 's' : ''}) →`}
                  </button>
                </div>
              </div>
            </div>
          </>)}

          {/* ── ETAPA 2: PREVIEW DO PLANO ── */}
          {etapa === 'plano' && (<>
            <div style={{ ...S.block }}>
              <div style={S.blockTitle}>Preview do Plano de Trabalho</div>
              <div style={{ padding: '8px 10px' }}>
                <iframe srcDoc={htmlPlano} style={{ width: '100%', height: '700px', border: '1px solid #c3d4f0', borderRadius: '4px' }} title="Plano" />
              </div>
            </div>
            <div style={S.footer}>
              <button style={{ ...S.btn, ...S.btnSec }} onClick={() => setEtapa('ativo')}>← Voltar</button>
              <button style={{ ...S.btn, ...S.btnPri, opacity: salvando ? 0.6 : 1 }} onClick={salvarPlano} disabled={salvando}>
                {salvando ? 'Salvando...' : '💾 Salvar plano'}
              </button>
            </div>
          </>)}

        </div>
      </div>
      <Banner {...bannerProps} />
    </div>
  )
}

function HeaderBar({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div style={S.header}>
      <div style={{ width: '80px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Image src="/logo.png" alt="AIMÊ" width={80} height={36} style={{ filter: 'brightness(0) invert(1)', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <h1 style={{ fontSize: '11pt', fontWeight: 700, color: '#fff', margin: 0 }}>{titulo}</h1>
        <p style={{ fontSize: '7pt', color: '#B5D4F4', marginTop: '2px' }}>{subtitulo}</p>
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

const S: Record<string, React.CSSProperties> = {
  body:        { background: '#E8EEF7', display: 'flex', justifyContent: 'center', padding: '24px', fontFamily: 'Arial, Helvetica, sans-serif', minHeight: '100vh' },
  page:        { width: '210mm', maxWidth: '100%', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,.15)', overflow: 'hidden', height: 'fit-content' },
  header:      { background: '#1E3A8A', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  divider:     { height: '2px', background: '#1E3A8A' },
  formBody:    { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  block:       { border: '1px solid #c3d4f0', borderRadius: '6px', overflow: 'hidden' },
  blockTitle:  { background: '#1E3A8A', color: '#ffffff', fontSize: '7.5pt', fontWeight: 700, padding: '3px 10px' },
  blockBody:   { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' },
  sectionTitle:{ fontSize: '7pt', fontWeight: 700, color: '#1E3A8A', marginTop: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' },
  row:         { display: 'grid', gap: '6px' },
  c2:          { gridTemplateColumns: '1fr 1fr' },
  c3:          { gridTemplateColumns: '1fr 1fr 1fr' },
  c4:          { gridTemplateColumns: '1fr 1fr 1fr 1fr' },
  field:       { display: 'flex', flexDirection: 'column', gap: '2px' },
  fieldLabel:  { fontSize: '6.5pt', fontWeight: 600, color: '#4a6480' },
  input:       { width: '100%', border: '1px solid #c3d4f0', borderRadius: '4px', padding: '4px 6px', fontSize: '8pt', color: '#1a1a2e', fontFamily: 'inherit', background: '#ffffff', boxSizing: 'border-box' },
  inputRO:     { width: '100%', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px 6px', fontSize: '8pt', color: '#64748b', fontFamily: 'inherit', background: '#f1f5f9', boxSizing: 'border-box' },
  footer:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' },
  btn:         { padding: '8px 0', fontSize: '8pt', fontWeight: 700, borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  btnSec:      { background: '#ffffff', border: '2px solid #1E3A8A', color: '#1E3A8A' },
  btnPri:      { background: '#1E3A8A', border: '2px solid #1E3A8A', color: '#ffffff' },
}
