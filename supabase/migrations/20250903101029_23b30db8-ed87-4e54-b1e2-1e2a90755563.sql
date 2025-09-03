-- Create challan_verifications table for caching challan data
CREATE TABLE public.challan_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_data JSONB,
  error_message TEXT,
  is_cached BOOLEAN DEFAULT false,
  api_cost_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.challan_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own challan verifications" 
ON public.challan_verifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challan verifications" 
ON public.challan_verifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challan verifications" 
ON public.challan_verifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_challan_verifications_updated_at
BEFORE UPDATE ON public.challan_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();