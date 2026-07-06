import Link from 'next/link'

interface Hijo {
  id: string
  nombreCompleto: string
  colegio: string
  gradoNivel: string
  alergias: string[]
  fechaNacimiento?: string
}

interface HijosRegistradosProps {
  hijos: Hijo[]
}

function formatFechaNacimiento(fecha?: string) {
  if (!fecha) return null
  const d = new Date(fecha)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function HijosRegistrados({ hijos }: HijosRegistradosProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Hijos Registrados
        </h2>
        <Link
          href="/app/hijos/nuevo"
          className="text-xs font-semibold text-[#0077B6] hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <span className="text-base leading-none">+</span> Nuevo
        </Link>
      </div>

      {/* Lista */}
      {hijos.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">No tienes hijos registrados aún.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {hijos.map((hijo, index) => {
            const sinAlergias = !hijo.alergias || hijo.alergias.length === 0
            const fechaFormateada = formatFechaNacimiento(hijo.fechaNacimiento)

            return (
              <li key={hijo.id || index} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Avatar + info */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                      {hijo.nombreCompleto.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">
                        {hijo.nombreCompleto}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {hijo.colegio && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
                            </svg>
                            {hijo.colegio}
                          </span>
                        )}
                        {fechaFormateada && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {fechaFormateada}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 bg-white rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 bg-white rounded-md hover:bg-gray-50 transition-colors">
                      Dar acceso
                    </button>
                  </div>
                </div>

                {/* Alergias warning */}
                {sinAlergias && (
                  <p className="mt-2 text-[11px] font-medium text-amber-600 flex items-center gap-1 ml-12">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Alergias: Sin especificar
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
