interface Step3Props {
  data: Record<string, string | boolean>
  onChange: (field: string, value: string | boolean) => void
}

const ALERGENOS = [
  'Gluten', 'Crustaceos', 'Huevos', 'Pescado', 'Cacahuetes',
  'Soja', 'Lacteos', 'Frutos de cascara', 'Apio', 'Mostaza',
  'Sesamo', 'Sulfitos', 'Altramuces', 'Moluscos'
]

export function Step3({ data, onChange }: Step3Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Salud y condiciones</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Alergenos (marca los que apliquen)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ALERGENOS.map(alergeno => (
            <label key={alergeno} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!data[`alergeno_${alergeno.toLowerCase()}`]}
                onChange={e => onChange(`alergeno_${alergeno.toLowerCase()}`, e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">{alergeno}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Necesidades especiales (opcional)</label>
        <textarea
          value={data.necesidades_especiales as string ?? ''}
          onChange={e => onChange('necesidades_especiales', e.target.value)}
          rows={3}
          placeholder="Alergias, condiciones medicas, medicacion..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefono de emergencia (opcional)</label>
        <input
          type="tel"
          value={data.telefono_emergencia as string ?? ''}
          onChange={e => onChange('telefono_emergencia', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="border-t pt-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.acepta_tyc}
            onChange={e => onChange('acepta_tyc', e.target.checked)}
            className="mt-1 rounded border-gray-300 text-blue-600"
            required
          />
          <span className="text-sm text-gray-700">
            He leido y acepto los <a href="/terminos" className="text-blue-600 underline" target="_blank">Terminos y Condiciones</a> y la <a href="/privacidad" className="text-blue-600 underline" target="_blank">Politica de Privacidad</a>. *
          </span>
        </label>
      </div>
    </div>
  )
}