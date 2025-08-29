-- Create table for RC verification requests and results
CREATE TABLE public.rc_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_number TEXT NOT NULL,
  request_id TEXT, -- API request ID for tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  verification_data JSONB, -- Store the complete API response
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rc_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own RC verifications" 
ON public.rc_verifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own RC verifications" 
ON public.rc_verifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RC verifications" 
ON public.rc_verifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rc_verifications_updated_at
BEFORE UPDATE ON public.rc_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_rc_verifications_vehicle_number ON public.rc_verifications(vehicle_number);
CREATE INDEX idx_rc_verifications_request_id ON public.rc_verifications(request_id);
CREATE INDEX idx_rc_verifications_user_status ON public.rc_verifications(user_id, status);