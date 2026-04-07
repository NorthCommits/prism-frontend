# Prism Frontend

> A premium, intelligent chat interface for the Prism AI copilot.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)

---

## What is Prism?

Prism is an open-source AI copilot that routes every message to the most capable specialist model. The frontend delivers a cinematic, focused chat experience built for real productivity — with smart suggestions, project workspaces, a productivity dashboard, and a UI that stays out of your way.

**The right model. Every time.**

---

## Features

### Chat Experience
- **Cinematic Loading Screen** — Animated entry with step-by-step initialization for new and returning users
- **Streaming Responses** — Token-by-token SSE streaming with a smooth animated cursor
- **Two-Phase Rendering** — Plain text during streaming, full markdown after completion, no flicker
- **Auto Model Routing UI** — Badge showing which specialist model handled each message and why
- **Web Search Badges** — Displays when Prism fetched live data from the web
- **GPT-4o Vision** — Upload images and ask questions about them directly in chat
- **Agent Mode Progress** — Step-by-step progress indicator for multi-step agent tasks
- **Message Action Bar** — Hover any message to copy, regenerate, edit, or give feedback
- **Edit Message** — Edit any past user message and replay the conversation from that point
- **Regenerate Response** — One click to get a fresh response to the same question
- **AI Response Actions** — Quick action pills after every response: Continue, Make shorter, Make longer, Simplify, Try differently, Add examples, Use bullets
- **Message Timestamps** — Hover any message to see the exact time it was sent
- **Reaction Animations** — Confetti on first message, celebration milestone at 100 messages

### Input
- **File Upload** — Attach PDF, DOCX, CSV, XLSX, Python, JavaScript, TypeScript, Markdown, and plain text files
- **Image Upload** — Drag or paste images for visual analysis
- **Slash Commands** — Type `/` to browse and apply six expert prompt templates
- **Smart Context Suggestions** — As you type, Prism surfaces related past conversations via semantic search
- **Project Picker** — Link any conversation to a project directly from the input bar

### Code
- **Syntax Highlighting** — All code blocks rendered with language-aware highlighting
- **Line Numbers** — Clean numbered lines in every code block
- **Language Badge** — Shows the detected language in the code block header
- **Copy Button** — One click to copy, icon swaps to a checkmark on success
- **Run Button** — Execute Python, JavaScript, TypeScript, and Bash directly from the chat
- **Inline Output** — Execution results appear below the code block, green for success, red for errors
- **Expand and Collapse** — Long code blocks collapse by default with a Show more option
- **Word Wrap Toggle** — Switch between wrapped and unwrapped code display

### Sidebar
- **Persistent Conversation History** — All conversations saved to Supabase, accessible across sessions
- **Collapsible Sidebar** — Collapses to a slim icon rail that stays usable
- **Collapsed Icon Rail** — Quick access to new chat, projects, and search even when sidebar is closed
- **Drag to Reorder** — Drag conversations into any order, saved to localStorage
- **Bulk Actions** — Select multiple conversations to delete or move to a project
- **Sidebar Resize** — Drag the sidebar edge to any width, preference saved across sessions
- **Conversation Search** — Search titles and message content with instant results and snippets
- **Conversation Preview** — Hover any sidebar item to see the last message in a floating popup
- **Dynamic Icons** — Sidebar icons adapt to the topic of each conversation

### Projects
- **Project Workspaces** — Create projects with names, colors, descriptions, and custom instructions
- **File Uploads Per Project** — Upload reference files into any project (5MB per file, 25MB per project)
- **Project Context in Chat** — Linking a conversation injects project instructions and file contents automatically
- **Project Picker in Input** — Link the active conversation to a project without leaving the chat
- **Project Banner** — A subtle indicator shows when a project context is active in the current chat
- **Linked Conversations** — Browse all conversations tied to a project from the project detail page

### Profile and Settings
- **Productivity Dashboard** — Tracks conversations, average scores, time saved, category breakdown, top topics, and daily chart
- **Weekly Report Card** — Automatic summary of your most productive week metrics
- **User Profile** — Set your name, background, custom instructions, and preferred response style
- **Cross-Conversation Memory** — View, manage, and delete memories Prism has extracted across sessions
- **Onboarding Flow** — A four-step guided setup for new users that configures name, expertise, and response style
- **Font Size Control** — Switch between Small, Medium, and Large text in the navbar, saved to localStorage
- **Feedback Evolution** — Thumbs up and down on any message, Prism rewrites your custom instructions based on patterns

