# Code reading guide

Read the backend first to understand each API, then follow its response into the frontend. Paths below are relative to the project root.

## Start here

1. [`supabase/schema.sql`](supabase/schema.sql): defines posts, searchable chunks, author policies, and the image bucket.
2. [`backend/main.py`](backend/main.py): creates FastAPI, configures CORS, and registers the routers.
3. [`backend/postlight/config.py`](backend/postlight/config.py) → [`clients.py`](backend/postlight/clients.py) / [`database.py`](backend/postlight/database.py): loads settings and creates external clients/database connections.
4. [`frontend/src/main.jsx`](frontend/src/main.jsx) → [`App.jsx`](frontend/src/App.jsx): mounts React; App coordinates posts, selected stories, and dialogs.

## Shared authentication and requests

[`Auth.jsx`](frontend/src/components/Auth.jsx) → [`lib/supabase.js`](frontend/src/lib/supabase.js) → Supabase Auth: signs up or signs in. [`hooks/useSession.js`](frontend/src/hooks/useSession.js) keeps App's session current.

[`lib/api.js`](frontend/src/lib/api.js) → [`backend/postlight/dependencies.py`](backend/postlight/dependencies.py): attaches the session's Bearer token; `current_user()` verifies it with Supabase. Creating, editing, deleting, and chatting require authentication. Reading posts is public.

## Post CRUD

Start with [`routers/posts.py`](backend/postlight/routers/posts.py). Its helpers live in [`services/posts.py`](backend/postlight/services/posts.py), [`services/storage.py`](backend/postlight/services/storage.py), and [`services/retrieval.py`](backend/postlight/services/retrieval.py).

| Feature | Backend flow | Frontend flow |
| --- | --- | --- |
| Read | `list_posts()` / `get_post()` → `database.connection()` → `serialize_post()` → JSON containing public image URLs. | `App.refresh()` → `api('/posts')` → `PostList.jsx` → selected post → `PostDetail.jsx`. Search filters already loaded posts in App. |
| Create | `create_post()` → authenticate → `validate_text()` → optional `store_image()` → insert post → `index_post()` → return saved post (201). | App opens `Editor.jsx` → `submit()` sends multipart `POST /posts` → `onSaved()` closes the editor and refreshes the list. |
| Update | `update_post()` → authenticate → validate → optional upload → lock post/check author → update post → replace search chunks → clean up old image. | `PostDetail.jsx` → App opens `Editor.jsx` with the selected post → multipart `PUT /posts/{id}` → close and refresh. |
| Delete | `delete_post()` → authenticate → lock post/check author → delete row → database cascades chunk deletion → image cleanup → 204. | `PostDetail.jsx` → `App.remove()` confirms deletion → `DELETE /posts/{id}` → clear selection and refresh. |

[`Editor.jsx`](frontend/src/components/Editor.jsx) handles title/body inputs, image previews, replacement, and removal. [`PostList.jsx`](frontend/src/components/PostList.jsx) and [`PostDetail.jsx`](frontend/src/components/PostDetail.jsx) display posts.

`index_post()` splits title/body into overlapping chunks and creates 768-dimensional Gemini embeddings. Post writes and chunk updates share a database transaction. Failed writes attempt to remove newly uploaded images; old images are removed after successful updates/deletes.

## AI chat

Backend reading order:

1. [`schemas.py`](backend/postlight/schemas.py): `ChatRequest` accepts a question of 1–2,000 characters.
2. [`routers/chat.py`](backend/postlight/routers/chat.py): `POST /chat` verifies the user and calls `answer_question()`.
3. [`services/retrieval.py`](backend/postlight/services/retrieval.py): embeds the question → searches `post_chunks` for the six nearest chunks → passes excerpts to Gemini through LangChain → returns `{answer, sources}` with duplicate post IDs removed. With no chunks, it returns an empty-search answer without calling the chat model.

Frontend response flow:

[`Chat.jsx`](frontend/src/components/Chat.jsx) `send()` → [`lib/api.js`](frontend/src/lib/api.js) → `POST /chat` → Chat displays the answer/source buttons → `App.onOpenPost` callback uses a cached post or `GET /posts/{id}` → [`PostDetail.jsx`](frontend/src/components/PostDetail.jsx).

Chat searches all published post text, including when opened from a particular story. It does not send that story's ID, inspect images, or send previous messages as conversation history.
