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

All core chat state lives in `src/app/page.tsx` — a single large component (~3500 lines) that owns conversations, messages, sidebar, streaming state, model selection, project linking, and more. There is no global state library. State is passed down as props or managed locally in each component.

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`). Use `@/components/...`, `@/lib/...`, etc. throughout.

### Custom Hooks

`src/hooks/useMobileKeyboardOpen.ts` — detects whether the software keyboard is open on mobile (by comparing `window.innerHeight` to `screen.height`). Used in `page.tsx` to adjust layout when the keyboard appears.

### API Layer (`src/lib/`)

- **`api.ts`** — `sendMessageStream` (SSE streaming via `fetch`), `parseFile`, `fetchModels`, `transcribeAudio`. The `ChatMessage` interface is the canonical message shape used throughout the app. **Note:** the `/api/v1/chat` endpoint is unauthenticated — `user_id` is passed in the POST body instead of a Bearer token.
- **`history.ts`** — Conversation and message CRUD against the backend REST API, semantic search, smart suggestions, chat branching, export, and `embedAllConversations` (called once on load to bulk-generate pgvector embeddings for smart suggestions).
- **`profile.ts`** — User profile (including `voice` preference), memory, productivity scores, onboarding.
- **`projects.ts`** — Project CRUD, file uploads, conversation linking. `Project` type is defined here.
- **`feedback.ts`** — `submitFeedback` — posts a thumbs-up/down rating for a single assistant message to `POST /api/v1/feedback`.
- **`templates.ts`** — `getTemplates` — fetches slash-command prompt templates from `GET /api/v1/templates`. Each `Template` has `{ id, command, title, description, icon }`.
- **`haptics.ts`** — Haptic feedback helpers (see Haptics section below).
- **`messageTime.ts`** — `formatMessageTime` — formats ISO timestamps for display.
- **`supabase.ts`** — Browser Supabase client. Auth tokens from Supabase are passed as `Authorization: Bearer <token>` to the backend (except the chat endpoint).

### ModelId Type

`ModelId = "coding" | "writing" | "auto"` — defined in `api.ts`. The `auto` value triggers server-side routing between specialist models; the backend echoes `routed_to` and `routing_reason` in the SSE metadata event.

### Streaming / Two-Phase Rendering

Messages have an `isStreaming` boolean on `ChatMessage`. While streaming, `ChatWindow` renders plain `whitespace-pre-wrap` text with an animated cursor. On the `done` SSE event, `isStreaming` is set to false and `MarkdownRenderer` renders the full markdown. This prevents re-parsing markdown on every token.

The `/api/v1/chat` SSE stream emits JSON events on each `data:` line. `sendMessageStream` handles four types:

| `type` | Payload | Purpose |
|--------|---------|---------|
| `metadata` | `ChatResponse` fields | Model routing info, search used, response_type, etc. |
| `token` | `{ content: string }` | Streaming text fragment |
| `done` | — | Stream complete |
| `error` | `{ message: string }` | Stream error |

All other event types (e.g. agent step events) are silently ignored by the frontend.

The response can also be JSON (`application/json`) instead of SSE when `response_type` is `"plot"` or `"image"`.

### Key Components

- **`ChatWindow.tsx`** — Renders the message list. Distinguishes streaming vs settled messages. Owns TTS playback state (`speakingMessageId`, `currentAudioRef`) and calls `POST /api/v1/voice/speak` directly. Accepts `userVoice` prop. Handles `onRegenerate`, `onEditMessage`, `onBranch`, `onResponseAction`.
- **`ChatInput.tsx`** — Input bar with file/image upload, slash commands (`/` triggers template picker from `getTemplates()`), smart context suggestions (debounced 150ms, 3+ chars via `getSmartSuggestions`), and voice recording via `MediaRecorder`. Space on an empty input starts recording (walkie-talkie shortcut).
- **`ResponseActions.tsx`** — Quick follow-up action chips rendered after an assistant message. Actions are defined as `RESPONSE_ACTION_TAGS` in `page.tsx` (`continue`, `shorter`, `longer`, `simpler`, `different`, `examples`, `bullets`).
- **`MessageActionsBar.tsx`** — Hover action bar for messages. Accepts `onSpeak`/`isSpeaking` props to render the speaker button (assistant messages only). Also provides branch, regenerate, edit, copy, and feedback controls.
- **`MarkdownRenderer.tsx`** — Wraps `react-markdown` with custom renderers. Uses `CodeBlock` for all code. Uses `PlotRenderer` for `response_type: "plot"` and `ImageRenderer` for `response_type: "image"`.
- **`PlotRenderer.tsx`** / **`ImageRenderer.tsx`** — Renders Plotly JSON charts and AI-generated images respectively.
- **`CodeBlock.tsx`** — Code execution (Python, JS, TS, Bash via backend), copy, line numbers, expand/collapse, word wrap.
- **`LoadingScreen.tsx`** — 5-step sequenced initialization shown once per browser session. Controls the boot flow: auth check → profile → conversations → projects → setup.
- **`SplashScreen.tsx`** / **`Onboarding.tsx`** — First-run onboarding flow.
- **`ProductivityDashboard.tsx`** — Shown on the `/profile` page, renders productivity metrics.
- **`Toast.tsx`** — Toast notification system. Use `ToastProvider` + `ToastContainer` at the layout level; call `pushToast({ message, type })` imperatively or `useToast()` hook inside components.
- **`Navbar.tsx`** — Model selector, font size toggle (saved to `localStorage`), theme, profile link.
- **`SortableDesktopConversationRow.tsx`** — Drag-and-drop sortable conversation rows using `@dnd-kit/core`. Also exports `PinnedDesktopConversationRow` for pinned items and `ConversationRowDragGhost` for the drag overlay.
- **`ConversationPreview.tsx`** — Hover/tap preview card showing recent messages for a conversation.
- **`ConversationContextMenu.tsx`** — Right-click context menu for conversations (rename, delete, pin, branch, export).

### Sidebar Conversation Features

- **Drag-and-drop reordering** via `@dnd-kit/core` + `@dnd-kit/sortable` in `page.tsx`.
- **Bulk select mode** — long-press a conversation row activates bulk selection; shows checkboxes on all rows.
- **Date grouping** — `groupConversationsByDate` in `page.tsx` buckets conversations into Today / Yesterday / Last 7 Days / Last 30 Days / Older.
- **Icon mapping** — `getConversationIconConfig` keyword-matches conversation titles to a `ICON_CONFIGS` entry (Code2, Globe, Image, PenLine, etc.) for a colored icon badge.
- **Chat branching** — `branchConversation(conversationId, messageIndex)` in `history.ts` posts to `POST /api/v1/conversations/{id}/branch`; opens the new branch conversation automatically.
- **Export** — `exportConversation` in `history.ts`.

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

Supabase issues a JWT on login. All `src/lib/*.ts` API calls (except `api.ts` chat/stream) retrieve the session via `supabase.auth.getSession()` and attach `Authorization: Bearer <token>`. The backend filters all data by `user_id` from the token. The chat endpoint receives `user_id` in the POST body instead.

### Backend API Endpoints Summary

| Method + Path | Module | Purpose |
|---------------|--------|---------|
| `POST /api/v1/chat` | `api.ts` | SSE streaming chat (no auth header; `user_id` in body) |
| `POST /api/v1/file/parse` | `api.ts` | Parse uploaded file → `{ file_name, file_type, content }` |
| `GET /api/v1/models` | `api.ts` | Available models |
| `GET /api/v1/templates` | `templates.ts` | Prompt template list for slash commands |
| `POST /api/v1/voice/transcribe` | `api.ts` | Audio → text (multipart, field `file`) |
| `POST /api/v1/voice/speak` | `ChatWindow` | Text → audio/mpeg stream |
| `GET /api/v1/voice/voices` | — | Available TTS voices |
| `GET /api/v1/conversations` | `history.ts` | List conversations |
| `POST /api/v1/conversations` | `history.ts` | Create conversation |
| `PATCH /api/v1/conversations/{id}` | `history.ts` | Update title |
| `DELETE /api/v1/conversations/{id}` | `history.ts` | Delete conversation |
| `GET /api/v1/conversations/{id}/messages` | `history.ts` | Load messages |
| `POST /api/v1/conversations/{id}/branch` | `history.ts` | Branch at message index |
| `POST /api/v1/messages` | `history.ts` | Save a message |
| `GET /api/v1/search?q=...` | `history.ts` | Full-text conversation search |
| `POST /api/v1/suggestions` | `history.ts` | Semantic smart suggestions |
| `POST /api/v1/feedback` | `feedback.ts` | Thumbs-up/down rating |

### localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `prism_font_size` | `"small" \| "medium" \| "large"` | Font size preference, read on mount in `page.tsx` |
| `prism_voice` | string (e.g. `"nova"`) | TTS voice preference, written by profile page, read by `page.tsx` and passed as `userVoice` to `ChatWindow` |
| `prism_sidebar_collapsed` | `"0" \| "1"` | Sidebar open/closed state |
| `prism_sidebar_width` | string (px number) | Sidebar drag-resize width |
| `prism_conv_order` | JSON string (string[]) | Manual drag-reordered conversation IDs |
| `prism_pinned_conversations` | JSON string (string[]) | Pinned conversation IDs |
| `prism_visited` | `"true"` | Set after first visit to skip splash screen on return |
| `prism_pending_profile` | JSON string | Onboarding profile data buffered before auth completes |
| `prism_first_message_sent` | `"true"` | Triggers first-message confetti via `ReactionAnimation` |
| `prism_message_count` | string (number) | Running total for milestone reaction (fires at 100) |
| `prism_install_dismissed_until` | string (timestamp ms) | Suppresses PWA install banner until this time |

`page.tsx` re-syncs `userVoice` from localStorage on `visibilitychange` so changes made on the profile page take effect when the user returns to chat.

### Haptics

`src/lib/haptics.ts` exports `Haptics` with named methods: `tap`, `press`, `send`, `responseComplete`, `error`, `sidebarOpen`, `sidebarClose`, `tabSwitch`, `milestone`, `thumbsUp`, `thumbsDown`. Only vibrates on touch devices (skipped when `hover: hover` matches). Do not call `Haptics.medium` or `Haptics.success` — those don't exist; use `Haptics.press` and `Haptics.responseComplete` instead.

### Styling

Tailwind CSS v4 with `shadcn/ui` components in `src/components/ui/`. Animations use Framer Motion (`motion/react`). Dark/light mode via `next-themes`. Global styles and keyframes in `src/app/globals.css`.

### Mobile

`MobileAppChrome.tsx` wraps mobile-specific UI. `BottomNav.tsx` provides fixed bottom navigation. Swipe gestures and haptic feedback (`src/lib/haptics.ts`) are handled in `MobileConversationRow.tsx`. The app is a PWA with `public/manifest.json` and `public/sw.js`.
