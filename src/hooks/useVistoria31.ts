// src/hooks/useVistoria31.ts
// AIMÊ — Hook da Tela 31 conforme especificação 2.6
// Nomes de colunas ajustados conforme estrutura real do banco:
//   cpf_inspetor, cnpjoucpf, tag_ativo_nr_serie, razao_social_nome

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { GerarNcCpRequest, GerarNcCpResponse } from '@/app/api/gerar-nc-cp/route'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Prioridade = 'Alta' | 'Média' | 'Baixa'

export interface FormVistoria {
  // Bloco Identificação — preservados ao limpar após salvar
  cnpjoucpf:           string
  razaoSocialNome:     string
  tipoAtivo:           string
  tagAtivoNrSerie:     string   // coluna: tag_ativo_nr_serie

  // Bloco Manifestação Patológica
  sistema:             string
  subsistema:          string
  anomalia:            string
  origem:              string
  local:               string
  complemento:         string   // único campo não obrigatório

  // Bloco Classificação de Risco
  gravidade:           number
  urgencia:            number
  abrangencia:         number
  exposicao:           number

  // Calculados automaticamente
  grauRisco:           number
  prioridade:          Prioridade
  definicaoPrioridade: string

  // Evidência fotográfica
  fotoNr:              string
  dataVistoria:        string
  fotoBase64:          string

  // Resultado da Análise
  nc:                  string
  cp:                  string
  ncGeradaPorIa:       boolean
  cpGeradaPorIa:       boolean
}

export type FeedbackIa =
  | null
  | 'avaliando_ambiente'
  | 'analisando_anomalia'
  | 'cruzando_parametros'
  | 'gerando_nc'
  | 'gerando_cp'
  | 'concluido'
  | 'erro'

export interface EstadoVistoria {
  salvando:             boolean
  feedbackIa:           FeedbackIa
  erroIa:               string | null
  erroSave:             string | null
  sucesso:              boolean
  ultimoArquivoSalvo:   string | null
  ultimoRegistroSalvo:  boolean
}

// ─── Funções de cálculo ───────────────────────────────────────────────────────

// GR = ROUND((0,4×Gra + 0,3×Urg + 0,2×Abr + 0,1×Exp) × 20)  →  0–100
export function calcularGR(gra: number, urg: number, abr: number, exp: number): number {
  return Math.round((0.4 * gra + 0.3 * urg + 0.2 * abr + 0.1 * exp) * 20)
}

// Prioridade: Alta ≥64 | Média 35–63 | Baixa ≤34
export function calcularPrioridade(gr: number): { prioridade: Prioridade; definicao: string } {
  if (gr >= 64) return {
    prioridade: 'Alta',
    definicao:  '1 – Requer ação imediata e recuperação a curto prazo (até 6 meses)',
  }
  if (gr >= 35) return {
    prioridade: 'Média',
    definicao:  '2 – Requer ação a médio prazo (até 12 meses)',
  }
  return {
    prioridade: 'Baixa',
    definicao:  '3 – Ação deve ser planejada e implementada em até 24 meses',
  }
}

// ─── Estado inicial dos campos resetáveis ────────────────────────────────────

function grInicial() {
  const gr = calcularGR(1, 1, 1, 1)
  const { prioridade, definicao } = calcularPrioridade(gr)
  return { gr, prioridade, definicao }
}

const { gr: GR_INICIAL, prioridade: PRIO_INICIAL, definicao: DEF_INICIAL } = grInicial()

// Campos zerados após salvar (cnpjoucpf e razaoSocialNome são preservados)
const CAMPOS_RESETAVEIS: Omit<FormVistoria, 'cnpjoucpf' | 'razaoSocialNome'> = {
  tipoAtivo:           '',
  tagAtivoNrSerie:     '',
  sistema:             '',
  subsistema:          '',
  anomalia:            '',
  origem:              '',
  local:               '',
  complemento:         '',
  gravidade:           1,
  urgencia:            1,
  abrangencia:         1,
  exposicao:           1,
  grauRisco:           GR_INICIAL,
  prioridade:          PRIO_INICIAL,
  definicaoPrioridade: DEF_INICIAL,
  fotoNr:              '',
  dataVistoria:        new Date().toLocaleDateString('pt-BR'),
  fotoBase64:          '',
  nc:                  '',
  cp:                  '',
  ncGeradaPorIa:       false,
  cpGeradaPorIa:       false,
}

