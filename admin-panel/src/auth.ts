
export function checkAuth() {
  const token = localStorage.getItem('kio_admin_token');
  if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
  }
}

export function logout() {
  localStorage.removeItem('kio_admin_token');
  window.location.href = '/login.html';
}

/** Configura eventos de botones de logout en TODAS las páginas */
export function setupAuthUI() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}
