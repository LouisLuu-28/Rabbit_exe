CREATE OR REPLACE FUNCTION public.update_ingredient_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingredient_record RECORD;
  order_user_id UUID;
BEGIN
  -- Validate order belongs to authenticated user
  SELECT user_id INTO order_user_id
  FROM public.orders
  WHERE id = NEW.order_id;
  
  IF order_user_id IS NULL OR order_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: order does not belong to current user';
  END IF;

  -- Loop through ingredients needed for this menu item
  FOR ingredient_record IN 
    SELECT ingredient_id, quantity_needed 
    FROM public.menu_item_ingredients 
    WHERE menu_item_id = NEW.menu_item_id
  LOOP
    -- Update ingredient stock
    UPDATE public.ingredients
    SET current_stock = current_stock - (ingredient_record.quantity_needed * NEW.quantity)
    WHERE id = ingredient_record.ingredient_id
      AND user_id = order_user_id;
  END LOOP;
  
  RETURN NEW;
END;
$$;