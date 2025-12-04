const API_BASE = 'http://localhost:4000/api';
let calendar;
let refetchTimer = null;
const eventsCache = {};

let dataSelecionada = '';
let horaParaCancelar = '';
let roomId = null;
let roomsCache = [];
let adminToken = localStorage.getItem('adminToken') || '';

const modal = document.getElementById('modal');
const cancelarModal = document.getElementById('cancelarModal');
const nomeCancelarInput = document.getElementById('nomeCancelar');
const cancelListEl = document.getElementById('cancelList');
const confirmPhraseEl = document.getElementById('confirmPhrase');
let cancelBaseName = '';
let cancelSelectedHours = [];
const viewSelect = document.getElementById('viewSelect');
const rangeLabel = document.getElementById('rangeLabel');
const btnHoje = document.getElementById('btnHoje');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnNovaSala = document.getElementById('btnNovaSala');
const btnCustom = document.getElementById('btnCustom');
const customModal = document.getElementById('customModal');
const customDate = document.getElementById('customDate');
const customStart = document.getElementById('customStart');
const customEnd = document.getElementById('customEnd');
const daySelect = document.getElementById('daySelect');

function getDiasUteisSemana(offset = 0) {
  const dias = [];
  const hoje = new Date();
  const segunda = new Date(hoje);
  const diaSemana = hoje.getDay();
  segunda.setDate(hoje.getDate() - ((diaSemana + 6) % 7) + offset * 7);
  for (let i = 0; i < 5; i++) {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    dias.push(d);
  }
  return dias;
}

