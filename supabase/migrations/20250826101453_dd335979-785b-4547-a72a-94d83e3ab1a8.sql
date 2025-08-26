-- ============================================================================
-- PHASE 1: CORE BUSINESS SCHEMA FOR FLEET MANAGEMENT SYSTEM
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS AND TYPES
-- ============================================================================

CREATE TYPE public.vehicle_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE public.document_status AS ENUM ('uploaded', 'missing', 'expired', 'pending_review', 'approved', 'rejected');
CREATE TYPE public.driver_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.trip_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.transaction_type AS ENUM ('fuel', 'parking', 'fasttag', 'add_money', 'maintenance', 'insurance', 'revenue', 'toll', 'permit', 'fine', 'manual_income', 'manual_expense');
CREATE TYPE public.payment_method AS ENUM ('upi', 'cash', 'bank_transfer', 'card', 'wallet', 'other');
CREATE TYPE public.expense_category AS ENUM ('fuel', 'maintenance', 'insurance', 'permits', 'parking', 'tolls', 'fines', 'other');
CREATE TYPE public.settlement_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- ============================================================================
-- CORE BUSINESS TABLES
-- ============================================================================

-- Vehicles Table
CREATE TABLE public.vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL,
    model TEXT,
    make TEXT,
    year INTEGER,
    color TEXT,
    status vehicle_status NOT NULL DEFAULT 'active',
    
    -- Financial tracking
    pay_tap_balance DECIMAL(10,2) DEFAULT 0.00,
    fasttag_linked BOOLEAN DEFAULT FALSE,
    fasttag_balance DECIMAL(10,2) DEFAULT 0.00,
    
    -- Maintenance
    last_service_date DATE,
    next_service_due DATE,
    odometer_reading INTEGER DEFAULT 0,
    
    -- GPS and tracking
    gps_linked BOOLEAN DEFAULT FALSE,
    gps_device_id TEXT,
    
    -- Legal and compliance  
    challans_count INTEGER DEFAULT 0,
    insurance_expiry DATE,
    registration_expiry DATE,
    pollution_expiry DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, number)
);

-- Drivers Table
CREATE TABLE public.drivers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    license_number TEXT NOT NULL,
    license_expiry DATE,
    date_of_birth DATE,
    address TEXT,
    status driver_status NOT NULL DEFAULT 'active',
    
    -- Performance metrics
    total_trips INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    rating DECIMAL(3,2) DEFAULT 0.00,
    
    -- Emergency contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, license_number)
);

-- Vehicle-Driver Assignments
CREATE TABLE public.vehicle_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    UNIQUE(vehicle_id, driver_id, is_active)
);

