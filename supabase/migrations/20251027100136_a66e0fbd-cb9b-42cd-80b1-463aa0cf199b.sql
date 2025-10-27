-- Fix security warnings: Set search_path for all code generation functions
DROP FUNCTION IF EXISTS generate_ingredient_code(UUID);
DROP FUNCTION IF EXISTS generate_menu_item_code(UUID);
DROP FUNCTION IF EXISTS generate_order_code(UUID);

CREATE OR REPLACE FUNCTION generate_ingredient_code(p_user_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'NL-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM ingredients
  WHERE user_id = p_user_id AND code ~ '^NL-\d+$';
  
  new_code := 'NL-' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION generate_menu_item_code(p_user_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'TD-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM menu_items
  WHERE user_id = p_user_id AND code ~ '^TD-\d+$';
  
  new_code := 'TD-' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION generate_order_code(p_user_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'DH-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM orders
  WHERE user_id = p_user_id AND code ~ '^DH-\d+$';
  
  new_code := 'DH-' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_code;
END;
$$;