const API_BASE = 'http://localhost:4000/api';
let token = null;

async function adminLogin() {
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value.trim();
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'Falha no login');
  token = data.token;
  alert('Login realizado');
  loadRooms();
}

async function createRoom() {
  if (!token) return alert('Faça login primeiro');
  const name = document.getElementById('roomName').value.trim();
  const capacity = Number(document.getElementById('roomCapacity').value);
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, capacity: Number.isFinite(capacity) ? capacity : undefined }),
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'Erro ao criar sala');
  alert('Sala criada');
  loadRooms();
}

async function loadRooms() {
  const res = await fetch(`${API_BASE}/rooms`);
  const rooms = await res.json();
  const ul = document.getElementById('roomsList');
  ul.innerHTML = '';
  rooms.forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.name} ${r.capacity ? '(' + r.capacity + ')' : ''}`;
    ul.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', loadRooms);