### Mobile
- **Swipe to Open Sidebar** — Swipe right from the left edge to open the sidebar
- **Swipe to Delete** — Swipe left on a conversation to reveal a delete action
- **Long Press Context Menu** — Hold any conversation for rename, link to project, and delete options
- **Bottom Navigation Bar** — Fixed bottom bar on mobile with Home, Projects, Search, and Profile
- **Haptic Feedback** — Vibration on send, response complete, thumbs up, thumbs down, and navigation
- **PWA Support** — Install Prism as a native app on iOS and Android, works offline

### Landing Page
- **13-Section Landing Page** — Hero, marquee, feature sections, comparison table, stats, and CTA
- **Live Demo Embed** — Try Prism without signing up, directly on the landing page
- **Smooth Scroll** — Lenis smooth scrolling throughout the landing page
- **Cinematic Animations** — Motion-powered scroll-triggered reveals on every section

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type safety throughout |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible component library (Radix, Nova preset) |
| **Framer Motion** | Page transitions, micro-animations, scroll reveals |
| **Supabase** | Authentication and persistent chat history |
| **Plotly.js** | Interactive chart rendering |
| **react-markdown** | Markdown rendering for settled messages |
| **remark-gfm** | GitHub Flavored Markdown support |
| **react-syntax-highlighter** | Code block syntax highlighting |
| **recharts** | Productivity dashboard charts |
| **@dnd-kit** | Drag to reorder conversations |
| **Lenis** | Smooth scroll on landing page |
| **lucide-react** | Icon library |
| **next-themes** | Dark and light mode |

---

## Getting Started

