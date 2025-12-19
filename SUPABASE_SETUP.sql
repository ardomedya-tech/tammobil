-- Users table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('operator', 'technician', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Devices table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    imei TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending_inspection', 'inspected', 'in_service', 'repaired', 'completed')),
    created_by UUID REFERENCES app_74b74e94ab_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Device Stock table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_device_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    imei TEXT UNIQUE NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 1,
    purchase_price DECIMAL(10, 2) NOT NULL,
    service_cost DECIMAL(10, 2),
    created_by UUID REFERENCES app_74b74e94ab_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Initial Inspections table (NEW)
CREATE TABLE IF NOT EXISTS app_74b74e94ab_initial_inspections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES app_74b74e94ab_devices(id) ON DELETE CASCADE,
    imei TEXT NOT NULL,
    screen_broken BOOLEAN NOT NULL,
    camera_defect BOOLEAN NOT NULL,
    sound_defect BOOLEAN NOT NULL,
    back_cover_broken BOOLEAN NOT NULL,
    body_damage BOOLEAN NOT NULL,
    battery_level INTEGER NOT NULL CHECK (battery_level >= 0 AND battery_level <= 100),
    inspected_by UUID REFERENCES app_74b74e94ab_users(id),
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Defects table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_defects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES app_74b74e94ab_devices(id) ON DELETE CASCADE,
    defect_type TEXT NOT NULL CHECK (defect_type IN ('screen', 'battery', 'camera', 'software', 'speaker', 'microphone', 'charging_port', 'refurbishment', 'other')),
    description TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    detected_by UUID REFERENCES app_74b74e94ab_users(id),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Service Requests table
CREATE TABLE IF NOT EXISTS app_74b74e94ab_service_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES app_74b74e94ab_devices(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('sent', 'in_progress', 'completed')),
    notes TEXT,
    service_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    sent_by UUID REFERENCES app_74b74e94ab_users(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE app_74b74e94ab_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_74b74e94ab_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_74b74e94ab_device_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_74b74e94ab_initial_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_74b74e94ab_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_74b74e94ab_service_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "allow_read_all_users" ON app_74b74e94ab_users FOR SELECT USING (true);
CREATE POLICY "allow_insert_users" ON app_74b74e94ab_users FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_read_all_devices" ON app_74b74e94ab_devices FOR SELECT USING (true);
CREATE POLICY "allow_insert_devices" ON app_74b74e94ab_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_devices" ON app_74b74e94ab_devices FOR UPDATE USING (true);
CREATE POLICY "allow_delete_devices" ON app_74b74e94ab_devices FOR DELETE USING (true);

CREATE POLICY "allow_read_all_device_stock" ON app_74b74e94ab_device_stock FOR SELECT USING (true);
CREATE POLICY "allow_insert_device_stock" ON app_74b74e94ab_device_stock FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_device_stock" ON app_74b74e94ab_device_stock FOR UPDATE USING (true);
CREATE POLICY "allow_delete_device_stock" ON app_74b74e94ab_device_stock FOR DELETE USING (true);

CREATE POLICY "allow_read_all_initial_inspections" ON app_74b74e94ab_initial_inspections FOR SELECT USING (true);
CREATE POLICY "allow_insert_initial_inspections" ON app_74b74e94ab_initial_inspections FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_initial_inspections" ON app_74b74e94ab_initial_inspections FOR UPDATE USING (true);
CREATE POLICY "allow_delete_initial_inspections" ON app_74b74e94ab_initial_inspections FOR DELETE USING (true);

CREATE POLICY "allow_read_all_defects" ON app_74b74e94ab_defects FOR SELECT USING (true);
CREATE POLICY "allow_insert_defects" ON app_74b74e94ab_defects FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_defects" ON app_74b74e94ab_defects FOR UPDATE USING (true);
CREATE POLICY "allow_delete_defects" ON app_74b74e94ab_defects FOR DELETE USING (true);

CREATE POLICY "allow_read_all_service_requests" ON app_74b74e94ab_service_requests FOR SELECT USING (true);
CREATE POLICY "allow_insert_service_requests" ON app_74b74e94ab_service_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_service_requests" ON app_74b74e94ab_service_requests FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_devices_imei ON app_74b74e94ab_devices(imei);
CREATE INDEX IF NOT EXISTS idx_devices_status ON app_74b74e94ab_devices(status);
CREATE INDEX IF NOT EXISTS idx_device_stock_imei ON app_74b74e94ab_device_stock(imei);
CREATE INDEX IF NOT EXISTS idx_initial_inspections_device_id ON app_74b74e94ab_initial_inspections(device_id);
CREATE INDEX IF NOT EXISTS idx_initial_inspections_imei ON app_74b74e94ab_initial_inspections(imei);
CREATE INDEX IF NOT EXISTS idx_defects_device_id ON app_74b74e94ab_defects(device_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_device_id ON app_74b74e94ab_service_requests(device_id);