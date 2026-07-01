// src/app/vistoria/tela31/page.tsx — versão mínima de teste
'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function Inner() {
  const params = useSearchParams()
  const cnpj = params.get('cnpjoucpf') ?? 'não informado'
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#1E3A8A' }}>Tela 31 — Teste</h1>
      <p>CNPJ: {cnpj}</p>
      <p>✅ Página carregou com sucesso!</p>
    </div>
  )
}

export default function Tela31Page() {
  return (
    <Suspense fallback={<div style={{ padding: '40px' }}>Carregando...</div>}>
      <Inner />
    </Suspense>
  )
}
