interface Step3Props {
  data: Record<string, string | boolean>
  onChange: (field: string, value: string | boolean) => void
}

// 6 alergias principales del mockup — mapeadas a los campos que espera el backend
const ALERGIAS_UI = [
  { label: 'Ninguna',      field: null },                       // manejo especial
  { label: 'Gluten',       field: 'alergeno_gluten' },
  { label: 'Lactosa',      field: 'alergeno_lacteos' },
  { label: 'Frutos secos', field: 'alergeno_frutos de cascara' },
  { label: 'Pescado',      field: 'alergeno_pescado' },
  { label: 'Marisco',      field: 'alergeno_crustaceos' },
]

export function Step3({ data, onChange }: Step3Props) {
  const ningunaMarcada = ALERGIAS_UI
    .filter(a => a.field !== null)
    .every(a => !data[a.field!])

  function handleNinguna(checked: boolean) {
    if (checked) {
      // Desmarcar todas las alergias
      ALERGIAS_UI.filter(a => a.field !== null).forEach(a => onChange(a.field!, false))
    }
  }

  function handleAlergia(field: string, checked: boolean) {
    onChange(field, checked)
  }

  return (
    <div className="space-y-6">

      {/* ── Información de Salud ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Paso 3 de 3: Salud y privacidad</h2>
      </div>

      <fieldset>
        <legend className="text-sm font-bold text-gray-800 mb-1">Información de Salud</legend>
        <p className="text-xs text-gray-500 mb-3">Alergias o intolerancias</p>
        <div className="grid grid-cols-3 gap-y-3 gap-x-4">
          {ALERGIAS_UI.map(({ label, field }) => {
            const isNinguna = field === null
            const checked = isNinguna ? ningunaMarcada : !!data[field!]
            return (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => {
                    if (isNinguna) {
                      handleNinguna(e.target.checked)
                    } else {
                      handleAlergia(field!, e.target.checked)
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-[#0077B6] focus:ring-[#0077B6] cursor-pointer"
                />
                <span className="text-sm text-gray-700 select-none">{label}</span>
              </label>
            )
          })}
        </div>

        {/* Otras alergias */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Otras alergias
          </label>
          <textarea
            value={data.necesidades_especiales as string ?? ''}
            onChange={e => onChange('necesidades_especiales', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0077B6] focus:border-[#0077B6] resize-none transition-colors"
          />
        </div>
      </fieldset>

      {/* ── Contacto Directo ── */}
      <fieldset>
        <legend className="text-sm font-bold text-gray-800 mb-1">Contacto Directo</legend>
        <div className="mt-2">
          <input
            type="tel"
            value={data.telefono_emergencia as string ?? ''}
            onChange={e => onChange('telefono_emergencia', e.target.value)}
            placeholder="Teléfono del estudiante (opcional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0077B6] focus:border-[#0077B6] transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Para comunicaciones urgentes durante el viaje
          </p>
        </div>
      </fieldset>

      {/* ── Privacidad y Términos ── */}
      <fieldset className="border-t border-gray-100 pt-5 space-y-3">
        <legend className="text-sm font-bold text-gray-800 mb-3">Privacidad y Términos</legend>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.acepta_tyc}
            onChange={e => onChange('acepta_tyc', e.target.checked)}
            required
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0077B6] focus:ring-[#0077B6] cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-gray-700">
            Acepto los{' '}
            <a href="/terminos" target="_blank" className="text-[#0077B6] underline underline-offset-1">
              Términos y Condiciones
            </a>{' '}
            <span className="text-red-500">*</span>
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.acepta_seguro}
            onChange={e => onChange('acepta_seguro', e.target.checked)}
            required
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0077B6] focus:ring-[#0077B6] cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-gray-700">
            Consiento el tratamiento de datos para el seguro de viaje{' '}
            <span className="text-red-500">*</span>
          </span>
        </label>
      </fieldset>

    </div>
  )
}