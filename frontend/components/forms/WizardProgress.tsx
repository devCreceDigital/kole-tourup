interface WizardProgressProps {
  pasoActual: number
  totalPasos: number
  labels: string[]
}

export function WizardProgress({ pasoActual, totalPasos, labels }: WizardProgressProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${i + 1 <= pasoActual ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i + 1 <= pasoActual ? '✓' : i + 1}
            </div>
            <span className={`text-xs text-center hidden md:block ${i + 1 === pasoActual ? 'text-blue-800 font-semibold' : 'text-gray-400'}`}>{label}</span>
          </div>
        ))}
      </div>
      <div className="relative h-2 bg-gray-200 rounded-full">
        <div
          className="absolute h-2 bg-blue-800 rounded-full transition-all"
          style={{ width: `${((pasoActual - 1) / (totalPasos - 1)) * 100}%` }}
        />
      </div>
      <p className="text-sm text-gray-500 mt-2 text-center">Paso {pasoActual} de {totalPasos}</p>
    </div>
  )
}