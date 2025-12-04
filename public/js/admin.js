const API_BASE = 'http://localhost:4000/api';
let token = null;

function toSlug(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function adminLogin() {
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value.trim();
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const el = document.getElementById('loginError');
    el.textContent = data.error || 'Falha no login';
    el.style.display = '';
    return;
  }
  token = data.token;
  localStorage.setItem('adminToken', token);
  updateUIAuth();
  loadRooms();
  location.replace('/admin');
}

async function createRoom() {
  if (!token) return alert('Faça login primeiro');
  const name = document.getElementById('roomName').value.trim();
  const sector = document.getElementById('roomSector').value.trim();
  const floor = document.getElementById('roomFloor').value.trim();
  const createdBy = document.getElementById('roomCreator').value.trim();
  const capacityVal = document.getElementById('roomCapacity').value;
  const capacity = Number(capacityVal);
  const available = document.getElementById('roomAvailable').checked;
  const nameEl = document.getElementById('roomName');
  if (!name) {
    if (nameEl) nameEl.classList.add('input-error');
    alert('Informe o nome da sala');
    if (nameEl) nameEl.focus();
    return;
  }
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, sector, floor, createdBy, available, capacity: Number.isFinite(capacity) ? capacity : undefined }),
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'Erro ao criar sala');
  alert('Sala criada');
  loadRooms();
  if (nameEl) nameEl.classList.remove('input-error');
  document.getElementById('roomName').value = '';
  document.getElementById('roomSector').value = '';
  document.getElementById('roomFloor').value = '';
  document.getElementById('roomCreator').value = '';
  document.getElementById('roomCapacity').value = '';
}

let roomsData = [];

function renderRoomsAdmin(rooms) {
  const wrap = document.getElementById('roomsList');
  const table = `
    <table class="rooms-admin-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Setor</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${rooms.map(r => `
          <tr class="rooms-admin-row" data-id="${r._id}" data-name="${r.name || ''}" data-sector="${r.sector || ''}" data-floor="${r.floor || ''}" data-createdby="${r.createdBy || ''}" data-capacity="${r.capacity ?? ''}" data-available="${r.available ? '1' : '0'}">
            <td>${r.name || ''}</td>
            <td>${r.sector || ''}</td>
            <td>
              <div class="actions">
                <button class="icon-btn edit" title="Editar" aria-label="Editar">✏️</button>
                <button class="icon-btn secondary copy-id" title="Copiar ID" aria-label="Copiar ID">📋</button>
                <button class="icon-btn secondary toggle" title="Disponibilizar ou indisponibilizar" aria-label="Disponibilizar ou indisponibilizar">🔄</button>
                <button class="icon-btn secondary open" title="Abrir calendário" aria-label="Abrir calendário">📅</button>
                <button class="icon-btn danger delete" title="Excluir" aria-label="Excluir">🗑️</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  wrap.innerHTML = table;
  wrap.querySelectorAll('.rooms-admin-row').forEach(row => {
    const id = row.dataset.id;
    const copyBtn = row.querySelector('.copy-id');
    if (copyBtn) copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(id);
        showToast('ID copiado');
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = id;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast('ID copiado'); } finally { ta.remove(); }
      }
    };
    const editBtn = row.querySelector('.edit');
    if (editBtn) editBtn.onclick = () => openEditRoom(row);

    const toggleBtn = row.querySelector('.toggle');
    if (toggleBtn) toggleBtn.onclick = async () => {
      const currentAvailable = row.dataset.available === '1';
      const res = await fetch(`${API_BASE}/rooms/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ available: !currentAvailable }) 
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Erro ao atualizar disponibilidade');
      const idx = roomsData.findIndex(x => x._id === id);
      if (idx >= 0) roomsData[idx] = data;
      renderRoomsAdmin(roomsData);
      renderMetrics();
      showToast(data.available ? 'Sala disponibilizada' : 'Sala indisponibilizada');
    };
    const openBtn = row.querySelector('.open');
    if (openBtn) openBtn.onclick = () => {
      const slug = toSlug(row.dataset.name || '');
      window.open(`/${slug}/agendamento`, '_blank');
    };
    const delBtn = row.querySelector('.delete');
    if (delBtn) delBtn.onclick = async () => {
      if (!confirm('Confirmar exclusão da sala?')) return;
      const res = await fetch(`${API_BASE}/rooms/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Erro ao excluir sala');
      showToast('Sala excluída');
      roomsData = roomsData.filter(x => x._id !== id);
      renderRoomsAdmin(roomsData);
      renderMetrics();
    };
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.remove(); }, 2000);
}

