const DEFAULT_DIMENSIONS = { rows: 10, cols: 14 };
const SIZE_VARIANTS = [
  { rows: 10, cols: 14 },
  { rows: 8, cols: 12 },
  { rows: 12, cols: 16 },
];

const sheetEl = document.getElementById('sheet');
const template = document.getElementById('bubble-template');
const soundToggle = document.getElementById('sound-toggle');
const newSheetButton = document.getElementById('new-sheet');

let soundEnabled = true;
let audioContext;
let variantIndex = 0;

soundToggle.addEventListener('change', (event) => {
  soundEnabled = event.target.checked;
});

newSheetButton.addEventListener('click', () => {
  variantIndex = (variantIndex + 1) % SIZE_VARIANTS.length;
  const { rows, cols } = SIZE_VARIANTS[variantIndex];
  createSheet(rows, cols);
});

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

function createSheet(rows = DEFAULT_DIMENSIONS.rows, cols = DEFAULT_DIMENSIONS.cols) {
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
