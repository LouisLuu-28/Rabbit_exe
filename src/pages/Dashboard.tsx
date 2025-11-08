import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, DollarSign, TrendingUp } from "lucide-react";
import { CustomerReturnFrequency } from "@/components/CustomerReturnFrequency";
import { PreferredSuppliers } from "@/components/PreferredSuppliers";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";

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

interface ChartData {
  date: string;
  revenue: number;
  orders: number;
}

interface IngredientChartData {
  date: string;
  imported: number;
  used: number;
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
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [ingredientChartData, setIngredientChartData] = useState<IngredientChartData[]>([]);

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

    // Fetch data for chart (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const { data: chartOrdersData } = await supabase
      .from("orders")
      .select("order_date, total_amount")
      .eq("user_id", user.id)
      .gte("order_date", sevenDaysAgo.toISOString().split('T')[0])
      .order("order_date", { ascending: true });

    // Group data by date
    const dateMap = new Map<string, { revenue: number; orders: number }>();
    
    // Initialize all dates in the range
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { revenue: 0, orders: 0 });
    }

    // Fill in actual data
    chartOrdersData?.forEach(order => {
      const dateStr = order.order_date;
      const existing = dateMap.get(dateStr) || { revenue: 0, orders: 0 };
      dateMap.set(dateStr, {
        revenue: existing.revenue + Number(order.total_amount),
        orders: existing.orders + 1,
      });
    });

    // Convert to chart data format
    const formattedChartData: ChartData[] = Array.from(dateMap.entries()).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      revenue: data.revenue,
      orders: data.orders,
    }));

    setChartData(formattedChartData);

    // Fetch ingredient usage and imports data
    const ingredientDateMap = new Map<string, { imported: number; used: number }>();
    
    // Initialize all dates
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      ingredientDateMap.set(dateStr, { imported: 0, used: 0 });
    }

    // Calculate ingredients imported (based on created_at or updated_at)
    const { data: recentIngredients } = await supabase
      .from("ingredients")
      .select("created_at, updated_at")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());

    recentIngredients?.forEach(ingredient => {
      const dateStr = ingredient.created_at.split('T')[0];
      if (ingredientDateMap.has(dateStr)) {
        const existing = ingredientDateMap.get(dateStr)!;
        ingredientDateMap.set(dateStr, { ...existing, imported: existing.imported + 1 });
      }
    });

    // Calculate ingredients used (from orders)
    const { data: orderItemsData } = await supabase
      .from("orders")
      .select(`
        order_date,
        order_items (
          quantity,
          menu_item_id
        )
      `)
      .eq("user_id", user.id)
      .gte("order_date", sevenDaysAgo.toISOString().split('T')[0]);

    // Get menu item ingredients to calculate usage
    if (orderItemsData) {
      for (const order of orderItemsData) {
        const dateStr = order.order_date;
        if (!ingredientDateMap.has(dateStr)) continue;

        for (const item of (order.order_items as any[])) {
          const { data: menuIngredients } = await supabase
            .from("menu_item_ingredients")
            .select("ingredient_id, quantity_needed")
            .eq("menu_item_id", item.menu_item_id);

          if (menuIngredients) {
            const existing = ingredientDateMap.get(dateStr)!;
            ingredientDateMap.set(dateStr, {
              ...existing,
              used: existing.used + (menuIngredients.length * item.quantity),
            });
          }
        }
      }
    }

    // Convert to ingredient chart data format
    const formattedIngredientChartData: IngredientChartData[] = Array.from(ingredientDateMap.entries()).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      imported: data.imported,
      used: data.used,
    }));

    setIngredientChartData(formattedIngredientChartData);
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
        <p className="text-muted-foreground">Chào mừng bạn đến với Rabbit EMS System</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tutorial="dashboard-stats">
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
            <CardTitle>Doanh Thu 7 Ngày Qua</CardTitle>
            <CardDescription>Xu hướng doanh thu theo ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Doanh thu",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value) => `${Number(value).toLocaleString()}₫`}
                  />} 
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Số Đơn Hàng 7 Ngày Qua</CardTitle>
            <CardDescription>Xu hướng số lượng đơn hàng</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                orders: {
                  label: "Đơn hàng",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value) => `${value} đơn`}
                  />} 
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#ordersGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-tutorial="dashboard-recent-orders">
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

        <Card data-tutorial="dashboard-low-stock">
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

      <Card>
        <CardHeader>
          <CardTitle>Nguyên Liệu Nhập & Sử Dụng (7 Ngày)</CardTitle>
          <CardDescription>Theo dõi nhập kho và tiêu thụ nguyên liệu</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              imported: {
                label: "Nhập vào",
                color: "hsl(var(--chart-3))",
              },
              used: {
                label: "Sử dụng",
                color: "hsl(var(--chart-4))",
              },
            }}
            className="h-[300px]"
          >
            <BarChart data={ingredientChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="rect"
              />
              <Bar 
                dataKey="imported" 
                fill="hsl(var(--chart-3))" 
                radius={[4, 4, 0, 0]}
                name="Nhập vào"
              />
              <Bar 
                dataKey="used" 
                fill="hsl(var(--chart-4))" 
                radius={[4, 4, 0, 0]}
                name="Sử dụng"
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerReturnFrequency />
        <PreferredSuppliers />
      </div>
    </div>
  );
};

export default Dashboard;
