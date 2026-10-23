/**
 * app.js — To-do List Life Dashboard
 *
 * Single-module entry point. All state lives in the `state` object below.
 * No external dependencies; runs in any modern browser as an ES module.
 */

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single source of truth for all mutable application state.
 * Clock/date values are read directly from new Date() and are NOT stored here.
 * Timer state is intentionally NOT persisted to localStorage.
 *
 * @type {{
 *   tasks: import('./app.js').Task[],
 *   links: import('./app.js').Link[],
 *   timer: { remaining: number, running: boolean, expired: boolean }
 * }}
 */
export const state = {
  tasks: [],
  links: [],
  timer: {
    remaining: 1500, // 25 * 60 seconds
    running: false,
    expired: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect whether localStorage is available and writable.
 * @returns {boolean}
 */
export function storageAvailable() {
  try {
    const key = '__storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist a value to localStorage as JSON.
 * Shows a transient error message in the relevant widget if the write fails.
 * @param {string} key
 * @param {unknown} value
 */
export function saveToStorage(key, value) {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    _showStorageWriteError(key);
  }
}

/**
 * Load and parse a JSON value from localStorage.
 * Returns null if the key is absent or the value cannot be parsed.
 * @param {string} key
 * @returns {unknown|null}
 */
export function loadFromStorage(key) {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Trim a string and enforce a maximum length.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function sanitizeText(str, maxLen) {
  const trimmed = String(str).trim();
  return trimmed.slice(0, maxLen);
}

/** Generate a unique ID (UUID v4 if available, else timestamp-based). */
function _generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Display a transient "could not save" error in the widget associated with a storage key. */
function _showStorageWriteError(key) {
  const widgetErrorId = key === 'tasks' ? 'todo-error' : 'links-error';
  const el = document.getElementById(widgetErrorId);
  if (!el) return;
  el.textContent = 'Changes could not be saved.';
  setTimeout(() => { el.textContent = ''; }, 4000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Greeting Widget
// ─────────────────────────────────────────────────────────────────────────────

/** @type {ReturnType<typeof setInterval>|null} */
let _clockInterval = null;

/** Start the 1-second clock interval. */
export function initClock() {
  tickClock();
  _clockInterval = setInterval(tickClock, 1000);
}

/** Read the current time from the device clock and update the DOM. */
export function tickClock() {
  const now = new Date();
  const hour = now.getHours();

  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  const greetEl = document.getElementById('greeting-message');

  if (timeEl) {
    const hh = String(hour).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    timeEl.textContent = `${hh}:${mm}:${ss}`;
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  if (greetEl) {
    greetEl.textContent = getGreeting(hour);
  }
}

/**
 * Return the appropriate greeting string for a given hour (0–23).
 * @param {number} hour  Integer in [0, 23]
 * @returns {'Good Morning'|'Good Afternoon'|'Good Evening'|'Good Night'}
 */
export function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 20) return 'Good Evening';
  return 'Good Night'; // 21–23 and 0–4
}

// ─────────────────────────────────────────────────────────────────────────────
// Focus Timer Widget
// ─────────────────────────────────────────────────────────────────────────────

/** @type {ReturnType<typeof setInterval>|null} */
let _timerInterval = null;

/** Render the timer display from current state and wire up button handlers. */
export function initTimer() {
  _renderTimerDisplay();

  const startStopBtn = document.getElementById('timer-start-stop');
  const resetBtn = document.getElementById('timer-reset');

  if (startStopBtn) {
    startStopBtn.addEventListener('click', () => {
      if (state.timer.running) {
        stopTimer();
      } else {
        startTimer();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetTimer);
  }
}

/** Start the countdown if it is not already running. */
export function startTimer() {
  if (state.timer.running || state.timer.expired) return;
  state.timer.running = true;
  _timerInterval = setInterval(tickTimer, 1000);
  _renderTimerDisplay();
}

/** Pause the countdown. */
export function stopTimer() {
  if (!state.timer.running) return;
  clearInterval(_timerInterval);
  _timerInterval = null;
  state.timer.running = false;
  _renderTimerDisplay();
}

/** Stop any active countdown and restore remaining to 1500. */
export function resetTimer() {
  clearInterval(_timerInterval);
  _timerInterval = null;
  state.timer.running = false;
  state.timer.remaining = 1500;
  state.timer.expired = false;
  _renderTimerDisplay();
}

/**
 * Decrement remaining by 1; set expired at 0 and stop the interval.
 * Called once per second by the running interval.
 */
export function tickTimer() {
  if (state.timer.remaining <= 0) {
    _expireTimer();
    return;
  }
  state.timer.remaining -= 1;
  if (state.timer.remaining === 0) {
    _expireTimer();
  } else {
    _renderTimerDisplay();
  }
}

/** Mark the timer as expired, stop the interval, and update the DOM. */
function _expireTimer() {
  clearInterval(_timerInterval);
  _timerInterval = null;
  state.timer.running = false;
  state.timer.expired = true;
  _renderTimerDisplay();
}

/** Update the timer display DOM from current state. */
function _renderTimerDisplay() {
  const displayEl = document.getElementById('timer-display');
  const alertEl = document.getElementById('timer-expired-alert');
  const startStopBtn = document.getElementById('timer-start-stop');

  if (displayEl) {
    const total = state.timer.remaining;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    displayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  if (alertEl) {
    alertEl.hidden = !state.timer.expired;
  }

  if (startStopBtn) {
    startStopBtn.textContent = state.timer.running ? 'Stop' : 'Start';
    startStopBtn.disabled = state.timer.expired;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// To-Do List Widget
// ─────────────────────────────────────────────────────────────────────────────

/** Load tasks from localStorage into state.tasks. */
export function hydrateTasks() {
  // Check for a pre-existing raw string so we can distinguish
  // "key absent" (silent empty) from "key present but unparseable" (show error).
  const hadExistingData = storageAvailable() && localStorage.getItem('tasks') !== null;
  const raw = loadFromStorage('tasks');
  if (raw === null) {
    // loadFromStorage returns null for both absent key AND parse failure.
    // Only show the error if data was present but could not be parsed.
    if (hadExistingData) {
      _showTasksLoadError();
    }
    state.tasks = [];
    return;
  }
  if (!Array.isArray(raw)) {
    // Parsed successfully but is not the expected array shape — treat as corrupted.
    _showTasksLoadError();
    state.tasks = [];
    return;
  }
  state.tasks = raw;
}

/** Full re-render of the task list DOM from state. */
export function renderTasks() {
  const listEl = document.getElementById('task-list');
  if (!listEl) return;

  listEl.innerHTML = '';
  // Display tasks in insertion order (ascending by createdAt timestamp).
  const sorted = [...state.tasks].sort((a, b) => a.createdAt - b.createdAt);
  sorted.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}`;
    li.dataset.id = task.id;

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.description;

    const completeBtn = document.createElement('button');
    completeBtn.className = 'complete-btn';
    completeBtn.type = 'button';
    completeBtn.textContent = task.completed ? 'Undo' : 'Done';
    completeBtn.setAttribute('aria-label', task.completed ? `Mark "${task.description}" incomplete` : `Mark "${task.description}" complete`);
    completeBtn.addEventListener('click', () => toggleTask(task.id));

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', `Edit task: ${task.description}`);
    editBtn.addEventListener('click', () => _startEditTask(task.id, li));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.description}`);
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(span);
    li.appendChild(completeBtn);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  });
}

/**
 * Add a new task. Validates description before mutating state.
 * @param {string} description
 * @returns {boolean} true if task was added, false if rejected
 */
export function addTask(description) {
  const trimmed = String(description).trim();
  const errorEl = document.getElementById('task-input-error');

  if (trimmed.length === 0) {
    if (errorEl) errorEl.textContent = 'Task cannot be empty.';
    return false;
  }
  if (trimmed.length > 500) {
    if (errorEl) errorEl.textContent = 'Task must be 500 characters or fewer.';
    return false;
  }

  if (errorEl) errorEl.textContent = '';

  /** @type {import('./app.js').Task} */
  const task = {
    id: _generateId(),
    description: trimmed,
    completed: false,
    createdAt: Date.now(),
  };

  state.tasks.push(task);
  saveToStorage('tasks', state.tasks);
  renderTasks();
  return true;
}

/**
 * Update the description of an existing task.
 * @param {string} id
 * @param {string} newDescription
 * @returns {boolean} true if updated, false if rejected
 */
export function editTask(id, newDescription) {
  const trimmed = String(newDescription).trim();
  if (trimmed.length === 0 || trimmed.length > 500) return false;

  const task = state.tasks.find((t) => t.id === id);
  if (!task) return false;

  task.description = trimmed;
  saveToStorage('tasks', state.tasks);
  renderTasks();
  return true;
}

/**
 * Toggle the completed state of a task.
 * @param {string} id
 */
export function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveToStorage('tasks', state.tasks);
  renderTasks();
}

/**
 * Permanently remove a task.
 * @param {string} id
 */
export function deleteTask(id) {
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;
  state.tasks.splice(idx, 1);
  saveToStorage('tasks', state.tasks);
  renderTasks();
}

/**
 * Replace a task's text node with an inline edit field.
 * @param {string} id
 * @param {HTMLLIElement} li
 */
function _startEditTask(id, li) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  const span = li.querySelector('.task-text');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = task.description;
  input.maxLength = 500;
  input.setAttribute('aria-label', 'Edit task description');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';
  saveBtn.className = 'edit-save-btn';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'edit-cancel-btn';

  li.replaceChild(input, span);

  const editBtn = li.querySelector('.edit-btn');
  const completeBtn = li.querySelector('.complete-btn');
  if (editBtn) editBtn.replaceWith(saveBtn);
  if (completeBtn) completeBtn.style.display = 'none';

  saveBtn.addEventListener('click', () => {
    editTask(id, input.value);
  });

  cancelBtn.addEventListener('click', () => {
    renderTasks();
  });

  saveBtn.after(cancelBtn);
  input.focus();
}

/** Show a data-load error in the todo widget. */
function _showTasksLoadError() {
  const el = document.getElementById('todo-error');
  if (el) el.textContent = 'Saved data could not be loaded and has been cleared.';
}

/** Wire up the todo form submit event. */
function _initTodoForm() {
  const form = document.getElementById('todo-form');
  const input = document.getElementById('task-input');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const added = addTask(input.value);
    if (added) {
      input.value = '';
    } else {
      input.focus();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Links Widget
// ─────────────────────────────────────────────────────────────────────────────

/** Load links from localStorage into state.links. */
export function hydrateLinks() {
  const raw = loadFromStorage('links');
  if (raw === null) {
    state.links = [];
    return;
  }
  if (!Array.isArray(raw)) {
    state.links = [];
    return;
  }
  state.links = raw;
}

/** Full re-render of the links panel DOM from state. */
export function renderLinks() {
  const panelEl = document.getElementById('links-list');
  if (!panelEl) return;

  panelEl.innerHTML = '';
  state.links.forEach((link) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'link-item';
    wrapper.dataset.id = link.id;

    const anchor = document.createElement('a');
    anchor.className = 'link-btn';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label;
    anchor.setAttribute('aria-label', `Open ${link.label} (${link.url}) in new tab`);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-link-btn';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Delete link: ${link.label}`);
    deleteBtn.addEventListener('click', () => deleteLink(link.id));

    wrapper.appendChild(anchor);
    wrapper.appendChild(deleteBtn);
    panelEl.appendChild(wrapper);
  });
}

/**
 * Add a new quick link. Validates and normalizes URL before mutating state.
 * @param {string} label
 * @param {string} url
 * @returns {boolean} true if added, false if rejected
 */
export function addLink(label, url) {
  const trimmedLabel = String(label).trim();
  const trimmedUrl = String(url).trim();

  const labelErrorEl = document.getElementById('link-label-error');
  const urlErrorEl = document.getElementById('link-url-error');
  let valid = true;

  if (trimmedLabel.length === 0) {
    if (labelErrorEl) labelErrorEl.textContent = 'Label cannot be empty.';
    valid = false;
  } else if (trimmedLabel.length > 50) {
    if (labelErrorEl) labelErrorEl.textContent = 'Label must be 50 characters or fewer.';
    valid = false;
  } else {
    if (labelErrorEl) labelErrorEl.textContent = '';
  }

  if (trimmedUrl.length === 0) {
    if (urlErrorEl) urlErrorEl.textContent = 'URL cannot be empty.';
    valid = false;
  } else if (trimmedUrl.length > 2048) {
    if (urlErrorEl) urlErrorEl.textContent = 'URL must be 2048 characters or fewer.';
    valid = false;
  } else {
    if (urlErrorEl) urlErrorEl.textContent = '';
  }

  if (!valid) return false;

  const normalizedUrl = normalizeUrl(trimmedUrl);

  /** @type {import('./app.js').Link} */
  const link = {
    id: _generateId(),
    label: trimmedLabel,
    url: normalizedUrl,
  };

  state.links.push(link);
  saveToStorage('links', state.links);
  renderLinks();
  return true;
}

/**
 * Prepend https:// if the URL does not already have a valid protocol.
 * @param {string} url
 * @returns {string}
 */
export function normalizeUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

/**
 * Permanently remove a link.
 * @param {string} id
 */
export function deleteLink(id) {
  const idx = state.links.findIndex((l) => l.id === id);
  if (idx === -1) return;
  state.links.splice(idx, 1);
  saveToStorage('links', state.links);
  renderLinks();
}

/** Wire up the links form submit event. */
function _initLinksForm() {
  const form = document.getElementById('links-form');
  const labelInput = document.getElementById('link-label-input');
  const urlInput = document.getElementById('link-url-input');
  if (!form || !labelInput || !urlInput) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const added = addLink(labelInput.value, urlInput.value);
    if (added) {
      labelInput.value = '';
      urlInput.value = '';
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Show a non-dismissable banner when localStorage is unavailable.
 */
function _showStorageUnavailableBanner() {
  const existing = document.getElementById('storage-unavailable-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'storage-unavailable-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent =
    'Your browser does not support local storage. Data will not be saved.';
  document.body.prepend(banner);
}

/**
 * Main entry point. Called on DOMContentLoaded.
 * Hydrates state from localStorage, renders all widgets, starts the clock.
 */
export function init() {
  if (!storageAvailable()) {
    _showStorageUnavailableBanner();
  }

  hydrateTasks();
  hydrateLinks();

  renderTasks();
  renderLinks();

  _initTodoForm();
  _initLinksForm();

  initClock();
  initTimer();
}

// Wire init() to DOMContentLoaded only when running in a real browser
// (not when imported in a test environment).
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}
