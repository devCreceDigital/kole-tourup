'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/backoffice', label: 'Dashboard', icon: '📊' },
  { href: '/backoffice/viajes', label: 'Viajes', icon: '✈️' },
  { href: '/backoffice/inscripciones', label: 'Inscripciones', icon: '📋' },
  { href: '/backoffice/pagos', label: 'Pagos', icon: '💰' },
  { href: '/backoffice/documentos', label: 'Documentos', icon: '📄' },
  { href: '/backoffice/comunicados', label: 'Comunicados', icon: '📢' },
  { href: '/backoffice/chat', label: 'Chat', icon: '💬' },
  { href: '/backoffice/notificaciones', label: 'Notificaciones', icon: '🔔' },
]

export function NavBackoffice() {
  const pathname = usePathname()
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)

  function handleLogout() {
    document.cookie = 'access_token=; path=/; max-age=0'
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="md:hidden fixed top-4 left-4 z-30 bg-blue-900 text-white p-2 rounded-lg shadow-lg"
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {abierto && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setAbierto(false)}
        />
      )}

      <aside className={`w-64 min-h-screen bg-blue-900 text-white flex flex-col fixed md:static top-0 left-0 z-50 transition-transform duration-200 ${abierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-6 py-5 border-b border-blue-800 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Tottem Hub</h1>
            <p className="text-xs text-blue-300 mt-0.5">Panel de agente</p>
          </div>
          <button onClick={() => setAbierto(false)} className="md:hidden text-blue-300 hover:text-white" aria-label="Cerrar menu">✕</button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const activo = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} onClick={() => setAbierto(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activo ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="px-6 py-4 border-t border-blue-800">
          <button onClick={handleLogout} className="text-xs text-blue-300 hover:text-white">Cerrar sesion</button>
        </div>
      </aside>
    </>
  )
}
