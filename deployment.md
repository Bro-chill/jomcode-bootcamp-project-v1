# Deploy Postlight for free: Cloudflare Pages + Render

Guide checked against official documentation on **25 October 2026**.

This guide assumes the complete project is already in a GitHub repository. Follow **Parts 1–4** to deploy without buying a domain. Then follow **Part 5** if you want to use a domain you own.

## What goes where?

| Project part | Hosting service | Example public address |
| --- | --- | --- |
| React/Vite frontend (`frontend/`) | Cloudflare Pages Free | `https://postlight-web.pages.dev` |
| FastAPI backend (`backend/`) | Render Free Web Service | `https://postlight-api.onrender.com` |
| Database, login, and image storage | Supabase Free | Your existing Supabase project |
| AI chat and embeddings | Gemini API | Accessed by the backend |

The example names above may already be taken. Replace them with the actual names and URLs assigned to you throughout this guide.

**Why use Render too?** The existing frontend can be built directly on Pages. The backend currently uses Uvicorn, PostgreSQL connections, and Python packages; deploying it to Cloudflare Python Workers would require adaptation and compatibility testing. This guide uses the existing code. [Cloudflare Python Workers](https://developers.cloudflare.com/workers/languages/python/).

**What does “free” mean?** Select the free plans and stay within each provider's quotas. Render sleeps when idle; Supabase and Gemini have separate limits. A custom domain's registration and renewal are separate costs. Check the free-tier notes in Part 7 before sharing the site widely.

## Part 1 — Prepare your accounts and settings

### Step 1. Have these accounts ready

- GitHub, with this repository and its `frontend/package-lock.json`.
- [Cloudflare](https://dash.cloudflare.com/), on the Free plan.
- [Render](https://dashboard.render.com/), for a Free Web Service.
- [Supabase](https://supabase.com/dashboard), with a Free project.
- [Google AI Studio](https://aistudio.google.com/apikey), with a Gemini API key.

You do not need to buy or transfer a domain for Parts 1–4. The deployment steps below use the websites; no local deployment commands are required.

### Step 2. Prepare Supabase

If your existing Supabase project already works locally, reuse it and skip the schema setup.

1. Open **Supabase Dashboard → your project → SQL Editor → New query**.
2. Copy the contents of this repository's [`supabase/schema.sql`](supabase/schema.sql), paste them into the editor, and click **Run**. Run this setup once on a new project; existing policies make repeated execution fail.
3. Open **Authentication → Sign In / Providers → Email**. In dashboard versions showing **Providers**, open that section instead. Enable email/password sign-in and save. If email confirmation is enabled, users must confirm before signing in.
4. Open **Storage** and confirm the `post-images` bucket exists.
5. Collect these values for later:

   | Value needed | Where to find it |
   | --- | --- |
   | Project URL | Project **Connect** dialog, or **Project Settings → Data API** |
   | Publishable key or legacy `anon` key | **Project Settings → API Keys** |
   | Legacy `service_role` key | **Project Settings → API Keys → Legacy API Keys**; reveal/copy `service_role` |
   | PostgreSQL connection string | Top **Connect** button → connection string → **Session pooler** |

Use the legacy `service_role` key for this guide to match the repository's configuration. It is private. Only the publishable/anon key belongs in the frontend. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

For the database connection, choose **Session pooler** on port **5432**, which supports IPv4 connections. Replace the password placeholder with your database password, URL-encoding special characters. Preserve the supplied host and username; add `?sslmode=require` if the copied URL has no query string. Example shape:

```text
postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=require
```

This is the database password you chose for the project, not an API key. [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

### Step 3. Check Gemini model access

The repository currently defaults to:

```text
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
```

Use these only if your API key can access them and their current pricing includes a free tier for your use. Otherwise set accessible, compatible model IDs in Render in Part 2. This guide does not guarantee that the repository's default models are free or available to every account. [Gemini model pricing](https://ai.google.dev/gemini-api/docs/pricing).

The code requests **768-dimensional embeddings**, matching the database schema. If you change embedding models on an existing database, regenerate existing post embeddings using the new model; equal vector length alone does not make embeddings from different models comparable.

## Part 2 — Deploy the backend on Render

### Step 4. Connect the GitHub repository

1. Sign in at [Render Dashboard](https://dashboard.render.com/).
2. Click **New + → Web Service**.
3. Choose **Git Provider**, connect **GitHub**, and authorize access to this repository.
4. Find the repository and click **Connect**.

### Step 5. Enter the backend settings

On the new web service form, use:

| Field | Value |
| --- | --- |
| Name | `postlight-api`, or another available name |
| Language / Runtime | `Python 3` |
| Branch | Your deployment branch, usually `main` |
| Region | A region near your Supabase project, where Free is available |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type / compute plan | **Free** |

Enter the start command exactly as shown in Render. `$PORT` is expanded by Render's Linux environment; it is not a local PowerShell command. [Render FastAPI deployment](https://render.com/docs/deploy-fastapi).

### Step 6. Add backend environment variables

In the form's **Environment Variables** section, click **Add Environment Variable** for each row. If collapsed, expand **Advanced**. Enter plain values without surrounding quotation marks.

| Name | Value |
| --- | --- |
| `PYTHON_VERSION` | `3.11.11` (an explicit Python 3.11 version compatible with this project's stated requirements) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your private legacy `service_role` key |
| `SUPABASE_DB_URL` | Your complete session pooler connection string from Step 2 |
| `SUPABASE_STORAGE_BUCKET` | `post-images` |
| `GOOGLE_API_KEY` | Your Gemini API key |
| `GEMINI_CHAT_MODEL` | Your accessible chat model ID; see Step 3 |
| `GEMINI_EMBEDDING_MODEL` | Your accessible embedding model ID; see Step 3 |
| `FRONTEND_ORIGIN` | `http://localhost:5173` temporarily; replace it in Step 10 |

Render supports selecting Python through `PYTHON_VERSION`. This example is a version pin, not a claim that it is the newest Python patch. [Render Python versions](https://render.com/docs/python-version).

If the form offers **Health Check Path**, enter `/health`. Click **Deploy Web Service** (or **Create Web Service**, depending on the form). Wait for the deployment to become **Live**. [Render web service setup](https://render.com/docs/web-services).

### Step 7. Record and test the API URL

1. On the Render service page, copy its public HTTPS URL, for example `https://postlight-api.onrender.com`.
2. Open `https://YOUR_API.onrender.com/health`. Expect `{"ok":true}`.
3. Open `https://YOUR_API.onrender.com/posts`. Expect a JSON list, possibly empty. This also checks database access; `/health` alone does not.
4. If either fails, open the service's **Logs** before continuing.

Keep this URL for Cloudflare's `VITE_API_URL`. Do not append `/docs`, `/posts`, or a trailing `/`.

## Part 3 — Deploy without a custom domain on Cloudflare Pages

### Step 8. Create the Pages project from GitHub

1. Sign in at [Cloudflare Dashboard](https://dash.cloudflare.com/) and select your account.
2. In the left sidebar, open **Workers & Pages**. It may appear inside **Compute (Workers)**.
3. Click **Create application → Pages → Connect to Git**.
4. If the screen opens a Worker creation form instead, look for **Looking to deploy Pages? → Get started**. Continue with the Pages Git import option, which may be labeled **Import an existing Git repository**.
5. Select **GitHub** and authorize Cloudflare's GitHub app. Grant it access to this repository.
6. Select the repository and click **Begin setup**.

Dashboard labels can vary as Cloudflare updates its interface. The documented path is **Workers & Pages → Create application → Pages → Connect to Git**. [Cloudflare Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/).

### Step 9. Set the build and public environment variables

On **Set up builds and deployments**, enter:

| Field / section | Value |
| --- | --- |
| Project name | `postlight-web`, or another available name |
| Production branch | Your deployment branch, usually `main` |
| Framework preset | **React (Vite)**; if unavailable, **None** with the manual values below |
| Root directory (advanced) | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |

The output is `dist` relative to the `frontend` root. [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [React deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).

Expand **Environment variables (advanced)** and add:

| Variable name | Value |
| --- | --- |
| `NODE_VERSION` | `22.14.0` (meets this project's Node.js requirement) |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your public Supabase publishable/anon key |
| `VITE_API_URL` | Your Render HTTPS URL from Step 7, without a trailing `/` |

**Never add the Supabase service role key, database password, or Gemini API key to Pages.** Vite includes `VITE_*` values in browser JavaScript. They must be safe for visitors to see. [Vite environment variables](https://vite.dev/guide/env-and-mode).

Click **Save and Deploy**. When the build succeeds, click **Continue to project** and copy the production address, such as `https://postlight-web.pages.dev`. Use this stable production address, rather than a deployment-specific preview address.

If the creation form does not offer variables, add them through **your Pages project → Settings → Variables and Secrets → Add**. Select **Production**, enter each name/value, and click **Save**. Then rebuild using Step 15. [Pages variables](https://developers.cloudflare.com/pages/functions/bindings/).

The website now has a free HTTPS address. Complete Part 4 before testing sign-in and publishing.

## Part 4 — Connect the live frontend, backend, and login

### Step 10. Allow the actual Pages URL on the backend

1. Open **Render Dashboard → postlight-api → Environment**.
2. Click **Edit** and change `FRONTEND_ORIGIN` to your exact production Pages origin:

   ```text
   https://postlight-web.pages.dev
   ```

3. Click **Save, rebuild, and deploy**, or the save option that redeploys the service. Wait until it is Live.

Use `https://`, with no trailing slash or path. The code matches origins exactly. To keep local development working too, use a comma-separated value:

```text
https://postlight-web.pages.dev,http://localhost:5173
```

### Step 11. Set Supabase's production login URL

1. Open **Supabase Dashboard → your project → Authentication → URL Configuration**.
2. Set **Site URL** to your production Pages URL, for example `https://postlight-web.pages.dev`.
3. Click **Save changes**.
4. Under **Redirect URLs**, use **Add URL** to allow any additional intended return URLs, such as `http://localhost:5173`, and save.

This project's sign-up code does not supply a custom `emailRedirectTo`, so Supabase's **Site URL** is the default confirmation destination. [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

### Step 12. Test the complete website

Open the production `pages.dev` URL and check:

- Public posts load, even while signed out.
- Sign-up works; if enabled, the confirmation email returns to the live website.
- Sign-in works.
- You can publish a short post and upload an image.
- You can edit and delete your own post.
- A signed-in user can ask AI about an existing post and open a cited source.

Post publishing also generates embeddings, so a working `/health` or empty post list does not prove Gemini access works. If publishing fails, inspect Render's **Logs** for model or quota errors.

**Finished without a domain:** share your `https://YOUR_PROJECT.pages.dev` address. You can stop here.

## Part 5 — Use your own domain (optional)

Finish Parts 1–4 first. You can keep the backend's Render address; a custom API domain is unnecessary.

Choose one option:

| Desired website address | Follow |
| --- | --- |
| `example.com`, with DNS managed by Cloudflare | Option A |
| `www.example.com` or `app.example.com`, keeping your current DNS provider | Option B |

### Option A — Use the root domain, such as `example.com`

#### Step 13A. Add the domain to Cloudflare DNS

Skip onboarding if the domain is already active in the same Cloudflare account.

1. Open **Cloudflare Dashboard → Domains → Onboard a domain**. Older layouts may show **Websites → Add a domain / Add a site**.
2. Enter `example.com`, select the DNS record scan, and click **Continue**.
3. Select **Free** and continue.
4. Review the imported DNS records. Preserve records for existing websites and email, including MX and TXT records.
5. Follow Cloudflare's nameserver instructions. At your domain registrar, replace the existing nameservers with the exact pair assigned by Cloudflare and save. If DNSSEC is enabled, follow Cloudflare's instructions to disable it before the nameserver switch; re-enable it after activation.
6. Return to Cloudflare, complete the nameserver check, and wait for the domain to show **Active**.

Nameserver changes can take time to propagate. Domains purchased through Cloudflare already use its nameservers. [Cloudflare domain onboarding and nameservers](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).

#### Step 13B. Attach the domain to Pages

1. Open **Workers & Pages → your Pages project → Custom domains**.
2. Click **Set up a domain**.
3. Enter `example.com` and click **Continue**.
4. Review the proposed DNS record and confirm using **Activate domain** or the displayed confirmation button.
5. Wait for **Active**, then open `https://example.com`.

Cloudflare creates the Pages DNS record for a domain in the account. To serve `www.example.com` as well, repeat this process for that hostname. Registering both hostnames does not automatically redirect one to the other. [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

### Option B — Keep DNS elsewhere and use a subdomain

1. Open **Cloudflare → Workers & Pages → your Pages project → Custom domains → Set up a domain**.
2. Enter `www.example.com` (or `app.example.com`) and click **Continue**.
3. Follow the external-DNS instructions. At your DNS provider, create:

   | DNS field | Example value |
   | --- | --- |
   | Type | `CNAME` |
   | Name / Host | `www` (or `app`) |
   | Target / Value | `postlight-web.pages.dev` — your actual Pages hostname, without `https://` |
   | TTL | Default / Auto |

4. Resolve any conflicting record for that same hostname, then save. Leave unrelated records in place.
5. Return to **Custom domains**, complete validation, and wait for **Active** and HTTPS to work.

Add the hostname in Pages before creating its CNAME. A CNAME alone does not register a custom domain with Pages. External DNS works for a subdomain; using the root domain requires Option A. [Pages DNS requirements](https://developers.cloudflare.com/pages/configuration/custom-domains/).

### Step 14. Update backend access and login for the custom domain

After the custom hostname is Active:

1. Open **Render → your backend → Environment → Edit**.
2. Set `FRONTEND_ORIGIN` to the exact domains visitors will use, for example:

   ```text
   https://example.com,https://www.example.com,https://postlight-web.pages.dev
   ```

   Include `www` only if you attached it to Pages. For Option B, use your actual subdomain instead.

3. Save and redeploy the backend.
4. Open **Supabase → Authentication → URL Configuration**. Set **Site URL** to your preferred custom address and save.
5. Add other intended confirmation/return addresses under **Redirect URLs** and save. New confirmation emails use the updated Site URL by default.
6. Repeat Step 12 at the custom address. Users may need to sign in again because browser sessions belong to each website origin.

Keep `VITE_API_URL` pointed at Render. Adding a frontend domain does not change the API address.

## Part 6 — Update the deployed project later

### Step 15. Publish code or configuration changes

- **Code:** commit and push to the connected production branch on GitHub. Pages and Render normally redeploy automatically when automatic deployments are enabled.
- **Pages build variables:** open **Workers & Pages → your project → Settings → Variables and Secrets**, select **Production**, edit and save. Then open **Deployments → latest production deployment → … → Retry deployment**. If retry is unavailable, push a new commit. A new build is required for `VITE_*` changes.
- **Backend variables:** open **Render → your service → Environment → Edit**, save and redeploy. If needed, use **Manual Deploy → Deploy latest commit**.

Preview builds have separate configuration. For this beginner setup, test using the stable production URL. A preview address needs its own allowed backend origin and appropriate Supabase redirect settings.

## Part 7 — Free-tier limits and common problems

### Free-tier expectations

| Service | What to expect |
| --- | --- |
| Cloudflare Pages Free | Includes 500 builds/month, one concurrent build, 20,000 files/site, and a 25 MiB limit per file. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) |
| Render Free | Sleeps after 15 minutes without inbound traffic; waking takes about a minute. Includes 750 instance hours/workspace/month. Bandwidth/build limits also apply; usage beyond allowances can incur charges when a payment method is present. Check **Billing → Monthly Included Usage**. [Render free limits](https://render.com/docs/free) |
| Supabase Free | Database, storage, and auth quotas apply; inactive free projects may pause. [Supabase pricing](https://supabase.com/pricing) |
| Gemini API | Free availability depends on model, account, region, and quota. A deployed app does not prove its AI calls are free. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Custom domain | Registration and renewal are paid separately; attaching an existing domain to Pages does not require upgrading Pages. |

This setup suits learning and small demos. The first API call after idle may be slow; open the backend's `/health`, wait for it to wake, and retry. Images and posts persist in Supabase, rather than Render's temporary filesystem.

### Troubleshooting

| Problem | Where to look and what to change |
| --- | --- |
| GitHub repository missing in Cloudflare | Check the Cloudflare GitHub app's repository access; grant access to this repository and retry setup. |
| Pages cannot find `package.json` | **Pages project → Settings → Builds & deployments**: root must be `frontend`, build command `npm run build`, output `dist`. |
| Website calls `localhost:8000` | Set Production `VITE_API_URL` to the Render HTTPS address, then rebuild Pages. |
| Browser reports CORS errors | Set Render `FRONTEND_ORIGIN` to the exact website origin, with `https://`, no path, and no trailing `/`; redeploy. Also check Render logs for an underlying API failure. |
| Backend fails to start | Check **Render → Logs** for missing variables or package errors. Confirm root `backend` and the exact start command in Step 5. |
| Database connection fails | Verify the session pooler host, port `5432`, username, encoded database password, and SSL setting. Resume Supabase if paused. |
| Email confirmation returns to localhost | Change **Supabase → Authentication → URL Configuration → Site URL**, save, and request a new confirmation email. |
| Sign-up email is delayed or rate-limited | Check Supabase Auth email limits/settings; retry after the limit resets. |
| Publishing or AI chat fails | Check Gemini key, model access, quota, and Render logs. Publishing needs embedding access too. |
| Image upload fails | Verify the Supabase `post-images` bucket and backend service role key. |
| Custom hostname is pending or returns 522 | Confirm it was added through **Pages → Custom domains**, check its CNAME/nameservers, and wait for validation. |
| New Pages variables have no effect | Confirm you edited **Production**, then trigger a fresh production build. |

For more project-specific details, see [`README.md`](README.md) and [`runbook.md`](runbook.md). This guide's Render deployment avoids the backend adaptation required by the Workers approach described in the runbook.
