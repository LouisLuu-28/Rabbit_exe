import { supabase } from './supabase.js';

/**
 * Lấy danh sách toàn bộ nguyên liệu trong kho của người dùng
 */
export async function get_inventory(userId: string) {
    const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', userId)
        .order('name');
    
    if (error) throw error;
    return data;
}

/**
 * Lấy danh sách nguyên liệu sắp hết hàng (current_stock <= min_stock)
 */
export async function get_low_stock_items(userId: string) {
    const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', userId)
        .lte('current_stock', 'min_stock'); // Lưu ý: Một số DB không so sánh 2 cột trực tiếp được qua .lte() đơn giản
    
    // Fallback nếu .lte() giữa 2 cột không hoạt động tốt trên JS client
    const { data: allItems, error: allErr } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', userId);
    
    if (allErr) throw allErr;
    return allItems?.filter(item => item.current_stock <= item.min_stock) || [];
}

/**
 * Lấy danh sách nguyên liệu sắp hết hạn (trong vòng 7 ngày)
 */
export async function get_expiring_items(userId: string) {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', userId)
        .gte('expiration_date', today.toISOString())
        .lte('expiration_date', sevenDaysLater.toISOString());
    
    if (error) throw error;
    return data;
}

/**
 * Lấy lịch sử nhập xuất kho gần đây
 */
export async function get_recent_movements(userId: string, limit = 10) {
    const { data, error } = await supabase
        .from('inventory_logs')
        .select(`
            *,
            ingredients(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data;
}
