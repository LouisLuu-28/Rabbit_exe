import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Package, DollarSign, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  const stats = [
    {
      title: "Tổng Đơn Hàng",
      value: "0",
      description: "Đơn hàng trong tháng",
      icon: ShoppingCart,
      trend: "+0%",
    },
    {
      title: "Nguyên Liệu",
      value: "0",
      description: "Loại nguyên liệu",
      icon: Package,
      trend: "0 cần mua",
    },
    {
      title: "Doanh Thu",
      value: "0đ",
      description: "Trong tháng này",
      icon: DollarSign,
      trend: "+0%",
    },
    {
      title: "Lợi Nhuận",
      value: "0đ",
      description: "Ước tính tháng này",
      icon: TrendingUp,
      trend: "+0%",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Chào mừng bạn đến với EMS Pro</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
            <div className="text-center py-8 text-muted-foreground">
              Chưa có đơn hàng nào
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nguyên Liệu Sắp Hết</CardTitle>
            <CardDescription>Cần mua thêm trong tuần này</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Tất cả nguyên liệu đều đủ
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
