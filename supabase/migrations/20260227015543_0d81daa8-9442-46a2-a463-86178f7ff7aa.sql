-- Add image_url column to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage
CREATE POLICY "Users can upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their menu images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their menu images"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view menu images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');