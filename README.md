# Shopdesk — AI Live Chat Agent

An intelligent customer support live chat widget simulating an assistant for "Shopdesk" (an e-commerce storefront). This project features a React frontend, a Node.js + Express backend, SQLite database persistence, and OpenAI LLM integration.

---

## 🌟 Key Features

* **Real-Time Token Streaming (SSE)**: Response chunks are streamed dynamically using Server-Sent Events (SSE). The frontend UI displays a typing loading animation until the first token arrives, and then streams the reply word-by-word.
* **Contextual Follow-up Suggestion Chips**: The backend analyzes AI responses and appends up to three matching follow-up queries (e.g., if AI mentions shipping, frontend receives chips for *"Do you ship to Canada?"* and *"Is there free shipping?"*). Suggestions are filtered to ensure they do not repeat what the user just asked.
* **File-Synchronized FAQ Knowledge Base**: Store policies (shipping, returns, hours, promotions, and FAQs) are managed in a structured [policies.json](file:///Users/anujrajput/Desktop/temp/backend/data/policies.json) document. On backend startup, the server reads this file, serializes nested sections, and synchronizes/upserts them idempotently into the SQLite `knowledge_base` table, making policies easy to manage offline.
* **Markdown & URL Link Parsing**: A custom, XSS-safe text formatter in the frontend parses bold markdown (`**text**`), translates bullets (`-` or `*`) into clean list elements, and auto-links HTTP/HTTPS URLs with trailing punctuation trimming.
* **Automatic Session Restoration**: Generates a persistent `sessionId` stored in browser `localStorage`. Refreshing the tab automatically restores the full session history from the database. Includes a "New Chat" button to reset the session.
* **Cost & Guardrail Protections**: Capped to a maximum of 300 response tokens and last 10 history messages. Truncates inputs exceeding 2000 characters and blocks empty submissions.
* **Resilient Error surfeiting**: Catches OpenAI timeouts, rate limits (`429`), or auth issues, returning friendly fallback statements to the client instead of throwing crashes. Surfaces connection issues as stylized red inline error bubbles in the chat stream.

---

## 🛠️ Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: SQLite (`better-sqlite3`, raw SQL)
- **LLM**: OpenAI `gpt-4o-mini`
- **Frontend**: React + Vite (TypeScript)

---

## 🏗️ Architecture & Folder Structure

```
shopdesk/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── data/                 # Policies document and auto-created SQLite file
│   │   ├── policies.json     # Primary source of truth for store rules
│   │   └── chat.db           # SQLite DB file (created at runtime, gitignored)
│   ├── src/
│   │   ├── index.ts          # Express app, CORS, body limits, global error handler
│   │   ├── db.ts             # Schema definition, policies sync, and query getters
│   │   ├── validate.ts       # Message input validation middleware
│   │   ├── chat.routes.ts    # POST /message and GET /history/:sessionId controllers
│   │   ├── chat.service.ts   # Core service layer orchestration & suggestion logic
│   │   └── llm.service.ts    # OpenAI integration and dynamic system prompt assembly
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React + Vite + TypeScript Client
│   ├── src/
│   │   ├── api/
│   │   │   └── chat.ts       # Typed fetch wrapper and SSE stream reader
│   │   ├── components/
│   │   │   ├── ChatWidget.tsx       # Core chat window controller & state orchestrator
│   │   │   ├── MessageList.tsx      # Skeleton loader, suggestion grid, scroll anchor
│   │   │   ├── MessageBubble.tsx    # HTML custom parser and timezone formatter
│   │   │   ├── InputBar.tsx         # Multi-line self-growing input & char warnings
│   │   │   └── TypingIndicator.tsx  # Bouncing dots typing animation
│   │   ├── App.tsx
│   │   ├── index.css         # Responsive, glassmorphism theme and aesthetic styles
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
├── render.yaml               # Infrastructure-as-code deployment configuration
└── README.md
```

### Key Design Decisions
* **SQLite over PostgreSQL/Redis**: For a single customer chat widget, setting up PostgreSQL and Redis introduces heavy configuration overhead. SQLite (`better-sqlite3`) provides ultra-fast, file-backed SQL queries, and WAL (Write-Ahead Logging) is enabled for optimal concurrent reads.
* **Service-Layer Separation**: Routes handle HTTP semantics. Services coordinate orchestrations (reading history, calling OpenAI, mapping suggestions, saving response). The database file handles SQL directly. This makes it trivial to plug in additional channels (e.g. WhatsApp, Instagram hooks) by wrapping the service method.
* **OpenAI Raw SDK over LangChain**: Avoids bloated abstractions, keeping API requests fast, clean, and self-documenting.

---

## ⚙️ Environment Variables

Copy the `.env.example` templates to `.env` in both folders.

### Backend (`backend/.env`)
* `PORT`: Server port (defaults to `3000`).
* `OPENAI_API_KEY`: Your OpenAI API key (required).
* `FRONTEND_URL`: Origin allowed by CORS (e.g. `http://localhost:5173`).

### Frontend (`frontend/.env`)
* `VITE_API_URL`: The backend server endpoint (e.g. `http://localhost:3000`).

---

## 🚀 Local Run Instructions

### Prerequisites
* Node.js v18+
* NPM v9+

### 1. Start the Backend
```bash
cd backend
npm install
# Create environmental values
cp .env.example .env
# Edit .env and paste your OPENAI_API_KEY
npm run dev
```
On startup, the backend automatically creates `backend/data/chat.db` and logs:
`[db] Synchronized policies from policies.json.`
`Server running on http://localhost:3000`

### 2. Start the Frontend
In a new terminal window:
```bash
cd frontend
npm install
# Create environmental values
cp .env.example .env
npm run dev
```
Vite will launch the local development server at `http://localhost:5173`. Open this URL in your browser to test the widget.

---

## 💾 Database Setup, Seeding & Migration

* **Zero-Config Migrations**: SQLite tables are declared using `CREATE TABLE IF NOT EXISTS` directly inside `backend/src/db.ts`. When the server starts for the first time, tables are constructed automatically.
* **Idempotent Seeding**: During database initialization, a query counts setting rows inside `knowledge_base`. If empty, the default store policies (shipping, returns, hours, payment) are written within a single transaction.

---

## 🧠 LLM Rationale, Prompts & Guardrails

* **Model**: OpenAI `gpt-4o-mini` is used for high-speed, cost-effective reasoning.
* **System Prompt**: Built dynamically at request time by querying the database's `knowledge_base` table. This allows non-technical operators to adjust store rules in the database, updating the bot's behavior in real time.
* **Guardrails**:
  * **History Limiting**: Only the last 10 messages are passed as context to control cost and context window growth.
  * **Token Cap**: Capped at `max_tokens: 300` for short, concise replies.
  * **Validation & Truncation**: Inputs are validated on both sides. Messages exceeding 2000 characters are automatically warning-labeled in the UI and truncated on the backend to avoid API context poisoning.
  * **Graceful Fallbacks**: Catches rate limits (`429`), invalid keys (`401`), and network timeouts. Surfaces friendly support messages without throwing server crashes or silent failures.

---

## ⚖️ Trade-offs & "If I had more time..."

1. **Redis Caching**: Currently, we query the history from SQLite on every message. While SQLite is very fast on a indexed `conversation_id`, under heavy enterprise load, storing the active session contexts in Redis would minimize disk I/O.
2. **Session Expiry**: Sessions persist in `localStorage` indefinitely. Adding cookie/session timeout policies would help manage clean database retention.
