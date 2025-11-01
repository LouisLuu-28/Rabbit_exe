import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddIngredientDialog({ open, onOpenChange, onSuccess }: AddIngredientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "rau_cu",
    unit: "kg",
    current_stock: "",
    min_stock: "",
    cost_per_unit: "",
    last_purchase_date: "",
    supplier_info: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("ingredients").insert({
      ...formData,
      current_stock: parseFloat(formData.current_stock) || 0,
      min_stock: parseFloat(formData.min_stock) || 0,
      cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
      last_purchase_date: formData.last_purchase_date || null,
      user_id: user.id,
    });

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể thêm nguyên liệu",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Thành công",
        description: "Đã thêm nguyên liệu mới",
      });
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        code: "",
        name: "",
        category: "rau_cu",
        unit: "kg",
        current_stock: "",
        min_stock: "",
        cost_per_unit: "",
        last_purchase_date: "",
        supplier_info: "",
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm Nguyên Liệu Mới</DialogTitle>
          <DialogDescription>Nhập thông tin nguyên liệu vào kho</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Mã Nguyên Liệu *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="VD: NL-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Tên Nguyên Liệu *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Danh Mục *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rau_cu">Rau Củ</SelectItem>
                  <SelectItem value="thit">Thịt</SelectItem>
                  <SelectItem value="ca">Cá & Hải Sản</SelectItem>
                  <SelectItem value="gia_vi">Gia Vị</SelectItem>
                  <SelectItem value="bot">Bột</SelectItem>
                  <SelectItem value="dau">Dầu Ăn</SelectItem>
                  <SelectItem value="do_kho">Đồ Khô</SelectItem>
                  <SelectItem value="khac">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Đơn Vị Tính *</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">gram</SelectItem>
                  <SelectItem value="l">lít</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="chai">chai</SelectItem>
                  <SelectItem value="hop">hộp</SelectItem>
                  <SelectItem value="goi">gói</SelectItem>
                  <SelectItem value="cai">cái</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_stock">Tồn Kho Hiện Tại *</Label>
              <Input
                id="current_stock"
                type="number"
                min="0"
                step="0.01"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock">Ngưỡng Cảnh Báo *</Label>
              <Input
                id="min_stock"
                type="number"
                min="0"
                step="0.01"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_per_unit">Giá / Đơn Vị (₫) *</Label>
              <Input
                id="cost_per_unit"
                type="number"
                min="0"
                step="100"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_purchase_date">Ngày Nhập Gần Nhất</Label>
              <Input
                id="last_purchase_date"
                type="date"
                value={formData.last_purchase_date}
                onChange={(e) => setFormData({ ...formData, last_purchase_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="supplier_info">Thông Tin Nhà Cung Cấp</Label>
              <Textarea
                id="supplier_info"
                value={formData.supplier_info}
                onChange={(e) => setFormData({ ...formData, supplier_info: e.target.value })}
                rows={3}
                placeholder="Tên nhà cung cấp, số điện thoại, địa chỉ..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Thêm Nguyên Liệu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
