'use client'
// AIMÊ — Guarda a origem da visita (gclid, utm_*…) na 1ª carga de qualquer rota. Não desenha nada.
import { useEffect } from 'react'
import { guardarOrigemDaUrl } from '@/lib/origemVisita'

export default function OrigemVisita() {
  useEffect(() => { guardarOrigemDaUrl() }, [])
  return null
}
