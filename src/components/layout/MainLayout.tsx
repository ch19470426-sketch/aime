import Image from "next/image"

interface MainLayoutProps {
  children: React.ReactNode
  titulo?: string
}

export default function MainLayout({ children, titulo }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="AIMÊ"
            width={120}
            height={48}
            priority
          />
          {titulo && (
            <p
              className="max-w-[240px] text-right text-lg font-medium leading-snug tracking-wide"
              style={{ color: "#1E3A8A" }}
            >
              {titulo}
            </p>
          )}
        </div>
        <div className="mt-4" style={{ borderBottom: "2px solid #1E3A8A" }} />
      </header>

      <main className="flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  )
}
