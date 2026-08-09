# 2D → 3D Converter SaaS

A full-stack app where customers upload a 2D image, AI converts it to a 3D model (`.glb`), you review and approve it, then the customer gets a download link by email.

---

## Stack

| Layer | Tool |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) |
| Database | Supabase |
| File Storage | Supabase Storage |
| 2D→3D AI | TripoSR (Stability AI) |
| Email | Resend |
| 3D Preview | React Three Fiber |

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Python 3.10+
- A free [Supabase](https://supabase.com) account
- A free [Resend](https://resend.com) account

---

### 2. Set up Supabase

1. Create a new project at https://supabase.com
2. In the **SQL Editor**, run this to create the table:

```sql
create table conversions (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  input_image_url text not null,
  output_file_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
```

3. Go to **Storage** → create two buckets: `uploads` (public) and `outputs` (public)
4. Go to **Project Settings → API** and copy your URL, anon key, and service role key

---

### 3. Configure environment

```bash
cd app
cp .env.local.example .env.local
# Edit .env.local and fill in all values
```

---

### 4. Install Python AI model dependencies

```bash
# From the repo root
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

pip install torch torchvision
pip install Pillow trimesh
pip install git+https://github.com/VAST-AI-Research/TripoSR.git
```

**Test the model works** (downloads ~1 GB of weights on first run):

```bash
python convert.py some-photo.jpg output.glb
# → output.glb should appear
```

---

### 5. Install Node dependencies and run

```bash
cd app
npm install
npm run dev
```

Open http://localhost:3000

---

## How It Works

### Customer Flow

1. Go to **http://localhost:3000**
2. Enter your email and upload a photo
3. Hit **"Convert to 3D"**
4. You'll see a confirmation page — the conversion runs in the background

### Admin Flow

1. Go to **http://localhost:3000/admin**
2. Enter your `ADMIN_TOKEN` (the value you set in `.env.local`)
3. You'll see all pending conversions with:
   - The original image
   - A live rotating 3D preview of the output model
   - **Approve** / **Reject** buttons
4. Clicking **Approve** emails the customer their download link

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ADMIN_TOKEN` | Secret token you use to log into /admin |
| `RESEND_API_KEY` | Resend API key for sending emails |

---

## Deployment

### App → Vercel

```bash
npm install -g vercel
cd app
vercel deploy
```

Set all `.env.local` values as **Environment Variables** in the Vercel dashboard.

### Python AI → Replicate (recommended for production)

Since Vercel can't run Python, use [Replicate](https://replicate.com) to run TripoSR:

1. Go to https://replicate.com/stability-ai/triposr
2. Get an API key
3. Replace the `execAsync(python ...)` call in `src/app/api/upload/route.ts` with a Replicate API call:

```ts
import Replicate from 'replicate'
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
const output = await replicate.run('stability-ai/triposr', { input: { image: imageUrl } })
// output is a URL to the .glb file
```

---

## File Structure

```
app/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Customer upload page
│   │   ├── success/page.tsx      # "We got your image" page
│   │   ├── admin/page.tsx        # Admin approval dashboard
│   │   ├── api/
│   │   │   ├── upload/route.ts   # Handles image upload + triggers conversion
│   │   │   ├── approve/route.ts  # Approves + emails customer
│   │   │   ├── reject/route.ts   # Rejects a conversion
│   │   │   └── conversions/route.ts  # Lists all conversions (admin only)
│   ├── components/
│   │   └── ModelViewer.tsx       # React Three Fiber 3D preview
│   └── lib/
│       └── supabase.ts           # Supabase client helpers
convert.py                        # Python TripoSR wrapper
```
