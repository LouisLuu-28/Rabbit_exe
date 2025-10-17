import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package } from "lucide-react";

const Inventory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

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
        <Button className="gap-2">
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
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Loại nguyên liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sắp Hết Hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">0</div>
            <p className="text-xs text-muted-foreground mt-1">Cần chú ý</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cần Mua</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">0</div>
            <p className="text-xs text-muted-foreground mt-1">Mục trong danh sách</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Nguyên Liệu</CardTitle>
          <CardDescription>Tất cả nguyên liệu trong kho</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có nguyên liệu nào</p>
            <p className="text-sm mt-2">Nhấn "Thêm Nguyên Liệu" để bắt đầu quản lý kho</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
