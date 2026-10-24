# Panduan Deployment FinKu (Self-Hosted PostgreSQL & AI Assistant)

Aplikasi FinKu sekarang 100% mandiri (*self-hosted*), menggunakan **PostgreSQL internal/VPS**, **Next.js Standalone**, dan terintegrasi dengan **AI Assistant (Google Gemini 2.0 Flash)** untuk pencatatan transaksi via teks / foto struk di Web & Telegram Bot.

---

## 1. Arsitektur

- **Web App**: Next.js 16 (Standalone output, container port `3000` -> Host `127.0.0.1:3005`)
- **Web Server / Proxy**: Nginx Reverse Proxy dengan SSL Let's Encrypt (`finku.akmalasykar.my.id`)
- **Database**: PostgreSQL 16 di Host VPS (`host.docker.internal:5432`, database: `duitku_db`)
- **AI Assistant**: Google Gemini 2.0 Flash (`gemini-2.0-flash`) untuk NLP pencatatan & analitik database.
- **Telegram Bot**: Webhook endpoint `/api/telegram/webhook`.

---

## 2. File Environment (`.env`) di Server

Buat atau perbarui file `/var/www/duitku/.env`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://duitku_user:PASSWORD_ANDA@host.docker.internal:5432/duitku_db?sslmode=disable

# AI & Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
GEMINI_API_KEY=AIzaSy...
TELEGRAM_ALLOWED_USERS=
```

---

## 3. Jalankan Aplikasi dengan Docker

```bash
docker compose up -d --build
```

---

## 4. Setup Webhook Telegram Bot

Setelah container berjalan dan HTTPS aktif:

```bash
curl -F "url=https://finku.akmalasykar.my.id/api/telegram/webhook" https://api.telegram.org/bot<TOKEN_TELEGRAM_ANDA>/setWebhook
```