function renderMetrics() {
  const total = roomsData.length;
  const disponiveis = roomsData.filter(r => !!r.available).length;
  const indisponiveis = total - disponiveis;
  const elTotal = document.getElementById('metricsTotalRooms');
  const elOn = document.getElementById('metricsAvailableRooms');
  const elOff = document.getElementById('metricsUnavailableRooms');
  if (elTotal) elTotal.textContent = String(total);
  if (elOn) elOn.textContent = String(disponiveis);
  if (elOff) elOff.textContent = String(indisponiveis);
}

async function loadRooms() {
  try {
    const res = await fetch(`${API_BASE}/rooms`);
    roomsData = await res.json();
  } catch (e) {
    alert('Não foi possível carregar as salas. Verifique a API.');
    roomsData = [];
  }
  renderRoomsAdmin(roomsData);
  renderMetrics();
}

async function loadReservations() {
  const roomId = document.getElementById('resRoomId').value.trim();
  const start = document.getElementById('resStart').value;
  const end = document.getElementById('resEnd').value;
  if (!roomId || !start || !end) return alert('Informe sala, início e fim');
  const res = await fetch(`${API_BASE}/reservations/range?roomId=${roomId}&start=${start}&end=${end}`);
  const items = await res.json();
  const wrap = document.getElementById('resList');
  wrap.innerHTML = items.map(r => `
    <div class="res-item" data-id="${r._id}">
      <span>${r.date}</span>
      <span>${r.hour}</span>
      <span>${r.name}</span>
      <span>${r.sector}</span>
      <span>${r.motive || ''}</span>
      <div class="actions"><button class="del">Excluir</button></div>
    </div>
  `).join('');
  wrap.querySelectorAll('.res-item .del').forEach(btn => {
    btn.onclick = async (e) => {
      const id = e.target.closest('.res-item').dataset.id;
      if (!confirm('Confirmar exclusão do agendamento?')) return;
      const res = await fetch(`${API_BASE}/reservations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Erro ao excluir agendamento');
      loadReservations();
    };
  });
}

async function exportXlsx() {
  const roomId = document.getElementById('resRoomId').value.trim();
  const start = document.getElementById('resStart').value;
  const end = document.getElementById('resEnd').value;
  if (!roomId || !start || !end) return alert('Informe sala, início e fim');
  const url = `${API_BASE}/reservations/export?roomId=${roomId}&start=${start}&end=${end}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return alert(err.error || 'Falha ao exportar');
  }
  const blob = await resp.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agendamentos-${start}_a_${end}.xlsx`;
  a.click();
}

function updateUIAuth() {
  const logged = !!token;
  const login = document.getElementById('loginSection');
  const sections = document.querySelectorAll('.requires-auth');
  login.style.display = logged ? 'none' : '';
  sections.forEach(s => s.style.display = logged ? '' : 'none');
}

function showSection(id) {
  const ids = ['overviewSection', 'roomsSection', 'reservationsSection', 'reportsSection'];
  ids.forEach(x => {
    const el = document.getElementById(x);
    if (el) el.style.display = (x === id) ? '' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === id);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  token = localStorage.getItem('adminToken') || null;
  const path = location.pathname;
  if (path === '/admin' && !token) {
    location.replace('/admin/login');
    return;
  }
  if (path === '/admin/login' && token) {
    location.replace('/admin');
    return;
  }
  updateUIAuth();
  if (token) { loadRooms(); showSection('overviewSection'); }
  const btn = document.getElementById('btnAdminLogin');
  if (btn) btn.onclick = adminLogin;
  const pwd = document.getElementById('adminPassword');
  if (pwd) pwd.addEventListener('keydown', (e) => { if (e.key === 'Enter') adminLogin(); });
  const logout = document.getElementById('btnLogout');
  if (logout) logout.onclick = () => {
    localStorage.removeItem('adminToken');
    token = null;
    updateUIAuth();
    location.replace('/admin/login');
  };
  const btnCreate = document.getElementById('btnCreateRoom');
  if (btnCreate) btnCreate.onclick = createRoom;
  const nameEl2 = document.getElementById('roomName');
  if (nameEl2) nameEl2.addEventListener('input', () => nameEl2.classList.remove('input-error'));
  const btnToggleClose = document.getElementById('btnNewRoomCard');
  if (btnToggleClose) btnToggleClose.onclick = () => {
    const card = document.getElementById('createRoomCard');
    card.style.display = 'none';
  };
  const btnOpenCreate = document.getElementById('btnOpenCreateRoom');
  if (btnOpenCreate) btnOpenCreate.onclick = () => {
    const card = document.getElementById('createRoomCard');
    card.style.display = '';
  };
  const btnLoadRes = document.getElementById('btnLoadRes');
  if (btnLoadRes) btnLoadRes.onclick = loadReservations;
  const btnExport = document.getElementById('btnExportXlsx');
  if (btnExport) btnExport.onclick = exportXlsx;
  const roomFilter = document.getElementById('roomFilter');
  const btnRefreshRooms = document.getElementById('btnRefreshRooms');
  if (roomFilter) roomFilter.addEventListener('input', () => {
    const q = roomFilter.value.trim().toLowerCase();
    const filtered = roomsData.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.sector || '').toLowerCase().includes(q)
    );
    renderRoomsAdmin(filtered);
  });
  if (btnRefreshRooms) btnRefreshRooms.onclick = loadRooms;
  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.target));
  });
  const editModal = document.getElementById('editRoomModal');
  const btnSaveEdit = document.getElementById('btnSaveEditRoom');
  const btnCancelEdit = document.getElementById('btnCancelEditRoom');
  if (btnCancelEdit) btnCancelEdit.onclick = () => { if (editModal) editModal.style.display = 'none'; };
  if (editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.style.display = 'none'; });
  if (btnSaveEdit) btnSaveEdit.onclick = saveEditRoom;
});

function openEditRoom(row) {
  const m = document.getElementById('editRoomModal');
  m.dataset.id = row.dataset.id;
  document.getElementById('editRoomName').value = row.dataset.name || '';
  document.getElementById('editRoomSector').value = row.dataset.sector || '';
  document.getElementById('editRoomFloor').value = row.dataset.floor || '';
  document.getElementById('editRoomCreator').value = row.dataset.createdby || '';
  document.getElementById('editRoomCapacity').value = row.dataset.capacity || '';
  document.getElementById('editRoomAvailable').checked = row.dataset.available === '1';
  m.style.display = 'flex';
}

async function saveEditRoom() {
  const m = document.getElementById('editRoomModal');
  const id = m.dataset.id;
  const name = document.getElementById('editRoomName').value.trim();
  const sector = document.getElementById('editRoomSector').value.trim();
  const floor = document.getElementById('editRoomFloor').value.trim();
  const createdBy = document.getElementById('editRoomCreator').value.trim();
  const capacityRaw = document.getElementById('editRoomCapacity').value.trim();
  const available = document.getElementById('editRoomAvailable').checked;
  const capacity = capacityRaw === '' ? undefined : Number(capacityRaw);
  if (!name) { document.getElementById('editRoomName').focus(); return; }
  if (capacity !== undefined && (!Number.isFinite(capacity) || capacity < 0)) { document.getElementById('editRoomCapacity').focus(); return; }
  const body = { name, sector, floor, createdBy, capacity, available };
  const res = await fetch(`${API_BASE}/rooms/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'Erro ao salvar');
  const idx = roomsData.findIndex(x => x._id === id);
  if (idx >= 0) roomsData[idx] = data;
  renderRoomsAdmin(roomsData);
  renderMetrics();
  showToast('Sala atualizada');
  m.style.display = 'none';
}
