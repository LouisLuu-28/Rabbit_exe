import { supabase } from './supabase.js';

/**
 * Tổng hợp doanh thu và chi phí trong một khoảng thời gian
 */
export async function get_financial_summary(userId: string, startDate?: string, endDate?: string) {
    let query = supabase
        .from('financial_records')
        .select('type, amount')
        .eq('user_id', userId);
    
    if (startDate) query = query.gte('record_date', startDate);
    if (endDate) query = query.lte('record_date', endDate);

    const { data, error } = await query;
    if (error) throw error;

    const summary = {
        total_income: 0,
        total_expense: 0,
        net_profit: 0
    };

    data.forEach(record => {
        if (record.type === 'income') summary.total_income += record.amount;
        else if (record.type === 'expense') summary.total_expense += record.amount;
    });

    summary.net_profit = summary.total_income - summary.total_expense;
    return summary;
}

/**
 * Lấy danh sách các bản ghi tài chính gần đây (thu hoặc chi)
 */
export async function get_recent_financial_records(userId: string, type?: string, limit = 10) {
    let query = supabase
        .from('financial_records')
        .select('*')
        .eq('user_id', userId)
        .order('record_date', { ascending: false })
        .limit(limit);
    
    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}
