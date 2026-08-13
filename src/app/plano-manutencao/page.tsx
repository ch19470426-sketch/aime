'use client'
import { Suspense } from 'react'
import PlanoManutencaoInner from './inner'

export default function PlanoManutencaoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#4a6480' }}>Carregando...</div>}>
      <PlanoManutencaoInner />
    </Suspense>
  )
}
