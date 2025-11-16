const SIZE_VARIANTS = [
  { rows: 10, cols: 14 },
  { rows: 8, cols: 12 },
  { rows: 12, cols: 16 },
];
const RESPONSIVE_BREAKPOINTS = [
  { width: 420, cols: 5 },
  { width: 520, cols: 6 },
  { width: 640, cols: 8 },
  { width: 820, cols: 10 },
  { width: 1024, cols: 12 },
  { width: Infinity, cols: 14 },
];
const MIN_ROWS = 4;

const sheetEl = document.getElementById('sheet');
const template = document.getElementById('bubble-template');
const soundToggle = document.getElementById('sound-toggle');
const newSheetButton = document.getElementById('new-sheet');

let soundEnabled = true;
let audioContext;
let variantIndex = 0;
let currentDimensions = SIZE_VARIANTS[variantIndex];

soundToggle.addEventListener('change', (event) => {
  soundEnabled = event.target.checked;
});

newSheetButton.addEventListener('click', () => {
  variantIndex = (variantIndex + 1) % SIZE_VARIANTS.length;
  currentDimensions = SIZE_VARIANTS[variantIndex];
  createSheet();
});

window.addEventListener('resize', debounce(() => createSheet(), 200));

sheetEl.addEventListener('click', (event) => {
  const bubble = event.target.closest('.bubble');
  if (!bubble || bubble.classList.contains('popped')) {
    return;
  }

  bubble.classList.add('popped');
  bubble.setAttribute('aria-pressed', 'true');
  bubble.setAttribute('aria-label', 'Popped bubble');

  if (soundEnabled) {
    playPopSound();
  }
});

function createSheet() {
  const { rows, cols } = getResponsiveDimensions(currentDimensions);
  sheetEl.style.setProperty('--cols', cols);
  sheetEl.replaceChildren();

  const fragment = document.createDocumentFragment();
  const total = rows * cols;

  for (let i = 0; i < total; i += 1) {
    const bubble = template.content.firstElementChild.cloneNode(true);
    bubble.dataset.index = i;
    fragment.appendChild(bubble);
  }

  sheetEl.appendChild(fragment);
  sheetEl.dataset.sheetSize = `${rows}x${cols}`;
  sheetEl.setAttribute('aria-label', `Bubble wrap sheet ${rows} by ${cols}`);
}

function ensureAudioContext() {
  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    audioContext = new Context();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

function playPopSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(180, now);
  oscillator.frequency.exponentialRampToValueAtTime(90, now + 0.1);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.22);
}

createSheet();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.error('Service worker registration failed:', error));
  });
}

function getResponsiveDimensions({ rows: preferredRows, cols: preferredCols }) {
  const width = window.innerWidth;
  const fallbackBreakpoint = RESPONSIVE_BREAKPOINTS[RESPONSIVE_BREAKPOINTS.length - 1];
  const breakpoint = RESPONSIVE_BREAKPOINTS.find((bp) => width <= bp.width) || fallbackBreakpoint;
  const cols = Math.max(
    MIN_ROWS,
    Math.min(preferredCols, breakpoint.cols || preferredCols, getMaxColsByViewport())
  );
  const scale = cols / preferredCols;
  const scaledRows = Math.max(MIN_ROWS, Math.round(preferredRows * scale));
  const maxRowsByViewport = getMaxRowsByViewport();
  const rows = Math.min(scaledRows, maxRowsByViewport);
  return { rows, cols };
}

function getMaxColsByViewport() {
  const width = sheetEl.clientWidth || window.innerWidth;
  const styles = window.getComputedStyle(sheetEl);
  const gap = parseFloat(styles.columnGap || styles.gap || 12);
  const bubbleSize = clamp(window.innerWidth * 0.06, 48, 64);
  const total = Math.max(1, Math.floor(width / (bubbleSize + gap)));
  return Math.max(4, total);
}

function getMaxRowsByViewport() {
  const heightAvailable = window.innerHeight - sheetEl.getBoundingClientRect().top - 40;
  const bubbleSize = clamp(window.innerWidth * 0.06, 48, 64);
  const total = Math.max(1, Math.floor(heightAvailable / (bubbleSize + 12)));
  return Math.max(MIN_ROWS, total);
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
