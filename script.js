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
const MIN_ROWS = 6;
const SOUND_VARIANTS = {
  pop: {
    type: 'triangle',
    startFrequency: 280,
    endFrequency: 110,
    duration: 0.14,
    startGain: 0.28,
    release: 0.18,
  },
  reset: {
    type: 'sine',
    startFrequency: 130,
    endFrequency: 260,
    duration: 0.12,
    startGain: 0.16,
    release: 0.16,
  },
};

const sheetEl = document.getElementById('sheet');
const template = document.getElementById('bubble-template');
const soundToggle = document.getElementById('sound-toggle');
const newSheetButton = document.getElementById('new-sheet');

let soundEnabled = true;
let audioContext;
let variantIndex = 0;
let currentDimensions = SIZE_VARIANTS[variantIndex];
let gestureActive = false;
let visitedBubbles = new Set();

soundToggle.addEventListener('change', (event) => {
  soundEnabled = event.target.checked;
});

newSheetButton.addEventListener('click', () => {
  variantIndex = (variantIndex + 1) % SIZE_VARIANTS.length;
  currentDimensions = SIZE_VARIANTS[variantIndex];
  createSheet();
});

window.addEventListener('resize', debounce(() => createSheet(), 200));
primeAudioOnFirstInteraction();

sheetEl.addEventListener('pointerdown', handlePointerDown);
window.addEventListener('pointermove', handlePointerDrag);
window.addEventListener('pointerup', endGesture);
window.addEventListener('pointercancel', endGesture);

sheetEl.addEventListener('click', (event) => {
  if (event.detail !== 0) {
    return;
  }

  const bubble = event.target.closest('.bubble');
  if (!bubble) {
    return;
  }

  const shouldPop = !bubble.classList.contains('popped');
  applyBubbleState(bubble, shouldPop);
});

function handlePointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  const bubble = event.target.closest('.bubble');
  if (!bubble) {
    return;
  }

  gestureActive = true;
  visitedBubbles.clear();

  // Toggle the initial bubble
  const shouldPop = !bubble.classList.contains('popped');
  applyBubbleState(bubble, shouldPop);
  visitedBubbles.add(bubble);

  // Release pointer capture so elementFromPoint works correctly on Safari/Mac
  if (bubble.hasPointerCapture(event.pointerId)) {
    bubble.releasePointerCapture(event.pointerId);
  }

  // Prevent default to avoid scrolling on touch devices while dragging on bubbles
  event.preventDefault();
}

function handlePointerDrag(event) {
  if (!gestureActive) {
    return;
  }

  // Use elementFromPoint to find the element under the cursor/finger
  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (!target) return;

  const bubble = target.closest('.bubble');
  if (!bubble) {
    return;
  }

  // Ensure we are still interacting with the same sheet
  if (!sheetEl.contains(bubble)) {
    return;
  }

  // Only toggle if we haven't visited this bubble in the current gesture
  if (!visitedBubbles.has(bubble)) {
    const shouldPop = !bubble.classList.contains('popped');
    applyBubbleState(bubble, shouldPop);
    visitedBubbles.add(bubble);
  }
}

function endGesture() {
  gestureActive = false;
  visitedBubbles.clear();
}

function applyBubbleState(bubble, shouldPop) {
  const alreadyPopped = bubble.classList.contains('popped');
  if (alreadyPopped === shouldPop) {
    return false;
  }

  bubble.classList.toggle('popped', shouldPop);
  bubble.setAttribute('aria-pressed', String(shouldPop));
  bubble.setAttribute('aria-label', shouldPop ? 'Popped bubble' : 'Bubble reset');

  if (soundEnabled) {
    playPopSound(shouldPop ? 'pop' : 'reset');
  }

  return true;
}

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
    audioContext.resume().catch(() => { });
  }

  return audioContext;
}

function playPopSound(type = 'pop') {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const profile = SOUND_VARIANTS[type] || SOUND_VARIANTS.pop;
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = profile.type;
  oscillator.frequency.setValueAtTime(profile.startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    profile.endFrequency,
    now + profile.duration
  );

  gain.gain.setValueAtTime(profile.startGain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + profile.release);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + Math.max(profile.duration, profile.release) + 0.05);
}

createSheet();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.error('Service worker registration failed:', error));
  });
}

function primeAudioOnFirstInteraction() {
  const interactionEvents = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];

  const unlock = () => {
    const ctx = ensureAudioContext();
    if (ctx) {
      // Play a silent buffer to unlock the audio context on iOS
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }

    interactionEvents.forEach((event) => {
      window.removeEventListener(event, unlock, { capture: true });
    });
  };

  interactionEvents.forEach((eventName) => {
    window.addEventListener(eventName, unlock, { capture: true });
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
  const bubbleSize = clamp(window.innerWidth * 0.06, 42, 64);
  const total = Math.max(1, Math.floor(width / (bubbleSize + gap)));
  return Math.max(4, total);
}

function getMaxRowsByViewport() {
  const rect = sheetEl.getBoundingClientRect();
  const minViewportShare = window.innerHeight * 0.55;
  const availableHeight = Math.max(minViewportShare, window.innerHeight - (rect.top || 0) - 24);
  const bubbleSize = clamp(window.innerWidth * 0.06, 42, 64);
  const total = Math.max(1, Math.floor(availableHeight / (bubbleSize + 12)));
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
