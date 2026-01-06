# Supabase Authentication Setup

## Step 1: Create a Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Sign in or create a free account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - **Name**: BioQuest (or your preferred name)
     - **Database Password**: Create a strong password (save it!)
     - **Region**: Choose closest to your users
   - Click "Create new project"
   - Wait 2-3 minutes for setup to complete

3. **Get Your API Credentials**
   - Once ready, go to: **Settings** → **API**
   - You'll need two values:
     - **Project URL** (under "Project URL")
     - **anon public** key (under "Project API keys")

## Step 2: Configure Environment Variables

1. **Open your `.env.local` file** in the project root

2. **Add these variables** (replace with your actual values):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Restart your dev server** after adding the variables:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

## Step 3: Configure Email Authentication

1. **In Supabase Dashboard**, go to: **Authentication** → **Providers**

2. **Enable Email Provider**
   - It should be enabled by default
   - Toggle it ON if not

3. **Configure Email Templates** (Optional but Recommended)
   - Go to: **Authentication** → **Email Templates**
   - Customize the confirmation email if desired

4. **Configure Site URL**
   - Go to: **Authentication** → **URL Configuration**
   - Set **Site URL** to: `http://localhost:3000` (for development)
   - Add **Redirect URLs**: `http://localhost:3000/auth/callback`

## Step 4: Test the Setup

Your environment is now ready! The authentication will work once you implement the login/signup pages in the next steps.

## Files Created

✅ **lib/supabase/client.ts** - Client-side Supabase instance
✅ **lib/supabase/server.ts** - Server-side Supabase instance
✅ **lib/supabase/middleware.ts** - Session refresh logic
✅ **middleware.ts** - Next.js middleware for auth
✅ **.env.local.example** - Template for environment variables

## Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Packages Installed

- `@supabase/supabase-js` - Supabase JavaScript client
- `@supabase/ssr` - Server-side rendering helpers for Next.js
- `@supabase/auth-helpers-nextjs` - Next.js auth helpers (legacy)

## Next Steps

Proceed to **Step 2**: Create working login page with Supabase integration.
