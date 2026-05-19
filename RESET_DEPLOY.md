# Reset Deploy Guide

This guide resets the deployment from scratch with a new Supabase project and a new Render service.

## Current deployment facts

- GitHub repo: `https://github.com/adidas-superstar99/codex_order4ax.com.git`
- Branch to deploy: `master`
- Latest verified app commit: `00d251e`
- App runtime: Node `22.x`
- Health check path: `/api/health`
- The server auto-creates its tables on first successful boot.

## Before you recreate anything

Make sure Render deploys commit `00d251e` or newer.

The app now has:

- local fallback storage for Windows preview when SQLite native bindings are unavailable
- BOM-safe menu JSON loading
- Render Rollup Linux binary workaround in `render.yaml`

## Step 1. Create a brand new Supabase project

1. Create a new project in Supabase.
2. Wait until the database is ready.
3. Open `Project Settings` -> `Database`.
4. Copy the Postgres connection string.

Use the direct Postgres URI in this format:

```env
postgresql://USER:PASSWORD@HOST:5432/postgres
```

Do not use the local SQLite path in production.

## Step 2. Delete and recreate the Render service

1. Delete the old Render web service if you want a completely clean restart.
2. In Render, create a new Blueprint or Web Service from the same GitHub repo.
3. Point it at branch `master`.
4. If creating manually, use:

```env
Build Command: npm install --include=dev && npm install --no-save --workspace apps/web @rollup/rollup-linux-x64-gnu@4.60.4 && npm run build
Start Command: npm run start
```

5. Set environment variables:

```env
NODE_ENV=production
ADMIN_PASSWORD=your-real-admin-password
DATABASE_URL=your-supabase-postgres-url
```

6. Set health check path to:

```txt
/api/health
```

## Step 3. First boot behavior

On the first successful boot, the server will:

- connect to Supabase Postgres
- create `order_batches`, `orders`, and `order_items` if missing
- start serving the built frontend and API together

No manual SQL migration is required for the current app.

## Step 4. Verify after deploy

Check these in order:

1. `https://your-render-domain/api/health`
2. `https://your-render-domain/`
3. `https://your-render-domain/admin`

Expected result:

- `/api/health` returns JSON with `"ok": true`
- `/` loads the order list page
- `/admin` loads the admin page

## If Render still fails

There are two likely buckets:

1. Build-time package issue
   - usually Rollup optional binary install
2. Runtime environment issue
   - usually wrong `DATABASE_URL` or missing env var

If it fails again, capture:

- the first red error block in Render build logs
- the exact `Build Command`
- whether the failing step is `npm install`, `npm run build`, or server startup

## Local preview

For actual local app behavior, use the real server at:

```txt
http://127.0.0.1:3000
```

Do not use the static preview server on `4011` for functional testing. That preview only shows built HTML assets and does not provide the API.
