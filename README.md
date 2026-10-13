# Postlight

A community blog built with React, Vite, FastAPI, Supabase, and Gemini. Anyone can read posts; signed-in users can publish posts, manage their own posts, and ask AI questions. AI answers cite published posts and use text, not images.

## Requirements

- Python 3.11+
- Node.js 20.19+ or 22.12+
- A Supabase project and a Gemini API key

## Setup

1. Run [`supabase/schema.sql`](supabase/schema.sql) **once** in Supabase SQL Editor to create the tables, pgvector extension, and `post-images` bucket.
2. Enable email/password authentication. Set the Supabase Site URL to `http://localhost:5173`; confirm your email if confirmation is enabled.
3. Copy the environment templates from the project root:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env
   ```
4. Fill in these settings. Get a Gemini key from [Google AI Studio](https://aistudio.google.com/apikey).

| File              | Settings                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `backend/.env`  | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `GOOGLE_API_KEY` |
| `frontend/.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable/anon key)                 |

Keep the remaining template defaults for local development. Keep service role credentials in the backend only and never commit `.env` files.

## Run locally

From the project root, start the backend:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On macOS/Linux, use `python3` and `source .venv/bin/activate`. Start FastAPI from `backend/` to load its `.env`.

In a second terminal, start the frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. Check **http://localhost:8000/health** for `{"ok":true}`; API documentation is at **http://localhost:8000/docs**.

## Project structure

```text
backend/
  main.py                  # FastAPI app, CORS, and router registration
  postlight/
    config.py              # Environment settings
    clients.py             # Supabase and Gemini clients
    database.py            # PostgreSQL connections
    dependencies.py        # Authentication dependency
    schemas.py             # Request validation models
    routers/               # Health, post CRUD, and chat endpoints
    services/              # Post validation/serialization, image storage, AI retrieval
frontend/src/
  main.jsx                 # React bootstrap and stylesheet import
  App.jsx                  # App state and screen/dialog coordination
  components/              # Layout, post views, editor, authentication, chat
  hooks/useSession.js      # Supabase session subscription
  lib/                     # Supabase client and authenticated API requests
  style.css                # Shared styles
supabase/schema.sql        # Database schema, policies, and storage setup
```

Embeddings use 768 dimensions; keep `backend/postlight/services/retrieval.py` and `schema.sql` aligned when changing this.

## Checks

Build the frontend with `cd frontend` followed by `npm run build`.

For setup issues, credentials, model access, and CORS troubleshooting, see [`runbook.md`](runbook.md).
