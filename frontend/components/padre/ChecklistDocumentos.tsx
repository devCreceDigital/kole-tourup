import { ProgressBar } from '@/components/ui/ProgressBar'
import { ItemDocumento } from './ItemDocumento'

interface DocRequerido {
  id: string
  nombre: string
  obligatorio: boolean
  formatos_permitidos: string
  entrega_actual?: any
}

interface ChecklistDocumentosProps {
  inscripcionId: string
  documentos: DocRequerido[]
  onSubido: () => void
}

export function ChecklistDocumentos({ inscripcionId, documentos, onSubido }: ChecklistDocumentosProps) {
  const validados = documentos.filter(d => d.entrega_actual?.estado === 'validado').length
  const porcentaje = documentos.length > 0 ? Math.round((validados / documentos.length) * 100) : 0
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-2">{validados} de {documentos.length} documentos aprobados</p>
        <ProgressBar porcentaje={porcentaje} />
      </div>
      <div className="space-y-3">
        {documentos.map(doc => (
          <ItemDocumento
            key={doc.id}
            inscripcionId={inscripcionId}
            documentoRequeridoId={doc.id}
            nombre={doc.nombre}
            obligatorio={doc.obligatorio}
            formatosPermitidos={doc.formatos_permitidos}
            entregaActual={doc.entrega_actual}
            onSubido={onSubido}
          />
        ))}
      </div>
    </div>
  )
}