function formatarDataBr(date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function mudarSemana(direcao) {
  semanaOffset += direcao;
  gerarDiasSemana();
}

function formatarRangeLabel(start) {
  const monthLong = start.toLocaleDateString('pt-BR', { month: 'long' });
  const year = start.getFullYear();
  const label = monthLong.charAt(0).toUpperCase() + monthLong.slice(1) + ' ' + year;
  rangeLabel.textContent = label;
}

function showToast(msg) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

function showLoading() {
  let el = document.getElementById('loadingOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.className = 'loading-overlay';
    el.innerHTML = '<div class="loading-spinner"></div><span>Carregando...</span>';
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}

function debouncedRefetch(ms = 200) {
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => { if (calendar) calendar.refetchEvents(); }, ms);
}

function horasDia() {
  const horas = [];
  for (let h = 8; h <= 16; h++) horas.push(`${String(h).padStart(2,'0')}:00`);
  return horas;
}

function formatarIsoParaBr(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function horasEntrada() {
  const horas = [];
  for (let h = 8; h <= 16; h++) horas.push(`${String(h).padStart(2,'0')}:00`);
  return horas;
}

function horasSaida() {
  const horas = [];
  for (let h = 9; h <= 17; h++) horas.push(`${String(h).padStart(2,'0')}:00`);
  return horas;
}

function gerarHorasIntervalo(startStr, endStr) {
  const [sh] = startStr.split(':').map(Number);
  const [eh] = endStr.split(':').map(Number);
  const out = [];
  for (let h = sh; h < eh; h++) out.push(`${String(h).padStart(2,'0')}:00`);
  return out;
}

async function getRooms() {
  try {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error(`Falha ao carregar salas (${res.status})`);
    const rooms = await res.json();
    roomsCache = rooms;
    console.log('Salas carregadas:', rooms);
    return rooms;
  } catch (e) {
    showToast('Não foi possível carregar as salas. Verifique a API.');
    console.error('Erro ao carregar salas:', e);
    roomsCache = [];
    return [];
  }
}

function toSlug(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function findRoomIdBySlug(slug) {
  const r = roomsCache.find(r => toSlug(r.name) === slug);
  return r?._id || null;
}

function renderRooms(rooms) {
  const grid = document.getElementById('roomsGrid');
  grid.style.display = '';
  const html = rooms.map(r => {
    const cap = r.capacity ? `Capacidade: ${r.capacity}` : '';
    const cls = r.available ? 'room-card' : 'room-card disabled';
    const sector = r.sector ? `Setor: ${r.sector}` : '';
    const floor = r.floor ? `Andar: ${r.floor}` : '';
    return `<div class="${cls}" data-id="${r._id}"><h3>${r.name}</h3><div class="room-meta">${[sector, floor, cap].filter(Boolean).map(t=>`<span>${t}</span>`).join('')}</div></div>`;
  }).join('');
  grid.innerHTML = html;
  document.querySelectorAll('.room-card').forEach(el => {
    el.onclick = () => {
      if (el.classList.contains('disabled')) return;
      const r = rooms.find(x => x._id === el.dataset.id);
      const slug = r ? toSlug(r.name || '') : el.dataset.id;
      location.assign(`/${slug}/agendamento`);
    };
  });
}

function atualizarUIAdmin() {
  if (!btnNovaSala) return;
  if (adminToken) {
    btnNovaSala.style.display = '';
  } else {
    btnNovaSala.style.display = 'none';
  }
}

// Login permanece como rota oculta na API; o front apenas lê token existente.

async function criarSala() {
  const name = prompt('Nome da sala:');
  if (!name) return;
  const capacityStr = prompt('Capacidade (opcional):');
  const capacity = capacityStr ? Number(capacityStr) : undefined;
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const res = await fetch(`${API_BASE}/rooms`, { method: 'POST', headers, body: JSON.stringify({ name, capacity }) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(`Erro: ${err.error || res.status}`);
    return;
  }
  await getRooms();
  if (location.pathname === '/') renderRooms(roomsCache);
  showToast('Sala criada');
}

function mapReservationToEvent(r) {
  const start = `${r.date}T${r.hour}`;
  const [hh] = r.hour.split(':');
  const endHour = String(Number(hh) + 1).padStart(2, '0');
  const end = `${r.date}T${endHour}:00`;
  return {
    id: r._id,
    title: `${r.sector} - ${r.name}`,
    start,
    end,
    extendedProps: { name: r.name, sector: r.sector, motive: r.motive || '' },
  };
}

async function createReservationAt(dateStr, hourStr) {
  const nome = document.getElementById('nome').value.trim();
  const setor = document.getElementById('setor').value.trim();
  const motivo = document.getElementById('motivo').value.trim();
  if (!nome || !setor || !roomId) return false;
  const payload = { roomId, date: dateStr, hours: [hourStr], name: nome, sector: setor, motive: motivo || undefined };
  const res = await fetch(`${API_BASE}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(`Erro: ${err.error || res.status}`);
    return false;
  }
  await res.json();
  showToast('Reserva criada');
  calendar.refetchEvents();
  for (const k in eventsCache) delete eventsCache[k];
  return true;
}

async function createReservationFullDay(dateStr) {
  const nome = document.getElementById('nome').value.trim();
  const setor = document.getElementById('setor').value.trim();
  const motivo = document.getElementById('motivo').value.trim();
  if (!nome || !setor || !roomId) return false;
  const payload = { roomId, date: dateStr, hours: horasDia(), name: nome, sector: setor, motive: motivo || undefined };
  const res = await fetch(`${API_BASE}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(`Erro: ${err.error || res.status}`);
    return false;
  }
  await res.json();
  showToast('Dia todo reservado');
  calendar.refetchEvents();
  for (const k in eventsCache) delete eventsCache[k];
  return true;
}

function abrirModalPara(dateStr, hourStr) {
  const dataBr = formatarIsoParaBr(dateStr);
  document.getElementById('horarioSelecionado').textContent = `${dataBr} às ${hourStr}`;
  modal.style.display = 'flex';
  const content = modal.querySelector('.modal-content');
  if (content) { content.classList.remove('anim-scale-out','anim-fade-out'); content.classList.add('anim-scale-in'); }
  modal.dataset.date = dateStr;
  modal.dataset.hour = hourStr;
  modal.dataset.mode = 'hour';
}

async function confirmarReserva() {
  const dateStr = modal.dataset.date;
  const hourStr = modal.dataset.hour;
  const mode = modal.dataset.mode;
  let success = false;
  
  if (mode === 'allday') {
    success = await createReservationFullDay(dateStr);
  } else {
    success = await createReservationAt(dateStr, hourStr);
  }
  
  if (success) {
    modal.style.display = 'none';
    document.getElementById('nome').value = '';
    document.getElementById('setor').value = '';
    document.getElementById('motivo').value = '';
  }
}

function abrirCancelamento(dateStr, hourStr) {
  cancelarModal.style.display = 'flex';
  const content = cancelarModal.querySelector('.modal-content');
  if (content) { content.classList.remove('anim-scale-out','anim-fade-out'); content.classList.add('anim-scale-in'); }
  document.getElementById('horaCancelar').textContent = `${dateStr} ${hourStr}`;
  cancelarModal.dataset.date = dateStr;
  cancelarModal.dataset.hour = hourStr;
  // preparar etapas e dados
  const step1 = document.getElementById('cancelStep1');
  const step2 = document.getElementById('cancelStep2');
  if (step1 && step2) {
    step1.style.display = '';
    step2.style.display = 'none';
  }
  if (nomeCancelarInput) nomeCancelarInput.value = '';
  if (confirmPhraseEl) confirmPhraseEl.value = '';
  cancelBaseName = '';
  cancelSelectedHours = [];
  montarListaCancelamentos(dateStr);
  bindCancelNameFilter();
}

function montarListaCancelamentos(dateStr) {
  if (!cancelListEl) return;
  const items = (calendar && Array.isArray(calendar.events)) ? calendar.events.filter(e => e.date === dateStr) : [];
  // Ordenar por hora
  items.sort((a, b) => a.hour.localeCompare(b.hour));
  cancelListEl.innerHTML = items.map(ev => {
    const id = `cancel_${ev.date}_${ev.hour}`.replace(/[^a-zA-Z0-9_]/g,'_');
    const label = `<span class="hour-blue">${ev.hour}</span> — <span class="name-blue">${ev.name}</span>${ev.sector ? ' <span class="muted">('+ev.sector+')</span>' : ''}${ev.motive ? ' — <span class="muted">'+ev.motive+'</span>' : ''}`;
    return `<label class="cancel-item"><input type="checkbox" data-hour="${ev.hour}" data-name="${ev.name}" id="${id}"> ${label}</label>`;
  }).join('') || '<em>Não há reservas ativas para este dia.</em>';

  cancelListEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const name = cb.dataset.name || '';
      if (cb.checked && !cancelBaseName) {
        cancelBaseName = name; // fixa o nome base
        // desabilitar itens com nome diferente
        bloquearNomesDiferentes();
      }
      if (!Array.from(cancelListEl.querySelectorAll('input[type="checkbox"]')).some(x => x.checked)) {
        // nenhuma seleção: liberar novamente
        cancelBaseName = '';
        desbloquearTodos();
      }
      atualizarSelecionados();
    });
  });
  atualizarSelecionados();
}

