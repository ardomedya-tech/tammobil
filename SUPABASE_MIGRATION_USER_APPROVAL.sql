-- =====================================================
-- KULLANICI ONAY SİSTEMİ KURULUMU
-- Bu script'i Supabase SQL Editor'da çalıştırın
-- =====================================================

-- 1. is_approved kolonunu ekle (eğer yoksa)
ALTER TABLE app_74b74e94ab_users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false NOT NULL;

-- 2. Index oluştur
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON app_74b74e94ab_users(is_approved);

-- 3. Bugra Kocak'ı admin yap ve onayla
INSERT INTO app_74b74e94ab_users (email, full_name, role, is_approved)
VALUES ('bugra.kocak@tammobil.com', 'Bugra Kocak', 'admin', true)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'admin', 
  is_approved = true,
  full_name = 'Bugra Kocak';

-- 4. Mevcut tüm kullanıcıları onayla (ilk kurulum için)
UPDATE app_74b74e94ab_users 
SET is_approved = true 
WHERE is_approved IS NULL OR is_approved = false;

-- 5. Demo kullanıcısını sil (eğer varsa)
DELETE FROM app_74b74e94ab_users 
WHERE email = 'demo@example.com';

-- 6. Kontrol: Tüm kullanıcıları listele
SELECT 
  email, 
  full_name, 
  role, 
  is_approved,
  created_at 
FROM app_74b74e94ab_users 
ORDER BY created_at DESC;