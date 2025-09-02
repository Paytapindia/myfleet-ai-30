-- Immediate fix for vehicle KA03NC6479: populate vehicles from latest rc_verifications
WITH latest AS (
  SELECT rv.*
  FROM rc_verifications rv
  WHERE rv.vehicle_number = 'KA03NC6479'
  ORDER BY rv.created_at DESC
  LIMIT 1
)
UPDATE vehicles v
SET
  owner_name = COALESCE(NULLIF((l.verification_data->>'ownerName')::text, ''), v.owner_name),
  chassis_number = NULLIF(l.verification_data->>'chassisNumber',''),
  engine_number = NULLIF(l.verification_data->>'engineNumber',''),
  fuel_type = NULLIF(l.verification_data->>'fuelType',''),
  registration_authority = NULLIF(l.verification_data->>'registrationAuthority',''),
  make = NULLIF(l.verification_data->>'make',''),
  model = COALESCE(NULLIF(l.verification_data->>'model',''), 'Not specified'),
  year = CASE WHEN (l.verification_data->>'year') ~ '^\d{4}$' THEN (l.verification_data->>'year')::int ELSE NULL END,
  registration_date = CASE WHEN (l.verification_data->>'registrationDate') ~ '^\d{4}-\d{2}-\d{2}$' THEN (l.verification_data->>'registrationDate')::date ELSE NULL END,
  insurance_expiry = CASE WHEN (l.verification_data->>'insuranceExpiry') ~ '^\d{4}-\d{2}-\d{2}$' THEN (l.verification_data->>'insuranceExpiry')::date ELSE NULL END,
  pollution_expiry = CASE WHEN (l.verification_data->>'puccExpiry') ~ '^\d{4}-\d{2}-\d{2}$' THEN (l.verification_data->>'puccExpiry')::date ELSE NULL END,
  financer = NULLIF(COALESCE(l.verification_data->>'financer',''), ''),
  is_financed = COALESCE((l.verification_data->>'isFinanced')::boolean, v.is_financed),
  rc_verification_status = 'verified',
  rc_verified_at = NOW()
FROM latest l
WHERE v.number = l.vehicle_number AND v.user_id = l.user_id;