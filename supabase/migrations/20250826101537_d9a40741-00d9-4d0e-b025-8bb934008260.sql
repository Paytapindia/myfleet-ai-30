-- ============================================================================
-- SECURITY FIXES FOR FUNCTIONS - SET SEARCH PATH
-- ============================================================================

-- Fix function search paths to prevent SQL injection
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.log_activity(
    p_user_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_action TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.activity_logs (
        user_id,
        entity_type,
        entity_id,
        action,
        description,
        metadata
    ) VALUES (
        p_user_id,
        p_entity_type,
        p_entity_id,
        p_action,
        p_description,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.calculate_trip_earnings(
    p_base_fare DECIMAL,
    p_distance_fare DECIMAL,
    p_waiting_charges DECIMAL DEFAULT 0,
    p_toll_charges DECIMAL DEFAULT 0,
    p_commission_rate DECIMAL DEFAULT 0.20
)
RETURNS TABLE (
    total_fare DECIMAL,
    driver_earnings DECIMAL,
    commission DECIMAL
) AS $$
DECLARE
    v_total_fare DECIMAL;
    v_commission DECIMAL;
    v_driver_earnings DECIMAL;
BEGIN
    v_total_fare := p_base_fare + p_distance_fare + p_waiting_charges + p_toll_charges;
    v_commission := v_total_fare * p_commission_rate;
    v_driver_earnings := v_total_fare - v_commission;
    
    RETURN QUERY SELECT v_total_fare, v_driver_earnings, v_commission;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.trigger_log_activity() 
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_activity(
            NEW.user_id,
            TG_TABLE_NAME,
            NEW.id,
            'created',
            'New ' || TG_TABLE_NAME || ' created',
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_activity(
            NEW.user_id,
            TG_TABLE_NAME,
            NEW.id,
            'updated',
            TG_TABLE_NAME || ' updated',
            jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_activity(
            OLD.user_id,
            TG_TABLE_NAME,
            OLD.id,
            'deleted',
            TG_TABLE_NAME || ' deleted',
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trigger_trip_completion() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.driver_id IS NOT NULL THEN
        UPDATE public.drivers 
        SET 
            total_trips = total_trips + 1,
            total_earnings = total_earnings + COALESCE(NEW.driver_earnings, 0),
            updated_at = NOW()
        WHERE id = NEW.driver_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;