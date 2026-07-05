import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { InscribirForm } from '../../(padre)/app/inscribir/[viaje_id]/InscribirForm'

async function getAlumnos(): Promise<any[]> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return []
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || 'http://gateway:3001'
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/mis-alumnos/`, {
      cache: 'no-store',
      headers: { Cookie: `access_token=${token}` },
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export default async function InscribirPublicPage() {
  const cookieStore = await cookies()
  const isAuthenticated = !!cookieStore.get('access_token')?.value
  const alumnos = isAuthenticated ? await getAlumnos() : []
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <InscribirForm initialAlumnos={alumnos} isAuthenticated={isAuthenticated} />
    </Suspense>
  )
}
