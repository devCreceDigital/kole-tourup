'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'

export function PadreNavbar() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null)

  useEffect(() => {
    fetchApi('/api/v1/auth/me/')
      .then(data => setNombreUsuario(data?.nombre ?? null))
      .catch(() => {})
  }, [])

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
      <div className="max-w-5xl mx-auto px-2 sm:px-4 min-h-11 py-1.5 sm:py-0 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-xs sm:text-sm tracking-tight truncate">Tottem Hub</span>
        </div>

        {/* Nav items */}
        <nav className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0">
          <Link
            href="/app/cuenta"
            className="px-1 sm:px-2 py-1 hover:text-gray-800 flex items-center gap-0.5 sm:gap-1 rounded hover:bg-gray-50 transition-colors max-w-[90px] sm:max-w-none"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
            <span className="hidden sm:inline truncate">{nombreUsuario || 'Mi cuenta'}</span>
          </Link>
          <span className="text-gray-200 select-none">|</span>
          <Link
            href="/app"
            className="px-1 sm:px-2 py-1 hover:text-gray-800 flex items-center gap-0.5 sm:gap-1 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">← Mis viajes</span>
            <span className="sm:hidden">←</span>
          </Link>
          <span className="text-gray-200 select-none">|</span>
          <button
            onClick={handleLogout}
            className="px-1 sm:px-2 py-1 hover:text-red-600 flex items-center gap-0.5 sm:gap-1 rounded hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
