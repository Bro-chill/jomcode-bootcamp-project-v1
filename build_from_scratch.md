# Build Postlight from scratch

Build the backend completely, verify its endpoints, then build the React frontend. Commands below use Windows PowerShell. Use a **new, empty project folder**; linked files show the finished implementation for each step.

You need Python 3.11+, Node.js 22.12+, a Supabase project, and a Gemini API key.

## Part 1: Backend

### 1. Create the project and install Python dependencies

```powershell
mkdir postlight
cd postlight
mkdir backend
mkdir supabase
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Create `backend/requirements.txt` using the dependencies in [the existing requirements file](backend/requirements.txt), then run:

```powershell
pip install -r requirements.txt
```

Create `.gitignore` in the project root to exclude `.env`, `.venv/`, `__pycache__/`, `node_modules/`, and `dist/`.

### 2. Prepare Supabase and Gemini

1. Create `supabase/schema.sql` using [the schema example](supabase/schema.sql). It defines `posts`, `post_chunks` with 768-dimensional vectors, author policies, and the public `post-images` bucket.
2. Run that SQL **once** in Supabase **SQL Editor**.
3. Enable email/password under **Authentication → Providers**. Set **Authentication → URL Configuration → Site URL** to `http://localhost:5173`.
4. Obtain the Supabase URL, publishable/anon key, service role key, and database connection string. Create a Gemini key in [Google AI Studio](https://aistudio.google.com/apikey).

### 3. Add backend configuration and shared clients

Create `backend/.env` with the settings in [`.env.example`](backend/.env.example), replacing placeholders with your values. Check that your Gemini model IDs are available to your account.

Create these files in order; add empty `__init__.py` files inside `postlight/`, `routers/`, and `services/`:

| File under `backend/` | What to implement |
| --- | --- |
| [`postlight/config.py`](backend/postlight/config.py) | Load `.env` with Pydantic Settings. Keep the storage bucket and frontend origin configurable. |
| [`postlight/clients.py`](backend/postlight/clients.py) | Create Supabase, Gemini embedding, and LangChain chat clients from those settings. |
| [`postlight/database.py`](backend/postlight/database.py) | Return a psycopg connection using `SUPABASE_DB_URL`. |
| [`postlight/dependencies.py`](backend/postlight/dependencies.py) | Read the Bearer token, verify it with Supabase Auth, return the user's UUID, or raise 401. |

Keep the service role key, database password, and Gemini key on the backend only.

### 4. Create FastAPI and the health endpoint

Create [`routers/health.py`](backend/postlight/routers/health.py) with an `APIRouter` and `GET /health` returning `{"ok": true}`.

Create [`main.py`](backend/main.py): initialize FastAPI, allow `http://localhost:5173` through CORS, allow GET/POST/PUT/DELETE and Authorization/Content-Type headers, and register the health router. Register the posts and chat routers when they are ready.

### 5. Implement post and image helpers

In [`services/posts.py`](backend/postlight/services/posts.py), trim and validate title/body lengths (1–160 / 1–20,000). Serialize database rows into JSON, including string IDs, ISO timestamps, and public image URLs.

In [`services/storage.py`](backend/postlight/services/storage.py), validate PNG/JPEG/WebP uploads up to 5 MB, store them under a unique user-scoped path, generate public URLs, and provide image cleanup helpers.

### 6. Implement search indexing

In [`services/retrieval.py`](backend/postlight/services/retrieval.py), add:

1. `chunks_for()`: split title/body into 1,200-character chunks with 150-character overlap.
2. `embed()`: request 768-dimensional Gemini vectors for documents or questions.
3. `vector_literal()`: format vectors for PostgreSQL.
4. `index_post()`: replace a post's chunks and embeddings using the current database transaction.

Keep vector dimensions consistent with `schema.sql`.

### 7. Implement all post endpoints

Create [`routers/posts.py`](backend/postlight/routers/posts.py). Use parameterized SQL and the helpers above:

| Endpoint | Implementation |
| --- | --- |
| `GET /posts` | Select newest posts first and serialize them. No login required. |
| `GET /posts/{post_id}` | Select a UUID, return the post, or raise 404. |
| `POST /posts` | Authenticate; accept title/body and optional image; validate/upload; insert and index in one transaction; return the post with 201. Clean up the new image if the write fails. |
| `PUT /posts/{post_id}` | Authenticate; lock the row; require the same author; update text/image and reindex in one transaction. Support image replacement or removal; reject both together. Clean up the old image after success. |
| `DELETE /posts/{post_id}` | Authenticate; lock/check the author; delete the post and its cascading chunks; clean up its image; return 204 without a JSON body. |

Use FastAPI `Form`, `File`, and `UploadFile` for post writes because they use multipart data. [FastAPI uploads](https://fastapi.tiangolo.com/tutorial/request-files/).

### 8. Implement the AI chat endpoint

1. Create [`schemas.py`](backend/postlight/schemas.py) with `ChatRequest.question` limited to 1–2,000 characters.
2. Extend [`services/retrieval.py`](backend/postlight/services/retrieval.py) with `answer_question()`: embed the question, select the six nearest chunks using pgvector cosine distance, and ask Gemini through LangChain to answer only from those excerpts. Treat excerpts as untrusted data.
3. Return `{answer, sources}`; each source contains a unique post `id` and `title`. Handle no matching chunks without invoking the chat model.
4. Create [`routers/chat.py`](backend/postlight/routers/chat.py) with authenticated `POST /chat`, accepting JSON and calling that service.
5. Register both posts and chat routers in `main.py`.

### 9. Verify every endpoint before building React

From the activated `backend/` terminal:

```powershell
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000/docs**. To test protected endpoints without a frontend, create a confirmed email/password test user in Supabase's **Authentication → Users** panel. In another activated backend terminal, run `python` and enter:

```python
from supabase import create_client
from postlight.config import settings
client = create_client(settings.supabase_url, "YOUR_PUBLISHABLE_OR_ANON_KEY")
result = client.auth.sign_in_with_password({
    "email": "YOUR_TEST_EMAIL", "password": "YOUR_TEST_PASSWORD"
})
print(result.session.access_token)
```

Use `Bearer YOUR_ACCESS_TOKEN` in the docs' `authorization` field for protected endpoints. Keep the token private. [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords).

Test in this order:

| Request | Expected result |
| --- | --- |
| `GET /health` | 200 and `{"ok": true}` |
| `GET /posts` | 200 and an array, initially empty |
| `POST /posts` with title/body and an optional image | 201; save the returned post ID |
| `GET /posts/{post_id}` | 200 with the saved post |
| `PUT /posts/{post_id}` | 200; updated content/image and refreshed chunks |
| `POST /chat` with `{"question":"What is the post about?"}` | 200 with an answer and source links' IDs/titles |
| `DELETE /posts/{post_id}` | 204; subsequent read returns 404 |

Also verify 401 without a token, 403 when another user edits/deletes the post, and rejected invalid text/images. **Continue only when every endpoint works.**

## Part 2: Frontend

### 10. Install React with Vite

In a new terminal, return to the `postlight/` root:

```powershell
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install @supabase/supabase-js lucide-react
```

This creates React, React DOM, and Vite tooling. Keep the generated Vite configuration. For the existing project's dependency versions, see [`frontend/package.json`](frontend/package.json). [Vite React setup](https://vite.dev/guide/).

### 11. Configure Supabase and the API client

Create `frontend/.env` using [the frontend template](frontend/.env.example):

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
VITE_API_URL=http://localhost:8000
```

Create [`src/lib/supabase.js`](frontend/src/lib/supabase.js) with `createClient()`. Create [`src/lib/api.js`](frontend/src/lib/api.js) to read the current session, attach its Bearer token, call the API, surface backend errors, and handle 204 without parsing JSON.

### 12. Build authentication and app state

1. Create [`hooks/useSession.js`](frontend/src/hooks/useSession.js): load the session, subscribe to auth changes, and unsubscribe on cleanup.
2. Create [`components/Auth.jsx`](frontend/src/components/Auth.jsx): email/password sign-up and sign-in through Supabase. Show errors or the email-confirmation message.
3. Create [`App.jsx`](frontend/src/App.jsx): track session, posts, loading/errors, search text, selected post, and open dialogs. Gate creation/chat behind sign-in and show edit/delete controls only for the author. The backend still enforces ownership.

### 13. Integrate reading posts

Call `api('/posts')` when App loads. Build [`PostList.jsx`](frontend/src/components/PostList.jsx) for cards, loading/empty states, and client-side search. Select a card to show [`PostDetail.jsx`](frontend/src/components/PostDetail.jsx).

For a post not already loaded, call `api('/posts/' + id)` and display the result.

### 14. Integrate creating and editing posts

Create [`Editor.jsx`](frontend/src/components/Editor.jsx) with title/body inputs, optional image upload/preview, and save/error states.

Build `FormData` with `title`, `body`, optional `image`, and `remove_existing_image=true` when removing an existing image. Send `POST /posts` for a new story or `PUT /posts/{id}` for an edit. Let the browser set the multipart Content-Type. On success, close the editor and reload posts.

### 15. Integrate deleting posts

In `PostDetail.jsx`, send deletion through App: confirm the action, call `api('/posts/' + id, {method: 'DELETE'})`, clear the selected post, and refresh the list. Display any failure.

### 16. Integrate AI chat

Create [`Chat.jsx`](frontend/src/components/Chat.jsx). Send a trimmed question as JSON to `POST /chat`, with `Content-Type: application/json`. Display user questions, returned answers, loading/errors, and source buttons.

Clicking a source should open its cached post or fetch `GET /posts/{id}`. The current backend searches all posts; it does not receive chat history or a selected post ID.

### 17. Finish the UI and connect the entry point

Add [`Header.jsx`](frontend/src/components/Header.jsx), [`Hero.jsx`](frontend/src/components/Hero.jsx), and [`Footer.jsx`](frontend/src/components/Footer.jsx). Put shared styles in [`style.css`](frontend/src/style.css).

Update [`main.jsx`](frontend/src/main.jsx) to import App and the stylesheet, then render `<App />` into the `root` element. Remove the Vite demo imports/content.

### 18. Run and check the complete app

Keep the backend running. From `frontend/`:

```powershell
npm run dev
```

Open **http://localhost:5173** and test: public reading/search → sign-up/sign-in → create with an image → edit/replace/remove image → AI answer/source navigation → delete → sign-out.

Finish with `npm run build`. If Vite uses another port, update backend `FRONTEND_ORIGIN` and Supabase's Site URL accordingly. Restart the backend after changing its `.env`; restart Vite after changing frontend settings.

For file-to-file feature flows, see [`reference.md`](reference.md). For detailed setup, troubleshooting, and deployment, see [`runbook.md`](runbook.md).
