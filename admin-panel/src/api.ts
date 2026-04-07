export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('kio_admin_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Unauthorized -> login
    localStorage.removeItem('kio_admin_token');
    window.location.href = '/login.html';
    throw new Error('No autorizado');
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error en la petición');
    }
    return data;
  }

  return response as any;
}
