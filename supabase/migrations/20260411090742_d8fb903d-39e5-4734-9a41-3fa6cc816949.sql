
CREATE OR REPLACE FUNCTION public.admin_list_customers()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  plan text,
  raw_plan text,
  can_self_manage_plan boolean,
  subscription_expires_at text,
  is_expired boolean,
  last_sign_in_at text,
  created_at text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin users to call this function
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role') = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    COALESCE(u.email, '')::text AS email,
    (u.raw_user_meta_data->>'full_name')::text AS full_name,
    COALESCE(u.raw_user_meta_data->>'role', 'customer')::text AS role,
    CASE
      WHEN (u.raw_user_meta_data->>'subscription_expires_at') IS NOT NULL
        AND now() > (u.raw_user_meta_data->>'subscription_expires_at')::timestamptz
      THEN 'unpaid'
      ELSE COALESCE(u.raw_user_meta_data->>'plan', 'unpaid')
    END::text AS plan,
    COALESCE(u.raw_user_meta_data->>'plan', 'unpaid')::text AS raw_plan,
    COALESCE((u.raw_user_meta_data->>'can_self_manage_plan')::boolean, false) AS can_self_manage_plan,
    (u.raw_user_meta_data->>'subscription_expires_at')::text AS subscription_expires_at,
    CASE
      WHEN (u.raw_user_meta_data->>'subscription_expires_at') IS NOT NULL
        AND now() > (u.raw_user_meta_data->>'subscription_expires_at')::timestamptz
      THEN true
      ELSE false
    END AS is_expired,
    u.last_sign_in_at::text AS last_sign_in_at,
    u.created_at::text AS created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;
