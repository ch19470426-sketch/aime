// src/app/vistoria/tela31/page.tsx — teste com imports mas sem useVistoria31
'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

function Inner() {
  const params = useSearchParams()
  const cnpj = params.get('cnpjoucpf') ?? 'não informado'
  const [dados, setDados] = useState<string>('aguardando...')

  async function testar() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('estabelecimento')
        .select('razao_social_nome')
        .eq('cnpjoucpf', cnpj)
        .single()
      if (error) setDados('Erro: ' + error.message)
      else setDados('OK: ' + data?.razao_social_nome)
    } catch (e) {
      setDados('Exceção: ' + String(e))
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#1E3A8A' }}>Tela 31 — Teste Supabase</h1>
      <p>CNPJ: {cnpj}</p>
      <p>Resultado: {dados}</p>
      <button onClick={testar} style={{ padding: '10px 20px', background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', marginTop: '10px' }}>
        Testar Supabase
      </button>
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
