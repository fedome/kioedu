import './style.css';
import { fetchApi } from './api';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm') as HTMLFormElement;
  const errorMsg = document.getElementById('errorMsg') as HTMLDivElement;

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.style.display = 'none';

      const email = (document.getElementById('email') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;

      try {
        const res = await fetchApi<{ access_token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        if (res && res.access_token) {
          localStorage.setItem('kio_admin_token', res.access_token);
          window.location.href = '/';
        } else {
          throw new Error('No se recibió el token de autenticación');
        }
      } catch (err: any) {
        errorMsg.textContent = err.message || 'Error al iniciar sesión';
        errorMsg.style.display = 'block';
      }
    });
  }
});
