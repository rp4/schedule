import { Header } from '@/components/layout/Header'
import { MetricsBar } from '@/components/layout/MetricsBar'
import { Navigation } from '@/components/layout/Navigation'

export default function ScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: 'url(/Field.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Header />
      <MetricsBar />
      <Navigation />
      <main className="container mx-auto px-6 py-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-green-200">
          {children}
        </div>
      </main>
    </div>
  )
}