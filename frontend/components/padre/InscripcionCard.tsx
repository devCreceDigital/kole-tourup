'use client'

import { useState } from 'react'
import { SubCardPagos } from './SubCardPagos'
import { SubCardDocumentos } from './SubCardDocumentos'
import { SubCardAlojamiento } from './SubCardAlojamiento'
import Link from 'next/link'
import Image from 'next/image'

// Badge de estado de la inscripcion - fiel al mockup
const ESTADO_CONFIG: Record<string, { label: string; classes: string }> = {
  pre_inscrito:  { label: 'Lista de espera', classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  pendiente:     { label: 'Pendiente',        classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  confirmado:    { label: 'Plaza confirmada', classes: 'bg-green-50 text-green-700 border border-green-200' },
  cancelado:     { label: 'Cancelado',        classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
  baja:          { label: 'Baja',             classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

// Tabs inferiores - icono SVG consistente con el resto del proyecto
const TABS = [
  {
    label: 'Itinerario',
    path: (id: string) => `/app/inscripciones/${id}`,
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    label: 'Pagos',
    path: (id: string) => `/app/inscripciones/${id}/pagos`,
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    label: 'Docs',
    path: (id: string) => `/app/inscripciones/${id}/documentos`,
    icon: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  },
  {
    label: 'Vuelos',
    path: (id: string) => `/app/inscripciones/${id}/vuelos`,
    icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  },
  {
    label: 'Hotel',
    path: (id: string) => `/app/inscripciones/${id}/hoteles`,
    icon: 'M3 12V7a1 1 0 011-1h16a1 1 0 011 1v5M3 12h18M3 12v4a1 1 0 001 1h16a1 1 0 001-1v-4M7 8v4',
  },
  {
    label: 'Info',
    path: (id: string) => `/app/inscripciones/${id}/info`,
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]

interface InscripcionCardProps {
  inscripcion: {
    id: string
    estado: string
    precio_final: number
    porcentaje_pagado: number
    nivel_educativo?: string
    grado?: string
    viaje: {
      id: string
      nombre: string
      destino: string
      fecha_salida: string
      fecha_regreso: string
      imagen_url?: string
    }
    alumno: { nombre: string; apellidos: string }
    colegio?: string
    pagos_resumen: {
      total_cuotas: number
      cuotas_pagadas: number
      tiene_cuota_vencida: boolean
    }
    documentos_resumen: {
      total_requeridos: number
      total_validados: number
      tiene_rechazado: boolean
    }
    hotel_asignado?: { nombre: string; maps_url: string }
  }
}

function formatDateRange(salida: string, regreso: string) {
  if (!salida) return ''
  const s = new Date(salida)
  const r = regreso ? new Date(regreso) : null
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const optsDay: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (r) {
    return `${s.toLocaleDateString('es-ES', optsDay)} - ${r.toLocaleDateString('es-ES', opts)}`
  }
  return s.toLocaleDateString('es-ES', opts)
}

export function InscripcionCard({ inscripcion: ins }: InscripcionCardProps) {
  const [expandido, setExpandido] = useState(false)
  const estadoConf = ESTADO_CONFIG[ins.estado] ?? ESTADO_CONFIG.pendiente
  const progreso = Math.round(ins.porcentaje_pagado ?? 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

      <button type="button" onClick={() => setExpandido(!expandido)} className="w-full text-left">
        <div className="relative h-40 bg-gray-100">
          {ins.viaje.imagen_url ? (
            <Image
              src={ins.viaje.imagen_url}
              alt={ins.viaje.destino}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/70" />
          )}
        </div>

        <div className="px-5 pt-4 pb-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900 leading-snug">
              {ins.viaje.nombre}
            </h2>
            <svg className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform ${expandido ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
              {ins.alumno.nombre.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-800">
              {ins.alumno.nombre} {ins.alumno.apellidos}
            </span>
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${estadoConf.classes}`}>
              {estadoConf.label}
            </span>
          </div>
        </div>
      </button>

      {expandido && (
        <>
          <div className="px-5 pb-5 space-y-4">

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDateRange(ins.viaje.fecha_salida, ins.viaje.fecha_regreso)}
              </span>
              {ins.colegio && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6M5.4 9.4L12 20l6.6-10.6" />
                  </svg>
                  {ins.colegio}
                </span>
              )}
              {(ins.grado || ins.nivel_educativo) && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {[ins.grado, ins.nivel_educativo].filter(Boolean).join(' ')}
                </span>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Progreso de Inscripcion
                </span>
                <span className="text-xs font-bold text-primary">{progreso}% Completado</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-0 border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-3 py-3 hover:bg-gray-50 transition-colors">
                <SubCardPagos
                  totalCuotas={ins.pagos_resumen.total_cuotas}
                  cuotasPagadas={ins.pagos_resumen.cuotas_pagadas}
                  tieneCuotaVencida={ins.pagos_resumen.tiene_cuota_vencida}
                  href={`/app/inscripciones/${ins.id}/pagos`}
                />
              </div>
              <div className="px-3 py-3 border-l border-r border-gray-100 hover:bg-gray-50 transition-colors">
                <SubCardDocumentos
                  totalRequeridos={ins.documentos_resumen.total_requeridos}
                  totalValidados={ins.documentos_resumen.total_validados}
                  tieneRechazado={ins.documentos_resumen.tiene_rechazado}
                  href={`/app/inscripciones/${ins.id}/documentos`}
                />
              </div>
              <div className="px-3 py-3 hover:bg-gray-50 transition-colors">
                <SubCardAlojamiento
                  hotelNombre={ins.hotel_asignado?.nombre}
                  mapsUrl={ins.hotel_asignado?.maps_url}
                />
              </div>
            </div>

          </div>

          <div className="border-t border-gray-100">
            <div className="grid grid-cols-6 divide-x divide-gray-100">
              {TABS.map((tab) => (
                <Link
                  key={tab.label}
                  href={tab.path(ins.id)}
                  className="flex flex-col items-center justify-center py-3 gap-1 hover:bg-gray-50 transition-colors group"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  <span className="text-[10px] font-semibold text-gray-500 group-hover:text-primary transition-colors">
                    {tab.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  )
}
