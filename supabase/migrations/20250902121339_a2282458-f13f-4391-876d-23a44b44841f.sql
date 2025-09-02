-- Extend vehicles table to store complete RC verification data
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS chassis_number TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS engine_number TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS registration_date DATE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS registration_authority TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rc_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rc_verification_status TEXT DEFAULT 'pending';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS financer TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_financed BOOLEAN DEFAULT false;

-- Create index for efficient vehicle number lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_number_rc_status ON public.vehicles(number, rc_verification_status);

-- Update rc_verifications table to better track API calls
ALTER TABLE public.rc_verifications ADD COLUMN IF NOT EXISTS is_cached BOOLEAN DEFAULT false;
ALTER TABLE public.rc_verifications ADD COLUMN IF NOT EXISTS api_cost_saved BOOLEAN DEFAULT false;