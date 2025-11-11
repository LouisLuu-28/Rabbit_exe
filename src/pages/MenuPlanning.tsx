import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload } from "lucide-react";
import { AddMenuItemDialog } from "@/components/menu/AddMenuItemDialog";
import { EditMenuItemDialog } from "@/components/menu/EditMenuItemDialog";
import { ImportMenuItemsDialog } from "@/components/menu/ImportMenuItemsDialog";

interface MenuItem {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
}

const MenuPlanning = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
        fetchMenuItems();
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchMenuItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (!error && data) {
      setMenuItems(data);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      main: "Món Chính",
      side: "Món Phụ",
      drink: "Đồ Uống",
      dessert: "Tráng Miệng",
    };
    return labels[category] || category;
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch =
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Danh Sách Món Ăn</h1>
          <p className="text-muted-foreground">Quản lý tất cả món ăn trong thực đơn</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Nhập Excel
          </Button>
          <Button className="gap-2" onClick={() => setDialogOpen(true)} data-tutorial="add-menu-item">
            <Plus className="h-4 w-4" />
            Thêm Món
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã hoặc tên món..."
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
            <SelectItem value="main">Món Chính</SelectItem>
            <SelectItem value="side">Món Phụ</SelectItem>
            <SelectItem value="drink">Đồ Uống</SelectItem>
            <SelectItem value="dessert">Tráng Miệng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredMenuItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-6xl mb-4">🍽️</div>
              <p>Chưa có món nào trong thực đơn</p>
              <p className="text-sm mt-2">Nhấn "Thêm Món" để bắt đầu</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-tutorial="menu-list">
          {filteredMenuItems.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-mono text-muted-foreground mb-1">{item.code || "-"}</div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </div>
                  {item.is_available ? (
                    <Badge variant="default">Còn hàng</Badge>
                  ) : (
                    <Badge variant="destructive">Hết hàng</Badge>
                  )}
                </div>
                <CardDescription>
                  <Badge variant="outline" className="mt-1">
                    {getCategoryLabel(item.category)}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {item.description || "Không có mô tả"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    {item.price.toLocaleString()}₫
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedMenuItemId(item.id);
                      setEditDialogOpen(true);
                    }}
                  >
                    Chỉnh sửa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMenuItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchMenuItems}
      />
      
      <ImportMenuItemsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchMenuItems}
      />
      
      <EditMenuItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        menuItemId={selectedMenuItemId}
        onSuccess={fetchMenuItems}
      />
    </div>
  );
};

export default MenuPlanning;