### Prerequisites
- Node.js 18 or higher
- A running [Prism Backend](https://github.com/NorthCommits/Prism-backend)
- A Supabase project

### 1. Clone the repository
```bash
git clone https://github.com/NorthCommits/Prism.git
cd Prism
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_publishable_key
```

For production, replace `NEXT_PUBLIC_API_URL` with your deployed backend URL.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout, ThemeProvider, ToastProvider
│   │   ├── page.tsx                   # Main chat page, all core state
│   │   ├── globals.css                # Global styles, keyframes, scrollbar
│   │   ├── login/
│   │   │   └── page.tsx               # Login page (email, magic link, forgot password)
│   │   ├── reset-password/
│   │   │   └── page.tsx               # Password reset handler
│   │   ├── profile/
│   │   │   └── page.tsx               # Profile settings + productivity dashboard
│   │   ├── projects/
│   │   │   ├── page.tsx               # Projects list page
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Project detail, files, linked conversations
│   │   └── landing/
│   │       └── page.tsx               # Public landing page (13 sections)
│   ├── components/
│   │   ├── LoadingScreen.tsx          # Cinematic loading screen for app init
│   │   ├── SplashScreen.tsx           # First-visit meteor animation
│   │   ├── Onboarding.tsx             # Four-step new user onboarding flow
│   │   ├── Navbar.tsx                 # Top bar, model selector, font size, profile
│   │   ├── ModelToggle.tsx            # Auto / Coding / Writing selector
│   │   ├── ChatWindow.tsx             # Message list, streaming, markdown, actions
│   │   ├── ChatInput.tsx              # Input bar, file upload, image, slash commands, suggestions
│   │   ├── MarkdownRenderer.tsx       # Settled message markdown with all overrides
│   │   ├── CodeBlock.tsx              # Code blocks with run, copy, line numbers, expand
│   │   ├── ResponseActions.tsx        # Quick action pills after each response
│   │   ├── PlotRenderer.tsx           # Interactive Plotly chart renderer
│   │   ├── ImageRenderer.tsx          # DALL-E image display with download
│   │   ├── AgentProgress.tsx          # Multi-step agent progress indicator
│   │   ├── MessageFeedback.tsx        # Thumbs up and down with text feedback
│   │   ├── ReactionAnimation.tsx      # Confetti and milestone celebrations
│   │   ├── ConversationPreview.tsx    # Hover preview popup for sidebar items
│   │   ├── ProjectPicker.tsx          # Project link popup in chat input
│   │   ├── BottomNav.tsx              # Mobile fixed bottom navigation bar
│   │   └── Toast.tsx                 # Stacked toast notifications with progress and undo
│   └── lib/
│       ├── api.ts                     # sendMessageStream, parseFile
│       ├── history.ts                 # Conversation and message CRUD, search, suggestions
│       ├── profile.ts                 # Profile, memory, scores, onboarding API calls
│       ├── projects.ts                # Project CRUD, file upload, conversation linking
│       ├── feedback.ts                # submitFeedback
│       ├── templates.ts               # getTemplates, Template interface
│       ├── haptics.ts                 # Vibration patterns for mobile haptic feedback
│       └── supabase.ts                # Browser Supabase client
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── sw.js                          # Service worker for offline support
│   └── icons/                         # PWA app icons
├── .env.local                         # Environment variables (not committed)
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Authentication Flow

```
User visits /login
     │
     ├── Email + Password
     │   OR
     └── Magic Link
          │
          ▼
     Supabase issues JWT
          │
          ▼
     Token stored in browser session
          │
          ▼
     All API calls include Authorization: Bearer token
          │
          ▼
     Backend verifies token → filters all data by user_id
```

Each user only sees their own conversations, projects, memories, and scores.

---

## Loading Sequence

When the app initializes, it runs through a sequenced loading screen:

```
App mounts
     │
     ├── First ever visit? → Splash / meteor animation (2-3s)
     │
     ▼
Loading screen appears
     │
     ├── Step 1 (0-20%)   → Check auth session
     ├── Step 2 (20-40%)  → Load user profile
     ├── Step 3 (40-60%)  → Load conversations
     ├── Step 4 (60-80%)  → Load projects
     ├── Step 5 (80-100%) → Final setup
     │
     ▼
New user?  → Onboarding flow (4 steps)
Old user?  → Chat UI fades in
     │
     ▼
Background: bulk embed conversations for smart suggestions
```

The loading screen only shows once per browser session. Navigating to Profile and back skips it.

---

## Streaming Architecture

Prism uses a two-phase rendering strategy to eliminate flicker during streaming:

```
Token arrives via SSE
     │
     ▼
Phase 1 — STREAMING
  Plain text, whitespace-pre-wrap
  No markdown parsing
  No syntax highlighting
  Animated gradient cursor visible
  rAF-throttled updates (60fps max)
     │
     ▼ (done event received)
     │
Phase 2 — SETTLED (50ms delay)
  Full ReactMarkdown parsing
  Syntax-highlighted code blocks
  All markdown elements rendered
  Smooth opacity fade-in (0.8 → 1)
```

This matches how Claude and ChatGPT handle streaming. No re-parsing on every token, no flicker on code blocks.

---

## Smart Context Suggestions

As the user types, Prism queries the backend for semantically related past conversations:

```
User types 3+ characters
     │
     ▼ (150ms debounce)
POST /api/v1/suggestions
     │
     ├── Backend generates embedding via text-embedding-3-small
     ├── Runs pgvector cosine similarity search
     └── Falls back to title text search if no embeddings exist
     │
     ▼
Up to 3 related conversations shown as chips above input
Each chip shows title + relative time
Click → loads that conversation inline
```

Embeddings are generated automatically every 4th message and bulk-generated on first load.

---

## Deployment

### Deploy to Vercel (recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add environment variables in the Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_KEY=your_publishable_key
   ```
4. Click Deploy

Vercel handles Next.js builds, CDN distribution, and preview deployments automatically.

### After deployment

Update your backend CORS settings to allow your Vercel domain and update Supabase Auth with your production redirect URL so magic links work correctly.

---

## PWA Installation

Prism is a fully installable Progressive Web App.

On iOS: open the deployed URL in Safari, tap Share, then Add to Home Screen.

On Android: open the URL in Chrome, tap the menu, then Install App.

Once installed, Prism launches in standalone mode with no browser chrome, behaves like a native app, and serves cached pages when offline.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | URL of the Prism backend | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_KEY` | Supabase publishable key (safe for browser) | Yes |

---

## Related

- [Prism Backend](https://github.com/NorthCommits/Prism-backend) — The FastAPI routing engine powering Prism

---

## Contributing

Contributions are welcome. Please feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — free to use in your own projects.

---

<p align="center">Built by <a href="https://github.com/NorthCommits">NorthCommits</a></p>