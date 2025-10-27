-- Add code and category columns to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN code TEXT,
ADD COLUMN category TEXT;

-- Add code column to menu_items table (category already exists)
ALTER TABLE public.menu_items 
ADD COLUMN code TEXT;

-- Add code column to orders table
ALTER TABLE public.orders 
ADD COLUMN code TEXT;

-- Create unique constraints to ensure codes are unique per user
ALTER TABLE public.ingredients ADD CONSTRAINT ingredients_user_code_unique UNIQUE (user_id, code);
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_user_code_unique UNIQUE (user_id, code);
ALTER TABLE public.orders ADD CONSTRAINT orders_user_code_unique UNIQUE (user_id, code);

-- Create function to generate next code for ingredients
CREATE OR REPLACE FUNCTION generate_ingredient_code(p_user_id UUID)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to generate next code for menu items
CREATE OR REPLACE FUNCTION generate_menu_item_code(p_user_id UUID)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to generate next code for orders
CREATE OR REPLACE FUNCTION generate_order_code(p_user_id UUID)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;