-- Trips Table
CREATE TABLE public.trips (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    
    -- Trip details
    pickup_location TEXT,
    destination TEXT,
    pickup_coordinates POINT,
    destination_coordinates POINT,
    distance_km DECIMAL(8,2),
    
    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status trip_status NOT NULL DEFAULT 'scheduled',
    
    -- Financial
    base_fare DECIMAL(10,2) DEFAULT 0.00,
    distance_fare DECIMAL(10,2) DEFAULT 0.00,
    waiting_charges DECIMAL(10,2) DEFAULT 0.00,
    toll_charges DECIMAL(10,2) DEFAULT 0.00,
    total_fare DECIMAL(10,2) DEFAULT 0.00,
    driver_earnings DECIMAL(10,2) DEFAULT 0.00,
    commission DECIMAL(10,2) DEFAULT 0.00,
    
    -- Customer info
    customer_name TEXT,
    customer_phone TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    
    -- Notes and feedback
    notes TEXT,
    cancellation_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    
    -- Transaction details
    type public.transaction_type NOT NULL,
    category TEXT NOT NULL, -- 'income' or 'expense'
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    reference_number TEXT,
    location TEXT,
    
    -- Payment info
    payment_method public.payment_method,
    payment_reference TEXT,
    
    -- Metadata
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_manual BOOLEAN DEFAULT FALSE,
    receipt_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Expenses Table (Detailed expense tracking)
CREATE TABLE public.expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    
    -- Expense details
    category public.expense_category NOT NULL,
    subcategory TEXT,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    vendor_name TEXT,
    vendor_contact TEXT,
    
    -- Receipt and documentation
    receipt_number TEXT,
    receipt_url TEXT,
    receipt_date DATE,
    
    -- Approval workflow
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Metadata
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Documents Table
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    
    -- Document details
    document_type TEXT NOT NULL, -- 'pollution', 'registration', 'insurance', 'license', 'kyc', etc.
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    
    -- Validation and expiry
    status public.document_status NOT NULL DEFAULT 'uploaded',
    issue_date DATE,
    expiry_date DATE,
    
    -- Review process
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Settlements Table
CREATE TABLE public.settlements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    
    -- Settlement period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Financial summary
    total_trips INTEGER NOT NULL DEFAULT 0,
    gross_earnings DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Payment details
    status public.settlement_status NOT NULL DEFAULT 'pending',
    payment_method public.payment_method,
    payment_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Activity Logs Table (Audit trail)
CREATE TABLE public.activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Activity details
    entity_type TEXT NOT NULL, -- 'vehicle', 'driver', 'trip', 'transaction', etc.
    entity_id UUID,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'assigned', etc.
    description TEXT,
    
    -- Metadata
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User-based indexes for multi-tenancy
CREATE INDEX idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX idx_drivers_user_id ON public.drivers(user_id);
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_settlements_user_id ON public.settlements(user_id);

-- Foreign key indexes
CREATE INDEX idx_vehicle_assignments_vehicle_id ON public.vehicle_assignments(vehicle_id);
CREATE INDEX idx_vehicle_assignments_driver_id ON public.vehicle_assignments(driver_id);
CREATE INDEX idx_trips_vehicle_id ON public.trips(vehicle_id);
CREATE INDEX idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX idx_transactions_vehicle_id ON public.transactions(vehicle_id);
CREATE INDEX idx_transactions_trip_id ON public.transactions(trip_id);
CREATE INDEX idx_expenses_vehicle_id ON public.expenses(vehicle_id);
CREATE INDEX idx_expenses_transaction_id ON public.expenses(transaction_id);

-- Query optimization indexes
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_date ON public.trips(created_at);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_documents_expiry ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_settlements_status ON public.settlements(status);

-- Full-text search indexes
CREATE INDEX idx_vehicles_search ON public.vehicles USING gin(to_tsvector('english', number || ' ' || COALESCE(model, '') || ' ' || COALESCE(make, '')));
CREATE INDEX idx_drivers_search ON public.drivers USING gin(to_tsvector('english', name || ' ' || COALESCE(phone, '') || ' ' || license_number));

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "Users can view their own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);

-- Drivers policies
CREATE POLICY "Users can view their own drivers" ON public.drivers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own drivers" ON public.drivers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own drivers" ON public.drivers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own drivers" ON public.drivers FOR DELETE USING (auth.uid() = user_id);

-- Vehicle assignments policies
CREATE POLICY "Users can view their own assignments" ON public.vehicle_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own assignments" ON public.vehicle_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assignments" ON public.vehicle_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assignments" ON public.vehicle_assignments FOR DELETE USING (auth.uid() = user_id);

-- Trips policies
CREATE POLICY "Users can view their own trips" ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips" ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips" ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view their own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Settlements policies
CREATE POLICY "Users can view their own settlements" ON public.settlements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own settlements" ON public.settlements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settlements" ON public.settlements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own settlements" ON public.settlements FOR DELETE USING (auth.uid() = user_id);

-- Activity logs policies
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create activity logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activities
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate trip earnings
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER trigger_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activity logging triggers
CREATE OR REPLACE FUNCTION public.trigger_log_activity() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply activity logging to core tables
CREATE TRIGGER trigger_vehicles_activity AFTER INSERT OR UPDATE OR DELETE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.trigger_log_activity();
CREATE TRIGGER trigger_drivers_activity AFTER INSERT OR UPDATE OR DELETE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.trigger_log_activity();
CREATE TRIGGER trigger_trips_activity AFTER INSERT OR UPDATE OR DELETE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.trigger_log_activity();
CREATE TRIGGER trigger_transactions_activity AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.trigger_log_activity();

-- Trip completion trigger to update driver stats
CREATE OR REPLACE FUNCTION public.trigger_trip_completion() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_trips_completion AFTER UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.trigger_trip_completion();