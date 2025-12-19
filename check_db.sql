-- Check if table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'app_74b74e94ab_users'
ORDER BY ordinal_position;
