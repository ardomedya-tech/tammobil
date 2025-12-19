import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzjexgxthqlcyraxexvx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6amV4Z3h0aHFsY3lyYXhleHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzc2MzMsImV4cCI6MjA4MTY1MzYzM30.qRnKMS773be72hcimqLQnFIrbkKTnOD7f9bK4WIVn8A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOperations() {
  console.log('Testing Supabase operations...\n');
  
  // Test 1: Read users
  console.log('1. Testing getUsers()...');
  const { data: users, error: usersError } = await supabase
    .from('app_74b74e94ab_users')
    .select('*');
  
  if (usersError) {
    console.error('❌ Error reading users:', usersError);
  } else {
    console.log('✅ Users read successfully:', users.length, 'users found');
  }
  
  // Test 2: Update user (dry run - just check permissions)
  console.log('\n2. Testing updateUser() permissions...');
  if (users && users.length > 0) {
    const testUser = users[0];
    const { data: updateData, error: updateError } = await supabase
      .from('app_74b74e94ab_users')
      .update({ is_approved: testUser.is_approved })
      .eq('id', testUser.id)
      .select();
    
    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      console.error('Error details:', JSON.stringify(updateError, null, 2));
    } else {
      console.log('✅ User update successful');
    }
  }
  
  // Test 3: Delete user (dry run - just check permissions)
  console.log('\n3. Testing deleteUser() permissions...');
  const { error: deleteError } = await supabase
    .from('app_74b74e94ab_users')
    .delete()
    .eq('id', 'non-existent-id-test');
  
  if (deleteError) {
    console.error('❌ Error deleting user:', deleteError);
    console.error('Error details:', JSON.stringify(deleteError, null, 2));
  } else {
    console.log('✅ Delete permission check passed (no actual deletion)');
  }
}

testOperations();
