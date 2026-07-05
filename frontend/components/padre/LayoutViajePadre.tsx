'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  label: string
  href: string
  icon: string
}

interface LayoutViajePadreProps {
  inscripcionId: string
  nombreViaje: string
  destino: string
  estadoBadge: 'confirmado' | 'pre_inscrito' | 'pendiente' | 'espera'
  nombreAlumno: string
  imagenUrl?: string
  children: React.ReactNode
}

const ESTADO_CONFIG = {
  confirmado:   { label: 'Plaza confirmada', color: 'bg-green-500' },
  pre_inscrito: { label: 'Pre-inscrito',     color: 'bg-amber-500' },
  pendiente:    { label: 'Pendiente',         color: 'bg-gray-400' },
  espera:       { label: 'Lista de espera',   color: 'bg-orange-400' },
}

export function LayoutViajePadre({
  inscripcionId,
  nombreViaje,
  destino,
  estadoBadge,
  nombreAlumno,
  imagenUrl,
  children,
}: LayoutViajePadreProps) {
  const pathname = usePathname()
  const base = `/app/inscripciones/${inscripcionId}`

  const tabs: Tab[] = [
    { label: 'Itinerario', href: base,                  icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
    { label: 'Pagos',      href: `${base}/pagos`,       icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { label: 'Docs',       href: `${base}/documentos`,  icon: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z' },
    { label: 'Vuelos',     href: `${base}/vuelos`,      icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
    { label: 'Hotel',      href: `${base}/hoteles`,     icon: 'M3 12V7a1 1 0 011-1h16a1 1 0 011 1v5M3 12h18M3 12v4a1 1 0 001 1h16a1 1 0 001-1v-4M7 8v4' },
    { label: 'Info',       href: `${base}/info`,        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]

  const estado = ESTADO_CONFIG[estadoBadge] ?? ESTADO_CONFIG.pendiente

  return (
    <div>
      {/* Header con imagen del destino */}
      <div className="relative h-40 md:h-52 overflow-hidden">
        {imagenUrl ? (
          <img src={imagenUrl} alt={destino} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70" />
        )}
        <div className="absolute inset-0 bg-black/40" />

        {/* Breadcrumb */}
        <div className="absolute top-3 left-4 text-xs text-white/70 flex items-center gap-1.5">
          <Link href="/app" className="hover:text-white transition-colors">Principal</Link>
          <span>/</span>
          <span className="text-white/90">Viaje</span>
          <span>/</span>
          <span className="text-white font-medium">{tabs.find(t => t.href === pathname)?.label ?? 'Detalle'}</span>
        </div>

        {/* Título y badge */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white font-bold text-lg md:text-2xl leading-tight drop-shadow">{nombreViaje}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`${estado.color} text-white text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 inline-block" />
              {estado.label}
            </span>
            <span className="text-white/90 text-sm">{nombreAlumno}</span>
          </div>
        </div>
      </div>

      {/* Contenido de la tab activa */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        {children}
      </div>

      {/* Tab bar - fija abajo, estilo bottom nav movil */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 overflow-x-auto">
        <div className="max-w-5xl mx-auto px-2 flex justify-between md:justify-center md:gap-2">
          {tabs.map(tab => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 px-2 md:px-3 py-2.5 text-[10px] md:text-xs font-semibold whitespace-nowrap border-t-2 md:border-t-0 md:border-b-2 transition-colors flex-1 md:flex-none justify-center ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <svg className="w-4 h-4 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
