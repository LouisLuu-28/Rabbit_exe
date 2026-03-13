import { supabase } from './supabase';

/**
 * Lấy toàn bộ thực đơn của người dùng
 */
export async function get_menu(userId: string) {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('user_id', userId)
        .order('name');
    
    if (error) throw error;
    return data;
}

/**
 * Lấy danh sách món ăn theo danh mục (main, side, drink, dessert)
 */
export async function get_menu_by_category(userId: string, category: string) {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('name');
    
    if (error) throw error;
    return data;
}

/**
 * Lấy danh sách các món ăn đang có sẵn (is_available = true)
 */
export async function get_available_menu(userId: string) {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_available', true)
        .order('name');
    
    if (error) throw error;
    return data;
}
