import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fzjexgxthqlcyraxexvx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6amV4Z3h0aHFsY3lyYXhleHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzc2MzMsImV4cCI6MjA4MTY1MzYzM30.qRnKMS773be72hcimqLQnFIrbkKTnOD7f9bK4WIVn8A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User types and interfaces
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'operator' | 'technician' | 'admin';
  is_approved: boolean;
  created_at: string;
}

// Device types and interfaces
export interface Device {
  id: string;
  imei: string;
  brand: string;
  model: string;
  entry_date: string;
  status: 'pending_inspection' | 'inspected' | 'in_service' | 'repaired' | 'completed';
  created_by: string;
  created_at: string;
}

// Device Stock types and interfaces
export interface DeviceStock {
  id: string;
  brand: string;
  model: string;
  imei: string;
  stock_quantity: number;
  purchase_price: number;
  service_cost?: number;
  created_by: string;
  created_at: string;
}

// Initial Inspection types and interfaces
export interface InitialInspection {
  id: string;
  device_id: string;
  imei: string;
  screen_broken: boolean;
  camera_defect: boolean;
  sound_defect: boolean;
  back_cover_broken: boolean;
  body_damage: boolean;
  battery_level: number;
  inspected_by: string;
  inspected_at: string;
}

// Defect types and interfaces
export interface Defect {
  id: string;
  device_id: string;
  defect_type: 'screen' | 'battery' | 'camera' | 'software' | 'speaker' | 'microphone' | 'charging_port' | 'refurbishment' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  detected_by: string;
  detected_at: string;
  technician?: string; // Added technician field
}

// Service Request types and interfaces
export interface ServiceRequest {
  id: string;
  device_id: string;
  status: 'sent' | 'in_progress' | 'completed';
  notes?: string;
  service_cost: number;
  sent_by: string;
  sent_at: string;
  completed_at?: string;
}

// Database operations
export const db = {
  // Users
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async addUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_users')
      .insert([user])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    // First, do the update without expecting a return
    const { error: updateError } = await supabase
      .from('app_74b74e94ab_users')
      .update(updates)
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    // Then fetch the updated user
    const { data, error: fetchError } = await supabase
      .from('app_74b74e94ab_users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_74b74e94ab_users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Devices
  async getDevices(): Promise<Device[]> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_devices')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async addDevice(device: Omit<Device, 'id' | 'created_at'>): Promise<Device> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_devices')
      .insert([device])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_devices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteDevice(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_74b74e94ab_devices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Device Stock
  async getDeviceStock(): Promise<DeviceStock[]> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_device_stock')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getDeviceStockByImei(imei: string): Promise<DeviceStock | null> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_device_stock')
      .select('*')
      .eq('imei', imei)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async addDeviceStock(stock: Omit<DeviceStock, 'id' | 'created_at'>): Promise<DeviceStock> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_device_stock')
      .insert([stock])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateDeviceStock(id: string, updates: Partial<DeviceStock>): Promise<DeviceStock> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_device_stock')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateDeviceStockByImei(imei: string, updates: Partial<DeviceStock>): Promise<DeviceStock | null> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_device_stock')
      .update(updates)
      .eq('imei', imei)
      .select()
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async deleteDeviceStock(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_74b74e94ab_device_stock')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Initial Inspections
  async getInitialInspections(): Promise<InitialInspection[]> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_initial_inspections')
      .select('*')
      .order('inspected_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getInitialInspectionByDeviceId(deviceId: string): Promise<InitialInspection | null> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_initial_inspections')
      .select('*')
      .eq('device_id', deviceId)
      .order('inspected_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async addInitialInspection(inspection: Omit<InitialInspection, 'id' | 'inspected_at'>): Promise<InitialInspection> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_initial_inspections')
      .insert([inspection])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Defects
  async getDefects(): Promise<Defect[]> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_defects')
      .select('*')
      .order('detected_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getDefectsByDevice(deviceId: string): Promise<Defect[]> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_defects')
      .select('*')
      .eq('device_id', deviceId)
      .order('detected_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async addDefect(defect: Omit<Defect, 'id' | 'detected_at'>): Promise<Defect> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_defects')
      .insert([defect])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteDefect(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_74b74e94ab_defects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Service Requests
  async getServiceRequests(): Promise<ServiceRequest[]> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_service_requests')
      .select('*')
      .order('sent_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getServiceRequestByDevice(deviceId: string): Promise<ServiceRequest | null> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_service_requests')
      .select('*')
      .eq('device_id', deviceId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async addServiceRequest(request: Omit<ServiceRequest, 'id' | 'sent_at'>): Promise<ServiceRequest> {
    const { data, error } = await supabase
      .from('app_74b74e94ab_service_requests')
      .insert([request])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const { data, error} = await supabase
      .from('app_74b74e94ab_service_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};