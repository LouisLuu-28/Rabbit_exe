import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState("new");
  const [ingredients, setIngredients] = useState<any[]>([]);
  
  // Form data for new ingredient
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "rau_cu",
    unit: "kg",
    current_stock: "",
    min_stock: "",
    cost_per_unit: "",
    last_purchase_date: "",
    manufacture_date: "",
    expiration_date: "",
    supplier_info: "",
  });

  // Form data for restocking
  const [restockData, setRestockData] = useState({
    ingredient_id: "",
    quantity_to_add: "",
    cost_per_unit: "",
    purchase_date: new Date().toISOString().split('T')[0],
    manufacture_date: "",
    expiration_date: "",
    notes: "",
  });

  // Fetch existing ingredients for restock dropdown
  useEffect(() => {
    if (open && activeTab === "restock") {
      fetchIngredients();
    }
  }, [open, activeTab]);

  const fetchIngredients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (data) {
      setIngredients(data);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
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
      resetForms();
    }
    setLoading(false);
  };

  const handleSubmitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const selectedIngredient = ingredients.find(i => i.id === restockData.ingredient_id);
    if (!selectedIngredient) {
      setLoading(false);
      return;
    }

    const quantityToAdd = parseFloat(restockData.quantity_to_add) || 0;
    const newCostPerUnit = parseFloat(restockData.cost_per_unit) || selectedIngredient.cost_per_unit;
    
    // Calculate weighted average cost if new cost is provided
    const currentTotalValue = selectedIngredient.current_stock * selectedIngredient.cost_per_unit;
    const newTotalValue = quantityToAdd * newCostPerUnit;
    const newTotalQuantity = selectedIngredient.current_stock + quantityToAdd;
    const averageCost = newTotalQuantity > 0 ? (currentTotalValue + newTotalValue) / newTotalQuantity : newCostPerUnit;

    // Update ingredient with new stock and average cost
    const { error: updateError } = await supabase
      .from("ingredients")
      .update({
        current_stock: newTotalQuantity,
        cost_per_unit: averageCost,
        last_purchase_date: restockData.purchase_date,
      })
      .eq("id", restockData.ingredient_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      toast({
        title: "Lỗi",
        description: `Không thể bổ sung nguyên liệu: ${updateError.message}`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Log the restock transaction
    const { error: logError } = await supabase.from("inventory_logs").insert({
      user_id: user.id,
      ingredient_id: restockData.ingredient_id,
      transaction_type: 'restock',
      quantity: quantityToAdd,
      unit: selectedIngredient.unit,
      cost_per_unit: newCostPerUnit,
      reference: 'Bổ sung kho',
      notes: restockData.notes || null,
    });

    if (logError) {
      console.error("Log error:", logError);
      // Still show success for update even if log fails
      toast({
        title: "Cảnh báo",
        description: "Đã cập nhật kho nhưng không ghi được lịch sử",
      });
    } else {
      toast({
        title: "Thành công",
        description: `Đã bổ sung ${quantityToAdd} ${selectedIngredient.unit} vào kho`,
      });
    }
    
    onSuccess();
    onOpenChange(false);
    resetForms();
    setLoading(false);
  };

  const resetForms = () => {
    setFormData({
      code: "",
      name: "",
      category: "rau_cu",
      unit: "kg",
      current_stock: "",
      min_stock: "",
      cost_per_unit: "",
      last_purchase_date: "",
      manufacture_date: "",
      expiration_date: "",
      supplier_info: "",
    });
    setRestockData({
      ingredient_id: "",
      quantity_to_add: "",
      cost_per_unit: "",
      purchase_date: new Date().toISOString().split('T')[0],
      manufacture_date: "",
      expiration_date: "",
      notes: "",
    });
    setActiveTab("new");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quản Lý Nguyên Liệu</DialogTitle>
          <DialogDescription>Thêm mới hoặc bổ sung nguyên liệu vào kho</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Thêm Nguyên Liệu Mới</TabsTrigger>
            <TabsTrigger value="restock">Bổ Sung Nguyên Liệu Đang Có</TabsTrigger>
          </TabsList>

          {/* Tab 1: Add New Ingredient */}
          <TabsContent value="new">
            <form onSubmit={handleSubmitNew} className="space-y-4">
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
                  <Label htmlFor="last_purchase_date">Ngày Nhập</Label>
                  <Input
                    id="last_purchase_date"
                    type="date"
                    value={formData.last_purchase_date}
                    onChange={(e) => setFormData({ ...formData, last_purchase_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacture_date">Ngày Sản Xuất</Label>
                  <Input
                    id="manufacture_date"
                    type="date"
                    value={formData.manufacture_date}
                    onChange={(e) => setFormData({ ...formData, manufacture_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration_date">Ngày Hết Hạn</Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="supplier_info">Thông Tin Nhà Cung Cấp</Label>
                  <Textarea
                    id="supplier_info"
                    value={formData.supplier_info}
                    onChange={(e) => setFormData({ ...formData, supplier_info: e.target.value })}
                    rows={2}
                    placeholder="Tên nhà cung cấp, số điện thoại..."
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
          </TabsContent>

          {/* Tab 2: Restock Existing Ingredient */}
          <TabsContent value="restock">
            <form onSubmit={handleSubmitRestock} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ingredient_select">Chọn Nguyên Liệu *</Label>
                  <Select 
                    value={restockData.ingredient_id} 
                    onValueChange={(value) => {
                      const selected = ingredients.find(i => i.id === value);
                      setRestockData({ 
                        ...restockData, 
                        ingredient_id: value,
                        cost_per_unit: selected?.cost_per_unit.toString() || ""
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nguyên liệu cần bổ sung" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} - Tồn: {ing.current_stock} {ing.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {restockData.ingredient_id && (() => {
                  const selected = ingredients.find(i => i.id === restockData.ingredient_id);
                  return (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <h4 className="font-medium">Thông Tin Hiện Tại:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-muted-foreground">Tồn kho:</span> <strong>{selected?.current_stock} {selected?.unit}</strong></p>
                        <p><span className="text-muted-foreground">Giá hiện tại:</span> <strong>{selected?.cost_per_unit.toLocaleString()}₫</strong></p>
                        {selected?.last_purchase_date && (
                          <p><span className="text-muted-foreground">Nhập lần cuối:</span> {new Date(selected.last_purchase_date).toLocaleDateString('vi-VN')}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity_to_add">Số Lượng Bổ Sung *</Label>
                    <Input
                      id="quantity_to_add"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={restockData.quantity_to_add}
                      onChange={(e) => setRestockData({ ...restockData, quantity_to_add: e.target.value })}
                      placeholder="Nhập số lượng cần thêm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="restock_cost">Giá Nhập Lô Mới (₫)</Label>
                    <Input
                      id="restock_cost"
                      type="number"
                      min="0"
                      step="100"
                      value={restockData.cost_per_unit}
                      onChange={(e) => setRestockData({ ...restockData, cost_per_unit: e.target.value })}
                      placeholder="Giá trung bình sẽ được tính"
                    />
                    <p className="text-xs text-muted-foreground">Để trống nếu giữ nguyên giá cũ</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchase_date">Ngày Nhập *</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={restockData.purchase_date}
                      onChange={(e) => setRestockData({ ...restockData, purchase_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="restock_manufacture">Ngày Sản Xuất (Lô Mới)</Label>
                    <Input
                      id="restock_manufacture"
                      type="date"
                      value={restockData.manufacture_date}
                      onChange={(e) => setRestockData({ ...restockData, manufacture_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="restock_expiration">Ngày Hết Hạn (Lô Mới)</Label>
                    <Input
                      id="restock_expiration"
                      type="date"
                      value={restockData.expiration_date}
                      onChange={(e) => setRestockData({ ...restockData, expiration_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Ghi Chú</Label>
                  <Textarea
                    id="notes"
                    value={restockData.notes}
                    onChange={(e) => setRestockData({ ...restockData, notes: e.target.value })}
                    rows={2}
                    placeholder="Thông tin về lô hàng mới..."
                  />
                </div>

                {restockData.ingredient_id && restockData.quantity_to_add && (() => {
                  const selected = ingredients.find(i => i.id === restockData.ingredient_id);
                  const quantityToAdd = parseFloat(restockData.quantity_to_add) || 0;
                  const newCost = parseFloat(restockData.cost_per_unit) || selected?.cost_per_unit || 0;
                  const currentValue = (selected?.current_stock || 0) * (selected?.cost_per_unit || 0);
                  const newValue = quantityToAdd * newCost;
                  const totalQuantity = (selected?.current_stock || 0) + quantityToAdd;
                  const avgCost = totalQuantity > 0 ? (currentValue + newValue) / totalQuantity : newCost;

                  return (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                      <h4 className="font-medium text-primary">Sau Khi Bổ Sung:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-muted-foreground">Tổng tồn kho:</span> <strong>{totalQuantity.toFixed(2)} {selected?.unit}</strong></p>
                        <p><span className="text-muted-foreground">Giá trung bình:</span> <strong>{avgCost.toLocaleString()}₫</strong></p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={loading || !restockData.ingredient_id}>
                  {loading ? "Đang lưu..." : "Bổ Sung Nguyên Liệu"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
