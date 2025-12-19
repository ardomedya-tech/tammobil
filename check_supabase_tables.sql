-- Check if service_requests table exists and has the correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'service_requests'
ORDER BY ordinal_position;

-- Check if devices table exists and has the correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'devices'
ORDER BY ordinal_position;
