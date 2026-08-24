'use client'
import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LogoutPage() {
  useEffect(() => {
    createClient().auth.signOut().then(() => {
      // Limpar localStorage completamente
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
        keys.forEach(k => localStorage.removeItem(k))
      } catch {}
      window.location.replace('/')
    })
  }, [])

  return (
    <div style={{ backgroundColor:'#1E3A8A', minHeight:'100vh', display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'white', fontSize:'14px' }}>Encerrando sessão...</p>
    </div>
  )
}
