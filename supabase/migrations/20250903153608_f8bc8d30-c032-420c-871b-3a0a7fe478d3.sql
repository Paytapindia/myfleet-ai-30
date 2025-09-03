-- Secure support_tickets access with role-based policies
-- 1) Create role enum if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'support', 'user');
  END IF;
END $$;

-- 2) Create user_roles table if missing
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3) Enable RLS on user_roles (managed separately; function is SECURITY DEFINER)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) Security-definer helper to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 5) Replace overly-permissive policy on support_tickets
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Owners: can create their own tickets
CREATE POLICY "Users can insert their own support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Owners: can view their own tickets
CREATE POLICY "Users can view their own support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Support team and admins: full manage access
CREATE POLICY "Support staff and admins can manage all tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'support')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'support')
  OR public.has_role(auth.uid(), 'admin')
);