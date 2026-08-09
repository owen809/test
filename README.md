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

> **Choose the right PyTorch build for your machine.**

#### 🔴 Testing PC — AMD Ryzen 9 7950X + RX 7900XTX (ROCm)

The 7900XTX is an **AMD GPU** and needs the ROCm build of PyTorch (not the standard pip version).

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install PyTorch with ROCm 6.0 support (check https://pytorch.org for latest)
pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.0

# Install remaining deps
pip install Pillow trimesh
pip install git+https://github.com/VAST-AI-Research/TripoSR.git
```

> Windows users with a 7900XTX: ROCm support on Windows is limited. If you hit issues,
> use WSL2 (Ubuntu) — it works well with ROCm. Or run on CPU (slower but works).

#### 🟢 Always-on Laptop — GTX 1650 (CUDA, 4 GB VRAM)

The GTX 1650 uses standard CUDA. 4 GB VRAM is the minimum — `convert.py` automatically
lowers the mesh resolution and chunk size so it won't crash.

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Standard CUDA build (works on GTX 1650)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Install remaining deps
pip install Pillow trimesh
pip install git+https://github.com/VAST-AI-Research/TripoSR.git
```

> ⚠️ On the 1650, close Chrome, Discord, and other GPU-using apps before running the
> server, so TripoSR has the full 4 GB.

**Test the model works on your hardware** (downloads ~1 GB of weights on first run):

```bash
# Verify GPU is detected and prints correct profile
python check_hardware.py

# Full end-to-end test with a real photo
python check_hardware.py some-photo.jpg
# → should produce test_output.glb
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

## Hardware Notes

### Testing PC (7900XTX + Ryzen 9 7950X)
- Uses **ROCm** PyTorch build (AMD GPU)
- Runs at **full quality**: mesh resolution 256, chunk size 131072
- Expected conversion time: **~10–30 seconds per image**
- 24 GB VRAM — can handle many concurrent conversions

### Always-on Laptop (GTX 1650, 4 GB VRAM)
- Uses **standard CUDA** PyTorch build
- Automatically runs at **reduced quality**: mesh resolution 128, chunk size 8192
- Expected conversion time: **~60–120 seconds per image**
- 4 GB VRAM is the minimum — `convert.py` handles this automatically
- **Tips for the 1650:**
  - Keep it plugged in (power limit affects GPU performance)
  - Close other apps (browser, Discord) before starting the server
  - If you get an out-of-memory error, it means something else grabbed the VRAM — restart and try again
  - Conversions queue up naturally since the upload API runs them one at a time in the background

---

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
