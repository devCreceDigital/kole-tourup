import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwtPayload } from './lib/auth';

// Helper para obtener el path correcto según el rol
function getPathForRole(role: string): string {
  if (role === 'agente') return '/backoffice';
  if (role === 'alumno') return '/app/alumno';
  if (role === 'padre' || role === 'mecenas') return '/app';
  return '/login';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Obtener el token de la cookie httpOnly
  const token = request.cookies.get('access_token')?.value;
  let payload = null;
  
  if (token) {
    payload = decodeJwtPayload(token);
    // Validar expiración rudimentaria (backend hará validación estricta)
    if (payload && payload.exp && payload.exp * 1000 < Date.now()) {
      payload = null; // Token expirado
    }
  }

  const isAuthenticated = !!payload;
  const userRole = payload?.role;

  // 2. Proteger rutas de autenticación (login, registro)
  // Si el usuario ya está logueado, redirigir a su portal para evitar loops.
  const isAuthRoute = pathname === '/login' || pathname === '/registro';
  if (isAuthRoute && isAuthenticated && userRole) {
    const redirectUrl = new URL(getPathForRole(userRole), request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Evaluar permisos por área protegida
  const isBackoffice = pathname.startsWith('/backoffice');
  const isAlumnoApp = pathname.startsWith('/app/alumno');
  const isPadreApp = pathname.startsWith('/app') && !isAlumnoApp; // Todo bajo /app que no sea alumno

  // Si no intenta acceder a rutas protegidas, dejar pasar
  if (!isBackoffice && !isAlumnoApp && !isPadreApp) {
    return NextResponse.next();
  }

  // 4. Si es ruta protegida y no está autenticado -> login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Guardar URL original para redirect posterior (opcional, pero útil)
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Validar Autorización (Roles)
  if (isBackoffice && userRole !== 'agente') {
    return NextResponse.redirect(new URL(getPathForRole(userRole!), request.url));
  }

  if (isAlumnoApp && userRole !== 'alumno') {
    return NextResponse.redirect(new URL(getPathForRole(userRole!), request.url));
  }

  if (isPadreApp && userRole !== 'padre' && userRole !== 'mecenas') {
    return NextResponse.redirect(new URL(getPathForRole(userRole!), request.url));
  }

  // 6. Todo correcto, continuar
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Intercepta todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Archivos estáticos comunes (.svg, .png, .jpg)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
