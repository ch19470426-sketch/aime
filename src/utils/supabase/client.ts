import { createBrowserClient } from "@supabase/ssr"

// Singleton para evitar "Multiple GoTrueClient instances" no mesmo contexto
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (clientInstance) return clientInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  clientInstance = createBrowserClient(url, key)
  return clientInstance
}
