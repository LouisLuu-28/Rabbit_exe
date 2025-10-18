import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, DollarSign, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalOrders: number;
  ingredientsCount: number;
  ingredientsToRestock: number;
  revenue: number;
  profit: number;
}

interface Order {
  id: string;
  customer_name: string;
  order_date: string;
  total_amount: number;
  status: string;
}

interface Ingredient {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    ingredientsCount: 0,
    ingredientsToRestock: 0,
    revenue: 0,
    profit: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockIngredients, setLowStockIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
        fetchDashboardData();
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch orders for current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .gte("order_date", firstDayOfMonth);

    const totalOrders = ordersData?.length || 0;
    const revenue = ordersData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

    // Fetch recent orders
    const { data: recentOrdersData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("order_date", { ascending: false })
      .limit(5);

    // Fetch ingredients
    const { data: ingredientsData } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", user.id);

    const ingredientsCount = ingredientsData?.length || 0;
    const lowStock = ingredientsData?.filter(i => i.current_stock <= i.min_stock) || [];
    
    // Calculate profit (revenue - ingredient costs)
    const ingredientCost = ingredientsData?.reduce((sum, i) => sum + (Number(i.current_stock) * Number(i.cost_per_unit)), 0) || 0;
    const profit = revenue - ingredientCost;

    setStats({
      totalOrders,
      ingredientsCount,
      ingredientsToRestock: lowStock.length,
      revenue,
      profit,
    });
    setRecentOrders(recentOrdersData || []);
    setLowStockIngredients(lowStock);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      preparing: "secondary",
      ready: "default",
      delivered: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "Chờ Xử Lý",
      preparing: "Đang Chuẩn Bị",
      ready: "Sẵn Sàng",
      delivered: "Đã Giao",
      cancelled: "Đã Hủy",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const statsDisplay = [
    {
      title: "Tổng Đơn Hàng",
      value: stats.totalOrders.toString(),
      description: "Đơn hàng trong tháng",
      icon: ShoppingCart,
      trend: stats.totalOrders > 0 ? `${stats.totalOrders} đơn` : "Chưa có đơn",
    },
    {
      title: "Nguyên Liệu",
      value: stats.ingredientsCount.toString(),
      description: "Loại nguyên liệu",
      icon: Package,
      trend: `${stats.ingredientsToRestock} cần mua`,
    },
    {
      title: "Doanh Thu",
      value: `${stats.revenue.toLocaleString()}₫`,
      description: "Trong tháng này",
      icon: DollarSign,
      trend: stats.revenue > 0 ? "Đang hoạt động" : "Chưa có doanh thu",
    },
    {
      title: "Lợi Nhuận",
      value: `${stats.profit.toLocaleString()}₫`,
      description: "Ước tính tháng này",
      icon: TrendingUp,
      trend: stats.profit > 0 ? "Có lãi" : stats.profit < 0 ? "Lỗ" : "Hòa vốn",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Chào mừng bạn đến với EMS Pro</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsDisplay.map((stat) => (
          <Card key={stat.title} className="transition-shadow hover:shadow-[var(--shadow-hover)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
              <p className="text-xs text-success mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Đơn Hàng Gần Đây</CardTitle>
            <CardDescription>Các đơn hàng mới nhất của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có đơn hàng nào
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.order_date).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{order.total_amount.toLocaleString()}₫</p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nguyên Liệu Sắp Hết</CardTitle>
            <CardDescription>Cần mua thêm trong tuần này</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockIngredients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tất cả nguyên liệu đều đủ
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockIngredients.map((ingredient) => (
                  <div key={ingredient.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{ingredient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Min: {ingredient.min_stock} {ingredient.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-warning">
                        {ingredient.current_stock} {ingredient.unit}
                      </p>
                      <Badge variant="outline" className="border-warning text-warning">
                        Sắp hết
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
