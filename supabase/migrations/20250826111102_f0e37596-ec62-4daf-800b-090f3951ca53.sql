-- Fix security issues from linter

-- 1. Fix function search path by recreating the function with proper search_path
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.vehicle_id IS NOT NULL THEN
        -- Update vehicle wallet balance
        UPDATE public.vehicles 
        SET wallet_balance = NEW.balance_after,
            updated_at = NOW()
        WHERE id = NEW.vehicle_id AND user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;