function bloquearNomesDiferentes() {
  cancelListEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const same = (cb.dataset.name || '') === cancelBaseName;
    cb.disabled = !same && !cb.checked;
    const label = cb.closest('label');
    if (label) label.style.opacity = same || cb.checked ? '1' : '0.5';
  });
}

function desbloquearTodos() {
  cancelListEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.disabled = false;
    const label = cb.closest('label');
    if (label) label.style.opacity = '1';
  });
}

function atualizarSelecionados() {
  cancelSelectedHours = Array.from(cancelListEl.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.dataset.hour);
}

function bindCancelNameFilter() {
  if (!nomeCancelarInput) return;
  nomeCancelarInput.oninput = () => {
    const term = nomeCancelarInput.value.trim().toLowerCase();
    cancelListEl.querySelectorAll('label.cancel-item').forEach(lbl => {
      const cb = lbl.querySelector('input[type="checkbox"]');
      const name = (cb?.dataset.name || '').toLowerCase();
      const show = term.length === 0 || name.includes(term);
      lbl.style.display = show ? '' : 'none';
    });
  };
}

function avancarCancelamento() {
  if (cancelSelectedHours.length === 0) { showToast('Selecione ao menos uma reserva'); return; }
  if (!cancelBaseName) { showToast('Selecione a primeira reserva para fixar o nome'); return; }
  const dateStr = cancelarModal.dataset.date;
  const dataBr = formatarIsoParaBr(dateStr);
  const resumoTxt = `Cancelar ${cancelSelectedHours.length} reserva(s) de \"${cancelBaseName}\" no dia ${dataBr} (${cancelSelectedHours.join(', ')})`;
  const resumo = document.getElementById('cancelResumo');
  if (resumo) resumo.textContent = resumoTxt;
  const step1 = document.getElementById('cancelStep1');
  const step2 = document.getElementById('cancelStep2');
  if (step1 && step2) { step1.style.display = 'none'; step2.style.display = ''; }
}

