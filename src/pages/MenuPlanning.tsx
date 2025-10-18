import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays } from "lucide-react";
import { AddMenuItemDialog } from "@/components/menu/AddMenuItemDialog";
import { EditMenuItemDialog } from "@/components/menu/EditMenuItemDialog";

interface MenuItem {
  id: string;
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
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);

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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Danh Sách Món Ăn</h1>
          <p className="text-muted-foreground">Quản lý tất cả món ăn trong thực đơn</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Thêm Món
        </Button>
      </div>

      {menuItems.length === 0 ? (
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
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
