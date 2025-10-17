import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface IngredientLink {
  ingredient_id: string;
  quantity_needed: number;
}

interface AddMenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddMenuItemDialog({ open, onOpenChange, onSuccess }: AddMenuItemDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "main",
    is_available: true,
  });
  const [ingredientLinks, setIngredientLinks] = useState<IngredientLink[]>([]);

  useEffect(() => {
    if (open) {
      fetchIngredients();
    }
  }, [open]);

  const fetchIngredients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("ingredients")
      .select("id, name, unit")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách nguyên liệu",
        variant: "destructive",
      });
    } else {
      setIngredients(data || []);
    }
  };

  const addIngredientLink = () => {
    if (ingredients.length === 0) {
      toast({
        title: "Chưa có nguyên liệu",
        description: "Vui lòng thêm nguyên liệu vào kho trước",
        variant: "destructive",
      });
      return;
    }
    setIngredientLinks([...ingredientLinks, { ingredient_id: ingredients[0].id, quantity_needed: 0 }]);
  };

  const removeIngredientLink = (index: number) => {
    setIngredientLinks(ingredientLinks.filter((_, i) => i !== index));
  };

  const updateIngredientLink = (index: number, field: keyof IngredientLink, value: string | number) => {
    const newLinks = [...ingredientLinks];
    if (field === "ingredient_id" && typeof value === "string") {
      newLinks[index].ingredient_id = value;
    } else if (field === "quantity_needed" && typeof value === "number") {
      newLinks[index].quantity_needed = value;
    }
    setIngredientLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create menu item
    const { data: menuItem, error: menuError } = await supabase
      .from("menu_items")
      .insert({
        ...formData,
        price: parseFloat(formData.price) || 0,
        user_id: user.id,
      })
      .select()
      .single();

    if (menuError) {
      toast({
        title: "Lỗi",
        description: "Không thể thêm món",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Create ingredient links if any
    if (ingredientLinks.length > 0) {
      const linksData = ingredientLinks.map(link => ({
        menu_item_id: menuItem.id,
        ingredient_id: link.ingredient_id,
        quantity_needed: link.quantity_needed,
      }));

      const { error: linksError } = await supabase
        .from("menu_item_ingredients")
        .insert(linksData);

      if (linksError) {
        toast({
          title: "Cảnh báo",
          description: "Món đã được thêm nhưng không thể liên kết nguyên liệu",
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Thành công",
      description: "Đã thêm món mới",
    });

    onSuccess();
    onOpenChange(false);
    // Reset form
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "main",
      is_available: true,
    });
    setIngredientLinks([]);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm Món Mới</DialogTitle>
          <DialogDescription>Nhập thông tin món ăn và liên kết nguyên liệu</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Tên Món *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Danh Mục</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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

            <div className="space-y-2">
              <Label htmlFor="price">Giá Bán (₫) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Mô Tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 col-span-2">
              <Switch
                id="is_available"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
              />
              <Label htmlFor="is_available" className="cursor-pointer">Còn hàng</Label>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Nguyên Liệu Sử Dụng</Label>
              <Button type="button" onClick={addIngredientLink} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm Nguyên Liệu
              </Button>
            </div>

            <div className="space-y-2">
              {ingredientLinks.map((link, index) => {
                const ingredient = ingredients.find(i => i.id === link.ingredient_id);
                return (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Nguyên Liệu</Label>
                      <Select
                        value={link.ingredient_id}
                        onValueChange={(value) => updateIngredientLink(index, "ingredient_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-40">
                      <Label>Số Lượng ({ingredient?.unit})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={link.quantity_needed}
                        onChange={(e) => updateIngredientLink(index, "quantity_needed", parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeIngredientLink(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Thêm Món"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
