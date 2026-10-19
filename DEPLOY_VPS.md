# 🚀 Panduan Migrasi & Deploy DuitKu ke VPS

Panduan lengkap deployment aplikasi **DuitKu (Next.js 16 + Supabase)** ke VPS (Ubuntu / Debian) menggunakan **Docker & Docker Compose**, **Nginx Reverse Proxy**, dan **SSL Gratis (Let's Encrypt / Certbot)**.

---

## 📋 Daftar Isi
1. [Prasyarat & Persiapan Domain](#1-prasyarat--persiapan-domain)
2. [Instalasi Docker & Nginx di VPS](#2-instalasi-docker--nginx-di-vps)
3. [Clone Repository & Konfigurasi Lingkungan](#3-clone-repository--konfigurasi-lingkungan)
4. [Jalankan Aplikasi dengan Docker Compose](#4-jalankan-aplikasi-dengan-docker-compose)
5. [Konfigurasi Nginx & Pasang SSL Gratis](#5-konfigurasi-nginx--pasang-ssl-gratis)
6. [Cara Update Aplikasi di Masa Mendatang](#6-cara-update-aplikasi-di-masa-mendatang)
7. [Cheatsheet Perintah Berguna](#7-cheatsheet-perintah-berguna)

---

## 1. Prasyarat & Persiapan Domain

1. **VPS**: Ubuntu 22.04 / 24.04 LTS atau Debian 12 (RAM minimal 1 GB, disarankan 2 GB jika ada swap).
2. **Domain / Subdomain**: Misalnya `finance.domainanda.com` atau `duitku.domainanda.com`.
3. **DNS Record**:
   - Buka penyedia domain Anda (Cloudflare, Niagahoster, Domainesia, Namecheap, dll).
   - Tambahkan **DNS A Record**:
     - **Type**: `A`
     - **Name / Host**: `finance` (atau `@` jika root domain)
     - **IPv4 Address**: `IP_VPS_ANDA` (contoh: `103.123.45.67`)
     - **TTL**: Auto / 1 min (jika memakai Cloudflare, disarankan DNS Only / grey cloud dulu saat proses verifikasi SSL).

---

## 2. Instalasi Docker & Nginx di VPS

Login ke VPS Anda via SSH:
```bash
ssh root@IP_VPS_ANDA
```

Jalankan perintah update dan instalasi dependensi (Docker, Nginx, Certbot):

```bash
# 1. Update paket sistem
sudo apt update && sudo apt upgrade -y

# 2. Install Docker & Docker Compose plugin
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Install Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# 4. Pastikan Docker dan Nginx berjalan otomatis saat booting
sudo systemctl enable docker
sudo systemctl enable nginx
```

---

## 3. Clone Repository & Konfigurasi Lingkungan

Pilih folder untuk meletakkan project (misalnya di `/var/www/duitku` atau `/root/duitku`):

```bash
# Pindah ke direktori /var/www
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
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Tekan `Ctrl + O` lalu `Enter` untuk simpan, dan `Ctrl + X` untuk keluar dari nano)*

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
Aplikasi sekarang sudah berjalan di dalam container dan dibind aman ke `127.0.0.1:3005` (tidak bentrok dengan port 3000 webcompro).

---

## 5. Konfigurasi Nginx & Pasang SSL Gratis

Agar aplikasi dapat diakses dengan domain dan protokol HTTPS (SSL), kita gunakan Nginx sebagai reverse proxy.

### A. Siapkan Konfigurasi Nginx

Salin file konfigurasi yang sudah disediakan ke Nginx:

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

# CATATAN: JANGAN hapus /etc/nginx/sites-enabled/default jika webcompro Anda memakainya!

# Tes apakah konfigurasi Nginx valid
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### C. Pasang SSL Gratis (Let's Encrypt) dengan Certbot

Jalankan perintah berikut untuk mendapatkan sertifikat SSL HTTPS otomatis:

```bash
sudo certbot --nginx -d finance.domainanda.com
```
* Certbot akan meminta email Anda (untuk pengingat sertifikat).
* Ketik `Y` untuk menyetujui ToS.
* Certbot akan otomatis mengonfigurasi redirect dari HTTP ke HTTPS.

Tes auto-renewal SSL:
```bash
sudo certbot renew --dry-run
```
*(Sertifikat akan diperbarui otomatis oleh systemd timer setiap 60-90 hari)*

🎉 **Selamat! Aplikasi Anda sekarang live dengan aman di `https://finance.domainanda.com`!**

---

## 6. Cara Update Aplikasi di Masa Mendatang

Setiap kali Anda melakukan update kode (push ke GitHub):

```bash
cd /var/www/duitku
git pull origin main
docker compose up -d --build
```
Proses build Next.js dioptimalkan menggunakan multi-stage Dockerfile sehingga hanya memakan waktu ~1-2 menit tanpa downtime yang lama.

---

## 7. Cheatsheet Perintah Berguna

| Kebutuhan | Perintah |
|---|---|
| **Lihat log aplikasi realtime** | `docker compose logs -f web` |
| **Restart container** | `docker compose restart` |
| **Stop container** | `docker compose down` |
| **Cek penggunaan CPU/RAM** | `docker stats` |
| **Cek status Nginx** | `sudo systemctl status nginx` |
| **Cek log error Nginx** | `sudo tail -f /var/log/nginx/error.log` |
| **Bersihkan image Docker lama** | `docker image prune -f` |

