import { supabase } from './supabase.js';

/**
 * Lấy danh sách đơn hàng gần đây của người dùng
 */
export async function get_recent_orders(userId: string, limit = 10) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('order_date', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data;
}

/**
 * Lấy danh sách đơn hàng theo trạng thái
 * @param status 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
 */
export async function get_orders_by_status(userId: string, status: string) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .eq('status', status)
        .order('order_date', { ascending: false });
    
    if (error) throw error;
    return data;
}

/**
 * Lấy chi tiết một đơn hàng kèm danh sách món ăn
 */
export async function get_order_details(orderId: string) {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                *,
                menu_items (name)
            )
        `)
        .eq('id', orderId)
        .single();
    
    if (error) throw error;
    return data;
}
