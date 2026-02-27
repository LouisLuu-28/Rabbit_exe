import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Eye } from "lucide-react";
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
  image_url?: string;
  dish_style?: string;
  dish_type?: string;
  flavor_type?: string;
  drink_type?: string;
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
        <Card data-tutorial="menu-list">
          <CardContent className="pt-6">
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Ảnh</TableHead>
                  <TableHead>Mã Món</TableHead>
                  <TableHead>Tên Món</TableHead>
                  <TableHead>Danh Mục</TableHead>
                  <TableHead>Thuộc Tính</TableHead>
                  <TableHead className="text-right">Giá Bán</TableHead>
                  <TableHead className="text-center">Trạng Thái</TableHead>
                  <TableHead className="text-center">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMenuItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-lg">
                          🍽️
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.code || "-"}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {/* Hiển thị thuộc tính theo danh mục */}
                        {item.category === 'main' && item.dish_style && (
                          <Badge variant="secondary" className="text-xs">
                            {item.dish_style === 'noodle' ? 'Món nước' : 'Món khô'}
                          </Badge>
                        )}
                        {item.category === 'main' && item.dish_type && (
                          <Badge variant="secondary" className="text-xs">
                            {item.dish_type === 'vegetarian' ? 'Món chay' : 'Món mặn'}
                          </Badge>
                        )}
                        {(item.category === 'side' || item.category === 'dessert') && item.flavor_type && (
                          <Badge variant="secondary" className="text-xs">
                            {item.flavor_type === 'sweet' ? 'Ngọt' : 'Mặn'}
                          </Badge>
                        )}
                        {item.category === 'drink' && item.drink_type && (
                          <Badge variant="secondary" className="text-xs">
                            {item.drink_type === 'water' ? 'Nước' : 
                             item.drink_type === 'soda' ? 'Nước ngọt' :
                             item.drink_type === 'juice' ? 'Nước ép' :
                             item.drink_type === 'coffee' ? 'Cà phê' :
                             item.drink_type === 'tea' ? 'Trà' :
                             item.drink_type === 'alcohol' ? 'Đồ uống có cồn' : 'Khác'}
                          </Badge>
                        )}
                        {!item.dish_style && !item.dish_type && !item.flavor_type && !item.drink_type && (
                          <span className="text-xs text-muted-foreground">Chưa phân loại</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.price.toLocaleString()}₫
                    </TableCell>
                    <TableCell className="text-center">
                      {item.is_available ? (
                        <Badge variant="default">Còn hàng</Badge>
                      ) : (
                        <Badge variant="destructive">Hết hàng</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedMenuItemId(item.id);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
