const STORAGE_KEY = 'palestra-data-v1';
const starter = { days: [[], [], [], []], notes: { setup: '', progress: '' }, checks: [[], [], [], []] };
let state = loadState();
let selectedDay = 0;
let editingId = null;
const list = document.querySelector('#exercise-list');
const dialog = document.querySelector('#exercise-dialog');
const input = document.querySelector('#exercise-name');

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.days) && stored.days.length === 4) return { ...structuredClone(starter), ...stored, notes: { ...starter.notes, ...stored.notes }, checks: Array.isArray(stored.checks) ? stored.checks : [[], [], [], []] };
  } catch (error) { console.warn('Dati locali non leggibili, uso una scheda vuota.', error); }
  return structuredClone(starter);
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function activeDay() { return state.days[selectedDay]; }
function render() {
  document.querySelectorAll('.day-tab').forEach((tab, i) => { tab.classList.toggle('selected', i === selectedDay); tab.setAttribute('aria-selected', String(i === selectedDay)); });
  document.querySelector('#workout-kicker').textContent = `GIORNO ${selectedDay + 1}`;
  document.querySelector('#progress-count').textContent = `${state.checks[selectedDay].length} / ${activeDay().length}`;
  const percent = activeDay().length ? (state.checks[selectedDay].length / activeDay().length) * 100 : 0;
  document.querySelector('#progress-bar').style.width = `${percent}%`;
  list.replaceChildren();
  if (!activeDay().length) {
    const empty = document.createElement('li'); empty.className = 'empty-state';
    const strong = document.createElement('strong'); strong.textContent = 'La scheda è tutta tua.';
    empty.append(strong, document.createTextNode('Aggiungi il primo esercizio per iniziare.')); list.append(empty);
  }
  activeDay().forEach((exercise, index) => {
    const done = state.checks[selectedDay].includes(exercise.id);
    const row = document.createElement('li'); row.className = `exercise-row${done ? ' done' : ''}`;
    const check = document.createElement('button'); check.className = 'check-button'; check.type = 'button'; check.setAttribute('aria-label', `${done ? 'Segna da fare' : 'Completa'}: ${exercise.name}`); check.setAttribute('aria-pressed', String(done)); check.textContent = done ? '✓' : '';
    check.addEventListener('click', () => { state.checks[selectedDay] = done ? state.checks[selectedDay].filter(id => id !== exercise.id) : [...state.checks[selectedDay], exercise.id]; persist(); render(); });
    const name = document.createElement('span'); name.className = 'exercise-name'; name.textContent = exercise.name;
    const menu = document.createElement('div'); menu.className = 'row-menu';
    const makeButton = (label, symbol, action, disabled = false, extraClass = '') => { const button = document.createElement('button'); button.type = 'button'; button.className = `mini-button ${extraClass}`; button.textContent = symbol; button.setAttribute('aria-label', label); button.disabled = disabled; button.addEventListener('click', action); return button; };
    menu.append(makeButton('Sposta su', '↑', () => move(index, -1), index === 0), makeButton('Sposta giù', '↓', () => move(index, 1), index === activeDay().length - 1), makeButton('Rinomina', '✎', () => openEditor(exercise), false), makeButton('Elimina', '×', () => removeExercise(exercise), false, 'delete-button'));
    row.append(check, name, menu); list.append(row);
  });
  document.querySelector('#reset-day').hidden = state.checks[selectedDay].length === 0;
}
function move(index, direction) { const target = index + direction; const day = activeDay(); [day[index], day[target]] = [day[target], day[index]]; persist(); render(); }
function removeExercise(exercise) {
  if (!window.confirm(`Eliminare “${exercise.name}”?`)) return;
  state.days[selectedDay] = activeDay().filter(item => item.id !== exercise.id);
  state.checks[selectedDay] = state.checks[selectedDay].filter(id => id !== exercise.id); persist(); render();
}
function openEditor(exercise = null) {
  editingId = exercise?.id ?? null;
  document.querySelector('#dialog-title').textContent = exercise ? 'Rinomina esercizio' : 'Nuovo esercizio';
  document.querySelector('#dialog-eyebrow').textContent = `GIORNO ${selectedDay + 1}`;
  input.value = exercise?.name ?? ''; dialog.showModal(); setTimeout(() => input.focus(), 50);
}
document.querySelectorAll('.day-tab').forEach(tab => tab.addEventListener('click', () => { selectedDay = Number(tab.dataset.day); render(); }));
document.querySelector('#add-exercise').addEventListener('click', () => openEditor());
document.querySelector('#exercise-form').addEventListener('submit', event => {
  event.preventDefault(); const name = input.value.trim(); if (!name) return;
  if (editingId) { const found = activeDay().find(item => item.id === editingId); if (found) found.name = name; }
  else activeDay().push({ id: crypto.randomUUID(), name });
  persist(); dialog.close(); render();
});
document.querySelector('#cancel-edit').addEventListener('click', () => dialog.close());
document.querySelector('#reset-day').addEventListener('click', () => { state.checks[selectedDay] = []; persist(); render(); });
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
  const viewId = button.dataset.view;
  document.querySelectorAll('.nav-item').forEach(nav => { const current = nav === button; nav.classList.toggle('active', current); current ? nav.setAttribute('aria-current', 'page') : nav.removeAttribute('aria-current'); });
  document.querySelectorAll('.view').forEach(view => { const current = view.id === viewId; view.hidden = !current; view.classList.toggle('active', current); });
}));
[['#setup-note', 'setup'], ['#progress-note', 'progress']].forEach(([selector, key]) => {
  const textarea = document.querySelector(selector); textarea.value = state.notes[key];
  textarea.addEventListener('input', () => { state.notes[key] = textarea.value; persist(); });
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Cache offline non disponibile.', error));
render();
