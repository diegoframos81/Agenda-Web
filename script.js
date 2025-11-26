const API_BASE = 'http://localhost:4000/api';
let calendar;

let dataSelecionada = '';
let horaParaCancelar = '';
let roomId = null;
let adminToken = localStorage.getItem('adminToken') || '';

const modal = document.getElementById('modal');
const cancelarModal = document.getElementById('cancelarModal');
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
  const label = monthLong.charAt(0).toUpperCase() + monthLong.slice(1);
  rangeLabel.textContent = label;
}

function showToast(msg) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
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

async function carregarSalas() {
  const res = await fetch(`${API_BASE}/rooms`);
  const rooms = await res.json();
  roomId = rooms[0]?._id || null;
}

function atualizarUIAdmin() {
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
  await carregarSalas();
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
  };
}

async function createReservationAt(dateStr, hourStr) {
  const nome = document.getElementById('nome').value.trim();
  const setor = document.getElementById('setor').value.trim();
  const motivo = document.getElementById('motivo').value.trim();
  if (!nome || !setor || !roomId) return;
  const payload = { roomId, date: dateStr, hours: [hourStr], name: nome, sector: setor, motive: motivo || undefined };
  const res = await fetch(`${API_BASE}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(`Erro: ${err.error || res.status}`);
    return;
  }
  const created = await res.json();
  const codes = created.map(r => `${r.hour}: ${r.cancelCode}`).join('\n');
  showToast('Reserva criada');
  alert(`Código(s) de cancelamento:\n${codes}`);
  calendar.refetchEvents();
}

async function createReservationFullDay(dateStr) {
  const nome = document.getElementById('nome').value.trim();
  const setor = document.getElementById('setor').value.trim();
  const motivo = document.getElementById('motivo').value.trim();
  if (!nome || !setor || !roomId) return;
  const payload = { roomId, date: dateStr, hours: horasDia(), name: nome, sector: setor, motive: motivo || undefined };
  const res = await fetch(`${API_BASE}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(`Erro: ${err.error || res.status}`);
    return;
  }
  const created = await res.json();
  const codes = created.map(r => `${r.hour}: ${r.cancelCode}`).join('\n');
  showToast('Dia todo reservado');
  alert(`Códigos de cancelamento:\n${codes}`);
  calendar.refetchEvents();
}

function abrirModalPara(dateStr, hourStr) {
  document.getElementById('horarioSelecionado').textContent = `${dateStr} ${hourStr}`;
  modal.style.display = 'flex';
  modal.dataset.date = dateStr;
  modal.dataset.hour = hourStr;
  modal.dataset.mode = 'hour';
}

async function confirmarReserva() {
  const dateStr = modal.dataset.date;
  const hourStr = modal.dataset.hour;
  const mode = modal.dataset.mode;
  if (mode === 'allday') {
    await createReservationFullDay(dateStr);
  } else {
    await createReservationAt(dateStr, hourStr);
  }
  modal.style.display = 'none';
  document.getElementById('nome').value = '';
  document.getElementById('setor').value = '';
  document.getElementById('motivo').value = '';
}

function abrirCancelamento(dateStr, hourStr) {
  cancelarModal.style.display = 'flex';
  document.getElementById('horaCancelar').textContent = `${dateStr} ${hourStr}`;
  cancelarModal.dataset.date = dateStr;
  cancelarModal.dataset.hour = hourStr;
}

