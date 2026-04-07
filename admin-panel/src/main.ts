import './style.css';
import { checkAuth, setupAuthUI } from './auth';
import { fetchApi } from './api';

/** Escape HTML entities to prevent XSS via innerHTML */
function esc(str: any): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupAuthUI();

  // --- UI COMPONENTS (TOASTS & CONFIRM) ---
  const toastContainer = document.getElementById('toastContainer') as HTMLDivElement;
  function showToast(title: string, message: string, type: 'success' | 'error' = 'success') {
    const toast = document.createElement('div');
    const isErr = type === 'error';
    toast.style.background = isErr ? '#fef2f2' : '#f0fdf4';
    toast.style.border = `1px solid ${isErr ? '#fca5a5' : '#bbf7d0'}`;
    toast.style.color = isErr ? '#991b1b' : '#166534';
    toast.style.padding = '16px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    toast.style.display = 'flex';
    toast.style.flexDirection = 'column';
    toast.style.minWidth = '250px';
    toast.style.animation = 'slideInRight 0.3s ease-out forwards';
    toast.innerHTML = `
      <strong style="font-size: 0.95rem; margin-bottom: 4px;">${title}</strong>
      <span style="font-size: 0.85rem; opacity: 0.9;">${message}</span>
    `;

    // Dynamic keyframes injection if not present
    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style');
      style.id = 'toastStyles';
      style.textContent = `
        @keyframes slideInRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
      `;
      document.head.appendChild(style);
    }

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOutRight 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  const confirmModal = document.getElementById('confirmModal') as HTMLDivElement;
  const confirmTitle = document.getElementById('confirmModalTitle') as HTMLHeadingElement;
  const confirmText = document.getElementById('confirmModalText') as HTMLParagraphElement;
  const btnAccept = document.getElementById('confirmModalAccept') as HTMLButtonElement;
  const btnCancel = document.getElementById('confirmModalCancel') as HTMLButtonElement;

  function showConfirm(title: string, text: string, destructive: boolean = true): Promise<boolean> {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmText.textContent = text;
      btnAccept.style.background = destructive ? 'var(--danger-color)' : 'var(--success-color)';
      confirmModal.style.display = 'flex';

      const cleanup = () => {
        btnAccept.removeEventListener('click', onAccept);
        btnCancel.removeEventListener('click', onCancel);
        confirmModal.style.display = 'none';
      };

      const onAccept = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      btnAccept.addEventListener('click', onAccept);
      btnCancel.addEventListener('click', onCancel);
    });
  }


  // --- SPA ROUTER ---
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  const views = document.querySelectorAll('.spa-view');
  let allSchools: any[] = [];
  let allOwners: any[] = [];

  function switchView(target: string) {
    navItems.forEach(nav => nav.classList.remove('active'));
    document.querySelector(`[data-target="${target}"]`)?.classList.add('active');
    views.forEach(view => {
      (view as HTMLElement).style.display = 'none';
      view.classList.remove('active');
    });

    const activeView = document.getElementById(`view-${target}`);
    if (activeView) {
      activeView.style.display = 'block';
      activeView.classList.add('active');
    }
    window.location.hash = target;

    if (target === 'dashboard') loadStats();
    if (target === 'schools') loadSchools();
    if (target === 'kiosks') { loadOwners(); loadKiosks(); }
    if (target === 'users') loadUsers();
    if (target === 'support') loadTickets();
  }

  navItems.forEach(nav => {
    nav.addEventListener('click', (e) => {
      e.preventDefault();
      switchView((e.currentTarget as HTMLElement).getAttribute('data-target') || 'dashboard');
    });
  });
  switchView(window.location.hash.replace('#', '') || 'dashboard');


  // --- DYNAMIC CRUD MODAL ---
  const crudModal = document.getElementById('crudModal') as HTMLDivElement;
  const crudForm = document.getElementById('crudForm') as HTMLFormElement;
  const crudFields = document.getElementById('crudFieldsContainer') as HTMLDivElement;
  
  document.querySelectorAll('.cancelBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = (e.currentTarget as HTMLElement).getAttribute('data-modal');
      const modal = document.getElementById(modalId!);
      if (modal) modal.style.display = 'none';
    });
  });

  function openCrudModal(type: 'school' | 'owner' | 'kiosk' | 'user', mode: 'create' | 'edit', data: any = {}) {
    (document.getElementById('crudType') as HTMLInputElement).value = type;
    (document.getElementById('crudMode') as HTMLInputElement).value = mode;
    (document.getElementById('crudId') as HTMLInputElement).value = data.id || '';
    
    document.getElementById('crudModalTitle')!.textContent = mode === 'create' ? `Nuevo ${type}` : `Editar ${type} #${data.id}`;
    crudFields.innerHTML = '';
    
    const wrap = (label: string, inputHtml: string) => `<div class="input-group" style="margin-bottom: 16px;"><label>${label}</label>${inputHtml}</div>`;

    if (type === 'school') {
      crudFields.innerHTML += wrap('Nombre', `<input type="text" id="f_name" value="${data.name || ''}" required>`);
      crudFields.innerHTML += wrap('Código Invitación', `<input type="text" id="f_invite" value="${data.inviteCode || ''}" required style="text-transform: uppercase;">`);
    } 
    else if (type === 'owner') {
      crudFields.innerHTML += wrap('Nombre del Dueño', `<input type="text" id="f_name" value="${data.name || ''}" required>`);
      const opts = allSchools.map(s => `<option value="${s.id}" ${s.id===data.schoolId?'selected':''}>${s.name}</option>`).join('');
      crudFields.innerHTML += wrap('Colegio', `<select id="f_schoolId" required><option value="">Seleccionar...</option>${opts}</select>`);
      crudFields.innerHTML += wrap('MP Access Token', `<input type="password" id="f_mpAccessToken" value="${data.mpAccessToken || ''}" placeholder="TEST-xxxx...">`);
      crudFields.innerHTML += wrap('MP Public Key', `<input type="text" id="f_mpPublicKey" value="${data.mpPublicKey || ''}" placeholder="TEST-xxxx...">`);
    }
    else if (type === 'kiosk') {
      crudFields.innerHTML += wrap('Nombre de la Terminal', `<input type="text" id="f_name" value="${data.name || ''}" required>`);
      const optsS = allSchools.map(s => `<option value="${s.id}" ${s.id===data.schoolId?'selected':''}>${s.name}</option>`).join('');
      crudFields.innerHTML += wrap('Colegio', `<select id="f_schoolId" required><option value="">Seleccionar...</option>${optsS}</select>`);
      const optsO = allOwners.map(o => `<option value="${o.id}" ${o.id===data.ownerId?'selected':''}>${o.name}</option>`).join('');
      crudFields.innerHTML += wrap('Dueño', `<select id="f_ownerId" required><option value="">Seleccionar...</option>${optsO}</select>`);
    }
    else if (type === 'user') {
      crudFields.innerHTML += wrap('Nombre', `<input type="text" id="f_name" value="${data.name || ''}" required>`);
      crudFields.innerHTML += wrap('Email (Solo lectura)', `<input type="email" id="f_email" value="${data.email || ''}" disabled style="background:#f1f5f9;">`);
    }

    crudModal.style.display = 'flex';
  }

  crudForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = (document.getElementById('crudType') as HTMLInputElement).value;
    const mode = (document.getElementById('crudMode') as HTMLInputElement).value;
    const id = (document.getElementById('crudId') as HTMLInputElement).value;

    let url = '';
    let body: any = {};
    
    // Extract payload
    if (type === 'school') {
       url = mode === 'create' ? '/schools' : `/schools/${id}`;
       body = { name: (document.getElementById('f_name') as HTMLInputElement).value, 
                inviteCode: (document.getElementById('f_invite') as HTMLInputElement).value };
    } else if (type === 'owner') {
       url = mode === 'create' ? '/admin/owners' : `/admin/owners/${id}`;
       body = { name: (document.getElementById('f_name') as HTMLInputElement).value, 
                schoolId: parseInt((document.getElementById('f_schoolId') as HTMLSelectElement).value, 10),
                mpAccessToken: (document.getElementById('f_mpAccessToken') as HTMLInputElement).value || null,
                mpPublicKey: (document.getElementById('f_mpPublicKey') as HTMLInputElement).value || null };
    } else if (type === 'kiosk') {
       url = mode === 'create' ? '/admin/kiosks' : `/admin/kiosks/${id}`;
       body = { name: (document.getElementById('f_name') as HTMLInputElement).value, 
                schoolId: parseInt((document.getElementById('f_schoolId') as HTMLSelectElement).value, 10),
                ownerId: parseInt((document.getElementById('f_ownerId') as HTMLSelectElement).value, 10) };
       if (mode === 'create') body.apiKey = 'pos-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    } else if (type === 'user') {
       url = `/admin/users/${id}`;
       body = { name: (document.getElementById('f_name') as HTMLInputElement).value };
    }

    try {
      await fetchApi(url, { method: mode === 'create' ? 'POST' : 'PATCH', body: JSON.stringify(body) });
      crudModal.style.display = 'none';
      if (mode === 'create') showToast('¡Éxito!', `Registro creado correctamente.`, 'success');
      else showToast('¡Actualizado!', `El registro #${id} ha sido modificado.`, 'success');

      if (type === 'kiosk' && mode === 'create') showConfirm('¡Kiosco Agregado!', `La API Key asignada es: ${body.apiKey}\nGuárdala bajo llave.`, false);

      if (type === 'school') loadSchools();
      if (type === 'owner') loadOwners();
      if (type === 'kiosk') loadKiosks();
      if (type === 'user') loadUsers();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  });


  // --- DATA LOADING & ACTIONS ---
  
  // Dashboard
  async function loadStats() {
    try {
      const stats = await fetchApi<any>('/admin/stats');
      document.getElementById('statSchools')!.textContent = stats.schools;
      document.getElementById('statChildren')!.textContent = stats.children;
      document.getElementById('statUsers')!.textContent = stats.users;
      document.getElementById('statKiosks')!.textContent = stats.kiosks.total;
      document.getElementById('statKiosksDetail')!.textContent = `(${stats.kiosks.active} activos, ${stats.kiosks.suspended} susp.)`;
    } catch(err) {
      console.error('Error loading stats', err);
    }
  }

  // Schools
  document.getElementById('addSchoolBtn')?.addEventListener('click', () => openCrudModal('school', 'create'));
  const schoolsTbody = document.getElementById('schoolsTableBody') as HTMLTableSectionElement;
  async function loadSchools() {
    try {
      allSchools = await fetchApi<any[]>('/schools');
      schoolsTbody.innerHTML = allSchools.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:24px;">Sin colegios</td></tr>` : '';
      allSchools.forEach(s => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 16px; font-weight: 600;">#${s.id}</td>
          <td style="padding: 16px;">${esc(s.name)}</td>
          <td style="padding: 16px;"><code style="background:var(--bg-color); padding:4px 8px; border-radius:4px;">${esc(s.inviteCode) || 'N/A'}</code></td>
          <td style="padding: 16px; color: var(--text-sub); font-size: 0.85rem;">${s._count?.children||0} alumnos / ${s._count?.kiosks||0} kioscos</td>
          <td style="padding: 16px; display: flex; gap: 8px;">
             <button class="btn-edit-school" style="background:#f1f5f9; color:#334155; padding:6px 12px; border-radius:8px; border:none; cursor:pointer;" data-j='${JSON.stringify(s)}'>Editar</button>
             <button class="btn-delete-school" style="color:var(--danger-color); background:transparent; border:none; cursor:pointer;" data-id="${s.id}">Borrar</button>
          </td>
        `;
        schoolsTbody.appendChild(tr);
      });

      document.querySelectorAll('.btn-edit-school').forEach(b => b.addEventListener('click', (e) => openCrudModal('school', 'edit', JSON.parse((e.currentTarget as HTMLElement).getAttribute('data-j')!))));
      document.querySelectorAll('.btn-delete-school').forEach(b => b.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (await showConfirm('Eliminar Colegio', `¿Borrar el colegio #${id}? Esta acción es irreversible y afectará a kioscos y alumnos.`)) {
          try { await fetchApi(`/schools/${id}`, { method: 'DELETE' }); showToast('Borrado', 'Colegio eliminado.', 'success'); loadSchools(); } catch(err:any){ showToast('Error', err.message, 'error'); }
        }
      }));
    } catch(err:any){ showToast('Error conectando', err.message, 'error'); }
  }

  // Owners
  document.getElementById('addOwnerBtn')?.addEventListener('click', async () => { if(allSchools.length===0) allSchools = await fetchApi<any[]>('/schools'); openCrudModal('owner', 'create'); });
  const ownersTbody = document.getElementById('ownersTableBody') as HTMLTableSectionElement;
  async function loadOwners() {
    try {
      allOwners = await fetchApi<any[]>('/admin/owners');
      ownersTbody.innerHTML = allOwners.length === 0 ? `<tr><td colspan="4" style="text-align:center; padding:24px;">Sin dueños</td></tr>` : '';
      allOwners.forEach(o => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 16px; font-weight: 600;">#${o.id}</td>
          <td style="padding: 16px;">${esc(o.name)}<br><small style="color: var(--text-sub);">Colegio: ${esc(o.school?.name) || 'Borrado'}</small></td>
          <td style="padding: 16px;">${o._count.kiosks} terminal(es)</td>
          <td style="padding: 16px; display: flex; gap: 8px;">
             <button class="btn-edit-owner" style="background:#f1f5f9; color:#334155; padding:6px 12px; border-radius:8px; border:none; cursor:pointer;" data-j='${JSON.stringify(o)}'>Editar</button>
             <button class="btn-delete-owner" style="color:var(--danger-color); background:transparent; border:none; cursor:pointer;" data-id="${o.id}">Borrar</button>
          </td>
        `;
        ownersTbody.appendChild(tr);
      });

      document.querySelectorAll('.btn-edit-owner').forEach(b => b.addEventListener('click', async (e) => {
        if(allSchools.length===0) allSchools = await fetchApi<any[]>('/schools');
        openCrudModal('owner', 'edit', JSON.parse((e.currentTarget as HTMLElement).getAttribute('data-j')!));
      }));
      document.querySelectorAll('.btn-delete-owner').forEach(b => b.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (await showConfirm('Eliminar Dueño', `¿Borrar dueño #${id}? Se perderán sus kioscos en cascada.`)) {
          try { await fetchApi(`/admin/owners/${id}`, { method: 'DELETE' }); showToast('Borrado', 'Dueño eliminado.', 'success'); loadOwners(); loadKiosks(); } catch(err:any){ showToast('Error', err.message, 'error'); }
        }
      }));
    } catch(err:any) {}
  }

  // Kiosks
  document.getElementById('addKioskBtn')?.addEventListener('click', async () => { 
    if(allSchools.length===0) allSchools = await fetchApi<any[]>('/schools'); 
    if(allOwners.length===0) allOwners = await fetchApi<any[]>('/admin/owners'); 
    openCrudModal('kiosk', 'create'); 
  });
  const kiosksTbody = document.getElementById('kiosksTableBody') as HTMLTableSectionElement;
  async function loadKiosks() {
    try {
      const kiosks = await fetchApi<any[]>('/admin/kiosks');
      kiosksTbody.innerHTML = kiosks.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:24px;">Sin kioscos</td></tr>` : '';
      kiosks.forEach(k => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        const isActive = k.subscriptionActive !== false;
        tr.innerHTML = `
          <td style="padding: 16px; font-weight: 600;">#${k.id}</td>
          <td style="padding: 16px;">${esc(k.name)}<br><small style="color: var(--text-sub);">Dueño: ${esc(k.owner?.name)}</small></td>
          <td style="padding: 16px;"><span style="background: ${isActive ? '#dcfce7' : '#fee2e2'}; color: ${isActive ? '#166534' : '#991b1b'}; padding: 4px 8px; border-radius: 99px; font-size: 0.8rem; font-weight: 800;">${isActive ? 'ACTIVA' : 'SUSPENDIDA'}</span></td>
          <td style="padding: 16px;"><code style="background:var(--bg-color); padding:4px 8px; border-radius:4px;">${k.apiKey.substring(0,8)}...</code></td>
          <td style="padding: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-sub-kiosk" data-id="${k.id}" data-active="${isActive}" style="background:${isActive?'var(--danger-color)':'var(--success-color)'}; color:white; padding:6px 12px; border-radius:8px; border:none; cursor:pointer;">${isActive?'Suspender':'Activar'}</button>
            <button class="btn-billing-kiosk" style="background:#0284c7; color:white; padding:6px 12px; border-radius:8px; border:none; cursor:pointer;" data-id="${k.id}">Link Pago</button>
            <button class="btn-edit-kiosk" style="background:#f1f5f9; color:#334155; padding:6px 12px; border-radius:8px; border:none; cursor:pointer;" data-j='${JSON.stringify(k)}'>Editar</button>
            <button class="btn-delete-kiosk" style="color:var(--danger-color); background:transparent; border:none; cursor:pointer;" data-id="${k.id}">Borrar</button>
          </td>
        `;
        kiosksTbody.appendChild(tr);
      });

      document.querySelectorAll('.btn-sub-kiosk').forEach(b => b.addEventListener('click', async (e) => {
        const t = e.currentTarget as HTMLElement;
        const active = t.getAttribute('data-active') === 'true';
        if (await showConfirm(active?'Suspender':'Reactivar', `¿Desea cambiar la suscripción de esta terminal?`, active)) {
          try { await fetchApi(`/admin/kiosks/${t.getAttribute('data-id')}/subscription`, { method: 'PATCH', body: JSON.stringify({ active: !active }) }); loadKiosks(); showToast('Listo', 'Suscripción actualizada', 'success'); } catch(err:any){ showToast('Error', err.message, 'error'); }
        }
      }));
      document.querySelectorAll('.btn-edit-kiosk').forEach(b => b.addEventListener('click', async (e) => {
        if(allSchools.length===0) allSchools = await fetchApi<any[]>('/schools'); 
        if(allOwners.length===0) allOwners = await fetchApi<any[]>('/admin/owners'); 
        openCrudModal('kiosk', 'edit', JSON.parse((e.currentTarget as HTMLElement).getAttribute('data-j')!));
      }));
      document.querySelectorAll('.btn-delete-kiosk').forEach(b => b.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (await showConfirm('Eliminar Kiosco', `¿Borrar terminal #${id}? El hardware POS dejará de funcionar.`)) {
          try { await fetchApi(`/admin/kiosks/${id}`, { method: 'DELETE' }); showToast('Borrado', 'Kiosco eliminado.', 'success'); loadKiosks(); } catch(err:any){ showToast('Error', err.message, 'error'); }
        }
      }));
      document.querySelectorAll('.btn-billing-kiosk').forEach(b => b.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        try { 
          const data = await fetchApi<any>(`/admin/kiosks/${id}/billing-link`); 
          await navigator.clipboard.writeText(data.link);
          showToast('Copiado', 'Link de pago con MercadoPago copiado al portapapeles.<br><a href="'+data.link+'" target="_blank" style="color:var(--text-main); font-weight:bold; margin-top:8px; display:inline-block;">Probar Link MOCK</a>', 'success');
        } catch(err:any){ showToast('Error', 'No se pudo generar el link', 'error'); }
      }));
    } catch(err:any) {}
  }

  // Users 
  const usersTbody = document.getElementById('usersTableBody') as HTMLTableSectionElement;
  async function loadUsers() {
    try {
      const users = await fetchApi<any[]>('/admin/users');
      usersTbody.innerHTML = users.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:24px;">Sin usuarios</td></tr>` : '';
      users.forEach(user => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
          <td style="padding: 16px; font-weight: 600;">#${user.id}</td>
          <td style="padding: 16px;">${esc(user.name||'??')}<br><small style="color: var(--text-sub);">${esc(user.email)}</small></td>
          <td style="padding: 16px;">${user.roles.map((r:any)=>`<span style="background:#e0f2fe; color:#0284c7; padding:2px 6px; border-radius:4px; font-size:0.75rem;">${esc(r.role.name)}</span>`).join('')}</td>
          <td style="padding: 16px;">${user.children.length} hijo(s)</td>
          <td style="padding: 16px; display: flex; gap: 8px;">
             <button class="btn-edit-user" style="background:#f1f5f9; color:#334155; padding:6px 12px; border-radius:8px; border:none; cursor:pointer;" data-j='${JSON.stringify({id:user.id, name:user.name, email:user.email})}'>Editar</button>
             <button class="btn-reset-pw" style="background:#f59e0b; color:white; padding:6px 12px; border-radius:8px; border:none; cursor:pointer;" data-id="${user.id}">Nueva Clave</button>
             <button class="btn-delete-user" style="color:var(--danger-color); background:transparent; border:none; cursor:pointer;" data-id="${user.id}">Borrar</button>
          </td>
        `;
        usersTbody.appendChild(tr);
      });

      document.querySelectorAll('.btn-edit-user').forEach(b => b.addEventListener('click', (e) => openCrudModal('user', 'edit', JSON.parse((e.currentTarget as HTMLElement).getAttribute('data-j')!))));
      
      document.querySelectorAll('.btn-reset-pw').forEach(b => b.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const newPass = prompt("Ingresá la nueva contraseña para este usuario:");
        if (newPass) {
          try {
            await fetchApi(`/admin/users/${id}/password`, { method: 'POST', body: JSON.stringify({ password: newPass }) });
            showToast('Actualizado', 'La contraseña ha sido cambiada.', 'success');
          } catch (err: any) {
            showToast('Error', err.message, 'error');
          }
        }
      }));

      document.querySelectorAll('.btn-delete-user').forEach(b => b.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (await showConfirm('Eliminar Usuario', `¿Borrar a este usuario padre? Las cuentas de billetera y dependientes pueden quedar huérfanas o borrarse.`)) {
          try { await fetchApi(`/admin/users/${id}`, { method: 'DELETE' }); showToast('Borrado', 'Usuario eliminado.', 'success'); loadUsers(); } catch(err:any){ showToast('Error', err.message, 'error'); }
        }
      }));
    } catch(err:any) {}
  }

  // --- SUPPORT HELPDESK ---
  const ticketsList = document.getElementById('ticketsList') as HTMLDivElement;
  const chatContainer = document.getElementById('chatContainer') as HTMLDivElement;
  const chatEmptyState = document.getElementById('chatEmptyState') as HTMLDivElement;
  const chatTitle = document.getElementById('chatTitle') as HTMLHeadingElement;
  const chatSubtitle = document.getElementById('chatSubtitle') as HTMLSpanElement;
  const chatMessages = document.getElementById('chatMessages') as HTMLDivElement;
  const chatForm = document.getElementById('chatForm') as HTMLFormElement;
  const chatInput = document.getElementById('chatInput') as HTMLInputElement;
  const btnCloseTicket = document.getElementById('btnCloseTicket') as HTMLButtonElement;
  let currentTicketId: number | null = null;

  async function loadTickets() {
    try {
      const tickets = await fetchApi<any[]>('/admin/tickets');
      ticketsList.innerHTML = tickets.length === 0 ? `<p style="text-align:center; padding:20px; color:var(--text-sub);">Bandeja vacía</p>` : '';
      
      tickets.forEach(t => {
        const div = document.createElement('div');
        div.style.padding = '12px';
        div.style.borderBottom = '1px solid var(--border-color)';
        div.style.cursor = 'pointer';
        div.style.borderRadius = '8px';
        div.style.marginBottom = '4px';
        div.style.background = t.status === 'OPEN' ? (currentTicketId === t.id ? '#e2e8f0' : 'white') : '#f8fafc';
        div.style.opacity = t.status === 'OPEN' ? '1' : '0.6';

        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <strong style="font-size: 0.9rem;">#${t.id} - ${esc(t.user?.firstName) || 'Usuario'} ${esc(t.user?.lastName) || ''}</strong>
            <span style="font-size: 0.75rem; background: ${t.status === 'OPEN' ? '#dcfce7' : '#e2e8f0'}; color: ${t.status === 'OPEN' ? '#166534' : '#64748b'}; padding: 2px 6px; border-radius: 4px;">${esc(t.status)}</span>
          </div>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-sub); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${esc(t.subject) || 'Sin asunto'}</p>
          <small style="color: var(--text-sub); font-size: 0.75rem; display: block; margin-top: 6px;">Actualizado: ${new Date(t.updatedAt).toLocaleDateString()}</small>
        `;
        div.addEventListener('click', () => {
          document.querySelectorAll('#ticketsList > div').forEach(d => (d as HTMLElement).style.background = 'white');
          div.style.background = '#e2e8f0';
          openChat(t.id);
        });
        ticketsList.appendChild(div);
      });
    } catch(err) {}
  }

  async function openChat(ticketId: number) {
    currentTicketId = ticketId;
    chatEmptyState.style.display = 'none';
    chatContainer.style.display = 'flex';
    chatMessages.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">Cargando mensajes...</div>`;
    
    try {
      const ticket = await fetchApi<any>(`/admin/tickets/${ticketId}`);
      chatTitle.textContent = `#${ticket.id} - ${ticket.subject || 'Sin Asunto'}`;
      chatSubtitle.textContent = `Cliente: ${ticket.user?.firstName || ''} ${ticket.user?.lastName || ''} (${ticket.user?.email || ''})`;
      
      const isClosed = ticket.status === 'CLOSED';
      chatForm.style.display = isClosed ? 'none' : 'flex';
      btnCloseTicket.style.display = isClosed ? 'none' : 'block';

      chatMessages.innerHTML = '';
      if(ticket.messages.length === 0) chatMessages.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">No hay mensajes en este ticket.</div>`;

      ticket.messages.forEach((m: any) => {
        const isAdmin = m.senderRole === 'ADMIN';
        const msg = document.createElement('div');
        msg.style.maxWidth = '80%';
        msg.style.alignSelf = isAdmin ? 'flex-end' : 'flex-start';
        msg.style.background = isAdmin ? 'var(--text-main)' : 'white';
        msg.style.color = isAdmin ? 'white' : 'var(--text-main)';
        msg.style.padding = '12px 16px';
        msg.style.borderRadius = isAdmin ? '16px 16px 0 16px' : '16px 16px 16px 0';
        msg.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        msg.style.border = isAdmin ? 'none' : '1px solid var(--border-color)';
        
        msg.innerHTML = `
          <div style="font-size: 0.75rem; opacity: 0.8; margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>${isAdmin ? 'Tú (Soporte)' : 'Cliente'}</span>
            <span style="margin-left: 12px;">${new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <div style="font-size: 0.9rem; line-height: 1.4;">${esc(m.content)}</div>
        `;
        chatMessages.appendChild(msg);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch(err:any) {
      chatMessages.innerHTML = `<div style="color:var(--danger-color); text-align:center; padding:20px;">Error al cargar el chat</div>`;
    }
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!currentTicketId) return;
    const content = chatInput.value.trim();
    if(!content) return;
    
    chatInput.disabled = true;
    try {
      await fetchApi(`/admin/tickets/${currentTicketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content, senderRole: 'ADMIN' })
      });
      chatInput.value = '';
      await openChat(currentTicketId);
      loadTickets(); // Refresh inbox sort order
    } catch(err:any) {
      showToast('Error', 'No se pudo enviar el mensaje', 'error');
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  });

  btnCloseTicket.addEventListener('click', async () => {
    if(!currentTicketId) return;
    if(await showConfirm('Cerrar Ticket', '¿Marcar como resuelto? No se podrán enviar más mensajes.')) {
      try {
        await fetchApi(`/admin/tickets/${currentTicketId}/close`, { method: 'PATCH' });
        showToast('Resuelto', 'El ticket ha sido cerrado', 'success');
        openChat(currentTicketId);
        loadTickets();
      } catch(err:any) {
        showToast('Error', err.message, 'error');
      }
    }
  });

});
