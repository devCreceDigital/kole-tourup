const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    let msg = data.detail || data.error;
    if (!msg && typeof data === 'object') {
      // Try to find the first error string in the object values
      const firstKey = Object.keys(data)[0];
      if (firstKey && Array.isArray(data[firstKey])) {
        msg = data[firstKey][0];
      } else if (firstKey && typeof data[firstKey] === 'string') {
        msg = data[firstKey];
      }
    }
    super(msg || 'API Error');
    this.status = status;
    this.data = data;
  }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${GATEWAY_URL}${endpoint}`;

  const isFormData = options.body instanceof FormData;

  const finalOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: isFormData
      ? { ...options.headers as Record<string, string> }
      : {
          'Content-Type': 'application/json',
          ...options.headers,
        },
  };

  const response = await fetch(url, finalOptions);

  if (!response.ok) {
    let errorData: any = { error: 'Error inesperado del servidor' };
    try {
      errorData = await response.json();
    } catch {
      // keep default error
    }
    throw new ApiError(response.status, errorData);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return null;
}
