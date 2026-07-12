import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { InscribirForm } from './InscribirForm'

async function getAlumnos(): Promise<any[]> {
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || 'http://gateway:3001'

  async function intentarFetch(accessToken: string) {
    return fetch(`${gatewayUrl}/api/v1/inscripciones/mis-alumnos/`, {
      cache: 'no-store',
      headers: { Cookie: `access_token=${accessToken}` },
    })
  }

  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (token) {
      const res = await intentarFetch(token)
      if (res.ok) return await res.json()
    }

    // access_token ausente o vencido: intentamos refrescarlo con refresh_token
    // para no mostrar 'sin hijos registrados' por un token vencido
    if (refreshToken) {
      const refreshRes = await fetch(`${gatewayUrl}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: { Cookie: `refresh_token=${refreshToken}` },
      })
      if (refreshRes.ok) {
        const setCookie = refreshRes.headers.get('set-cookie') || ''
        const match = setCookie.match(/access_token=([^;]+)/)
        if (match) {
          const res2 = await intentarFetch(match[1])
          if (res2.ok) return await res2.json()
        }
      }
    }

    return []
  } catch {
    return []
  }
}

export default async function InscribirPage() {
  const cookieStore = await cookies()
  const isAuthenticated = !!cookieStore.get('refresh_token')?.value
  const alumnos = isAuthenticated ? await getAlumnos() : []
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <InscribirForm initialAlumnos={alumnos} isAuthenticated={isAuthenticated} />
    </Suspense>
  )
}
