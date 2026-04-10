// ===== Calculator State =====
const state = {
  currentValue: '0',       // Current display value as string
  previousValue: '',       // Previous operand as string
  operator: null,          // Current operator (+, -, *, /)
  waitingForOperand: false,// Whether next digit starts a new number
  expression: '',          // The expression string shown above result
  justEvaluated: false,    // Whether = was just pressed
  history: []              // Array of { expression, result } objects
};

// ===== DOM References =====
const resultEl = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const displayEl = document.getElementById('display');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const historyToggle = document.getElementById('historyToggle');
const historyClose = document.getElementById('historyClose');
const historyClearBtn = document.getElementById('historyClearBtn');
const toastEl = document.getElementById('toast');

// ===== Operator display symbols =====
const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };

// ===== Update the display =====
function updateDisplay() {
  resultEl.textContent = state.currentValue;
  expressionEl.textContent = state.expression;

  if (state.currentValue.length > 10) {
    resultEl.classList.add('shrink');
  } else {
    resultEl.classList.remove('shrink');
  }

  resultEl.classList.remove('error');

  displayEl.classList.add('active');
  clearTimeout(displayEl._glowTimeout);
  displayEl._glowTimeout = setTimeout(() => {
    displayEl.classList.remove('active');
  }, 800);

  document.querySelectorAll('.btn-op').forEach(btn => {
    btn.classList.remove('active-op');
    if (state.operator && btn.dataset.value === state.operator && state.waitingForOperand) {
      btn.classList.add('active-op');
    }
  });
}

// ===== Format a number for display =====
function formatNumber(numStr) {
  if (numStr === 'Error') return 'Error';

  if (numStr.includes('.')) {
    const parts = numStr.split('.');
    const intPart = parseInt(parts[0], 10).toLocaleString('en-US');
    return intPart + '.' + parts[1];
  }

  const num = parseFloat(numStr);
  if (isNaN(num)) return 'Error';
  if (Math.abs(num) >= 1e15) return num.toExponential(4);

  return num.toLocaleString('en-US', { maximumFractionDigits: 12 });
}

// ===== Show an error on the display =====
function showError(message) {
  resultEl.textContent = message;
  resultEl.classList.add('error');
  expressionEl.textContent = '';
}

// ===== Perform the actual arithmetic =====
function calculate(a, operator, b) {
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  if (isNaN(numA) || isNaN(numB)) return 'Error';

  let result;

  if (operator === '+') {
    result = numA + numB;
  } else if (operator === '-') {
    result = numA - numB;
  } else if (operator === '*') {
    result = numA * numB;
  } else if (operator === '/') {
    if (numB === 0) return 'Error';
    result = numA / numB;
  } else {
    return 'Error';
  }

  if (!Number.isFinite(result)) return 'Error';
  result = parseFloat(result.toPrecision(12));

  return String(result);
}

// ===== Handle number input =====
function inputNumber(digit) {
  if (state.justEvaluated) {
    state.currentValue = digit;
    state.expression = '';
    state.previousValue = '';
    state.operator = null;
    state.justEvaluated = false;
    state.waitingForOperand = false;
  } else if (state.waitingForOperand) {
    state.currentValue = digit;
    state.waitingForOperand = false;
  } else {
    if (state.currentValue.replace(/[^0-9]/g, '').length >= 15) return;
    state.currentValue = state.currentValue === '0' ? digit : state.currentValue + digit;
  }

  updateDisplay();
}

// ===== Handle decimal point =====
function inputDecimal() {
  if (state.justEvaluated) {
    state.currentValue = '0.';
    state.expression = '';
    state.previousValue = '';
    state.operator = null;
    state.justEvaluated = false;
    state.waitingForOperand = false;
    updateDisplay();
    return;
  }

  if (state.waitingForOperand) {
    state.currentValue = '0.';
    state.waitingForOperand = false;
    updateDisplay();
    return;
  }

  if (!state.currentValue.includes('.')) {
    state.currentValue += '.';
  }

  updateDisplay();
}

