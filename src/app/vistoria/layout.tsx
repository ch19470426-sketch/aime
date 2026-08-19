import OfflineBanner from '@/components/OfflineBanner'

export default function VistoriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  )
}
