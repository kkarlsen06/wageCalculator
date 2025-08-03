-- Add payroll_day column to user_settings table
-- Run this in your Supabase SQL editor

-- Check if the payroll_day column already exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name = 'payroll_day';

-- Add the payroll_day column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_settings' 
        AND column_name = 'payroll_day'
    ) THEN
        ALTER TABLE user_settings 
        ADD COLUMN payroll_day INTEGER DEFAULT 15 CHECK (payroll_day >= 1 AND payroll_day <= 31);
        
        -- Add a comment to document the column
        COMMENT ON COLUMN user_settings.payroll_day IS 'Day of the month when user receives payroll (1-31), defaults to 15';
        
        RAISE NOTICE 'Column payroll_day added successfully';
    ELSE
        RAISE NOTICE 'Column payroll_day already exists';
    END IF;
END $$;

-- Verify the column was added correctly
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name = 'payroll_day';
