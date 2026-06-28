export interface TokenPayload {
  user_id: number;
  role: 'padre' | 'mecenas' | 'agente' | 'alumno';
  exp: number;
}

/**
 * Decodifica el payload de un JWT sin validar criptográficamente su firma.
 * La validación definitiva se delega al backend/gateway.
 */
export function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}
