# Bhasha: Malayalam & Bangla trainer

A personal, offline-first language app for iPhone (installed from Safari as a web app).

- **Malayalam**: reading and writing, from the alphabet to full newspaper articles.
- **Bangla** (Bangladeshi, Dhaka): speaking and reading for everyday conversation.

Setup instructions: [SETUP.md](SETUP.md).

## Status

- [x] Phase 1: installable PWA, offline, audio, native keyboards, microphone (device check screen)
- [ ] Phase 2: learning engine (FSRS, sessions, exercises, answer checking, sync, export)
- [ ] Phase 3: Malayalam stages 1–5 + placement test
- [ ] Phase 4: first Bangla units + placement test
- [ ] Content batches until both courses reach their targets

## How it fits together

| Piece | Choice | Why |
| --- | --- | --- |
| App | Vite + TypeScript + React | Fast build, small output |
| Offline | vite-plugin-pwa (Workbox) | Precaches the app shell; prompts before updating |
| Audio | Azure AI Speech, generated at build time | Natural `ml-IN` and `bn-BD` voices with a free tier |
| Audio storage | Cache Storage, per unit | Download and delete per unit; works offline |
| Hosting | Netlify (from `main`) | Free; headers keep updates from going stale |

## Repository layout

```
content/<lang>/*.json     course content: unit -> lessons -> items
public/audio/<lang>/      generated MP3s, named by a hash of voice + text
scripts/generate-audio.ts generates missing audio (needs AZURE_SPEECH_KEY / AZURE_SPEECH_REGION)
scripts/validate-content.ts checks content: fields, unique ids, Unicode blocks, audio files
src/                      the app
.github/workflows/audio.yml runs the audio generator on GitHub when content changes
```

## Commands

```
npm install
npm run dev          # local dev server
npm run build        # typecheck + production build
npm run validate     # check content (add --flagged to list needs_check items, --strict to fail on missing audio)
npm run audio        # generate missing audio (add --dry-run to just list it)
```
