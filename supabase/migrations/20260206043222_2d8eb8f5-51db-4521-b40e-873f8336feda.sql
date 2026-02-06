-- Create inventory_logs table to track all inventory transactions
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  ingredient_id uuid REFERENCES public.ingredients NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('import', 'export', 'restock')),
  quantity numeric NOT NULL,
  unit text NOT NULL,
  cost_per_unit numeric,
  reference text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_inventory_logs_user_id ON public.inventory_logs(user_id);
CREATE INDEX idx_inventory_logs_ingredient_id ON public.inventory_logs(ingredient_id);
CREATE INDEX idx_inventory_logs_created_at ON public.inventory_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own inventory logs"
  ON public.inventory_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory logs"
  ON public.inventory_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);