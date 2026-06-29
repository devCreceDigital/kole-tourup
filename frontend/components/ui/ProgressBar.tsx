interface ProgressBarProps {
  porcentaje: number
  mostrarNumero?: boolean
}

function getColor(p: number) {
  if (p >= 100) return 'bg-green-500'
  if (p >= 50) return 'bg-blue-500'
  return 'bg-red-500'
}

export function ProgressBar({ porcentaje, mostrarNumero = true }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, porcentaje))
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        {mostrarNumero && (
          <span className="text-sm font-medium text-gray-700">{clamped}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}