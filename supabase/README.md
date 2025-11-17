# Supabase Setup

This folder holds raw SQL migrations that mirror the Prisma data model (`prisma/schema.prisma`).

## Apply the initial schema

### Option 1: Supabase Dashboard
1. Open your project at [Supabase](https://app.supabase.com/).
2. Go to **SQL Editor** → **New query**.
3. Paste the contents of `supabase/migrations/20231117_init.sql`.
4. Click **Run**. Supabase stores the migration in your project's history automatically.

### Option 2: Supabase CLI
1. Install and log in: `npm install -g supabase && supabase login`.
2. Ensure `supabase/config.toml` points at the correct project (run `supabase init` if needed).
3. Run the migration:
   ```bash
   supabase db push
   ```
   The CLI picks up every SQL file inside `supabase/migrations`.

> **Tip:** Keep Prisma and Supabase in sync by pointing `DATABASE_URL` to your Supabase Postgres instance. Run `npx prisma migrate deploy` (or `prisma db push`) each time you update the schema so both Prisma and Supabase stay aligned.
