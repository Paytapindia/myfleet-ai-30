-- Add phone_verified field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_verified boolean NOT NULL DEFAULT false;