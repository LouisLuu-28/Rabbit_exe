-- Add manufacture_date and expiration_date columns to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN manufacture_date date,
ADD COLUMN expiration_date date;