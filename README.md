# Lead database UI

Minimalistic, Apple-style Next.js app for viewing and filtering leads from a Supabase database (people, person_campaigns, touch_events).

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Supabase**

   Copy the example env file and add your Supabase credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` – service role key for server-side access (or use anon key if you use RLS)

3. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). You’ll see the leads list; use filters and click a row to open lead detail.

## Deploy to Vercel

When everything works locally:

1. Push the repo to GitHub and connect it in Vercel.
2. In the Vercel project, set the same env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or anon key).
3. Deploy.

No extra config is required for a standard Next.js App Router app.
