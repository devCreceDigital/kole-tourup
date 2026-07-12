interface Step2Props {
  data: Record<string, string>
  onChange: (field: string, value: string) => void
  grupos?: Array<{ id: string; nombre: string; descripcion?: string; capacidad?: number; alumnos_count?: number }>
}

// "Provincia" es el renombre visual de "departamento" — la clave de estado sigue siendo 'departamento'
const PROVINCIAS = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza',
  'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao',
  'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón',
  'Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura',
  'Chiclayo', 'Iquitos', 'Huancayo', 'Otro'
]

const NIVELES = [
  { value: 'primaria',     label: 'Primaria' },
  { value: 'secundaria',  label: 'Secundaria' },
  { value: 'bachillerato', label: 'Bachillerato' },
]

export function Step2({ data, onChange, grupos = [] }: Step2Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Paso 2 de 3: Centro y curso</h2>
        <p className="text-sm text-gray-500 mt-1">¿Dónde estudia tu hijo/a?</p>
      </div>

      {/* Provincia */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Provincia <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={data.departamento ?? ''}
            onChange={e => onChange('departamento', e.target.value)}
            className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0077B6] focus:border-[#0077B6] transition-colors"
          >
            <option value="">Provincia</option>
            {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Colegio / Centro educativo */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Colegio / Centro educativo <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={data.colegio ?? ''}
            onChange={e => onChange('colegio', e.target.value)}
            placeholder="Escribe para buscar..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0077B6] focus:border-[#0077B6] transition-colors"
          />
        </div>
      </div>

      {/* Nivel educativo — radio buttons horizontales */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Nivel educativo <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-4 flex-wrap">
          {NIVELES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => onChange('nivel', value)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  data.nivel === value
                    ? 'border-[#0077B6]'
                    : 'border-gray-300'
                }`}
              >
                {data.nivel === value && (
                  <div className="w-2 h-2 rounded-full bg-[#0077B6]" />
                )}
              </div>
              <span
                onClick={() => onChange('nivel', value)}
                className={`text-sm cursor-pointer select-none ${
                  data.nivel === value ? 'text-gray-900 font-medium' : 'text-gray-600'
                }`}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Curso / Clase */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Curso / Clase <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.grado ?? ''}
          onChange={e => onChange('grado', e.target.value)}
          placeholder="4º ESO B"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0077B6] focus:border-[#0077B6] transition-colors"
        />
      </div>

      {/* Grupo (opcional) */}
      {grupos && grupos.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Grupo <span className="text-gray-400 text-xs font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <select
              value={data.grupo_id ?? ''}
              onChange={e => onChange('grupo_id', e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0077B6] focus:border-[#0077B6] transition-colors"
            >
              <option value="">Sin grupo asignado</option>
              {grupos.map(g => {
                const disponibles = (g.capacidad ?? 99) - (g.alumnos_count ?? 0)
                return (
                  <option key={g.id} value={g.id} disabled={disponibles <= 0}>
                    {g.nombre}{disponibles > 0 ? ` (${disponibles} plazas)` : ' (completo)'}
                  </option>
                )
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Selecciona el grupo al que pertenece el alumno</p>
        </div>
      )}
    </div>
  )
}