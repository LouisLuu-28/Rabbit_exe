import { createClient } from '@supabase/supabase-js';

// Sử dụng biến môi trường chuẩn của Supabase/Vercel cho Serverless Functions
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Thiếu cấu hình Supabase URL hoặc Key trong biến môi trường.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
