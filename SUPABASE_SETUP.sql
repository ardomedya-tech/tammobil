-- Tammobil Yenileme Merkezi - Supabase Database Setup
-- Bu SQL komutlarını Supabase Dashboard'da çalıştırın:
-- 1. https://fzjexgxthqlcyraxexvx.supabase.co adresine gidin
-- 2. Sol menüden "SQL Editor" seçin
-- 3. "New Query" butonuna tıklayın
-- 4. Aşağıdaki tüm SQL kodunu kopyalayıp yapıştırın
-- 5. "Run" butonuna tıklayın

BEGIN;

-- Create users table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'technician', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create devices table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imei TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_inspection', 'inspected', 'in_service', 'repaired', 'completed')),
  created_by UUID REFERENCES app_74b74e94ab_users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create defects table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_defects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES app_74b74e94ab_devices(id) ON DELETE CASCADE NOT NULL,
  defect_type TEXT NOT NULL CHECK (defect_type IN ('screen', 'battery', 'camera', 'software', 'speaker', 'microphone', 'charging_port', 'refurbishment', 'other')),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  detected_by UUID REFERENCES app_74b74e94ab_users(id) NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create service_requests table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES app_74b74e94ab_devices(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'in_progress', 'completed')),
  notes TEXT,
  service_cost NUMERIC(10, 2) DEFAULT 0,
  sent_by UUID REFERENCES app_74b74e94ab_users(id) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_devices_created_by ON app_74b74e94ab_devices(created_by);
CREATE INDEX IF NOT EXISTS idx_devices_status ON app_74b74e94ab_devices(status);
CREATE INDEX IF NOT EXISTS idx_defects_device_id ON app_74b74e94ab_defects(device_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_device_id ON app_74b74e94ab_service_requests(device_id);

-- Setup Row Level Security (RLS)
ALTER TABLE app_74b74e94ab_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_74b74e94ab_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_74b74e94ab_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_74b74e94ab_service_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "allow_read_all_users" ON app_74b74e94ab_users FOR SELECT USING (true);
CREATE POLICY "allow_insert_users" ON app_74b74e94ab_users FOR INSERT WITH CHECK (true);

-- RLS Policies for devices table
CREATE POLICY "allow_read_all_devices" ON app_74b74e94ab_devices FOR SELECT USING (true);
CREATE POLICY "allow_insert_devices" ON app_74b74e94ab_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_devices" ON app_74b74e94ab_devices FOR UPDATE USING (true);

-- RLS Policies for defects table
CREATE POLICY "allow_read_all_defects" ON app_74b74e94ab_defects FOR SELECT USING (true);
CREATE POLICY "allow_insert_defects" ON app_74b74e94ab_defects FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_delete_defects" ON app_74b74e94ab_defects FOR DELETE USING (true);

-- RLS Policies for service_requests table
CREATE POLICY "allow_read_all_service_requests" ON app_74b74e94ab_service_requests FOR SELECT USING (true);
CREATE POLICY "allow_insert_service_requests" ON app_74b74e94ab_service_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_service_requests" ON app_74b74e94ab_service_requests FOR UPDATE USING (true);

-- Insert demo user
INSERT INTO app_74b74e94ab_users (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@example.com', 'Demo Kullanıcı', 'admin')
ON CONFLICT (email) DO NOTHING;

COMMIT;