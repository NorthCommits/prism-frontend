# Prism Frontend

> A beautiful, intelligent chat interface for the Prism AI copilot.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)

---

## What is Prism?

Prism is an open-source AI copilot that routes every message to the most capable specialist model. The frontend delivers a clean, focused chat experience — inspired by tools like Claude.ai — with powerful features built right in.

**The right model. Every time.**

---

## Features

- **Animated Splash Screen** — Beautiful branded entry screen with "Let's Chat" CTA
- **Auto Model Routing UI** — Shows which model handled each message and why
- **Web Search Badges** — Displays when Prism searched the web for your answer
- **File Upload** — Attach CSV, XLSX, Python, JS, TS, Markdown, and text files to your message
- **Interactive Charts** — Renders Plotly charts directly in the chat from natural language
- **AI Image Display** — Shows DALL-E 3 generated images inline in the conversation
- **Persistent Chat History** — All conversations saved to Supabase, accessible across sessions
- **Collapsible Sidebar** — Clean navigation with conversation history and timestamps
- **Copy & Quote Actions** — Copy any response or reply with a quoted reference
- **Authentication** — Email + password and magic link login via Supabase Auth
- **Per-user History** — Each user's conversations are completely isolated
- **Dark / Light Mode** — Full theme support with smooth transitions
- **Conversation Context** — Full history sent with every message for coherent multi-turn chats

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type safety throughout |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible component library (Radix + Nova preset) |
| **Supabase** | Authentication + persistent chat history |
| **Plotly.js** | Interactive chart rendering |
| **lucide-react** | Icon library |
| **next-themes** | Dark/light mode support |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A running [Prism Backend](https://github.com/NorthCommits/Prism-backend)
- A Supabase project

### 1. Clone the repository
```bash
git clone https://github.com/NorthCommits/prism-frontend.git
cd prism-frontend
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
│   │   ├── layout.tsx           # Root layout with ThemeProvider
│   │   ├── page.tsx             # Main chat page with all state
│   │   ├── globals.css          # Global styles + animations
│   │   └── login/
│   │       └── page.tsx         # Login page (email + magic link)
│   ├── components/
│   │   ├── SplashScreen.tsx     # Animated entry screen
│   │   ├── Navbar.tsx           # Top bar with theme toggle
│   │   ├── ModelToggle.tsx      # Auto / Coding / Writing selector
│   │   ├── ChatWindow.tsx       # Message list with bubbles
│   │   ├── ChatInput.tsx        # Input bar with file upload
│   │   ├── PlotRenderer.tsx     # Interactive Plotly chart renderer
│   │   ├── ImageRenderer.tsx    # AI image display component
│   │   └── ui/                  # shadcn/ui components
│   └── lib/
│       ├── api.ts               # Backend API calls
│       ├── history.ts           # Supabase conversation history
│       └── supabase.ts          # Supabase client
├── public/
├── .env.local                   # Environment variables (not committed)
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Authentication Flow

Prism uses Supabase Auth for user management:

```
User visits /login
     ↓
Email + Password or Magic Link
     ↓
Supabase issues JWT token
     ↓
Token stored in browser session
     ↓
All API calls include Bearer token
     ↓
Backend verifies token → filters data by user_id
```

Each user only sees their own conversation history.

---

## Deployment

### Deploy to Vercel (recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Add environment variables in the Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_KEY=your_publishable_key
   ```
4. Click Deploy

Vercel automatically handles Next.js builds, CDN distribution, and preview deployments on every pull request.

### After deployment

Update your backend CORS settings to allow your Vercel URL:

```python
allow_origins=["https://your-app.vercel.app"]
```

And update Supabase Auth URL configuration with your production URL so magic links redirect correctly.

---

## Backend

This frontend connects to the [Prism Backend](https://github.com/NorthCommits/prism-backend). Make sure it's running before starting the frontend.

The backend handles:
- Intelligent model routing (GPT-4o-mini router)
- Web search via Tavily
- File parsing (CSV, XLSX, code files)
- Plotly chart generation
- DALL-E 3 image generation
- Conversation persistence via Supabase
- JWT token verification

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | URL of the Prism backend | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_KEY` | Supabase publishable key (safe for browser) | Yes |

---

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## Related

- [Prism Backend](https://github.com/NorthCommits/prism-backend) — The FastAPI backend powering Prism

---

## License

MIT License — feel free to use this in your own projects.

---

<p align="center">Built with ❤️ by <a href="https://github.com/NorthCommits">Swapnil Bhattacharya</a></p>