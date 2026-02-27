import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface OrderItem {
  menu_item_id: string;
  quantity: number;
  unit_price: number;
}

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddOrderDialog({ open, onOpenChange, onSuccess }: AddOrderDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    delivery_address: "",
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    status: "pending",
    notes: "",
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (open) {
      fetchMenuItems();
    }
  }, [open]);

  const fetchMenuItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available")
      .eq("user_id", user.id)
      .eq("is_available", true)
      .order("name");

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách món",
        variant: "destructive",
      });
    } else {
      setMenuItems(data || []);
    }
  };

  const addOrderItem = () => {
    if (menuItems.length === 0) {
      toast({
        title: "Chưa có món",
        description: "Vui lòng thêm món vào thực đơn trước",
        variant: "destructive",
      });
      return;
    }
    setOrderItems([...orderItems, { menu_item_id: menuItems[0].id, quantity: 1, unit_price: menuItems[0].price }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...orderItems];
    if (field === "menu_item_id" && typeof value === "string") {
      const menuItem = menuItems.find(m => m.id === value);
      if (menuItem) {
        newItems[index].unit_price = menuItem.price;
      }
      newItems[index].menu_item_id = value;
    } else if (field === "quantity" && typeof value === "number") {
      newItems[index].quantity = value;
    } else if (field === "unit_price" && typeof value === "number") {
      newItems[index].unit_price = value;
    }
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const trimmedName = formData.customer_name.trim();
    if (!trimmedName || trimmedName.length > 100) {
      toast({ title: "Lỗi", description: "Tên khách hàng không hợp lệ (tối đa 100 ký tự)", variant: "destructive" });
      return;
    }
    if (formData.customer_phone && !/^[0-9+\-\s()]{0,15}$/.test(formData.customer_phone)) {
      toast({ title: "Lỗi", description: "Số điện thoại không hợp lệ", variant: "destructive" });
      return;
    }
    if (formData.delivery_address.length > 500) {
      toast({ title: "Lỗi", description: "Địa chỉ quá dài (tối đa 500 ký tự)", variant: "destructive" });
      return;
    }
    if (formData.notes.length > 2000) {
      toast({ title: "Lỗi", description: "Ghi chú quá dài (tối đa 2000 ký tự)", variant: "destructive" });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng thêm ít nhất một món",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalAmount = calculateTotal();

    // Generate code
    const { data: codeData } = await supabase.rpc('generate_order_code', { p_user_id: user.id });
    const code = codeData || 'DH-001';

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        ...formData,
        code,
        user_id: user.id,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderError) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo đơn hàng",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Create order items
    const orderItemsData = orderItems.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsData);

    if (itemsError) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu chi tiết đơn hàng",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Thành công",
        description: "Đã tạo đơn hàng mới",
      });
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        customer_name: "",
        customer_phone: "",
        delivery_address: "",
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: "",
        status: "pending",
        notes: "",
      });
      setOrderItems([]);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm Đơn Hàng Mới</DialogTitle>
          <DialogDescription>Nhập thông tin đơn hàng và chọn món</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Tên Khách Hàng *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_phone">Số Điện Thoại</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_date">Ngày Đặt *</Label>
              <Input
                id="order_date"
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_delivery_date">Ngày Giao Dự Kiến</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="delivery_address">Địa Chỉ Giao Hàng</Label>
              <Input
                id="delivery_address"
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Trạng Thái</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
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
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Ghi Chú</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                maxLength={2000}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-lg font-semibold">Món Ăn</Label>
              <Button type="button" onClick={addOrderItem} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm Món
              </Button>
            </div>

            <div className="space-y-2">
              {orderItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Món</Label>
                    <Select
                      value={item.menu_item_id}
                      onValueChange={(value) => updateOrderItem(index, "menu_item_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {menuItems.map((menuItem) => (
                          <SelectItem key={menuItem.id} value={menuItem.id}>
                            {menuItem.name} - {menuItem.price.toLocaleString()}₫
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-24">
                    <Label>Số Lượng</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="w-32">
                    <Label>Đơn Giá</Label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateOrderItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="w-32">
                    <Label>Thành Tiền</Label>
                    <Input
                      value={(item.quantity * item.unit_price).toLocaleString()}
                      disabled
                    />
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeOrderItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {orderItems.length > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Tổng Cộng</div>
                  <div className="text-2xl font-bold text-primary">
                    {calculateTotal().toLocaleString()}₫
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Tạo Đơn Hàng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
