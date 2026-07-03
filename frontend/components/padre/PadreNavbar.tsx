'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'

export function PadreNavbar() {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetchApi('/api/v1/auth/logout/', { method: 'POST' })
    } catch {
      // Idempotente: si falla, de todas formas limpiamos
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-11 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs leading-none">T</span>
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">Tottem Hub</span>
        </div>

        {/* Nav items */}
        <nav className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          <button className="px-2 py-1 hover:text-gray-800 flex items-center gap-1 rounded hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h3.945M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>español ▾</span>
          </button>

          <span className="text-gray-200 select-none">|</span>

          <span className="px-2 py-1 flex items-center gap-1 text-gray-700">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
            Mi cuenta
          </span>

          <span className="text-gray-200 select-none">|</span>

          <Link
            href="/app"
            className="px-2 py-1 hover:text-gray-800 flex items-center gap-1 rounded hover:bg-gray-50 transition-colors"
          >
            ← Mis viajes
          </Link>

          <span className="text-gray-200 select-none">|</span>

          <button
            onClick={handleLogout}
            className="px-2 py-1 hover:text-red-600 flex items-center gap-1 rounded hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Salir
          </button>
        </nav>
      </div>
    </header>
  )
}
