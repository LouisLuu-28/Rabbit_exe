import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface EditIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientId: string | null;
  onSuccess: () => void;
}

export function EditIngredientDialog({ open, onOpenChange, ingredientId, onSuccess }: EditIngredientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ingredient, setIngredient] = useState({
    code: "",
    name: "",
    category: "",
    unit: "",
    current_stock: "",
    min_stock: "",
    cost_per_unit: "",
    last_purchase_date: "",
    manufacture_date: "",
    expiration_date: "",
    supplier_info: "",
  });

  useEffect(() => {
    if (open && ingredientId) {
      fetchIngredient();
    }
  }, [open, ingredientId]);

  const fetchIngredient = async () => {
    if (!ingredientId) return;

    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", ingredientId)
      .single();

    if (data) {
      setIngredient({
        code: data.code || "",
        name: data.name,
        category: data.category || "khac",
        unit: data.unit,
        current_stock: data.current_stock.toString(),
        min_stock: data.min_stock.toString(),
        cost_per_unit: data.cost_per_unit.toString(),
        last_purchase_date: data.last_purchase_date || "",
        manufacture_date: data.manufacture_date || "",
        expiration_date: data.expiration_date || "",
        supplier_info: data.supplier_info || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientId) return;

    setLoading(true);

    const { error } = await supabase
      .from("ingredients")
      .update({
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        current_stock: parseFloat(ingredient.current_stock),
        min_stock: parseFloat(ingredient.min_stock),
        cost_per_unit: parseFloat(ingredient.cost_per_unit),
        last_purchase_date: ingredient.last_purchase_date || null,
        manufacture_date: ingredient.manufacture_date || null,
        expiration_date: ingredient.expiration_date || null,
        supplier_info: ingredient.supplier_info,
      })
      .eq("id", ingredientId);

    setLoading(false);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật nguyên liệu",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thành công",
      description: "Đã cập nhật nguyên liệu",
    });
    onSuccess();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!ingredientId) return;

    setLoading(true);

    // Delete related records first
    await supabase.from("menu_item_ingredients").delete().eq("ingredient_id", ingredientId);

    const { error } = await supabase.from("ingredients").delete().eq("id", ingredientId);

    setLoading(false);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa nguyên liệu",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thành công",
      description: "Đã xóa nguyên liệu",
    });
    onSuccess();
    onOpenChange(false);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh Sửa Nguyên Liệu</DialogTitle>
            <DialogDescription>Cập nhật thông tin nguyên liệu</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Mã Nguyên Liệu</Label>
              <Input
                id="code"
                value={ingredient.code}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="name">Tên Nguyên Liệu *</Label>
              <Input
                id="name"
                value={ingredient.name}
                onChange={(e) => setIngredient({ ...ingredient, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Danh Mục *</Label>
                <Select value={ingredient.category} onValueChange={(value) => setIngredient({ ...ingredient, category: value })}>
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
              <div>
                <Label htmlFor="unit">Đơn Vị *</Label>
                <Input
                  id="unit"
                  value={ingredient.unit}
                  onChange={(e) => setIngredient({ ...ingredient, unit: e.target.value })}
                  placeholder="kg, gram, chai..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="cost">Giá / Đơn Vị (₫) *</Label>
                <Input
                  id="cost"
                  type="number"
                  value={ingredient.cost_per_unit}
                  onChange={(e) => setIngredient({ ...ingredient, cost_per_unit: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current_stock">Tồn Kho Hiện Tại *</Label>
                <Input
                  id="current_stock"
                  type="number"
                  step="0.01"
                  value={ingredient.current_stock}
                  onChange={(e) => setIngredient({ ...ingredient, current_stock: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="min_stock">Ngưỡng Tối Thiểu *</Label>
                <Input
                  id="min_stock"
                  type="number"
                  step="0.01"
                  value={ingredient.min_stock}
                  onChange={(e) => setIngredient({ ...ingredient, min_stock: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="last_purchase_date">Ngày Nhập</Label>
                <Input
                  id="last_purchase_date"
                  type="date"
                  value={ingredient.last_purchase_date}
                  onChange={(e) => setIngredient({ ...ingredient, last_purchase_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="manufacture_date">Ngày Sản Xuất</Label>
                <Input
                  id="manufacture_date"
                  type="date"
                  value={ingredient.manufacture_date}
                  onChange={(e) => setIngredient({ ...ingredient, manufacture_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="expiration_date">Ngày Hết Hạn</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  value={ingredient.expiration_date}
                  onChange={(e) => setIngredient({ ...ingredient, expiration_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="supplier">Thông Tin Nhà Cung Cấp</Label>
              <Input
                id="supplier"
                value={ingredient.supplier_info}
                onChange={(e) => setIngredient({ ...ingredient, supplier_info: e.target.value })}
                placeholder="Tên, SĐT, địa chỉ..."
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
              >
                Xóa
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Đang lưu..." : "Cập nhật"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nguyên liệu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa nguyên liệu này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
