-- ══════════════════════════════════════════════
-- Setup Database Bot WA Nihongo no Benkyo
-- Jalankan di Supabase SQL Editor
-- ══════════════════════════════════════════════

-- Tabel admin yang boleh akses bot
CREATE TABLE IF NOT EXISTS bot_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert nomor owner (tidak perlu login, sudah otomatis)
INSERT INTO bot_admins (phone, username, password) VALUES
('+6289682359973', 'owner1', 'owner123'),
('+6289682037538', 'owner2', 'owner456')
ON CONFLICT (username) DO NOTHING;

-- Insert admin tambahan
INSERT INTO bot_admins (username, password) VALUES
('nihongonobenkyo', '@Lupa1122')
ON CONFLICT (username) DO NOTHING;

-- Tabel booking
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  nomor_telepon VARCHAR(20) NOT NULL,
  nama_website VARCHAR(100),
  tanggal_booking DATE NOT NULL,
  negara VARCHAR(50),
  kota VARCHAR(50),
  created_by VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabel sesi login bot
CREATE TABLE IF NOT EXISTS bot_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  is_logged_in BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_bookings_nama ON bookings(nama);
CREATE INDEX IF NOT EXISTS idx_bookings_telepon ON bookings(nomor_telepon);
CREATE INDEX IF NOT EXISTS idx_bookings_tanggal ON bookings(tanggal_booking);

-- Disable RLS (karena pakai service dari server)
ALTER TABLE bot_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions DISABLE ROW LEVEL SECURITY;
