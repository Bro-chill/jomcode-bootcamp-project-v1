# Postlight setup

This app uses React, FastAPI, Supabase Auth/Database/Storage/pgvector, LangChain, and Gemini. You supply all keys locally; no secrets are committed.

## 1. Create Supabase resources

1. Create a Supabase project and wait for its database to start.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) once. It creates the `posts` and `post_chunks` tables, enables pgvector, and creates the public `post-images` bucket. If you changed the bucket name, update the SQL and backend environment file together.
3. In **Authentication → Providers → Email**, enable email/password. Choose whether email confirmation is required. If enabled, set **Authentication → URL Configuration → Site URL** to `http://localhost:5173`; new users must confirm their email before signing in.
4. In **Project Settings → API**, copy the project URL, publishable/anon key, and service role key. In **Connect**, copy the database connection string. Use the session pooler URL if your network cannot reach the direct IPv6 database host.

Keep the service role key and database password on the backend only. The frontend uses the publishable/anon key.

## 2. Create a Gemini API key

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey). The configured model IDs are `gemini-3.8-flash` and `gemini-embedding-2`. The database schema expects 768 dimensional embeddings; keep this value aligned with `backend/postlight/services/retrieval.py` if changing it.

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

## 6. Deploy to Cloudflare Free: Workers + Pages

Documentation checked on **14 October 2026**. These instructions describe deployment; no Cloudflare resources or application changes have been made.

### Deployment readiness

| Part | Current status |
| --- | --- |
| Frontend → Pages | Ready for a static Vite build. A working public HTTPS API is required for post requests and chat. |
| Backend → Workers | Requires adaptation and compatibility testing first. The repository has no Workers entry point, `wrangler.jsonc`, or `pyproject.toml`. |

Cloudflare supports FastAPI through its Python Workers ASGI adapter. It does not use the project's local `uvicorn main:app` startup command. [Cloudflare FastAPI guide](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/).

### A. Prepare the backend before attempting deployment

**Stop here for the unchanged backend.** The following development work is a prerequisite, outside this documentation-only update:

1. Add a Workers entry module, for example `backend/worker.py`, exposing the FastAPI app through `from workers import asgi` and `Default = asgi.entrypoint(app)`.
2. Add `backend/wrangler.jsonc` with a Worker name (for example `postlight-api`), `main` pointing to that entry module, a tested compatibility date, and `compatibility_flags: ["python_workers"]`. Add a `pyproject.toml` with compatible application dependencies and the `workers-py` / `workers-runtime-sdk` development tools. Follow the [official FastAPI configuration](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/).
3. Adapt `postlight/config.py` and `clients.py` to initialize settings/clients from Workers bindings. Currently `Settings()` and the external clients run at import time using local environment settings. Workers exposes configuration through bindings such as `self.env`; simply adding dashboard secrets does not adapt this code. [Python bindings guide](https://developers.cloudflare.com/workers/languages/python/basics/).
4. Check every dependency in `requirements.txt`, especially `psycopg[binary]`, Pillow, Supabase, Gemini, and LangChain. Workers supports pure Python, PyEmscripten, and included Pyodide packages; ordinary Windows/Linux binary wheels are insufficient. Validate database connectivity, synchronous network calls, multipart uploads, and image decoding in the Workers runtime; replace incompatible parts if needed. This is a compatibility requirement inferred from this project's dependencies and Cloudflare's [package support documentation](https://developers.cloudflare.com/workers/languages/python/packages/).
5. Preserve author checks, 768-dimensional vectors, post/chunk transactions, and image cleanup. If database access changes to HTTP/RPC, transaction behavior must also be preserved. Test CRUD, uploads, and chat under Free plan CPU/memory limits before treating deployment as ready.

### B. Publish the adapted backend and configure it in the dashboard

**Only follow these steps after A is complete.** These commands are for a configured Python Worker, not the current backend.

1. Create/sign in to a free account at [Cloudflare Dashboard](https://dash.cloudflare.com/). Select your account and open **Workers & Pages**. Keep the Workers Free plan; the generated `workers.dev` URL avoids buying a domain.
2. Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and Node.js locally. In a terminal, open the adapted backend directory and authenticate:

   ```powershell
   cd backend
   uv run pywrangler login
   ```

   Follow the browser authorization prompt for the intended Cloudflare account. Python Workers uses `pywrangler` for local testing and publishing. [Python Workers tooling](https://developers.cloudflare.com/workers/languages/python/).

3. Supply local test bindings using Cloudflare's `.dev.vars` mechanism, keep that file out of version control, and run `uv run pywrangler dev`. Verify `/health`, post CRUD, image upload, and chat locally. Then run `uv run pywrangler deploy`. If startup requires secrets during the initial publish, set them using `uv run pywrangler secret put NAME` and publish again; do not hard-code them. [Local configuration](https://developers.cloudflare.com/workers/local-development/environment-variables/), [secret commands](https://developers.cloudflare.com/workers/configuration/secrets/).
4. Return to **Workers & Pages → postlight-api → Settings → Variables and Secrets → Add**. Add the values below, choosing **Secret** for credentials and **Text** for ordinary settings. Save/deploy the configuration changes. This panel configures Worker runtime values, not Pages build values. [Dashboard variables](https://developers.cloudflare.com/workers/configuration/environment-variables/), [dashboard secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

   | Type | Names and values |
   | --- | --- |
   | Secret | `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`; also `SUPABASE_DB_URL` if the adapted backend still uses it |
   | Text | `SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET=post-images`, the tested `GEMINI_CHAT_MODEL` and `GEMINI_EMBEDDING_MODEL` |
   | Text | `FRONTEND_ORIGIN=https://YOUR_PAGES_PROJECT.pages.dev` (use the exact eventual Pages URL) |

   Keep non-secret values synchronized with the adapted Wrangler configuration so later CLI deploys do not overwrite dashboard edits.

5. Open **Settings → Domains & Routes**, locate the `workers.dev` address, and enable it if necessary. Record the URL, such as `https://postlight-api.YOUR_SUBDOMAIN.workers.dev`. Check `URL/health` and `URL/posts`; health alone does not verify database or AI access. [workers.dev configuration](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
6. For subsequent backend changes, rerun `uv run pywrangler deploy` from the adapted project. Use the Worker dashboard's **Deployments** and **Observability** areas to inspect deployment status and request failures.

### C. Deploy the existing frontend through Pages

1. Put the project in a GitHub/GitLab repository, including `frontend/package-lock.json`. Exclude `.env`, `.venv`, `node_modules`, and credentials. Have the public HTTPS backend URL from B ready. Pages can also use another working HTTPS API while Workers adaptation is pending.
2. In [Cloudflare Dashboard](https://dash.cloudflare.com/), select your account → **Workers & Pages → Create application → Pages → Import an existing Git repository**. Connect GitHub/GitLab, authorize access to the repository, select it, and begin setup. [Pages Git deployment guide](https://developers.cloudflare.com/pages/get-started/git-integration/).
3. Choose a project name such as `postlight-web` and your production branch (often `main`). Under **Set up builds and deployments**, enter:

   | Setting | Value |
   | --- | --- |
   | Framework preset | React (Vite), if available; otherwise leave blank and use the values below |
   | Root directory (advanced) | `frontend` |
   | Build command | `npm run build` |
   | Build output directory | `dist` (relative to `frontend`, not `frontend/dist`) |

   Cloudflare installs the frontend dependencies and runs the build. [React build settings](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/), [root directory configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).

4. Expand **Environment variables (advanced)** before the first build and add:

   | Variable | Value |
   | --- | --- |
   | `NODE_VERSION` | `22.14.0` (the version used for this project's successful local build) |
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your publishable/anon key |
   | `VITE_API_URL` | The HTTPS API base URL, with no trailing slash; never `localhost` |

   Only public configuration belongs in `VITE_*` variables because Vite embeds it in browser JavaScript. Keep service role and Gemini keys on the backend. [Vite environment variables](https://vite.dev/guide/env-and-mode).

5. Click **Save and Deploy**, review the build log, and then **Continue to project**. Open the production URL, such as `https://postlight-web.pages.dev`. [Pages first deployment](https://developers.cloudflare.com/pages/get-started/git-integration/).
6. To change build variables later, open **Workers & Pages → your Pages project → Settings → Variables and Secrets**. Select the **Production** environment, add/edit the variables, save, and rebuild through **Deployments → the latest production deployment → Retry deployment** or push a new commit. Configure Preview separately only if needed. Vite variables require a new build to take effect. [Pages variables](https://developers.cloudflare.com/pages/functions/bindings/).

### D. Connect authentication and verify the complete app

1. Copy the actual production Pages origin into the backend's `FRONTEND_ORIGIN`, then deploy that configuration. Multiple allowed origins can be comma-separated; add only the preview/local origins you need. The current CORS code uses exact origin matching.
2. In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to the production Pages URL; add permitted confirmation/redirect URLs for any additional environments. Keep email/password enabled. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
3. Open the production Pages site. Check public post loading, sign-up/email confirmation, sign-in, create with an image, edit/replace/remove image, AI answer/source links, and delete. Confirm a different account cannot edit/delete someone else's post.
4. If requests fail, inspect the browser's Network tab and the backend logs. A deployed frontend with no working API will show request errors even if its Pages build succeeded.

### Free-tier boundaries

- **Workers Free:** 100,000 requests/day, 10 ms CPU per invocation, 128 MB memory, and 50 subrequests/request. Network waiting differs from CPU time; image validation and embedding preparation still need measurement. A successful publish does not prove this workload fits Free. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
- **Pages Free:** 500 builds/month, one concurrent build, 20,000 files, and 25 MiB maximum per file. This frontend uses static Pages hosting; API execution consumes the separate Workers allowance. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).
- **Supabase and Gemini:** have separate quotas and pricing. Check the configured models' API free-tier availability before deployment; this guide does not guarantee that the entire app is free. Supabase Free projects can pause after low activity. [Supabase plans](https://supabase.com/pricing), [project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).

## Troubleshooting

- **Sign-up succeeds but sign-in fails:** confirm your email if Supabase email confirmation is enabled.
- **Database connection fails:** verify `SUPABASE_DB_URL`, database password, and pooler host/port.
- **Database named `postgresSUPABASE_STORAGE_BUCKET=post-images` does not exist:** a newline is missing between those two settings in `backend/.env`. Separate them as shown above, save the file, and restart FastAPI.
- **Image upload fails:** confirm the `post-images` bucket exists and the backend has the service role key.
- **AI request fails:** check the Gemini API key, model access, and billing/quota in Google AI Studio.
- **CORS error:** set `FRONTEND_ORIGIN` to the frontend's actual origin and restart FastAPI.
- **Pages build cannot find `package.json`:** set Root directory to `frontend` and output directory to `dist`.
- **Deployed browser calls `localhost:8000`:** set Production `VITE_API_URL` and rebuild Pages; changing settings without rebuilding does not update the bundle.
- **Worker package/import/startup error:** complete the adaptation and dependency checks in section 6A. Uploading the existing backend alone is insufficient.

AI answers use the nearest text excerpts and list source posts. They do not inspect image contents. Large blogs may need a pgvector index and pagination; this starter uses exact vector search for simplicity.
