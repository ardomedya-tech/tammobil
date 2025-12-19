import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzjexgxthqlcyraxexvx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6amV4Z3h0aHFsY3lyYXhleHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzc2MzMsImV4cCI6MjA4MTY1MzYzM30.qRnKMS773be72hcimqLQnFIrbkKTnOD7f9bK4WIVn8A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDelete() {
  console.log('Testing DELETE with real UUID...\n');
  
  // Get users first
  const { data: users, error: usersError } = await supabase
    .from('app_74b74e94ab_users')
    .select('*');
  
  if (usersError) {
    console.error('Error reading users:', usersError);
    return;
  }
  
  console.log('Found users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));
  
  // Try to delete with a real UUID (but we'll use a filter that won't match)
  if (users && users.length > 0) {
    const testUserId = users[0].id;
    console.log('\nTesting DELETE permission with UUID:', testUserId);
    console.log('(Using a filter that won\'t match to avoid actual deletion)');
    
    const { error: deleteError } = await supabase
      .from('app_74b74e94ab_users')
      .delete()
      .eq('id', testUserId)
      .eq('email', 'non-existent-email-to-prevent-actual-delete@test.com');
    
    if (deleteError) {
      console.error('\n❌ DELETE PERMISSION ERROR:', deleteError);
      console.error('Error code:', deleteError.code);
      console.error('Error message:', deleteError.message);
      
      if (deleteError.code === '42501') {
        console.error('\n🔒 RLS POLICY BLOCKING DELETE!');
        console.error('The anon key does not have permission to delete users.');
        console.error('You need to update the RLS policy in Supabase Dashboard.');
      }
    } else {
      console.log('\n✅ DELETE permission OK (no rows matched, no deletion occurred)');
    }
  }
}

testDelete();
