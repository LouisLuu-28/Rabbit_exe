-- Add missing columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;

-- Create order_items table to store order details
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their order items"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their order items"
  ON public.order_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their order items"
  ON public.order_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

-- Add columns to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'main',
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Create menu_item_ingredients table to link menu items with ingredients
CREATE TABLE IF NOT EXISTS public.menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity_needed DECIMAL(10,3) NOT NULL CHECK (quantity_needed > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(menu_item_id, ingredient_id)
);

ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their menu item ingredients"
  ON public.menu_item_ingredients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.menu_items 
    WHERE menu_items.id = menu_item_ingredients.menu_item_id 
    AND menu_items.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their menu item ingredients"
  ON public.menu_item_ingredients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.menu_items 
    WHERE menu_items.id = menu_item_ingredients.menu_item_id 
    AND menu_items.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their menu item ingredients"
  ON public.menu_item_ingredients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.menu_items 
    WHERE menu_items.id = menu_item_ingredients.menu_item_id 
    AND menu_items.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their menu item ingredients"
  ON public.menu_item_ingredients FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.menu_items 
    WHERE menu_items.id = menu_item_ingredients.menu_item_id 
    AND menu_items.user_id = auth.uid()
  ));

-- Add columns to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS last_purchase_date DATE,
ADD COLUMN IF NOT EXISTS supplier_info TEXT;

-- Create function to auto-update ingredient stock when order is created
CREATE OR REPLACE FUNCTION public.update_ingredient_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingredient_record RECORD;
BEGIN
  -- Loop through ingredients needed for this menu item
  FOR ingredient_record IN 
    SELECT ingredient_id, quantity_needed 
    FROM public.menu_item_ingredients 
    WHERE menu_item_id = NEW.menu_item_id
  LOOP
    -- Update ingredient stock
    UPDATE public.ingredients
    SET current_stock = current_stock - (ingredient_record.quantity_needed * NEW.quantity)
    WHERE id = ingredient_record.ingredient_id;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update stock when order items are added
CREATE TRIGGER update_stock_on_order_item_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ingredient_stock_on_order();