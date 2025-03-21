const firebaseConfig = {
  apiKey: "AIzaSyBJHqg4Hg67ZQd4ckQOzpfAFU7PAnnuopE",
  authDomain: "agenda-sr-e61b8.firebaseapp.com",
  databaseURL: "https://agenda-sr-e61b8-default-rtdb.firebaseio.com",
  projectId: "agenda-sr-e61b8",
  storageBucket: "agenda-sr-e61b8.firebasestorage.app",
  messagingSenderId: "762223985846",
  appId: "1:762223985846:web:cbae74d291de3d3b8b9217"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let semanaOffset = 0;
let dataSelecionada = '';
let horaAtual = '';
let horaParaCancelar = '';
let nomeOriginal = '';

const diasSemanaDiv = document.getElementById('diasSemana');
const tituloDia = document.getElementById('tituloDia');
const horariosDiv = document.getElementById('horarios');
const modal = document.getElementById('modal');
const cancelarModal = document.getElementById('cancelarModal');

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

function gerarDiasSemana() {
  const dias = getDiasUteisSemana(semanaOffset);
  diasSemanaDiv.innerHTML = '';
  dias.forEach((dia, index) => {
    const btn = document.createElement('button');
    btn.textContent = formatarDataBr(dia);
    btn.onclick = () => selecionarDia(dia, btn);
    if (index === 0) btn.classList.add('active');
    diasSemanaDiv.appendChild(btn);
    if (index === 0) selecionarDia(dia, btn);
  });
  
function formatarDataCompacta(data) {
  const dia = data.getDate().toString().padStart(2, '0');
  const mes = data.toLocaleString('pt-BR', { month: 'short' });
  const ano = data.getFullYear();
  return `${dia} ${mes} ${ano}`;
}

  document.getElementById('semanaAtualLabel').textContent = `Semana: ${formatarDataCompacta(dias[0])} – ${formatarDataCompacta(dias[4])}`; `Semana de ${formatarDataBr(dias[0])} a ${formatarDataBr(dias[4])}`;
}

function selecionarDia(data, botao) {
  dataSelecionada = data.toISOString().split('T')[0];
  document.querySelectorAll('#diasSemana button').forEach(btn => btn.classList.remove('active'));
  botao.classList.add('active');
  tituloDia.textContent = `Horários para ${formatarDataBr(data)}`;
  gerarHorarios();
}

function gerarHorarios() {
  horariosDiv.innerHTML = '';
  for (let h = 8; h <= 16; h++) {
    const hora = `${h.toString().padStart(2, '0')}:00`;
    const card = document.createElement('div');
    card.className = 'card';
    const label = document.createElement('div');
    label.textContent = hora;
    const botao = document.createElement('button');
    botao.textContent = 'Reservar';
    botao.onclick = () => abrirModal(hora);

    db.ref(`reservas/${dataSelecionada}/${hora}`).get().then(snap => {
      if (snap.exists()) {
        const dados = snap.val();
        card.classList.add('reservado');
        botao.disabled = true;
        botao.textContent = 'Reservado';
        const info = document.createElement('small');
        info.textContent = `${dados.nome} - ${dados.setor}`;
        info.style.display = 'block';
        info.style.marginTop = '0.5rem';
        const cancelar = document.createElement('button');
        cancelar.textContent = 'Cancelar';
        cancelar.style.marginTop = '0.5rem';
        cancelar.onclick = () => abrirCancelamento(hora, dados.nome);
        card.appendChild(label);
        card.appendChild(botao);
        card.appendChild(info);
        card.appendChild(cancelar);
      } else {
        card.appendChild(label);
        card.appendChild(botao);
      }
      horariosDiv.appendChild(card);
    });
  }
}

function abrirModal(hora) {
  modal.style.display = 'flex';
  document.getElementById('horarioSelecionado').textContent = hora;
  horaAtual = hora;
}

function confirmarReserva() {
  const nome = document.getElementById('nome').value.trim();
  const setor = document.getElementById('setor').value.trim();
  if (!nome || !setor) return alert('Preencha todos os campos');
  db.ref(`reservas/${dataSelecionada}/${horaAtual}`).set({ nome, setor }).then(() => {
    modal.style.display = 'none';
    document.getElementById('nome').value = '';
    document.getElementById('setor').value = '';
    gerarHorarios();
  });
}

function abrirCancelamento(hora, nome) {
  cancelarModal.style.display = 'flex';
  document.getElementById('horaCancelar').textContent = hora;
  horaParaCancelar = hora;
  nomeOriginal = nome;
}

function confirmarCancelamento() {
  const nomeDigitado = document.getElementById('nomeCancelar').value.trim();
  if (nomeDigitado !== nomeOriginal) {
    alert('Nome incorreto. Só quem fez a reserva pode cancelar.');
    return;
  }
  db.ref(`reservas/${dataSelecionada}/${horaParaCancelar}`).remove().then(() => {
    cancelarModal.style.display = 'none';
    document.getElementById('nomeCancelar').value = '';
    gerarHorarios();
  });
}

document.addEventListener('DOMContentLoaded', gerarDiasSemana);
