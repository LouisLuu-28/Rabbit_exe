CREATE OR REPLACE FUNCTION public.admin_list_customers()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  plan TEXT,
  raw_plan TEXT,
  can_self_manage_plan BOOLEAN,
  subscription_expires_at TEXT,
  is_expired BOOLEAN,
  last_sign_in_at TEXT,
  created_at TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requester_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND COALESCE(u.raw_user_meta_data->>'role', 'customer') = 'admin'
  )
  INTO requester_is_admin;

  IF NOT requester_is_admin THEN
    RAISE EXCEPTION 'Forbidden. Admin access required.';
  END IF;

  RETURN QUERY
  WITH customer_rows AS (
    SELECT
      u.id,
      COALESCE(u.email, '') AS email,
      COALESCE(p.full_name, u.raw_user_meta_data->>'full_name') AS full_name,
      CASE
        WHEN COALESCE(u.raw_user_meta_data->>'role', 'customer') = 'admin' THEN 'admin'
        ELSE 'customer'
      END AS role,
      LOWER(COALESCE(u.raw_user_meta_data->>'plan', p.plan, 'unpaid')) AS raw_plan,
      COALESCE((u.raw_user_meta_data->>'can_self_manage_plan')::BOOLEAN, FALSE) AS can_self_manage_plan,
      NULLIF(u.raw_user_meta_data->>'subscription_expires_at', '') AS subscription_expires_at,
      u.last_sign_in_at::TEXT AS last_sign_in_at,
      u.created_at::TEXT AS created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
  )
  SELECT
    c.id,
    c.email,
    c.full_name,
    c.role,
    CASE
      WHEN c.subscription_expires_at IS NOT NULL
       AND c.subscription_expires_at ~ '^\\d{4}-\\d{2}-\\d{2}'
       AND c.subscription_expires_at::timestamptz < NOW()
      THEN 'unpaid'
      ELSE c.raw_plan
    END AS plan,
    c.raw_plan,
    c.can_self_manage_plan,
    c.subscription_expires_at,
    (
      c.subscription_expires_at IS NOT NULL
      AND c.subscription_expires_at ~ '^\\d{4}-\\d{2}-\\d{2}'
      AND c.subscription_expires_at::timestamptz < NOW()
    ) AS is_expired,
    c.last_sign_in_at,
    c.created_at
  FROM customer_rows c
  WHERE c.role <> 'admin'
  ORDER BY c.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_customers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_customers() TO authenticated;
