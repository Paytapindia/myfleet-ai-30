-- Update the vehicles table to add missing columns from the Lambda response
-- and ensure all RC verification data fields exist

-- Add missing columns that are in the Lambda response but not in the current table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS license_plate TEXT,
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS present_address TEXT,
ADD COLUMN IF NOT EXISTS owner_count INTEGER,
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS brand_model TEXT,
ADD COLUMN IF NOT EXISTS class TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS body_type TEXT,
ADD COLUMN IF NOT EXISTS cubic_capacity TEXT,
ADD COLUMN IF NOT EXISTS gross_weight TEXT,
ADD COLUMN IF NOT EXISTS unladen_weight TEXT,
ADD COLUMN IF NOT EXISTS cylinders TEXT,
ADD COLUMN IF NOT EXISTS seating_capacity INTEGER,
ADD COLUMN IF NOT EXISTS wheelbase TEXT,
ADD COLUMN IF NOT EXISTS fit_up_to DATE,
ADD COLUMN IF NOT EXISTS manufacturing_date DATE,
ADD COLUMN IF NOT EXISTS insurance_company TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy TEXT,
ADD COLUMN IF NOT EXISTS tax_upto DATE,
ADD COLUMN IF NOT EXISTS permit_valid_upto DATE,
ADD COLUMN IF NOT EXISTS national_permit_upto DATE,
ADD COLUMN IF NOT EXISTS rc_status TEXT,
ADD COLUMN IF NOT EXISTS norms TEXT,
ADD COLUMN IF NOT EXISTS rto_name TEXT;

-- Create index on vehicle number for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_number ON public.vehicles(number);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_number ON public.vehicles(user_id, number);