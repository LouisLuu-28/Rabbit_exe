import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, AlertTriangle, Pencil, Search } from "lucide-react";
import { AddIngredientDialog } from "@/components/inventory/AddIngredientDialog";
import { EditIngredientDialog } from "@/components/inventory/EditIngredientDialog";

interface Ingredient {
  id: string;
  code: string;
  name: string;
  category: string;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      rau_cu: "Rau Củ",
      thit: "Thịt",
      ca: "Cá & Hải Sản",
      gia_vi: "Gia Vị",
      bot: "Bột",
      dau: "Dầu Ăn",
      do_kho: "Đồ Khô",
      khac: "Khác",
    };
    return labels[category] || category;
  };

  const filteredIngredients = ingredients.filter((ingredient) => {
    const matchesSearch =
      ingredient.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || ingredient.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
        <Button className="gap-2" onClick={() => setDialogOpen(true)} data-tutorial="add-ingredient">
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
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã hoặc tên nguyên liệu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Lọc theo danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
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
        </CardHeader>
        <CardContent data-tutorial="ingredient-list">
          {filteredIngredients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có nguyên liệu nào</p>
              <p className="text-sm mt-2">Nhấn "Thêm Nguyên Liệu" để bắt đầu quản lý kho</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã NL</TableHead>
                  <TableHead>Tên Nguyên Liệu</TableHead>
                  <TableHead>Danh Mục</TableHead>
                  <TableHead>Tồn Kho</TableHead>
                  <TableHead>Ngưỡng Tối Thiểu</TableHead>
                  <TableHead>Giá / Đơn Vị</TableHead>
                  <TableHead>Tổng Giá Trị</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead>Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map((ingredient) => {
                  const isLowStock = ingredient.current_stock <= ingredient.min_stock;
                  const isOutOfStock = ingredient.current_stock === 0;
                  return (
                    <TableRow key={ingredient.id}>
                      <TableCell className="font-mono text-sm">{ingredient.code || "-"}</TableCell>
                      <TableCell className="font-medium">{ingredient.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryLabel(ingredient.category)}</Badge>
                      </TableCell>
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
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedIngredientId(ingredient.id);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
      
      <EditIngredientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        ingredientId={selectedIngredientId}
        onSuccess={fetchIngredients}
      />
    </div>
  );
};

export default Inventory;
