import { createClient } from '@supabase/supabase-js';

// Sử dụng biến môi trường chuẩn của Supabase/Vercel hoặc các biến từ Vite
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Tránh crash server khi thiếu biến môi trường ở tầng module
export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null as any; 

if (!supabase) {
    console.error("CRITICAL: Thiếu cấu hình Supabase URL hoặc Key. API sẽ không hoạt động đúng.");
}
