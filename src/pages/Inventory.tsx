import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { AddIngredientDialog } from "@/components/inventory/AddIngredientDialog";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
}

const Inventory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
        fetchIngredients();
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchIngredients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (!error && data) {
      setIngredients(data);
    }
  };

  const lowStockCount = ingredients.filter(i => i.current_stock <= i.min_stock).length;
  const outOfStockCount = ingredients.filter(i => i.current_stock === 0).length;
  const totalValue = ingredients.reduce((sum, i) => sum + (i.current_stock * i.cost_per_unit), 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Kho Nguyên Liệu</h1>
          <p className="text-muted-foreground">Quản lý và theo dõi tồn kho nguyên liệu</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Thêm Nguyên Liệu
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tổng Nguyên Liệu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ingredients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Loại nguyên liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sắp Hết Hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Cần chú ý</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Hết Hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Cần mua gấp</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Nguyên Liệu</CardTitle>
          <CardDescription>
            Tất cả nguyên liệu trong kho - Tổng giá trị: {totalValue.toLocaleString()}₫
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có nguyên liệu nào</p>
              <p className="text-sm mt-2">Nhấn "Thêm Nguyên Liệu" để bắt đầu quản lý kho</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên Nguyên Liệu</TableHead>
                  <TableHead>Tồn Kho</TableHead>
                  <TableHead>Ngưỡng Tối Thiểu</TableHead>
                  <TableHead>Giá / Đơn Vị</TableHead>
                  <TableHead>Tổng Giá Trị</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map((ingredient) => {
                  const isLowStock = ingredient.current_stock <= ingredient.min_stock;
                  const isOutOfStock = ingredient.current_stock === 0;
                  return (
                    <TableRow key={ingredient.id}>
                      <TableCell className="font-medium">{ingredient.name}</TableCell>
                      <TableCell>
                        {ingredient.current_stock} {ingredient.unit}
                      </TableCell>
                      <TableCell>
                        {ingredient.min_stock} {ingredient.unit}
                      </TableCell>
                      <TableCell>{ingredient.cost_per_unit.toLocaleString()}₫</TableCell>
                      <TableCell className="font-semibold">
                        {(ingredient.current_stock * ingredient.cost_per_unit).toLocaleString()}₫
                      </TableCell>
                      <TableCell>
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Hết hàng
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="gap-1 border-warning text-warning">
                            <AlertTriangle className="h-3 w-3" />
                            Sắp hết
                          </Badge>
                        ) : (
                          <Badge variant="default">Đủ hàng</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddIngredientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchIngredients}
      />
    </div>
  );
};

export default Inventory;
