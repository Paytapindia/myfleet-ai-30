-- Update the handle_new_user trigger to automatically create vehicles and mark as onboarded
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile with onboarding status
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email,
    is_onboarded
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name', 
    NEW.email,
    CASE 
      -- If user provides vehicle_number during signup, mark as onboarded
      WHEN NEW.raw_user_meta_data ->> 'vehicle_number' IS NOT NULL THEN true
      ELSE false
    END
  );

  -- Create initial vehicle if vehicle_number is provided
  IF NEW.raw_user_meta_data ->> 'vehicle_number' IS NOT NULL THEN
    INSERT INTO public.vehicles (
      user_id,
      number,
      model,
      status
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'vehicle_number',
      'Not specified',
      'active'
    );
  END IF;

  RETURN NEW;
END;
$$;