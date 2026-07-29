# 🚀 Panduan Deploy FinKu ke Vercel + Supabase

## Prasyarat
- Akun GitHub (gratis)
- Akun Vercel (gratis, hobby plan)
- Akun Supabase (gratis)

---

## Langkah 1: Push ke GitHub

```bash
cd d:/personal_finance/app
git init  # (sudah dilakukan otomatis)
git add .
git commit -m "Initial commit - FinKu personal finance app"

# Buat repo baru di github.com, lalu:
git remote add origin https://github.com/USERNAME/finku.git
git branch -M main
git push -u origin main
```

---

## Langkah 2: Setup Supabase

1. Buka **https://supabase.com** → Sign Up (gratis)
2. Klik **New Project** → isi nama, password database, pilih region Asia (Singapore)
3. Tunggu ~2 menit sampai project aktif
4. Buka **SQL Editor** di sidebar Supabase
5. Copy-paste seluruh isi file `supabase/schema.sql` dan klik **Run**
6. Buka **Project Settings → API**:
   - Copy **Project URL** → ini adalah `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon/public key** → ini adalah `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Langkah 3: Deploy ke Vercel

1. Buka **https://vercel.com** → Sign Up dengan GitHub
2. Klik **Add New Project** → Import repo `finku` dari GitHub
3. Di bagian **Environment Variables**, tambahkan:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...
   ```
4. **Root Directory**: Set ke `app` (karena Next.js ada di subfolder)
   - Di Vercel: General → Root Directory → `app`
5. Klik **Deploy** → tunggu ~2 menit
6. Aplikasi live di `https://finku-xxx.vercel.app`! 🎉

---

## Langkah 4: Custom Domain (opsional)

Di Vercel → Project Settings → Domains → Add `finku.yourdomain.com`

---

## ⚠️ Catatan Penting Supabase Free Tier

> Project Supabase gratis otomatis **di-pause** jika tidak ada request API selama **7 hari berturut-turut**.
> - Jika aplikasi dibuka rutin setiap hari → tidak masalah
> - Jika lama tidak dipakai → resume manual di dashboard Supabase
> - **Solusi**: Jadwalkan cron job gratis di [cron-job.org](https://cron-job.org) untuk ping API setiap 6 hari

---

## Migrasi Data ke Supabase

Saat ini app menggunakan **localStorage** (data tersimpan di browser lokal).
Untuk mengaktifkan Supabase sebagai backend:

1. Install Supabase client (sudah ada di package.json):
   ```bash
   npm install @supabase/supabase-js
   ```
2. Buat file `lib/supabase.ts`:
   ```ts
   import { createClient } from '@supabase/supabase-js';
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   ```
3. Ganti fungsi di `lib/store.ts` untuk menggunakan `supabase.from('transactions').select()` dll.

---

## Vercel Limits (Hobby Plan - Gratis Selamanya)

| Resource | Limit | Cukup? |
|----------|-------|--------|
| Bandwidth | 100 GB/bulan | ✅ Jauh lebih dari cukup |
| Serverless Functions | 100k invokasi/bulan | ✅ Ya |
| Build | 6000 menit/bulan | ✅ Ya |
| Projects | Unlimited | ✅ Ya |

## Supabase Limits (Free Tier)

| Resource | Limit |
|----------|-------|
| Database | 500 MB |
| Monthly Active Users | 50,000 |
| Storage | 1 GB |
| Edge Functions | 500k invokasi/bulan |
