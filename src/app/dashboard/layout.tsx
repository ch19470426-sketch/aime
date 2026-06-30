// src/app/dashboard/layout.tsx
// Força dynamic rendering para evitar pre-render estático
// (necessário porque o dashboard usa createClient do Supabase)
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
