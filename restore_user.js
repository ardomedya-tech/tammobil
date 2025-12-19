import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzjexgxthqlcyraxexvx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6amV4Z3h0aHFsY3lyYXhleHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzc2MzMsImV4cCI6MjA4MTY1MzYzM30.qRnKMS773be72hcimqLQnFIrbkKTnOD7f9bK4WIVn8A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restoreUser() {
  console.log('Restoring deleted user...\n');
  
  const { data, error } = await supabase
    .from('app_74b74e94ab_users')
    .insert([{
      id: '569dbeb1-fb22-4920-a058-f92663f7eec4',
      email: 'nevzat@nevzat.com',
      full_name: 'Nevzat',
      role: 'technician',
      is_approved: true
    }])
    .select();
  
  if (error) {
    console.error('Error restoring user:', error);
  } else {
    console.log('✅ User restored:', data);
  }
}

restoreUser();
