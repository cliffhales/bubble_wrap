# Bubble Wrap Oasis

A playful single-page web app that mimics the tactile joy of bubble wrap. Pop bubbles, toggle the satisfying pop sound, and generate fresh sheets whenever you like.

## Running locally

No build tooling required. Open `index.html` in your browser or run a simple static server:

```bash
npx serve .
```

## Features

- Responsive sheet layout with subtle glassmorphism styling
- Click or tap bubbles to pop them; keyboard accessible
- Toggleable synthesized pop sound
- "New sheet" button rotates through a few grid sizes for variety
- Installable PWA with offline cache, manifest, and icons

## PWA notes

- A service worker (`sw.js`) precaches the core assets and provides a cache-first strategy.
- The manifest + icons enable install prompts and better integration inside WebViews.
- When updating assets, bump the `CACHE_NAME` constant in `sw.js` to ensure clients fetch the new files.