function voltarCancelamento() {
  const step1 = document.getElementById('cancelStep1');
  const step2 = document.getElementById('cancelStep2');
  if (step1 && step2) { step2.style.display = 'none'; step1.style.display = ''; }
}

async function confirmarCancelamento() {
  const dateStr = cancelarModal.dataset.date;
  if (!roomId || !dateStr) return;
  if (cancelSelectedHours.length === 0) { showToast('Nenhuma reserva selecionada'); return; }
  if (!confirmPhraseEl || confirmPhraseEl.value !== 'Confirmo o cancelamento') { showToast('Digite exatamente: Confirmo o cancelamento'); return; }

  const requests = cancelSelectedHours.map(hour => {
    return fetch(`${API_BASE}/reservations/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, date: dateStr, hour, name: cancelBaseName })
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `Falha ao cancelar ${hour}`);
      }
      return r.json();
    });
  });

  try {
    await Promise.all(requests);
    showToast(`Cancelado(s): ${cancelSelectedHours.length}`);
  } catch (e) {
    console.error(e);
    showToast(e.message || 'Erro ao cancelar');
  }
  cancelarModal.style.display = 'none';
  if (nomeCancelarInput) nomeCancelarInput.value = '';
  if (confirmPhraseEl) confirmPhraseEl.value = '';
  cancelBaseName = '';
  cancelSelectedHours = [];
  calendar.refetchEvents();
  for (const k in eventsCache) delete eventsCache[k];
}

document.addEventListener('DOMContentLoaded', async () => {
  const path = location.pathname;
  const rooms = await getRooms();
  atualizarUIAdmin();
  const isHome = path === '/';
  const isCalendarRoute = /^\/[^/]+\/agendamento$/.test(path);
  if (isHome) {
    document.querySelector('.topbar').style.display = 'none';
    document.getElementById('calendar').style.display = 'none';
    renderRooms(rooms);
    return;
  }
  if (isCalendarRoute) {
    const seg = decodeURIComponent(path.split('/')[1]);
    const bySlug = findRoomIdBySlug(seg);
    if (bySlug) {
      roomId = bySlug;
    } else {
      const exists = rooms.some(r => r._id === seg);
      roomId = exists ? seg : (rooms[0]?._id || null);
    }
  } else {
    roomId = rooms[0]?._id || null;
  }
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = now.toISOString().slice(0, 10);
  
  // Inicializar calendário customizado
  calendar = new CustomCalendar(document.getElementById('calendar'), {
    onCellClick: (date, hour) => {
      if (date < todayISO) return;
      abrirModalPara(date, hour);
    },
    onEventClick: (eventId) => {
      const event = calendar.events.find(e => e.id === eventId);
      if (event) {
        abrirCancelamento(event.date, event.hour);
      }
    },
    onMonthCellClick: (date) => {
      if (window.innerWidth <= 768) {
        calendar.changeView('week', date);
      } else {
        calendar.changeView('week', date);
      }
      updateRangeLabel();
      fetchAndDisplayEvents();
    },
    onRefetch: () => {
      fetchAndDisplayEvents();
    }
  });
  
  // Detectar vista inicial
  function getDeviceType() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    
    if (width < 380) return { type: 'phone-small', view: 'month', isPortrait };
    if (width < 768) return { type: 'phone-large', view: isPortrait ? 'month' : 'week', isPortrait };
    if (width < 1025) return { type: 'tablet', view: 'week', isPortrait };
    if (width < 1921) return { type: 'desktop', view: 'week', isPortrait };
    return { type: '4k-tv', view: 'week', isPortrait };
  }
  
  const device = getDeviceType();
  calendar.changeView(device.view);
  viewSelect.value = device.view;
  updateRangeLabel();
  fetchAndDisplayEvents();
  populateDaySelect();
  
  async function fetchAndDisplayEvents() {
    if (!roomId) return;
    const start = new Date(calendar.currentDate);
    start.setDate(start.getDate() - 7);
    const end = new Date(calendar.currentDate);
    end.setDate(end.getDate() + 14);
    
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    
    try {
      const url = `${API_BASE}/reservations/range?roomId=${roomId}&start=${startStr}&end=${endStr}`;
      const res = await fetch(url);
      const data = await res.json();
      const reservations = Array.isArray(data) ? data : [];
      
      const events = reservations.map(r => ({
        id: r._id,
        date: r.date,
        hour: r.hour,
        title: `${r.sector} - ${r.name}`,
        motive: r.motive || '',
        sector: r.sector,
        name: r.name
      }));
      
      calendar.setEvents(events);
    } catch (e) {
      console.error('Erro ao buscar eventos:', e);
    }
  }
  
  // Botões de navegação
  btnHoje.onclick = () => { calendar.today(); updateRangeLabel(); fetchAndDisplayEvents(); populateDaySelect(); };
  btnPrev.onclick = () => { calendar.prev(); updateRangeLabel(); fetchAndDisplayEvents(); populateDaySelect(); };
  btnNext.onclick = () => { calendar.next(); updateRangeLabel(); fetchAndDisplayEvents(); populateDaySelect(); };
  
  viewSelect.onchange = () => {
    const target = viewSelect.value;
    calendar.changeView(target);
    updateRangeLabel();
    fetchAndDisplayEvents();
    populateDaySelect();
  };
  
  if (btnNovaSala) btnNovaSala.onclick = () => { criarSala(); };
  btnCustom.onclick = () => { 
    populateCustomDates();
    customModal.style.display = 'flex'; 
  };
  
  const btnAllDay = document.getElementById('btnAllDay');
  if (btnAllDay) btnAllDay.onclick = () => {
    const cur = calendar.getDate();
    const iso = new Date(cur).toISOString().slice(0,10);
    if (iso < todayISO) { showToast('Data no passado'); return; }
    const dataBr = formatarIsoParaBr(iso);
    document.getElementById('horarioSelecionado').textContent = `${dataBr} - Dia todo`;
    modal.style.display = 'flex';
    modal.dataset.date = iso;
    modal.dataset.mode = 'allday';
  };
  
  function populateCustomDates() {
    const weekDays = calendar.getWeekDays ? calendar.getWeekDays() : [];
    const dates = weekDays.map(d => d.iso);
    customDate.innerHTML = dates.map(d => `<option value="${d}">${formatarIsoParaBr(d)}</option>`).join('');
    customStart.innerHTML = horasEntrada().map(h => `<option value="${h}">${h}</option>`).join('');
    customEnd.innerHTML = horasSaida().map(h => `<option value="${h}">${h}</option>`).join('');
  }
  
  document.getElementById('btnConfirmCustom').onclick = async () => {
    const dateStr = customDate.value;
    const startStr = customStart.value;
    const endStr = customEnd.value;
    const nome = document.getElementById('customNome').value.trim();
    const setor = document.getElementById('customSetor').value.trim();
    const motivo = document.getElementById('customMotivo').value.trim();
    if (!dateStr || !startStr || !endStr || !nome || !setor || !roomId) return;
    if (dateStr < todayISO) { showToast('Data no passado'); return; }
    if (startStr >= endStr) { showToast('Entrada deve ser antes da saída'); return; }
    const hours = gerarHorasIntervalo(startStr, endStr);
    if (hours.length === 0) { showToast('Intervalo inválido'); return; }
    const res = await fetch(`${API_BASE}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, date: dateStr, hours, name: nome, sector: setor, motive: motivo || undefined }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(`Erro: ${err.error || res.status}`);
      return;
    }
    const created = await res.json();
    const codes = created.map(r => `${r.hour}: ${r.cancelCode}`).join('\n');
    showToast(`Reserva criada!\nCódigos de cancelamento:\n${codes}`);
    customModal.style.display = 'none';
    document.getElementById('customNome').value = '';
    document.getElementById('customSetor').value = '';
    document.getElementById('customMotivo').value = '';
    fetchAndDisplayEvents();
  };
  
  updateRangeLabel();
  
  // Event listener para seletor de dia (mobile/tablet)
  if (daySelect) {
    daySelect.addEventListener('change', () => {
      const selectedDate = daySelect.value;
      if (selectedDate) {
        calendar.changeView('week', selectedDate);
        updateRangeLabel();
        fetchAndDisplayEvents();
      }
    });
  }
  
  function updateRangeLabel() {
    const cur = calendar.getDate();
    formatarRangeLabel(cur);
  }
  
  // Fechar modais ao clicar no overlay
  [modal, cancelarModal, customModal].forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) {
        const content = m.querySelector('.modal-content');
        if (content) {
          content.classList.add('anim-scale-out', 'anim-fade-out');
          setTimeout(() => {
            m.style.display = 'none';
            content.classList.remove('anim-scale-out', 'anim-fade-out');
          }, 200);
        } else {
          m.style.display = 'none';
        }
      }
    });
  });
});

