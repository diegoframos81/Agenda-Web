// Calendário customizado para substituir FullCalendar
class CustomCalendar {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.currentDate = new Date();
    this.view = 'week';
    this.events = [];
    this.render();
  }

  render() {
    if (this.view === 'week') {
      this.renderWeekView();
    } else if (this.view === 'month') {
      this.renderMonthView();
    }
  }

  renderWeekView() {
    const weekDays = this.getWeekDays();
    const hours = this.getHours();
    
    let html = '<div class="custom-calendar week-view">';
    
    // Cabeçalho
    html += '<div class="calendar-header">';
    html += '<div class="hour-column header-cell">Horários</div>';
    weekDays.forEach(day => {
      html += `<div class="day-column header-cell">
        <div class="day-name">${day.name}</div>
        <div class="day-date">${day.date}</div>
      </div>`;
    });
    html += '</div>';
    
    // Grade de horários
    const today = new Date().toISOString().slice(0, 10);
    html += '<div class="calendar-body">';
    hours.forEach(hour => {
      html += '<div class="time-row">';
      html += `<div class="hour-column">${hour}</div>`;
      weekDays.forEach(day => {
        const cellId = `${day.iso}-${hour}`;
        const event = this.findEvent(day.iso, hour);
        const isPast = day.iso < today;
        const isToday = day.iso === today;
        const classes = ['day-cell'];
        if (isPast) classes.push('past');
        if (isToday) classes.push('today');
        html += `<div class="${classes.join(' ')}" data-date="${day.iso}" data-hour="${hour}" data-cell-id="${cellId}">
          ${event ? this.renderEvent(event) : ''}
        </div>`;
      });
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';
    
    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  renderMonthView() {
    const monthDays = this.getMonthDays();
    const weeks = this.groupByWeeks(monthDays);
    
    let html = '<div class="custom-calendar month-view">';
    html += '<div class="month-grid">';
    
    // Dias da semana
    html += '<div class="weekday-header">';
    ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].forEach(day => {
      html += `<div class="weekday-name">${day}</div>`;
    });
    html += '</div>';
    
    // Semanas
    const today = new Date().toISOString().slice(0, 10);
    weeks.forEach(week => {
      html += '<div class="week-row">';
      week.forEach(day => {
        if (day) {
          const count = this.getEventCount(day.iso);
          const isPast = day.iso < today;
          const classes = ['month-cell'];
          if (isPast) classes.push('past');
          if (day.isToday) classes.push('today');
          html += `<div class="${classes.join(' ')}" data-date="${day.iso}">
            <div class="month-day-number">${day.day}</div>
            ${count > 0 ? `<div class="event-count-badge">${count}</div>` : ''}
          </div>`;
        } else {
          html += '<div class="month-cell empty"></div>';
        }
      });
      html += '</div>';
    });
    
    html += '</div></div>';
    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  renderEvent(event) {
    return `<div class="calendar-event" data-event-id="${event.id}">
      <div class="event-title">${event.title}</div>
      ${event.motive ? `<div class="event-motive">${event.motive}</div>` : ''}
    </div>`;
  }

  getWeekDays() {
    const days = [];
    const start = new Date(this.currentDate);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para segunda-feira
    start.setDate(start.getDate() + diff);
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push({
        name: date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()),
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        iso: date.toISOString().slice(0, 10),
        dateObj: date,
        isToday: date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
      });
    }
    return days;
  }

  getHours() {
    const hours = [];
    for (let h = 8; h <= 16; h++) {
      hours.push(`${String(h).padStart(2, '0')}:00`);
    }
    return hours;
  }

  getMonthDays() {
    const days = [];
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date().toISOString().slice(0, 10);
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const iso = date.toISOString().slice(0, 10);
        days.push({
          day: d,
          iso: iso,
          isToday: iso === today,
          dateObj: date
        });
      }
    }
    return days;
  }

  groupByWeeks(days) {
    const weeks = [];
    let week = [];
    let currentWeekStart = null;
    
    days.forEach(day => {
      const weekStart = new Date(day.dateObj);
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() - 1));
      const weekKey = weekStart.toISOString().slice(0, 10);
      
      if (currentWeekStart !== weekKey) {
        if (week.length > 0) {
          while (week.length < 5) week.push(null);
          weeks.push(week);
        }
        week = [];
        currentWeekStart = weekKey;
        const dayOfWeek = day.dateObj.getDay();
        for (let i = 1; i < dayOfWeek; i++) {
          week.push(null);
        }
      }
      week.push(day);
    });
    
    if (week.length > 0) {
      while (week.length < 5) week.push(null);
      weeks.push(week);
    }
    
    return weeks;
  }

  findEvent(date, hour) {
    return this.events.find(e => e.date === date && e.hour === hour);
  }

  getEventCount(date) {
    return this.events.filter(e => e.date === date).length;
  }

  attachEventListeners() {
    if (this.view === 'week') {
      document.querySelectorAll('.day-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
          // Bloquear cliques em células passadas
          if (cell.classList.contains('past')) {
            return;
          }
          if (!e.target.closest('.calendar-event')) {
            const date = cell.dataset.date;
            const hour = cell.dataset.hour;
            if (this.options.onCellClick) {
              this.options.onCellClick(date, hour);
            }
          }
        });
      });
      
      document.querySelectorAll('.calendar-event').forEach(event => {
        event.addEventListener('click', (e) => {
          e.stopPropagation();
          const eventId = event.dataset.eventId;
          if (this.options.onEventClick) {
            this.options.onEventClick(eventId);
          }
        });
      });
    } else {
      document.querySelectorAll('.month-cell:not(.empty)').forEach(cell => {
        cell.addEventListener('click', () => {
          // Bloquear cliques em células passadas
          if (cell.classList.contains('past')) {
            return;
          }
          const date = cell.dataset.date;
          if (this.options.onMonthCellClick) {
            this.options.onMonthCellClick(date);
          }
        });
      });
    }
  }

  setEvents(events) {
    this.events = events;
    this.render();
  }

  changeView(view, date) {
    this.view = view;
    if (date) this.currentDate = new Date(date);
    this.render();
  }

  next() {
    if (this.view === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    } else {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    }
    this.render();
  }

  prev() {
    if (this.view === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    } else {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    }
    this.render();
  }

  today() {
    this.currentDate = new Date();
    this.render();
  }

  getDate() {
    return this.currentDate;
  }

  refetchEvents() {
    if (this.options.onRefetch) {
      this.options.onRefetch();
    }
  }
}
