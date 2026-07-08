// src/hooks/useBanner.ts
// Hook para acionar o Banner de qualquer componente

import { useState, useCallback } from 'react'
import type { BannerTipo, BannerBotao, BannerCampo } from '@/components/Banner'

interface BannerState {
  visivel: boolean
  tipo: BannerTipo
  titulo: string
  mensagem: string
  botoes: BannerBotao[]
  campos: BannerCampo[]
  valoresCampos: Record<string, string>
}

const ESTADO_INICIAL: BannerState = {
  visivel: false,
  tipo: 'informa',
  titulo: '',
  mensagem: '',
  botoes: [],
  campos: [],
  valoresCampos: {},
}

export function useBanner() {
  const [banner, setBanner] = useState<BannerState>(ESTADO_INICIAL)

  const fechar = useCallback(() => {
    setBanner(ESTADO_INICIAL)
  }, [])

  // Informa — mensagem neutra informativa
  const informa = useCallback((titulo: string, mensagem: string, onOk?: () => void) => {
    setBanner({
      visivel: true,
      tipo: 'informa',
      titulo,
      mensagem,
      botoes: [{ label: 'OK', acao: () => { fechar(); onOk?.() }, estilo: 'primario' }],
      campos: [],
      valoresCampos: {},
    })
  }, [fechar])

  // Orienta — instrução ou orientação ao inspetor
  const orienta = useCallback((titulo: string, mensagem: string, onOk?: () => void) => {
    setBanner({
      visivel: true,
      tipo: 'orienta',
      titulo,
      mensagem,
      botoes: [{ label: 'Entendido', acao: () => { fechar(); onOk?.() }, estilo: 'primario' }],
      campos: [],
      valoresCampos: {},
    })
  }, [fechar])

  // Agradece — sucesso ou confirmação positiva
  const agradece = useCallback((titulo: string, mensagem: string, onOk?: () => void) => {
    setBanner({
      visivel: true,
      tipo: 'agradece',
      titulo,
      mensagem,
      botoes: [{ label: 'Continuar', acao: () => { fechar(); onOk?.() }, estilo: 'primario' }],
      campos: [],
      valoresCampos: {},
    })
  }, [fechar])

  // Solicita — confirmação, alerta ou coleta de dados
  const solicita = useCallback((
    titulo: string,
    mensagem: string,
    botoes: BannerBotao[],
    campos?: BannerCampo[]
  ) => {
    setBanner({
      visivel: true,
      tipo: 'solicita',
      titulo,
      mensagem,
      botoes,
      campos: campos ?? [],
      valoresCampos: {},
    })
  }, [])

  const onChangeCampo = useCallback((id: string, valor: string) => {
    setBanner(prev => ({
      ...prev,
      valoresCampos: { ...prev.valoresCampos, [id]: valor },
    }))
  }, [])

  return {
    bannerProps: {
      visivel: banner.visivel,
      tipo: banner.tipo,
      titulo: banner.titulo,
      mensagem: banner.mensagem,
      botoes: banner.botoes,
      campos: banner.campos,
      valoresCampos: banner.valoresCampos,
      onChangeCampo,
    },
    informa,
    orienta,
    agradece,
    solicita,
    fechar,
  }
}
