# 🚀 Panduan Migrasi & Deploy DuitKu ke VPS (PostgreSQL Host)

Panduan lengkap deployment aplikasi **DuitKu (Next.js 16 + PostgreSQL VPS)** menggunakan **Docker & Docker Compose**, **Nginx Reverse Proxy**, dan **SSL Gratis (Let's Encrypt / Certbot)**.

---

## 📋 Daftar Isi
1. [Prasyarat & Persiapan Domain](#1-prasyarat--persiapan-domain)
2. [Setup Database PostgreSQL di Host VPS](#2-setup-database-postgresql-di-host-vps)
3. [Clone Repository & Konfigurasi Lingkungan](#3-clone-repository--konfigurasi-lingkungan)
4. [Jalankan Aplikasi dengan Docker Compose](#4-jalankan-aplikasi-dengan-docker-compose)
5. [Konfigurasi Nginx & Pasang SSL Gratis](#5-konfigurasi-nginx--pasang-ssl-gratis)
6. [Cara Update Aplikasi di Masa Mendatang](#6-cara-update-aplikasi-di-masa-mendatang)
7. [Cheatsheet Perintah Berguna](#7-cheatsheet-perintah-berguna)

---

## 1. Prasyarat & Persiapan Domain

1. **VPS**: Ubuntu 22.04 / 24.04 LTS atau Debian 12 dengan PostgreSQL yang sudah aktif di port `5432`.
2. **Domain / Subdomain**: Misalnya `finance.domainanda.com` atau `duitku.domainanda.com`.
3. **DNS Record**:
   - Buka penyedia DNS domain Anda (Cloudflare, Niagahoster, Domainesia, Namecheap, dll).
   - Tambahkan **DNS A Record**:
     - **Type**: `A`
     - **Name / Host**: `finance` (atau `@` jika root domain)
     - **IPv4 Address**: `IP_VPS_ANDA`
     - **TTL**: Auto / 1 min (jika menggunakan Cloudflare, set DNS Only / grey cloud saat setup SSL).

---

## 2. Setup Database PostgreSQL di Host VPS

Masuk ke terminal PostgreSQL di VPS:
```bash
sudo -u postgres psql
```

Jalankan perintah SQL berikut untuk membuat database dan user khusus DuitKu:
```sql
-- 1. Buat database
CREATE DATABASE duitku_db;

-- 2. Buat user dengan password pilihan Anda (ganti PasswordRahasia123!)
CREATE USER duitku_user WITH ENCRYPTED PASSWORD 'PasswordRahasia123!';

-- 3. Berikan hak akses penuh
GRANT ALL PRIVILEGES ON DATABASE duitku_db TO duitku_user;
ALTER DATABASE duitku_db OWNER TO duitku_user;

-- 4. Pindah ke database duitku_db dan berikan akses ke schema public
\c duitku_db
GRANT ALL ON SCHEMA public TO duitku_user;

-- 5. Keluar dari psql
\q
```

### Mengizinkan Akses dari Docker ke PostgreSQL Host:
Agar container Docker dapat terhubung ke PostgreSQL yang berjalan di host:

1. Buka file konfigurasi PostgreSQL (ganti `14`/`15`/`16` sesuai versi postgres Anda):
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```
Pastikan `listen_addresses` mengizinkan koneksi dari lokal / docker:
```text
listen_addresses = '*'
```

2. Buka file otentikasi `pg_hba.conf`:
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```
Tambahkan baris berikut di paling bawah (mengizinkan subnet Docker `172.17.0.0/16`):
```text
host    duitku_db       duitku_user     172.17.0.0/16           scram-sha-256
```
*(Catatan: Jika PostgreSQL Anda menggunakan md5, ganti `scram-sha-256` menjadi `md5`)*

3. Restart service PostgreSQL:
```bash
sudo systemctl restart postgresql
```

> 💡 **Info Otomatis**: Skema tabel, kolom, default categories, dan app settings akan **dibuat secara otomatis** oleh Next.js saat pertama kali dijalankan. Anda tidak perlu repot mengimpor file SQL manual!

---

## 3. Clone Repository & Konfigurasi Lingkungan

Pilih folder untuk meletakkan project (misalnya di `/var/www/duitku`):

```bash
mkdir -p /var/www
cd /var/www

# Clone repository
git clone https://github.com/askarakmal00/duitku.git
cd duitku

# Buat file .env dari template
cp .env.example .env

# Edit file .env
nano .env
```

Isi variabel di dalam file `.env`:
```env
DATABASE_URL=postgresql://duitku_user:PasswordRahasia123!@host.docker.internal:5432/duitku_db?sslmode=disable
```
*(Tekan `Ctrl + O` lalu `Enter` untuk simpan, dan `Ctrl + X` untuk keluar)*

---

## 4. Jalankan Aplikasi dengan Docker Compose

Build dan jalankan container di background:

```bash
docker compose up -d --build
```

Cek status container:
```bash
docker compose ps
```
Aplikasi sekarang sudah berjalan di dalam container dan dibind aman ke `127.0.0.1:3005` (sehingga port `3000` milik webcompro tidak terganggu).

---

## 5. Konfigurasi Nginx & Pasang SSL Gratis

### A. Siapkan Konfigurasi Nginx

Salin file konfigurasi yang sudah disediakan:
```bash
sudo cp nginx/duitku.conf /etc/nginx/sites-available/duitku.conf
```

Edit file tersebut dan masukkan nama domain Anda:
```bash
sudo nano /etc/nginx/sites-available/duitku.conf
```
Ganti baris `server_name yourdomain.com www.yourdomain.com;` menjadi domain Anda, contoh:
```nginx
server_name finance.domainanda.com;
```

### B. Aktifkan Konfigurasi & Reload Nginx

```bash
# Aktifkan konfigurasi dengan membuat symlink
sudo ln -s /etc/nginx/sites-available/duitku.conf /etc/nginx/sites-enabled/

# PENTING: JANGAN hapus default jika webcompro Anda memakainya!

# Tes apakah konfigurasi Nginx valid
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### C. Pasang SSL Gratis (Let's Encrypt) dengan Certbot

```bash
sudo certbot --nginx -d finance.domainanda.com
```

---

## 6. Cara Update Aplikasi di Masa Mendatang

Setiap kali ada pembaruan kode di GitHub:
```bash
cd /var/www/duitku
git pull origin main
docker compose up -d --build
```

---

## 7. Cheatsheet Perintah Berguna

| Kebutuhan | Perintah |
|---|---|
| **Lihat log aplikasi realtime** | `docker compose logs -f web` |
| **Restart container** | `docker compose restart` |
| **Stop container** | `docker compose down` |
| **Cek status database Postgres** | `sudo systemctl status postgresql` |
| **Buka konsol psql** | `sudo -u postgres psql -d duitku_db` |
