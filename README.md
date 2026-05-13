# 🤖 Bot WhatsApp Nihongo no Benkyo

Bot WhatsApp assistant untuk manajemen booking kelas bahasa Jepang.

## Fitur
- 🔐 Login/Logout sistem (kecuali nomor owner)
- 📝 Tambah booking baru
- ✏️ Edit jadwal booking
- 📋 List semua booking
- 🔍 Cari booking

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Buat file .env
```
SUPABASE_URL=https://xxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
FONNTE_TOKEN=your_fonnte_token
PORT=3000
```

### 3. Jalankan SQL di Supabase
Jalankan file `sql/setup.sql` di SQL Editor Supabase.

### 4. Jalankan bot
```bash
# Development
npm run dev

# Production
npm run build && npm start
```

### 5. Setup Webhook di Fonnte
- Buka fonnte.com → Device → Edit
- Webhook URL: `https://your-railway-url.railway.app/webhook`
- Method: POST

## Nomor Owner (tidak perlu login)
- +6289682359973
- +6289682037538

## Menu Bot
- **1** - Booking Baru
- **2** - Ubah Jadwal Booking  
- **3** - List Semua Booking
- **4** - Cari Booking
- **0** - Logout

## Deploy ke Railway
1. Push ke GitHub
2. Connect repo di Railway
3. Set Environment Variables
4. Deploy otomatis
