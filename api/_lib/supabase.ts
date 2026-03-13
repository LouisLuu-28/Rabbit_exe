import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Lưu ý: Trong môi trường production (Vercel), nên dùng SERVICE_ROLE_KEY để bypass RLS nếu cần thiết
// Ở đây ta ưu tiên dùng các biến môi trường đã có sẵn.

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