const ESTADO_INICIAL: EstadoVistoria = {
  salvando:            false,
  feedbackIa:          null,
  erroIa:              null,
  erroSave:            null,
  sucesso:             false,
  ultimoArquivoSalvo:  null,
  ultimoRegistroSalvo: true,
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useVistoria31(
  cpfInspetor:   string,   // coluna: cpf_inspetor
  chaveInspetor: string,   // prefixo do nome do arquivo salvo
  cnpjoucpf:     string,   // coluna: cnpjoucpf (estabelecimento)
  tipoServico:   string    // coluna: tipo_servico (VARCHAR no banco)
) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  if (!supabaseRef.current && typeof window !== 'undefined') {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current!

  const [form, setForm] = useState<FormVistoria>({
    cnpjoucpf:         '',
    razaoSocialNome:   '',
    ...CAMPOS_RESETAVEIS,
  })

  const [estado, setEstado] = useState<EstadoVistoria>(ESTADO_INICIAL)

  // ── Atualizar campo com recálculo automático de GR ────────────────────────

  const atualizar = useCallback(<K extends keyof FormVistoria>(
    campo: K,
    valor: FormVistoria[K]
  ) => {
    setForm((prev) => {
      const novo = { ...prev, [campo]: valor }
      if (['gravidade', 'urgencia', 'abrangencia', 'exposicao'].includes(campo as string)) {
        const gr = calcularGR(
          campo === 'gravidade'   ? Number(valor) : prev.gravidade,
          campo === 'urgencia'    ? Number(valor) : prev.urgencia,
          campo === 'abrangencia' ? Number(valor) : prev.abrangencia,
          campo === 'exposicao'   ? Number(valor) : prev.exposicao,
        )
        const { prioridade, definicao } = calcularPrioridade(gr)
        novo.grauRisco           = gr
        novo.prioridade          = prioridade
        novo.definicaoPrioridade = definicao
      }
      return novo
    })
  }, [])

  // ── Inicializar identificação com dados do Estabelecimento ────────────────

  const inicializarIdentificacao = useCallback((
    cnpjoucpf:       string,
    razaoSocialNome: string
  ) => {
    setForm((prev) => ({ ...prev, cnpjoucpf, razaoSocialNome }))
  }, [])

  // ── Botão "Tirar Foto" ────────────────────────────────────────────────────

  const tirarFotoEGerarNcCp = useCallback(async () => {

    // Campos obrigatórios — TAG obrigatório para tipos 35, 37 e 38
    const camposObrigatorios: (keyof FormVistoria)[] = [
      'tipoAtivo', 'sistema', 'subsistema', 'anomalia',
      'origem', 'local', 'gravidade', 'urgencia', 'abrangencia', 'exposicao',
    ]
    if (['35', '37', '38'].includes(tipoServico)) {
      camposObrigatorios.push('tagAtivoNrSerie')
    }

    const campoVazio = camposObrigatorios.find((c) => !form[c])
    if (campoVazio) {
      alert(`Campo obrigatório não preenchido: "${campoVazio}"`)
      return
    }

    setEstado((s) => ({
      ...s,
      feedbackIa:          'avaliando_ambiente',
      erroIa:              null,
      ultimoRegistroSalvo: false,
    }))

    try {
      // 1. Obtém e incrementa número de foto
      //    Chave: cpf_inspetor + cnpjoucpf + tipo_servico
      const resNr = await fetch('/api/foto-nr', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          cpf_inspetor: cpfInspetor,
          cnpjoucpf,
          tipo_servico: tipoServico,
        }),
      })
      const { formatado } = await resNr.json()

      // 2. Abre câmera do dispositivo
      const fotoBase64 = await new Promise<string>((resolve, reject) => {
        const input   = document.createElement('input')
        input.type    = 'file'
        input.accept  = 'image/*'
        input.capture = 'environment'
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (!file) { reject(new Error('Nenhuma foto selecionada')); return }
          const reader   = new FileReader()
          reader.onload  = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Erro ao ler a foto'))
          reader.readAsDataURL(file)
        }
        input.click()
      })

      setForm((prev) => ({
        ...prev,
        fotoNr:       formatado,
        dataVistoria: new Date().toLocaleDateString('pt-BR'),
        fotoBase64,
      }))

      // 3. Feedback progressivo e geração NC/CP
      setEstado((s) => ({ ...s, feedbackIa: 'analisando_anomalia' }))
      await aguardar(400)
      setEstado((s) => ({ ...s, feedbackIa: 'cruzando_parametros' }))
      await aguardar(400)
      setEstado((s) => ({ ...s, feedbackIa: 'gerando_nc' }))

      const payload: GerarNcCpRequest = {
        sistema:     form.sistema,
        subsistema:  form.subsistema,
        anomalia:    form.anomalia,
        local:       form.local,
        complemento: form.complemento || undefined,
        origem:      form.origem,
        abrangencia: String(form.abrangencia),
      }

      const resIA  = await fetch('/api/gerar-nc-cp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const dataIA: GerarNcCpResponse = await resIA.json()

      if (!resIA.ok || dataIA.erro) throw new Error(dataIA.erro ?? 'Erro na IA')

      setEstado((s) => ({ ...s, feedbackIa: 'gerando_cp' }))
      await aguardar(200)

      setForm((prev) => ({
        ...prev,
        fotoNr:        formatado,
        nc:            dataIA.nc,
        cp:            dataIA.cp,
        ncGeradaPorIa: true,
        cpGeradaPorIa: true,
      }))

      setEstado((s) => ({ ...s, feedbackIa: 'concluido', erroIa: null }))

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setEstado((s) => ({ ...s, feedbackIa: 'erro', erroIa: msg }))
    }
  }, [form, cpfInspetor, cnpjoucpf, tipoServico])

  // ── Botão "Salvar Dados" ──────────────────────────────────────────────────

  const salvarDados = useCallback(async () => {
    if (!form.fotoNr) {
      alert('Tire a foto antes de salvar.')
      return
    }

    setEstado((s) => ({ ...s, salvando: true, erroSave: null }))

    try {
      const nomeArquivo = `${chaveInspetor}${form.fotoNr}.json`

      const payload = {
        chaveInspetor,
        cpfInspetor,
        cnpjoucpf,
        tipoServico,
        savedAt: new Date().toISOString(),
        ...form,
      }

      const blob = new Blob(
        [JSON.stringify(payload, null, 2)],
        { type: 'application/json' }
      )

      const { error } = await supabase.storage
        .from('aime')
        .upload(`vistorias/${nomeArquivo}`, blob, {
          contentType: 'application/json',
          upsert:      true,
        })

      if (error) throw new Error(`Erro ao salvar no Storage: ${error.message}`)

      // Limpa o formulário preservando apenas cnpjoucpf e razaoSocialNome
      const { cnpjoucpf: cnpj, razaoSocialNome } = form
      setForm({
        cnpjoucpf:       cnpj,
        razaoSocialNome,
        ...CAMPOS_RESETAVEIS,
        dataVistoria: new Date().toLocaleDateString('pt-BR'),
      })

      setEstado((s) => ({
        ...s,
        salvando:            false,
        sucesso:             true,
        ultimoArquivoSalvo:  nomeArquivo,
        ultimoRegistroSalvo: true,
        feedbackIa:          null,
      }))

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setEstado((s) => ({ ...s, salvando: false, erroSave: msg }))
    }
  }, [form, chaveInspetor, cpfInspetor, cnpjoucpf, tipoServico, supabase])

  // ── Botão "Encerrar Vistoria" ─────────────────────────────────────────────

  const encerrarVistoria = useCallback((onEncerrar: () => void) => {
    if (!estado.ultimoRegistroSalvo) {
      alert('O processo não pode ser encerrado enquanto o último registro não for salvo.')
      return
    }
    onEncerrar()
  }, [estado.ultimoRegistroSalvo])

  const resetarSucesso = useCallback(() => {
    setEstado((s) => ({ ...s, sucesso: false, ultimoArquivoSalvo: null }))
  }, [])

  return {
    form,
    estado,
    atualizar,
    inicializarIdentificacao,
    tirarFotoEGerarNcCp,
    salvarDados,
    encerrarVistoria,
    resetarSucesso,
    podeEncerrar: estado.ultimoRegistroSalvo,
  }
}

// ─── Utilitário ───────────────────────────────────────────────────────────────

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
