'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { LayoutViajePadre } from '@/components/padre/LayoutViajePadre'

const ESTADO_CUOTA_CONFIG: Record<string, { label: string; badgeClass: string; icon: string }> = {
  pagado: { label: 'Pagado', badgeClass: 'bg-green-100 text-green-700', icon: 'M5 13l4 4L19 7' },
  en_revision: { label: 'En revision', badgeClass: 'bg-blue-100 text-blue-700', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  vencido: { label: 'Vencido', badgeClass: 'bg-red-100 text-red-700', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  pendiente: { label: 'Pendiente', badgeClass: 'bg-amber-100 text-amber-700', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
}

function formatFecha(fechaIso: string) {
  const [year, month, day] = fechaIso.split('-')
  return `${day}/${month}/${year}`
}

export default function PagosPage() {
  const params = useParams()
  const id = params.id as string

  const [inscripcion, setInscripcion] = useState<any>(null)
  const [planPago, setPlanPago] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<any>(null)
  const [importe, setImporte] = useState('')
  const [fechaPago, setFechaPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('transferencia')
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  async function cargarDatos() {
    setCargando(true)
    try {
      const [insData, planData] = await Promise.all([
        fetchApi(`/api/v1/inscripciones/${id}/`),
        fetchApi(`/api/v1/inscripciones/${id}/plan-pago/`).catch(() => null),
      ])
      setInscripcion(insData)
      setPlanPago(planData)
    } catch (e) {
      console.error('Error cargando pagos', e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  function abrirModal(cuota: any) {
    setCuotaSeleccionada(cuota)
    setImporte(cuota.importe)
    setFechaPago(new Date().toISOString().slice(0, 10))
    setMetodoPago('transferencia')
    setComprobante(null)
    setNotas('')
    setErrorForm(null)
    setExito(false)
  }

  async function enviarPago() {
    if (!cuotaSeleccionada) return
    setEnviando(true)
    setErrorForm(null)
    try {
      const formData = new FormData()
      formData.append('inscripcion', id)
      formData.append('cuota', cuotaSeleccionada.id)
      formData.append('importe', importe)
      formData.append('fecha_pago', fechaPago)
      formData.append('metodo_pago', metodoPago)
      formData.append('notas', notas)
      if (comprobante) {
        formData.append('comprobante', comprobante)
      }
      await fetchApi('/api/v1/pagos/', {
        method: 'POST',
        body: formData,
        headers: {},
      })
      setExito(true)
      await cargarDatos()
    } catch (e: any) {
      setErrorForm(e?.message || 'No se pudo registrar el pago. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar la inscripcion.</p>
      </div>
    )
  }

  const layoutProps = {
    inscripcionId: id,
    nombreViaje: inscripcion.viaje.nombre,
    destino: inscripcion.viaje.destino,
    estadoBadge: (inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito') as 'confirmado' | 'pre_inscrito',
    nombreAlumno: `${inscripcion.alumno.nombre} ${inscripcion.alumno.apellidos}`,
    imagenUrl: inscripcion.viaje.imagen_url ?? undefined,
  }

  const cuotas = planPago?.cuotas ?? []
  const totalPlan = cuotas.reduce((sum: number, c: any) => sum + parseFloat(c.importe), 0)
  const pagado = cuotas.filter((c: any) => c.estado === 'pagado').reduce((sum: number, c: any) => sum + parseFloat(c.importe), 0)
  const pendienteTotal = totalPlan - pagado
  const porcentajePagado = totalPlan > 0 ? Math.round((pagado / totalPlan) * 100) : 0
  const cuotasVencidas = cuotas.filter((c: any) => c.estado === 'vencido')
  const primeraCuotaPendiente = cuotas.find((c: any) => c.estado === 'vencido' || c.estado === 'pendiente')

  return (
    <LayoutViajePadre {...layoutProps}>
      {!planPago ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">El plan de pagos todavia no esta disponible.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm mb-4">
              Plan de Pagos - {inscripcion.viaje.nombre}
            </h2>
            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-400 text-xs block mb-0.5">Precio total del viaje</span>
                <span className="font-bold text-gray-900">S/ {totalPlan.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block mb-0.5">Pagado hasta ahora</span>
                <span className="font-bold text-gray-900">S/ {pagado.toFixed(2)} <span className="text-primary font-semibold">({porcentajePagado}%)</span></span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block mb-0.5">Pendiente</span>
                <span className="font-bold text-gray-900">S/ {pendienteTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${porcentajePagado}%` }} />
            </div>
          </div>

          {cuotasVencidas.length > 0 && (
            <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center gap-2 text-sm text-red-700">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                Tienes {cuotasVencidas.length} plazo{cuotasVencidas.length > 1 ? 's' : ''} vencido{cuotasVencidas.length > 1 ? 's' : ''}. Pagalo{cuotasVencidas.length > 1 ? 's' : ''} para evitar penalizaciones.
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th className="px-5 py-3 font-semibold">Plazo</th>
                  <th className="px-5 py-3 font-semibold">Importe</th>
                  <th className="px-5 py-3 font-semibold">Vence el</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {cuotas.map((cuota: any) => {
                  const config = ESTADO_CUOTA_CONFIG[cuota.estado] ?? ESTADO_CUOTA_CONFIG.pendiente
                  const puedePagar = cuota.estado === 'vencido' || cuota.estado === 'pendiente'
                  return (
                    <tr key={cuota.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {cuota.numero_cuota} {cuota.descripcion || 'Plazo'}
                      </td>
                      <td className="px-5 py-3 text-gray-700">S/ {parseFloat(cuota.importe).toFixed(2)}</td>
                      <td className="px-5 py-3 text-gray-500">{formatFecha(cuota.fecha_vencimiento)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${config.badgeClass}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                          </svg>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {puedePagar ? (
                          <button
                            onClick={() => abrirModal(cuota)}
                            className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            Pagar
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {primeraCuotaPendiente && (
            <div className="p-5 flex flex-col sm:flex-row gap-3 border-t border-gray-100">
              <button
                onClick={() => abrirModal(primeraCuotaPendiente)}
                className="flex-1 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pagar {primeraCuotaPendiente.numero_cuota} plazo - S/ {parseFloat(primeraCuotaPendiente.importe).toFixed(2)}
              </button>
              <button className="flex-1 sm:flex-none border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Hablar con la agencia
              </button>
            </div>
          )}
        </div>
      )}

      {cuotaSeleccionada && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            {exito ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Pago registrado</h3>
                <p className="text-sm text-gray-500 mb-5">Tu pago quedo en revision. La agencia lo validara pronto.</p>
                <button
                  onClick={() => setCuotaSeleccionada(null)}
                  className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 mb-1">Registrar pago</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {cuotaSeleccionada.numero_cuota} {cuotaSeleccionada.descripcion || 'Plazo'}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Importe (S/)</label>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={importe}
                      onChange={e => setImporte(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Fecha de pago</label>
                    <input
                      type="date"
                      value={fechaPago}
                      onChange={e => setFechaPago(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Metodo de pago</label>
                    <select
                      value={metodoPago}
                      onChange={e => setMetodoPago(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Comprobante (opcional)</label>
                    <input
                      type="file" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setComprobante(e.target.files?.[0] ?? null)}
                      className="w-full text-sm"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">PDF, JPG o PNG. Maximo 10 MB.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Notas (opcional)</label>
                    <textarea
                      value={notas}
                      onChange={e => setNotas(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {errorForm && <p className="text-xs text-red-600">{errorForm}</p>}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setCuotaSeleccionada(null)}
                      className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={enviarPago}
                      disabled={enviando || !importe || !fechaPago}
                      className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                      {enviando ? 'Enviando...' : 'Registrar pago'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </LayoutViajePadre>
  )
}
