interface Alumno {
  id: string
  nombre: string
  apellidos: string
  dni: string
  fecha_nacimiento: string | null
  genero: string
  colegio: string
  departamento: string
  nivel_educativo: string
  grado: string
  telefono_emergencia: string
  necesidades_especiales: string
  nombre_tutor_legal: string
  alergeno_gluten: boolean
  alergeno_crustaceos: boolean
  alergeno_huevos: boolean
  alergeno_pescado: boolean
  alergeno_cacahuetes: boolean
  alergeno_soja: boolean
  alergeno_lacteos: boolean
  alergeno_frutos_cascara: boolean
  alergeno_apio: boolean
  alergeno_mostaza: boolean
  alergeno_sesamo: boolean
  alergeno_sulfitos: boolean
  alergeno_altramuces: boolean
  alergeno_moluscos: boolean
}

interface Step0Props {
  alumnos: Alumno[]
  onSelectAlumno: (alumno: Alumno) => void
  onNuevo: () => void
}

export function Step0({ alumnos, onSelectAlumno, onNuevo }: Step0Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">¿Para quién es este viaje?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona un alumno ya registrado o agrega uno nuevo.
        </p>
      </div>

      <div className="space-y-3">
        {alumnos.map(alumno => {
          const iniciales = `${alumno.nombre.charAt(0)}${alumno.apellidos.charAt(0)}`.toUpperCase()
          const tieneAlergias = Object.entries(alumno)
            .filter(([k]) => k.startsWith('alergeno_'))
            .some(([, v]) => v === true)

          return (
            <button
              key={alumno.id}
              onClick={() => onSelectAlumno(alumno)}
              className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#0077B6] hover:shadow-sm transition-all text-left group"
            >
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:bg-[#0077B6] group-hover:text-white transition-colors">
                {iniciales}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {alumno.nombre} {alumno.apellidos}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-2">
                  {alumno.colegio && <span>{alumno.colegio}</span>}
                  {alumno.grado && alumno.nivel_educativo && (
                    <span>{alumno.grado} · {alumno.nivel_educativo}</span>
                  )}
                  {!tieneAlergias && (
                    <span className="text-amber-500 flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Alergias sin completar
                    </span>
                  )}
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-300 group-hover:text-[#0077B6] flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )
        })}

        {/* Nuevo alumno */}
        <button
          onClick={onNuevo}
          className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#0077B6] hover:bg-blue-50/40 transition-all text-left group"
        >
          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0077B6]/10 transition-colors">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#0077B6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-700 text-sm group-hover:text-[#0077B6] transition-colors">
              Nuevo alumno
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Registrar un alumno desde cero</p>
          </div>
        </button>
      </div>
    </div>
  )
}
