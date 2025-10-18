import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  menu_items?: {
    name: string;
  };
}

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onSuccess: () => void;
}

export function OrderDetailDialog({ open, onOpenChange, orderId, onSuccess }: OrderDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetail();
    }
  }, [open, orderId]);

  const fetchOrderDetail = async () => {
    if (!orderId) return;

    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderData) {
      setOrder(orderData);
      setStatus(orderData.status);
    }

    const { data: itemsData } = await supabase
      .from("order_items")
      .select(`
        *,
        menu_items (
          name
        )
      `)
      .eq("order_id", orderId);

    if (itemsData) {
      setOrderItems(itemsData);
    }
  };

  const handleUpdateStatus = async () => {
    if (!orderId) return;

    setLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    setLoading(false);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái đơn hàng",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thành công",
      description: "Đã cập nhật trạng thái đơn hàng",
    });
    onSuccess();
    onOpenChange(false);
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

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi Tiết Đơn Hàng #{order.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>Xem và cập nhật thông tin đơn hàng</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Khách Hàng</Label>
              <p className="font-medium">{order.customer_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Số Điện Thoại</Label>
              <p className="font-medium">{order.customer_phone || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Ngày Đặt</Label>
              <p className="font-medium">{new Date(order.order_date).toLocaleDateString("vi-VN")}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Ngày Giao Dự Kiến</Label>
              <p className="font-medium">
                {order.expected_delivery_date
                  ? new Date(order.expected_delivery_date).toLocaleDateString("vi-VN")
                  : "-"}
              </p>
            </div>
          </div>

          {order.delivery_address && (
            <div>
              <Label className="text-muted-foreground">Địa Chỉ Giao Hàng</Label>
              <p className="font-medium">{order.delivery_address}</p>
            </div>
          )}

          {order.notes && (
            <div>
              <Label className="text-muted-foreground">Ghi Chú</Label>
              <p className="font-medium">{order.notes}</p>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-muted-foreground mb-2 block">Món Ăn</Label>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.menu_items?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x {item.unit_price.toLocaleString()}₫
                    </p>
                  </div>
                  <p className="font-semibold">{item.subtotal.toLocaleString()}₫</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Label className="text-lg">Tổng Tiền</Label>
            <p className="text-2xl font-bold text-primary">{order.total_amount.toLocaleString()}₫</p>
          </div>

          <Separator />

          <div>
            <Label>Trạng Thái Đơn Hàng</Label>
            <div className="flex gap-2 mt-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Chờ Xử Lý</SelectItem>
                  <SelectItem value="preparing">Đang Chuẩn Bị</SelectItem>
                  <SelectItem value="ready">Sẵn Sàng</SelectItem>
                  <SelectItem value="delivered">Đã Giao</SelectItem>
                  <SelectItem value="cancelled">Đã Hủy</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleUpdateStatus} disabled={loading}>
                {loading ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