function updateRangeLabel() {
  const refDate = calendar.getDate();
  formatarRangeLabel(refDate);
}

document.querySelectorAll('.modal .modal-content').forEach(el => {
  el.addEventListener('click', (e) => { e.stopPropagation(); });
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    const c = modal.querySelector('.modal-content');
    if (c) { c.classList.remove('anim-scale-in'); c.classList.add('anim-fade-out','anim-scale-out'); setTimeout(()=>{ modal.style.display='none'; c.classList.remove('anim-fade-out','anim-scale-out'); }, 220); }
    document.getElementById('nome').value = '';
    document.getElementById('setor').value = '';
    document.getElementById('motivo').value = '';
  }
});

cancelarModal.addEventListener('click', (e) => {
  if (e.target === cancelarModal) {
    const c = cancelarModal.querySelector('.modal-content');
    if (c) { c.classList.remove('anim-scale-in'); c.classList.add('anim-fade-out','anim-scale-out'); setTimeout(()=>{ cancelarModal.style.display='none'; c.classList.remove('anim-fade-out','anim-scale-out'); }, 220); }
    const nc = document.getElementById('nomeCancelar');
    if (nc) nc.value = '';
  }
});

customModal.addEventListener('click', (e) => {
  if (e.target === customModal) {
    customModal.style.display = 'none';
    document.getElementById('customNome').value = '';
    document.getElementById('customSetor').value = '';
    document.getElementById('customMotivo').value = '';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modal.style.display === 'flex') {
      modal.style.display = 'none';
      document.getElementById('nome').value = '';
      document.getElementById('setor').value = '';
      document.getElementById('motivo').value = '';
    } else if (cancelarModal.style.display === 'flex') {
      cancelarModal.style.display = 'none';
      if (confirmPhraseEl) confirmPhraseEl.value = '';
      if (nomeCancelarInput) nomeCancelarInput.value = '';
      cancelBaseName = '';
      cancelSelectedHours = [];
    } else if (customModal.style.display === 'flex') {
      customModal.style.display = 'none';
      document.getElementById('customNome').value = '';
      document.getElementById('customSetor').value = '';
      document.getElementById('customMotivo').value = '';
    }
  }
});
function getWeekDates(refDate) {
  const d = new Date(refDate);
  const day = d.getDay();
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - mondayOffset);
  const list = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    list.push(x);
  }
  return list;
}

function populateDaySelect() {
  if (!daySelect) return;
  const isMobileOrTablet = window.innerWidth <= 1024;
  daySelect.style.display = isMobileOrTablet ? '' : 'none';
  if (!isMobileOrTablet) return;
  
  const weekDays = calendar ? calendar.getWeekDays() : [];
  if (weekDays.length === 0) return;
  
  daySelect.innerHTML = weekDays.map(day => {
    const dateParts = day.date.split('/');
    const label = `${day.name.slice(0, 3)} ${dateParts[0]}/${dateParts[1]}`;
    return `<option value="${day.iso}">${label}</option>`;
  }).join('');
  
  const curIso = new Date(calendar.getDate()).toISOString().slice(0,10);
  const opt = Array.from(daySelect.options).find(o => o.value === curIso);
  if (opt) daySelect.value = curIso;
}