async function confirmarCancelamento() {
  const codigo = document.getElementById('codigoCancelar').value.trim();
  const dateStr = cancelarModal.dataset.date;
  const hourStr = cancelarModal.dataset.hour;
  if (!codigo || !roomId || !dateStr || !hourStr) return;
  const res = await fetch(`${API_BASE}/reservations/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, date: dateStr, hour: hourStr, cancelCode: codigo }) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(`Erro: ${err.error || res.status}`);
    return;
  }
  cancelarModal.style.display = 'none';
  document.getElementById('codigoCancelar').value = '';
  calendar.refetchEvents();
}

document.addEventListener('DOMContentLoaded', async () => {
  await carregarSalas();
  atualizarUIAdmin();
  const now = new Date();
  const y = now.getFullYear();
  const yearStart = new Date(y, 0, 1);
  const yearEnd = new Date(y, 11, 31, 23, 59, 59);
  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    locale: 'pt-br',
    initialView: 'timeGridWeek',
    selectable: true,
    editable: true,
    eventDurationEditable: false,
    slotMinTime: '08:00:00',
    slotMaxTime: '17:00:00',
    slotDuration: '01:00:00',
    slotLabelInterval: '01:00:00',
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    expandRows: true,
    contentHeight: 560,
    validRange: { start: yearStart, end: yearEnd },
    views: { timeGridWeek: { weekends: false } },
    dayHeaderContent: (arg) => {
      const d = arg.date
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' })
      const dayName = weekday.charAt(0).toUpperCase() + weekday.slice(1)
      if (arg.view.type === 'timeGridWeek') {
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        return { html: `<span class="fc-dayname">${dayName}</span><span class="fc-daydate">${dateStr}</span>` }
      }
      return { html: `<span class="fc-dayname">${dayName}</span>` }
    },
    headerToolbar: false,
    eventClick: (info) => {
      const start = info.event.start;
      const dateStr = start.toISOString().slice(0, 10);
      const hourStr = start.toTimeString().slice(0,5);
      abrirCancelamento(dateStr, hourStr);
    },
    select: (sel) => {
      const start = sel.start;
      const dateStr = start.toISOString().slice(0,10);
      const hourStr = start.toTimeString().slice(0,5);
      abrirModalPara(dateStr, hourStr);
    },
    dateClick: (info) => {
      if (calendar.view.type === 'dayGridMonth') {
        const hourStr = prompt('Hora (08:00–16:00):', '08:00');
        if (!hourStr) return;
        abrirModalPara(info.dateStr, hourStr);
      }
    },
    datesSet: () => {
      const el = document.querySelector('.fc-timegrid-axis-cushion');
      if (el) el.textContent = 'Dia todo';
      document.querySelectorAll('.fc-daygrid-day').forEach(cell => {
        const date = cell.getAttribute('data-date');
        cell.onclick = () => {
          document.getElementById('horarioSelecionado').textContent = `${date} Dia todo`;
          modal.style.display = 'flex';
          modal.dataset.date = date;
          modal.dataset.mode = 'allday';
        };
      });
      ajustarLarguraEixo(200);

      const start = calendar.view.currentStart;
      const end = calendar.view.currentEnd;
      const dates = [];
      const cur = new Date(start);
      while (cur < end) {
        if (cur.getDay() >= 1 && cur.getDay() <= 5) {
          const iso = cur.toISOString().slice(0,10);
          dates.push(iso);
        }
        cur.setDate(cur.getDate() + 1);
      }
      customDate.innerHTML = dates.map(d => `<option value="${d}">${formatarIsoParaBr(d)}</option>`).join('');
      customStart.innerHTML = horasEntrada().map(h => `<option value="${h}">${h}</option>`).join('');
      customEnd.innerHTML = horasSaida().map(h => `<option value="${h}">${h}</option>`).join('');

      const isWeek = calendar.view.type === 'timeGridWeek';
      btnCustom.disabled = !isWeek;
    },
    eventDrop: async (info) => {
      const oldStart = info.oldEvent.start;
      const oldDate = oldStart.toISOString().slice(0,10);
      const oldHour = oldStart.toTimeString().slice(0,5);
      const newStart = info.event.start;
      const newDate = newStart.toISOString().slice(0,10);
      const newHour = newStart.toTimeString().slice(0,5);
      const codigo = prompt('Código de cancelamento para mover:');
      if (!codigo) { info.revert(); return; }
      const createRes = await fetch(`${API_BASE}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, date: newDate, hours: [newHour], name: info.event.title.split(' - ')[1], sector: info.event.title.split(' - ')[0] }) });
      if (!createRes.ok) { showToast('Conflito no novo horário'); info.revert(); return; }
      const cancelRes = await fetch(`${API_BASE}/reservations/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, date: oldDate, hour: oldHour, cancelCode: codigo }) });
      if (!cancelRes.ok) { showToast('Código inválido, revertendo'); info.revert(); return; }
      showToast('Evento movido');
      calendar.refetchEvents();
    },
    events: async (fetchInfo, success, failure) => {
      try {
        if (!roomId) return success([]);
        const url = `${API_BASE}/reservations/range?roomId=${roomId}&start=${fetchInfo.startStr.slice(0,10)}&end=${fetchInfo.endStr.slice(0,10)}`;
        const res = await fetch(url);
        const data = await res.json();
        success(data.map(mapReservationToEvent));
      } catch (e) {
        failure(e);
      }
    },
  });
  calendar.render();

  btnHoje.onclick = () => { calendar.today(); updateRangeLabel(); };
  btnPrev.onclick = () => { calendar.prev(); updateRangeLabel(); };
  btnNext.onclick = () => { calendar.next(); updateRangeLabel(); };
  viewSelect.onchange = () => { calendar.changeView(viewSelect.value); updateRangeLabel(); };
  btnNovaSala.onclick = () => { criarSala(); };
  btnCustom.onclick = () => { customModal.style.display = 'flex'; };
  document.getElementById('btnConfirmCustom').onclick = async () => {
    const dateStr = customDate.value;
    const startStr = customStart.value;
    const endStr = customEnd.value;
    const nome = document.getElementById('customNome').value.trim();
    const setor = document.getElementById('customSetor').value.trim();
    const motivo = document.getElementById('customMotivo').value.trim();
    if (!dateStr || !startStr || !endStr || !nome || !setor || !roomId) return;
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
    showToast('Reserva criada');
    alert(`Código(s) de cancelamento:\n${codes}`);
    customModal.style.display = 'none';
    document.getElementById('customNome').value = '';
    document.getElementById('customSetor').value = '';
    document.getElementById('customMotivo').value = '';
    calendar.refetchEvents();
  };
  updateRangeLabel();
});

function updateRangeLabel() {
  const refDate = calendar.getDate();
  formatarRangeLabel(refDate);
}

function ajustarLarguraEixo(px) {
  const selectors = [
    '.fc-col-header col:first-child',
    '.fc-scrollgrid-sync-table col:first-child',
    '.fc-timegrid-slots col:first-child',
    '.fc-timegrid-cols col:first-child',
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(col => {
      col.style.width = `${px}px`;
    });
  });
}
