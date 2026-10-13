# Postlight setup

This app uses React, FastAPI, Supabase Auth/Database/Storage/pgvector, LangChain, and Gemini. You supply all keys locally; no secrets are committed.

## 1. Create Supabase resources

1. Create a Supabase project and wait for its database to start.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) once. It creates the `posts` and `post_chunks` tables, enables pgvector, and creates the public `post-images` bucket. If you changed the bucket name, update the SQL and backend environment file together.
3. In **Authentication → Providers → Email**, enable email/password. Choose whether email confirmation is required. If enabled, set **Authentication → URL Configuration → Site URL** to `http://localhost:5173`; new users must confirm their email before signing in.
4. In **Project Settings → API**, copy the project URL, publishable/anon key, and service role key. In **Connect**, copy the database connection string. Use the session pooler URL if your network cannot reach the direct IPv6 database host.

Keep the service role key and database password on the backend only. The frontend uses the publishable/anon key.

## 2. Create a Gemini API key

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey). The configured model IDs are `gemini-3.8-flash` and `gemini-embedding-2`. The database schema expects 768 dimensional embeddings; keep this value aligned with `backend/main.py` if changing it.

## 3. Fill environment files

Copy `backend/.env.example` to `backend/.env`, and `frontend/.env.example` to `frontend/.env`. Fill in every placeholder. Use the Supabase database password in `SUPABASE_DB_URL`; URL encode special characters in that password. Set `FRONTEND_ORIGIN` to the exact frontend URL you open in the browser.

Keep each setting on its own line. In particular, the database URL must end at `/postgres` before the bucket setting begins:

```dotenv
SUPABASE_DB_URL=postgresql://postgres.YOUR_PROJECT:YOUR_PASSWORD@YOUR_POOLER_HOST:5432/postgres
SUPABASE_STORAGE_BUCKET=post-images
```

## 4. Start the backend

Install Python 3.11+ and Node.js 20.19+ (or 22.12+). In a terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On macOS/Linux use `python3 -m venv .venv` and `source .venv/bin/activate`. Check `http://localhost:8000/health` for `{"ok":true}`.

## 5. Start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Sign up or sign in, publish a post, optionally upload one image, then ask AI a question about the posts. Anyone can read posts; signed-in authors can edit or delete their own. Chat requires sign-in and searches all posts.

## Troubleshooting

- **Sign-up succeeds but sign-in fails:** confirm your email if Supabase email confirmation is enabled.
- **Database connection fails:** verify `SUPABASE_DB_URL`, database password, and pooler host/port.
- **Database named `postgresSUPABASE_STORAGE_BUCKET=post-images` does not exist:** a newline is missing between those two settings in `backend/.env`. Separate them as shown above, save the file, and restart FastAPI.
- **Image upload fails:** confirm the `post-images` bucket exists and the backend has the service role key.
- **AI request fails:** check the Gemini API key, model access, and billing/quota in Google AI Studio.
- **CORS error:** set `FRONTEND_ORIGIN` to the frontend's actual origin and restart FastAPI.

AI answers use the nearest text excerpts and list source posts. They do not inspect image contents. Large blogs may need a pgvector index and pagination; this starter uses exact vector search for simplicity.