// ===== Handle operator input =====
function inputOperator(op) {
  const current = parseFloat(state.currentValue);

  if (state.justEvaluated) {
    state.previousValue = state.currentValue;
    state.operator = op;
    state.expression = formatNumber(state.currentValue) + ' ' + opSymbols[op];
    state.waitingForOperand = true;
    state.justEvaluated = false;
    updateDisplay();
    return;
  }

  if (state.operator && !state.waitingForOperand) {
    const result = calculate(state.previousValue, state.operator, state.currentValue);
    if (result === 'Error') {
      showError('Cannot divide by zero');
      resetState();
      return;
    }
    state.currentValue = result;
    state.previousValue = result;
  } else {
    state.previousValue = state.currentValue;
  }

  state.operator = op;
  state.waitingForOperand = true;
  state.expression = formatNumber(state.previousValue) + ' ' + opSymbols[op];

  updateDisplay();
}

// ===== Handle equals =====
function inputEquals() {
  if (!state.operator || state.waitingForOperand) return;

  const fullExpression = formatNumber(state.previousValue) + ' ' + opSymbols[state.operator] + ' ' + formatNumber(state.currentValue);
  const result = calculate(state.previousValue, state.operator, state.currentValue);

  if (result === 'Error') {
    showError('Cannot divide by zero');
    addHistory(fullExpression, 'Error');
    resetState();
    return;
  }

  addHistory(fullExpression, formatNumber(result));

  state.expression = fullExpression + ' =';
  state.currentValue = result;
  state.previousValue = '';
  state.operator = null;
  state.waitingForOperand = false;
  state.justEvaluated = true;

  updateDisplay();
}

// ===== Handle clear =====
function clearAll() {
  resetState();
  updateDisplay();
}

function resetState() {
  state.currentValue = '0';
  state.previousValue = '';
  state.operator = null;
  state.waitingForOperand = false;
  state.expression = '';
  state.justEvaluated = false;
}

// ===== Handle negate (+/-) =====
function negateValue() {
  if (state.currentValue === '0' || state.currentValue === 'Error') return;

  if (state.currentValue.startsWith('-')) {
    state.currentValue = state.currentValue.slice(1);
  } else {
    state.currentValue = '-' + state.currentValue;
  }

  if (state.justEvaluated) {
    state.expression = '';
    state.justEvaluated = false;
  }

  updateDisplay();
}

// ===== Handle percent (%) =====
function percentValue() {
  if (state.currentValue === 'Error') return;

  const num = parseFloat(state.currentValue);
  if (isNaN(num)) return;

  const result = num / 100;
  state.currentValue = String(parseFloat(result.toPrecision(12)));

  if (state.justEvaluated) {
    state.expression = '';
    state.justEvaluated = false;
  }

  updateDisplay();
}

// ===== Handle backspace (keyboard) =====
function backspace() {
  if (state.justEvaluated || state.waitingForOperand || state.currentValue === 'Error') return;

  if (state.currentValue.length === 1 || (state.currentValue.length === 2 && state.currentValue.startsWith('-'))) {
    state.currentValue = '0';
  } else {
    state.currentValue = state.currentValue.slice(0, -1);
  }

  updateDisplay();
}

// ===== History Management =====
function addHistory(expr, val) {
  state.history.unshift({ expression: expr, result: val });
  if (state.history.length > 50) state.history.pop();
  renderHistory();
}

function renderHistory() {
  const items = historyList.querySelectorAll('.history-item');
  items.forEach(item => item.remove());

  if (state.history.length === 0) {
    historyEmpty.style.display = 'flex';
    return;
  }

  historyEmpty.style.display = 'none';

  for (let i = 0; i < state.history.length; i++) {
    const entry = state.history[i];
    const item = document.createElement('div');
    item.className = 'history-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', entry.expression + ' equals ' + entry.result);

    item.innerHTML = `
      <div class="history-expr">${escapeHtml(entry.expression)}</div>
      <div class="history-val">${escapeHtml(entry.result)}</div>
    `;

    const capturedResult = entry.result;
    item.addEventListener('click', () => loadFromHistory(capturedResult));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        loadFromHistory(capturedResult);
      }
    });

    historyList.appendChild(item);
  }
}

