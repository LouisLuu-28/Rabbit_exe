import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface SupplierStats {
  supplierName: string;
  ingredientCount: number;
  totalValue: number;
  ingredients: string[];
}

export const PreferredSuppliers = () => {
  const [supplierStats, setSupplierStats] = useState<SupplierStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupplierStats();
  }, []);

  const fetchSupplierStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("name, supplier_info, current_stock, cost_per_unit")
      .eq("user_id", user.id);

    if (!ingredients) {
      setLoading(false);
      return;
    }

    // Group ingredients by supplier
    const supplierMap = new Map<string, {
      ingredients: string[];
      totalValue: number;
    }>();

    ingredients.forEach(ingredient => {
      const supplier = ingredient.supplier_info?.trim() || "Chưa có nhà cung cấp";
      const value = Number(ingredient.current_stock) * Number(ingredient.cost_per_unit);
      
      if (!supplierMap.has(supplier)) {
        supplierMap.set(supplier, {
          ingredients: [],
          totalValue: 0
        });
      }
      
      const supplierData = supplierMap.get(supplier)!;
      supplierData.ingredients.push(ingredient.name);
      supplierData.totalValue += value;
    });

    // Convert to array and calculate stats
    const stats: SupplierStats[] = Array.from(supplierMap.entries()).map(([name, data]) => ({
      supplierName: name,
      ingredientCount: data.ingredients.length,
      totalValue: data.totalValue,
      ingredients: data.ingredients
    }));

    // Sort by total value (descending)
    stats.sort((a, b) => b.totalValue - a.totalValue);

    setSupplierStats(stats);
    setLoading(false);
  };

  const getSupplierBadge = (ingredientCount: number, totalValue: number) => {
    if (totalValue >= 10000000) {
      return <Badge className="bg-warning text-warning-foreground">Nhà Cung Cấp Vàng</Badge>;
    } else if (totalValue >= 5000000 || ingredientCount >= 5) {
      return <Badge variant="default">Đối Tác Chính</Badge>;
    } else if (ingredientCount >= 2) {
      return <Badge variant="secondary">Đối Tác Thường Xuyên</Badge>;
    }
    return <Badge variant="outline">Đối Tác</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nhà Cung Cấp Ưa Thích
          </CardTitle>
          <CardDescription>Thống kê nhà cung cấp nguyên liệu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Nhà Cung Cấp Ưa Thích
        </CardTitle>
        <CardDescription>
          Tổng {supplierStats.length} nhà cung cấp
        </CardDescription>
      </CardHeader>
      <CardContent>
        {supplierStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Chưa có dữ liệu nhà cung cấp
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {supplierStats.map((supplier, index) => (
              <div 
                key={index} 
                className="flex justify-between items-start p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium">{supplier.supplierName}</p>
                    {getSupplierBadge(supplier.ingredientCount, supplier.totalValue)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {supplier.ingredientCount} loại nguyên liệu
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {supplier.ingredients.slice(0, 3).map((ing, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {ing}
                      </Badge>
                    ))}
                    {supplier.ingredients.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{supplier.ingredients.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-primary">
                    {supplier.totalValue.toLocaleString()}₫
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tổng giá trị tồn kho
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};