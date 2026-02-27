import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface EditMenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItemId: string | null;
  onSuccess: () => void;
}

export function EditMenuItemDialog({ open, onOpenChange, menuItemId, onSuccess }: EditMenuItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuItem, setMenuItem] = useState({
    code: "",
    name: "",
    description: "",
    price: "",
    category: "main",
    is_available: true,
    dish_style: "",
    dish_type: "",
    flavor_type: "",
    drink_type: "",
  });
  const [ingredients, setIngredients] = useState<any[]>([]);

  useEffect(() => {
    if (open && menuItemId) {
      fetchMenuItem();
      fetchIngredients();
    }
  }, [open, menuItemId]);

  const fetchMenuItem = async () => {
    if (!menuItemId) return;

    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("id", menuItemId)
      .single();

    if (data) {
      setMenuItem({
        code: data.code || "",
        name: data.name,
        description: data.description || "",
        price: data.price.toString(),
        category: data.category,
        is_available: data.is_available,
        dish_style: data.dish_style || "",
        dish_type: data.dish_type || "",
        flavor_type: data.flavor_type || "",
        drink_type: data.drink_type || "",
      });
    }
  };

  const fetchIngredients = async () => {
    if (!menuItemId) return;

    const { data } = await supabase
      .from("menu_item_ingredients")
      .select(`
        *,
        ingredients (
          name,
          current_stock,
          min_stock,
          unit
        )
      `)
      .eq("menu_item_id", menuItemId);

    if (data) {
      setIngredients(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuItemId) return;

    setLoading(true);

    const { error } = await supabase
      .from("menu_items")
      .update({
        name: menuItem.name,
        description: menuItem.description,
        price: parseFloat(menuItem.price),
        category: menuItem.category,
        is_available: menuItem.is_available,
        dish_style: menuItem.dish_style || null,
        dish_type: menuItem.dish_type || null,
        flavor_type: menuItem.flavor_type || null,
        drink_type: menuItem.drink_type || null,
      })
      .eq("id", menuItemId);

    setLoading(false);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật món ăn",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thành công",
      description: "Đã cập nhật món ăn",
    });
    onSuccess();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!menuItemId) return;

    setLoading(true);

    // Delete related records first
    await supabase.from("menu_item_ingredients").delete().eq("menu_item_id", menuItemId);
    await supabase.from("order_items").delete().eq("menu_item_id", menuItemId);

    const { error } = await supabase.from("menu_items").delete().eq("id", menuItemId);

    setLoading(false);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa món ăn",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thành công",
      description: "Đã xóa món ăn",
    });
    onSuccess();
    onOpenChange(false);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh Sửa Món Ăn</DialogTitle>
            <DialogDescription>Cập nhật thông tin món ăn</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Mã Món</Label>
              <Input
                id="code"
                value={menuItem.code}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="name">Tên Món *</Label>
              <Input
                id="name"
                value={menuItem.name}
                onChange={(e) => setMenuItem({ ...menuItem, name: e.target.value })}
                maxLength={200}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Mô Tả</Label>
              <Textarea
                id="description"
                value={menuItem.description}
                onChange={(e) => setMenuItem({ ...menuItem, description: e.target.value })}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Giá Bán (₫) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={menuItem.price}
                  onChange={(e) => setMenuItem({ ...menuItem, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Danh Mục *</Label>
                <Select
                  value={menuItem.category}
                  onValueChange={(value) => setMenuItem({ ...menuItem, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Món Chính</SelectItem>
                    <SelectItem value="side">Món Phụ</SelectItem>
                    <SelectItem value="drink">Đồ Uống</SelectItem>
                    <SelectItem value="dessert">Tráng Miệng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Thuộc tính cho Món Chính */}
            {menuItem.category === 'main' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dish_style">Kiểu Món</Label>
                  <Select value={menuItem.dish_style} onValueChange={(value) => setMenuItem({ ...menuItem, dish_style: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kiểu món" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="noodle">Món Nước</SelectItem>
                      <SelectItem value="dry">Món Khô</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dish_type">Loại Món</Label>
                  <Select value={menuItem.dish_type} onValueChange={(value) => setMenuItem({ ...menuItem, dish_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại món" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vegetarian">Món Chay</SelectItem>
                      <SelectItem value="meat">Món Mặn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Thuộc tính cho Món Phụ */}
            {menuItem.category === 'side' && (
              <div>
                <Label htmlFor="flavor_type">Hương Vị</Label>
                <Select value={menuItem.flavor_type} onValueChange={(value) => setMenuItem({ ...menuItem, flavor_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn hương vị" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savory">Mặn</SelectItem>
                    <SelectItem value="sweet">Ngọt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Thuộc tính cho Tráng Miệng */}
            {menuItem.category === 'dessert' && (
              <div>
                <Label htmlFor="flavor_type">Hương Vị</Label>
                <Select value={menuItem.flavor_type} onValueChange={(value) => setMenuItem({ ...menuItem, flavor_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn hương vị" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savory">Mặn</SelectItem>
                    <SelectItem value="sweet">Ngọt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Thuộc tính cho Đồ Uống */}
            {menuItem.category === 'drink' && (
              <div>
                <Label htmlFor="drink_type">Loại Đồ Uống</Label>
                <Select value={menuItem.drink_type} onValueChange={(value) => setMenuItem({ ...menuItem, drink_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại đồ uống" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="water">Nước</SelectItem>
                    <SelectItem value="soda">Nước Ngọt</SelectItem>
                    <SelectItem value="juice">Nước Ép</SelectItem>
                    <SelectItem value="coffee">Cà Phê</SelectItem>
                    <SelectItem value="tea">Trà</SelectItem>
                    <SelectItem value="alcohol">Đồ Uống Có Cồn</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="available"
                checked={menuItem.is_available}
                onCheckedChange={(checked) => setMenuItem({ ...menuItem, is_available: checked })}
              />
              <Label htmlFor="available">Còn hàng</Label>
            </div>

            {ingredients.length > 0 && (
              <div>
                <Label className="mb-2 block">Nguyên Liệu Sử Dụng</Label>
                <div className="space-y-2">
                  {ingredients.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.ingredients?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Cần: {item.quantity_needed} {item.ingredients?.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          Tồn: {item.ingredients?.current_stock} {item.ingredients?.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Min: {item.ingredients?.min_stock} {item.ingredients?.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
              >
                Xóa Món
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
            <AlertDialogTitle>Xác nhận xóa món ăn</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa món ăn này? Hành động này không thể hoàn tác.
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