function loadFromHistory(val) {
  if (val === 'Error') {
    showToast('Cannot load error result');
    return;
  }
  const raw = val.replace(/,/g, '');
  const num = parseFloat(raw);
  if (isNaN(num)) return;

  state.currentValue = String(num);
  state.expression = '';
  state.previousValue = '';
  state.operator = null;
  state.waitingForOperand = false;
  state.justEvaluated = true;
  updateDisplay();
  closeHistory();
  showToast('Value loaded');
}

function clearHistory() {
  state.history = [];
  renderHistory();
  showToast('History cleared');
}

function openHistory() {
  historyPanel.classList.add('open');
  historyClose.focus();
}

function closeHistory() {
  historyPanel.classList.remove('open');
  historyToggle.focus();
}

// ===== Toast Notification =====
let toastTimeout;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2000);
}

// ===== HTML escaping =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Ripple Effect =====
function createRipple(e, button) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// ===== Button Click Event Listener (using event delegation) =====
document.querySelector('.buttons').addEventListener('click', function(e) {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  createRipple(e, btn);

  const action = btn.dataset.action;
  const value = btn.dataset.value;

  if (action === 'number') {
    inputNumber(value);
  } else if (action === 'decimal') {
    inputDecimal();
  } else if (action === 'operator') {
    inputOperator(value);
  } else if (action === 'equals') {
    inputEquals();
  } else if (action === 'clear') {
    clearAll();
  } else if (action === 'negate') {
    negateValue();
  } else if (action === 'percent') {
    percentValue();
  }
});

// ===== History Panel Event Listeners =====
historyToggle.addEventListener('click', openHistory);
historyClose.addEventListener('click', closeHistory);
historyClearBtn.addEventListener('click', clearHistory);

historyPanel.addEventListener('click', function(e) {
  if (e.target === historyPanel) closeHistory();
});

// ===== Keyboard Support =====
document.addEventListener('keydown', function(e) {
  if (historyPanel.classList.contains('open')) {
    if (e.key === 'Escape') closeHistory();
    return;
  }

  const key = e.key;

  if (key >= '0' && key <= '9') {
    e.preventDefault();
    inputNumber(key);
    highlightButton('[data-value="' + key + '"][data-action="number"]');
    return;
  }

  if (key === '+') {
    e.preventDefault();
    inputOperator('+');
    highlightButton('[data-value="+"]');
  } else if (key === '-') {
    e.preventDefault();
    inputOperator('-');
    highlightButton('[data-value="-"]');
  } else if (key === '*') {
    e.preventDefault();
    inputOperator('*');
    highlightButton('[data-value="*"]');
  } else if (key === '/') {
    e.preventDefault();
    inputOperator('/');
    highlightButton('[data-value="/"]');
  }

  if (key === '.') {
    e.preventDefault();
    inputDecimal();
    highlightButton('[data-action="decimal"]');
  }

  if (key === '=' || key === 'Enter') {
    e.preventDefault();
    inputEquals();
    highlightButton('[data-action="equals"]');
  }

  if (key === 'Escape') {
    e.preventDefault();
    clearAll();
    highlightButton('[data-action="clear"]');
  }

  if (key === 'Backspace') {
    e.preventDefault();
    backspace();
  }

  if (key === '%') {
    e.preventDefault();
    percentValue();
    highlightButton('[data-action="percent"]');
  }
});

// ===== Visual feedback for keyboard presses =====
function highlightButton(selector) {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.style.transform = 'scale(0.95)';
  btn.style.filter = 'brightness(1.2)';
  setTimeout(() => {
    btn.style.transform = '';
    btn.style.filter = '';
  }, 120);
}

// ===== Initialize =====
updateDisplay();
renderHistory();
