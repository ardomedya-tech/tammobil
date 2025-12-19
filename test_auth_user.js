import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fzjexgxthqlcyraxexvx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6amV4Z3h0aHFsY3lyYXhleHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzc2MzMsImV4cCI6MjA4MTY1MzYzM30.qRnKMS773be72hcimqLQnFIrbkKTnOD7f9bK4WIVn8A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthUser() {
  console.log('Testing current user authentication...\n');
  
  // Simulate what AuthContext does
  const storedUser = '{"id":"272dfffb-f35d-44f7-ad21-45b34959e315","email":"bugra.kocak@tammobil.com","role":"admin"}';
  const parsedUser = JSON.parse(storedUser);
  
  console.log('1. Stored user:', parsedUser);
  
  // Test getUserByEmail
  console.log('\n2. Testing getUserByEmail...');
  const { data: dbUser, error: getUserError } = await supabase
    .from('app_74b74e94ab_users')
    .select('*')
    .eq('email', parsedUser.email)
    .single();
  
  if (getUserError) {
    console.error('❌ Error getting user:', getUserError);
  } else {
    console.log('✅ User found:', dbUser);
  }
  
  // Test delete with current user's ID
  console.log('\n3. Testing DELETE with current user ID...');
  const testUserId = '569dbeb1-fb22-4920-a058-f92663f7eec4'; // nevzat@nevzat.com
  
  const { data: deleteData, error: deleteError } = await supabase
    .from('app_74b74e94ab_users')
    .delete()
    .eq('id', testUserId)
    .select();
  
  if (deleteError) {
    console.error('❌ DELETE ERROR:', deleteError);
    console.error('Error code:', deleteError.code);
    console.error('Error message:', deleteError.message);
    console.error('Error details:', JSON.stringify(deleteError, null, 2));
  } else {
    console.log('✅ DELETE successful:', deleteData);
    console.log('IMPORTANT: This was a real delete! User was removed.');
  }
  
  // Test update
  console.log('\n4. Testing UPDATE...');
  const { data: updateData, error: updateError } = await supabase
    .from('app_74b74e94ab_users')
    .update({ is_approved: false })
    .eq('id', '92ed44c3-ecf3-4594-958e-d72b876ae536')
    .select();
  
  if (updateError) {
    console.error('❌ UPDATE ERROR:', updateError);
  } else {
    console.log('✅ UPDATE successful:', updateData);
  }
}

testAuthUser();
