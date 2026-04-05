# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server at http://localhost:3000
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test suite is currently configured.

## Environment Variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_publishable_key
```

## Architecture Overview

**Next.js 16 App Router** with all pages under `src/app/`. Every page is a client component (`"use client"`).

### State Management

All core chat state lives in `src/app/page.tsx` — a single large component (~2000+ lines) that owns conversations, messages, sidebar, streaming state, model selection, project linking, and more. There is no global state library (no Redux, Zustand, etc.). State is passed down as props or managed locally in each component.

### API Layer (`src/lib/`)

- **`api.ts`** — `sendMessageStream` (SSE streaming via `fetch`), `parseFile`, `fetchModels`, `transcribeAudio`. The `ChatMessage` interface is the canonical message shape used throughout the app.
- **`history.ts`** — Conversation and message CRUD against the backend REST API, semantic search, smart suggestions.
- **`profile.ts`** — User profile (including `voice` preference), memory, productivity scores, onboarding.
- **`projects.ts`** — Project CRUD, file uploads, conversation linking. `Project` type is defined here.
- **`supabase.ts`** — Browser Supabase client. Auth tokens from Supabase are passed as `Authorization: Bearer <token>` to the backend.

### Streaming / Two-Phase Rendering

Messages have an `isStreaming` boolean on `ChatMessage`. While streaming, `ChatWindow` renders plain `whitespace-pre-wrap` text with an animated cursor. On the `done` SSE event, `isStreaming` is set to false and `MarkdownRenderer` renders the full markdown (including `CodeBlock` components with syntax highlighting). This prevents re-parsing markdown on every token.

### Key Components

- **`ChatWindow.tsx`** — Renders the message list. Distinguishes streaming vs settled messages. Owns TTS playback state (`speakingMessageId`, `currentAudioRef`) and calls `POST /api/v1/voice/speak` directly. Accepts `userVoice` prop.
- **`ChatInput.tsx`** — Input bar with file/image upload, slash commands (`/` triggers template picker), smart context suggestions (debounced 150ms, 3+ chars), and voice recording via `MediaRecorder`. Space on an empty input starts recording (walkie-talkie shortcut).
- **`MessageActionsBar.tsx`** — Hover action bar for messages. Accepts `onSpeak`/`isSpeaking` props to render the speaker button (assistant messages only).
- **`MarkdownRenderer.tsx`** — Wraps `react-markdown` with custom renderers. Uses `CodeBlock` for all code.
- **`CodeBlock.tsx`** — Code execution (Python, JS, TS, Bash via backend), copy, line numbers, expand/collapse, word wrap.
- **`LoadingScreen.tsx`** — 5-step sequenced initialization shown once per browser session. Controls the boot flow: auth check → profile → conversations → projects → setup.
- **`Navbar.tsx`** — Model selector, font size toggle (saved to `localStorage`), theme, profile link.

### Routing

| Route | Purpose |
|-------|---------|
| `/` | Main chat interface |
| `/login` | Email/password + magic link auth |
| `/reset-password` | Supabase password reset handler |
| `/profile` | User settings + productivity dashboard |
| `/projects` | Projects list |
| `/projects/[id]` | Project detail, file uploads, linked conversations |
| `/landing` | Public marketing page (Lenis smooth scroll, Framer Motion) |

### Auth Flow

Supabase issues a JWT on login. All `src/lib/*.ts` API calls retrieve the session via `supabase.auth.getSession()` and attach `Authorization: Bearer <token>`. The backend filters all data by `user_id` from the token.

### localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `prism_font_size` | `"small" \| "medium" \| "large"` | Font size preference, read on mount in `page.tsx` |
| `prism_voice` | string (e.g. `"nova"`) | TTS voice preference, written by profile page, read by `page.tsx` and passed as `userVoice` to `ChatWindow` |

`page.tsx` re-syncs `userVoice` from localStorage on `visibilitychange` so changes made on the profile page take effect when the user returns to chat.

### Voice API Endpoints

| Endpoint | Usage |
|----------|-------|
| `POST /api/v1/voice/transcribe` | multipart/form-data, field `file` = audio blob → `{ text, duration }` |
| `POST /api/v1/voice/speak` | `{ text, voice, speed }` → `audio/mpeg` stream |
| `GET /api/v1/voice/voices` | `{ voices, default, descriptions }` |

All voice endpoints require `Authorization: Bearer <token>`. `transcribeAudio` lives in `api.ts`; the speak fetch is inlined in `ChatWindow.handleSpeak`.

### Haptics

`src/lib/haptics.ts` exports `Haptics` with named methods: `tap`, `press`, `send`, `responseComplete`, `error`, `sidebarOpen`, `sidebarClose`, `tabSwitch`, `milestone`, `thumbsUp`, `thumbsDown`. Only vibrates on touch devices (skipped when `hover: hover` matches). Do not call `Haptics.medium` or `Haptics.success` — those don't exist; use `Haptics.press` and `Haptics.responseComplete` instead.

### Styling

Tailwind CSS v4 with `shadcn/ui` components in `src/components/ui/`. Animations use Framer Motion (`motion/react`). Dark/light mode via `next-themes`. Global styles and keyframes in `src/app/globals.css`.

### Mobile

`MobileAppChrome.tsx` wraps mobile-specific UI. `BottomNav.tsx` provides fixed bottom navigation. Swipe gestures and haptic feedback (`src/lib/haptics.ts`) are handled in `MobileConversationRow.tsx`. The app is a PWA with `public/manifest.json` and `public/sw.js`.
