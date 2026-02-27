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
import { Plus, Trash2, ImagePlus } from "lucide-react";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Lỗi", description: "Hình ảnh không được vượt quá 5MB", variant: "destructive" });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (userId: string, menuItemId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split('.').pop();
    const filePath = `${userId}/${menuItemId}.${ext}`;
    const { error } = await supabase.storage.from('menu-images').upload(filePath, imageFile, { upsert: true });
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(filePath);
    return publicUrl;
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

    // Upload image if provided
    if (imageFile) {
      const imageUrl = await uploadImage(user.id, menuItem.id);
      if (imageUrl) {
        await supabase.from("menu_items").update({ image_url: imageUrl } as any).eq("id", menuItem.id);
      }
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
    setIngredientLinks([]);
    setImageFile(null);
    setImagePreview(null);
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
            <div className="space-y-2">
              <Label htmlFor="code">Mã Món *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="VD: TD-001"
                required
              />
            </div>

            <div className="space-y-2">
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

            {/* Thuộc tính cho Món Chính */}
            {formData.category === 'main' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dish_style">Kiểu Món</Label>
                  <Select value={formData.dish_style} onValueChange={(value) => setFormData({ ...formData, dish_style: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kiểu món" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="noodle">Món Nước</SelectItem>
                      <SelectItem value="dry">Món Khô</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dish_type">Loại Món</Label>
                  <Select value={formData.dish_type} onValueChange={(value) => setFormData({ ...formData, dish_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại món" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vegetarian">Món Chay</SelectItem>
                      <SelectItem value="meat">Món Mặn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Thuộc tính cho Món Phụ */}
            {formData.category === 'side' && (
              <div className="space-y-2">
                <Label htmlFor="flavor_type">Hương Vị</Label>
                <Select value={formData.flavor_type} onValueChange={(value) => setFormData({ ...formData, flavor_type: value })}>
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
            {formData.category === 'dessert' && (
              <div className="space-y-2">
                <Label htmlFor="flavor_type">Hương Vị</Label>
                <Select value={formData.flavor_type} onValueChange={(value) => setFormData({ ...formData, flavor_type: value })}>
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
            {formData.category === 'drink' && (
              <div className="space-y-2">
                <Label htmlFor="drink_type">Loại Đồ Uống</Label>
                <Select value={formData.drink_type} onValueChange={(value) => setFormData({ ...formData, drink_type: value })}>
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
              <Label>Hình Ảnh Món Ăn</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Thêm ảnh</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
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
