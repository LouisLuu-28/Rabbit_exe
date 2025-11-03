import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface CustomerStats {
  customerName: string;
  customerPhone: string | null;
  orderCount: number;
  lastOrderDate: string;
  avgDaysBetweenOrders: number | null;
}

export const CustomerReturnFrequency = () => {
  const [customerStats, setCustomerStats] = useState<CustomerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerStats();
  }, []);

  const fetchCustomerStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: orders } = await supabase
      .from("orders")
      .select("customer_name, customer_phone, order_date")
      .eq("user_id", user.id)
      .order("order_date", { ascending: true });

    if (!orders) {
      setLoading(false);
      return;
    }

    // Group orders by customer
    const customerMap = new Map<string, { 
      phone: string | null;
      orderDates: string[];
    }>();

    orders.forEach(order => {
      const key = order.customer_name.toLowerCase();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          phone: order.customer_phone,
          orderDates: []
        });
      }
      customerMap.get(key)!.orderDates.push(order.order_date);
    });

    // Calculate stats for each customer
    const stats: CustomerStats[] = Array.from(customerMap.entries()).map(([name, data]) => {
      const orderCount = data.orderDates.length;
      const lastOrderDate = data.orderDates[data.orderDates.length - 1];
      
      let avgDaysBetweenOrders: number | null = null;
      if (orderCount > 1) {
        const dates = data.orderDates.map(d => new Date(d).getTime());
        let totalDays = 0;
        for (let i = 1; i < dates.length; i++) {
          totalDays += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        }
        avgDaysBetweenOrders = Math.round(totalDays / (orderCount - 1));
      }

      return {
        customerName: name.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        customerPhone: data.phone,
        orderCount,
        lastOrderDate,
        avgDaysBetweenOrders
      };
    });

    // Sort by order count (descending)
    stats.sort((a, b) => b.orderCount - a.orderCount);

    setCustomerStats(stats);
    setLoading(false);
  };

  const getLoyaltyBadge = (orderCount: number) => {
    if (orderCount >= 10) {
      return <Badge className="bg-warning text-warning-foreground">VIP</Badge>;
    } else if (orderCount >= 5) {
      return <Badge variant="default">Khách Thân Thiết</Badge>;
    } else if (orderCount >= 2) {
      return <Badge variant="secondary">Khách Quay Lại</Badge>;
    }
    return <Badge variant="outline">Khách Mới</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tần Suất Khách Hàng
          </CardTitle>
          <CardDescription>Thống kê khách hàng quay lại</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Tần Suất Khách Hàng
        </CardTitle>
        <CardDescription>
          Tổng {customerStats.length} khách hàng
        </CardDescription>
      </CardHeader>
      <CardContent>
        {customerStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Chưa có dữ liệu khách hàng
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {customerStats.map((customer, index) => (
              <div 
                key={index} 
                className="flex justify-between items-start p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{customer.customerName}</p>
                    {getLoyaltyBadge(customer.orderCount)}
                  </div>
                  {customer.customerPhone && (
                    <p className="text-sm text-muted-foreground">
                      📞 {customer.customerPhone}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Đơn gần nhất: {new Date(customer.lastOrderDate).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-primary">
                    {customer.orderCount} đơn
                  </p>
                  {customer.avgDaysBetweenOrders !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Trung bình: {customer.avgDaysBetweenOrders} ngày/lần
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};