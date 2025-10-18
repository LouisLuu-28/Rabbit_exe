import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

const Financial = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
        fetchFinancialData();
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchFinancialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current month date range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Fetch financial records
    const { data: records } = await supabase
      .from("financial_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("record_date", firstDayOfMonth)
      .lte("record_date", lastDayOfMonth);

    const revenueAmount = records?.filter(r => r.type === 'revenue').reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const expenseAmount = records?.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    // Also add revenue from orders
    const { data: orders } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("user_id", user.id)
      .gte("order_date", firstDayOfMonth)
      .lte("order_date", lastDayOfMonth)
      .neq("status", "cancelled");

    const ordersRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

    const totalRevenue = revenueAmount + ordersRevenue;
    const totalProfit = totalRevenue - expenseAmount;

    setRevenue(totalRevenue);
    setExpenses(expenseAmount);
    setProfit(totalProfit);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Báo Cáo Tài Chính</h1>
        <p className="text-muted-foreground">Theo dõi doanh thu, chi phí và lợi nhuận</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Doanh Thu</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{revenue.toLocaleString()}₫</div>
            <p className="text-xs text-muted-foreground mt-1">Tháng này</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Chi Phí</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expenses.toLocaleString()}₫</div>
            <p className="text-xs text-muted-foreground mt-1">Tháng này</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Lợi Nhuận</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{profit.toLocaleString()}₫</div>
            <p className="text-xs text-muted-foreground mt-1">Tháng này</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chi Tiết Tài Chính</CardTitle>
          <CardDescription>Xem theo thời gian</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="month" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="week">Tuần</TabsTrigger>
              <TabsTrigger value="month">Tháng</TabsTrigger>
              <TabsTrigger value="year">Năm</TabsTrigger>
            </TabsList>
            <TabsContent value="week" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                Chưa có dữ liệu tuần này
              </div>
            </TabsContent>
            <TabsContent value="month" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                Chưa có dữ liệu tháng này
              </div>
            </TabsContent>
            <TabsContent value="year" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                Chưa có dữ liệu năm này
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Financial;
