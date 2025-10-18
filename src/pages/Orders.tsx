import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { AddOrderDialog } from "@/components/orders/AddOrderDialog";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  order_date: string;
  total_amount: number;
  status: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
        fetchOrders();
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("order_date", { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
  };

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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản Lý Đơn Hàng</h1>
          <p className="text-muted-foreground">Theo dõi và quản lý tất cả đơn hàng</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Thêm Đơn Hàng
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Đơn Hàng</CardTitle>
          <CardDescription>Tất cả đơn hàng của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-6xl mb-4">📦</div>
              <p>Chưa có đơn hàng nào</p>
              <p className="text-sm mt-2">Nhấn "Thêm Đơn Hàng" để bắt đầu</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Đơn</TableHead>
                  <TableHead>Khách Hàng</TableHead>
                  <TableHead>Số Điện Thoại</TableHead>
                  <TableHead>Ngày Đặt</TableHead>
                  <TableHead>Tổng Tiền</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead>Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{order.customer_name}</TableCell>
                    <TableCell>{order.customer_phone || "-"}</TableCell>
                    <TableCell>{new Date(order.order_date).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="font-semibold">{order.total_amount.toLocaleString()}₫</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchOrders}
      />
      
      <OrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        orderId={selectedOrderId}
        onSuccess={fetchOrders}
      />
    </div>
  );
};

export default Orders;
