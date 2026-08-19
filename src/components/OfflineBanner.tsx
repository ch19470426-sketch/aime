'use client'
import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine)
    atualizar()
    window.addEventListener('online',  atualizar)
    window.addEventListener('offline', atualizar)
    return () => {
      window.removeEventListener('online',  atualizar)
      window.removeEventListener('offline', atualizar)
    }
  }, [])

  useEffect(() => {
    if (!offline) {
      // Ao voltar online, disparar Background Sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        setSincronizando(true)
        navigator.serviceWorker.ready.then(reg =>
          (reg as any).sync.register('aime-sync-vistoria')
            .then(() => setTimeout(() => setSincronizando(false), 3000))
            .catch(() => setSincronizando(false))
        )
      }
    }
  }, [offline])

  if (!offline && !sincronizando) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: offline ? '#92400e' : '#065f46',
      color: '#fff', textAlign: 'center',
      padding: '6px 16px', fontSize: '12px', fontWeight: 700,
      fontFamily: 'Arial, sans-serif',
    }}>
      {offline
        ? '⚠  Sem conexão — os registros serão salvos localmente e sincronizados ao retornar'
        : '✓  Conexão restaurada — sincronizando registros pendentes...'}
    </div>
  )
}
