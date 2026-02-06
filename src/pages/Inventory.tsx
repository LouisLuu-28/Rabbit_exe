import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, AlertTriangle, Pencil, Search, TrendingDown, DollarSign, History, ArrowUpDown, Upload, Eye } from "lucide-react";
import { AddIngredientDialog } from "@/components/inventory/AddIngredientDialog";
import { EditIngredientDialog } from "@/components/inventory/EditIngredientDialog";
import { ImportIngredientsDialog } from "@/components/inventory/ImportIngredientsDialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Ingredient {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  manufacture_date?: string;
  expiration_date?: string;
  supplier_info?: string;
  created_at?: string;
  last_purchase_date?: string;
}

interface InventoryMovement {
  date: string;
  ingredient_name: string;
  type: 'import' | 'export' | 'restock';
  quantity: number;
  unit: string;
  reference: string;
  cost?: number;
}

const Inventory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewDialogData, setViewDialogData] = useState<{title: string, items: Ingredient[]}>({title: "", items: []});
  
  // Pagination and sorting states
  const [slowMovingPage, setSlowMovingPage] = useState(1);
  const [slowMovingSortBy, setSlowMovingSortBy] = useState<'days' | 'quantity' | 'value'>('days');
  const [slowMovingSortOrder, setSlowMovingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [historyPage, setHistoryPage] = useState(1);
  const [historySortBy, setHistorySortBy] = useState<'date' | 'quantity'>('date');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 5;

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
      await fetchInventoryMovements(user.id, data);
    }
  };

  const fetchInventoryMovements = async (userId: string, ingredientsList: Ingredient[]) => {
    const movements: InventoryMovement[] = [];
    
    // Fetch all logs from inventory_logs table
    const { data: logs } = await supabase
      .from("inventory_logs")
      .select(`
        id,
        transaction_type,
        quantity,
        unit,
        cost_per_unit,
        reference,
        notes,
        created_at,
        ingredients!inner(name)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (logs) {
      for (const log of logs) {
        movements.push({
          date: log.created_at,
          ingredient_name: (log.ingredients as any).name,
          type: log.transaction_type as 'import' | 'export' | 'restock',
          quantity: log.quantity,
          unit: log.unit,
          cost: log.cost_per_unit,
          reference: log.reference || ''
        });
      }
    }

    // Fetch exports from orders (for backward compatibility)
    const { data: orders } = await supabase
      .from("orders")
      .select(`
        id,
        code,
        order_date,
        order_items (
          quantity,
          menu_item_id
        )
      `)
      .eq("user_id", userId)
      .order("order_date", { ascending: false })
      .limit(50);

    if (orders) {
      for (const order of orders) {
        if (order.order_items) {
          for (const item of order.order_items as any[]) {
            const { data: menuItemIngredients } = await supabase
              .from("menu_item_ingredients")
              .select(`
                quantity_needed,
                ingredient_id,
                menu_items!inner(name)
              `)
              .eq("menu_item_id", item.menu_item_id);

            if (menuItemIngredients) {
              for (const mii of menuItemIngredients) {
                const ingredient = ingredientsList.find(i => i.id === mii.ingredient_id);
                if (ingredient) {
                  movements.push({
                    date: order.order_date,
                    ingredient_name: ingredient.name,
                    type: 'export',
                    quantity: mii.quantity_needed * item.quantity,
                    unit: ingredient.unit,
                    reference: `Đơn ${order.code}`
                  });
                }
              }
            }
          }
        }
      }
    }

    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setInventoryMovements(movements.slice(0, 20));
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
  
  // Calculate ingredients about to expire (within 7 days)
  const expiringIngredients = ingredients.filter(ingredient => {
    if (!ingredient.expiration_date) return false;
    const expirationDate = new Date(ingredient.expiration_date);
    const today = new Date();
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration >= 0 && daysUntilExpiration <= 7;
  });
  
  // Calculate slow-moving inventory (over 10 days old)
  const slowMovingIngredients = ingredients.filter(ingredient => {
    const purchaseDate = ingredient.last_purchase_date 
      ? new Date(ingredient.last_purchase_date) 
      : ingredient.created_at 
        ? new Date(ingredient.created_at)
        : null;
    
    if (!purchaseDate) return false;
    
    const daysSincePurchase = Math.floor(
      (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSincePurchase > 10 && ingredient.current_stock > 0;
  });

  // Sort and paginate slow-moving ingredients
  const sortedSlowMoving = [...slowMovingIngredients].sort((a, b) => {
    const getPurchaseDate = (ing: Ingredient) => 
      ing.last_purchase_date ? new Date(ing.last_purchase_date) : new Date(ing.created_at!);
    
    if (slowMovingSortBy === 'days') {
      const daysA = Math.floor((new Date().getTime() - getPurchaseDate(a).getTime()) / (1000 * 60 * 60 * 24));
      const daysB = Math.floor((new Date().getTime() - getPurchaseDate(b).getTime()) / (1000 * 60 * 60 * 24));
      return slowMovingSortOrder === 'asc' ? daysA - daysB : daysB - daysA;
    } else if (slowMovingSortBy === 'quantity') {
      return slowMovingSortOrder === 'asc' ? a.current_stock - b.current_stock : b.current_stock - a.current_stock;
    } else {
      const valueA = a.current_stock * a.cost_per_unit;
      const valueB = b.current_stock * b.cost_per_unit;
      return slowMovingSortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    }
  });
  
  const totalSlowMovingPages = Math.ceil(sortedSlowMoving.length / itemsPerPage);
  const paginatedSlowMoving = sortedSlowMoving.slice(
    (slowMovingPage - 1) * itemsPerPage,
    slowMovingPage * itemsPerPage
  );

  // Sort and paginate inventory movements
  const sortedMovements = [...inventoryMovements].sort((a, b) => {
    if (historySortBy === 'date') {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return historySortOrder === 'asc' ? diff : -diff;
    } else {
      return historySortOrder === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
    }
  });
  
  const totalHistoryPages = Math.ceil(sortedMovements.length / itemsPerPage);
  const paginatedMovements = sortedMovements.slice(
    (historyPage - 1) * itemsPerPage,
    historyPage * itemsPerPage
  );

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
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Nhập Excel
          </Button>
          <Button className="gap-2" onClick={() => setDialogOpen(true)} data-tutorial="add-ingredient">
            <Plus className="h-4 w-4" />
            Thêm Nguyên Liệu
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tổng Nguyên Liệu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ingredients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Loại nguyên liệu</p>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {/* <AlertTriangle className="h-4 w-4" /> */}
              Nguyên liệu sắp hết hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{expiringIngredients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Trong vòng 7 ngày</p>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute bottom-2 right-2 h-6 w-6"
              onClick={() => {
                setViewDialogData({title: "Nguyên liệu sắp hết hạn", items: expiringIngredients});
                setViewDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sắp Hết Hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Cần chú ý</p>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute bottom-2 right-2 h-6 w-6"
              onClick={() => {
                const lowStockItems = ingredients.filter(i => i.current_stock <= i.min_stock && i.current_stock > 0);
                setViewDialogData({title: "Sắp Hết Hàng", items: lowStockItems});
                setViewDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Hết Hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Cần mua gấp</p>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute bottom-2 right-2 h-6 w-6"
              onClick={() => {
                const outOfStockItems = ingredients.filter(i => i.current_stock === 0);
                setViewDialogData({title: "Hết Hàng", items: outOfStockItems});
                setViewDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Hàng Tồn Chậm Luân Chuyển
            </CardTitle>
            <CardDescription>
              Nguyên liệu tồn kho trên 10 ngày
            </CardDescription>
            <div className="flex gap-2 mt-4">
              <Button
                variant={slowMovingSortBy === 'days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (slowMovingSortBy === 'days') {
                    setSlowMovingSortOrder(slowMovingSortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSlowMovingSortBy('days');
                    setSlowMovingSortOrder('desc');
                  }
                  setSlowMovingPage(1);
                }}
              >
                Số Ngày <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant={slowMovingSortBy === 'quantity' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (slowMovingSortBy === 'quantity') {
                    setSlowMovingSortOrder(slowMovingSortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSlowMovingSortBy('quantity');
                    setSlowMovingSortOrder('desc');
                  }
                  setSlowMovingPage(1);
                }}
              >
                Số Lượng <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant={slowMovingSortBy === 'value' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (slowMovingSortBy === 'value') {
                    setSlowMovingSortOrder(slowMovingSortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSlowMovingSortBy('value');
                    setSlowMovingSortOrder('desc');
                  }
                  setSlowMovingPage(1);
                }}
              >
                Giá Trị <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {slowMovingIngredients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Không có hàng tồn chậm</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên NL</TableHead>
                      <TableHead>Tồn Kho</TableHead>
                      <TableHead>Giá Trị</TableHead>
                      <TableHead>Số Ngày Tồn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSlowMoving.map((ingredient) => {
                      const purchaseDate = ingredient.last_purchase_date 
                        ? new Date(ingredient.last_purchase_date) 
                        : new Date(ingredient.created_at!);
                      const daysSincePurchase = Math.floor(
                        (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const value = ingredient.current_stock * ingredient.cost_per_unit;
                      
                      return (
                        <TableRow key={ingredient.id}>
                          <TableCell className="font-medium">{ingredient.name}</TableCell>
                          <TableCell>{ingredient.current_stock} {ingredient.unit}</TableCell>
                          <TableCell>{value.toLocaleString()}₫</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-warning text-warning">
                              {daysSincePurchase} ngày
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {totalSlowMovingPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setSlowMovingPage(Math.max(1, slowMovingPage - 1))}
                          className={slowMovingPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalSlowMovingPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setSlowMovingPage(page)}
                            isActive={page === slowMovingPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setSlowMovingPage(Math.min(totalSlowMovingPages, slowMovingPage + 1))}
                          className={slowMovingPage === totalSlowMovingPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Lịch Sử Nhập Xuất
            </CardTitle>
            <CardDescription>
              Tất cả giao dịch nhập xuất nguyên liệu
            </CardDescription>
            <div className="flex gap-2 mt-4">
              <Button
                variant={historySortBy === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (historySortBy === 'date') {
                    setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setHistorySortBy('date');
                    setHistorySortOrder('desc');
                  }
                  setHistoryPage(1);
                }}
              >
                Ngày <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant={historySortBy === 'quantity' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (historySortBy === 'quantity') {
                    setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setHistorySortBy('quantity');
                    setHistorySortOrder('desc');
                  }
                  setHistoryPage(1);
                }}
              >
                Số Lượng <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {inventoryMovements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Chưa có lịch sử</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Nguyên Liệu</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Số Lượng</TableHead>
                      <TableHead>Tham Chiếu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMovements.map((movement, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {new Date(movement.date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="font-medium">{movement.ingredient_name}</TableCell>
                        <TableCell>
                          <Badge variant={movement.type === 'import' || movement.type === 'restock' ? 'default' : 'secondary'}>
                            {movement.type === 'import' ? 'Nhập' : movement.type === 'restock' ? 'Bổ sung' : 'Xuất'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {movement.quantity} {movement.unit}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {movement.reference}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalHistoryPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                          className={historyPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setHistoryPage(page)}
                            isActive={page === historyPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setHistoryPage(Math.min(totalHistoryPages, historyPage + 1))}
                          className={historyPage === totalHistoryPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
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
                  <TableHead>Giá / Đơn Vị</TableHead>
                  <TableHead>Nhà Cung Cấp</TableHead>
                  <TableHead>Ngày Nhập</TableHead>
                  <TableHead>Hạn Sử Dụng</TableHead>
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
                      <TableCell>{ingredient.cost_per_unit.toLocaleString()}₫</TableCell>
                      <TableCell>
                        <span className="text-sm">{ingredient.supplier_info || <span className="text-muted-foreground">Chưa có</span>}</span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const purchaseDate = ingredient.last_purchase_date ? new Date(ingredient.last_purchase_date) : (ingredient.created_at ? new Date(ingredient.created_at) : null);
                          if (!purchaseDate) return <span className="text-muted-foreground text-sm">Chưa có</span>;
                          
                          const daysSincePurchase = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
                          const isNewStock = daysSincePurchase <= 3;
                          
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">{purchaseDate.toLocaleDateString('vi-VN')}</span>
                              {isNewStock ? (
                                <Badge variant="default" className="text-xs w-fit">mới nhập</Badge>
                              ) : daysSincePurchase > 10 ? (
                                <span className="text-xs text-orange-600 font-medium">{daysSincePurchase} ngày</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">{daysSincePurchase} ngày</span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                       <TableCell>
                         {ingredient.expiration_date ? (
                           (() => {
                             const today = new Date();
                             const expiryDate = new Date(ingredient.expiration_date);
                             const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                             
                             if (daysUntilExpiry < 0) {
                               return <Badge variant="destructive">Đã hết hạn</Badge>;
                             } else if (daysUntilExpiry <= 7) {
                               return <Badge variant="outline" className="border-warning text-warning">Sắp hết hạn ({daysUntilExpiry} ngày)</Badge>;
                             } else {
                               return <span className="text-sm">{new Date(ingredient.expiration_date).toLocaleDateString('vi-VN')}</span>;
                             }
                           })()
                         ) : (
                           <span className="text-muted-foreground text-sm">Chưa có</span>
                         )}
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
      
      <ImportIngredientsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchIngredients}
      />
      
      <EditIngredientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        ingredientId={selectedIngredientId}
        onSuccess={fetchIngredients}
      />

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewDialogData.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {viewDialogData.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có nguyên liệu nào</p>
            ) : (
              <div className="space-y-2">
                {viewDialogData.items.map((item) => {
                  // Calculate days until expiration
                  const getDaysUntilExpiration = () => {
                    if (!item.expiration_date) return null;
                    const today = new Date();
                    const expirationDate = new Date(item.expiration_date);
                    return Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  };

                  const daysUntilExpiry = getDaysUntilExpiration();

                  return (
                    <div key={item.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            {/* Show expiration info for expiring ingredients */}
                            {viewDialogData.title === "Nguyên liệu sắp hết hạn" && daysUntilExpiry !== null && (
                              <p className="text-orange-600 font-medium">
                                {daysUntilExpiry === 0 ? "Hết hạn hôm nay" : 
                                 daysUntilExpiry < 0 ? `Đã hết hạn ${Math.abs(daysUntilExpiry)} ngày trước` :
                                 `Còn ${daysUntilExpiry} ngày`}
                              </p>
                            )}
                            {/* Show stock info for low/out of stock */}
                            {(viewDialogData.title === "Sắp Hết Hàng" || viewDialogData.title === "Hết Hàng") && (
                              <p>
                                <span className={item.current_stock === 0 ? "text-destructive font-medium" : "text-warning font-medium"}>
                                  Tồn kho: {item.current_stock} {item.unit}
                                </span>
                                {item.current_stock > 0 && (
                                  <span className="text-muted-foreground"> / Ngưỡng: {item.min_stock} {item.unit}</span>
                                )}
                              </p>
                            )}
                            <p>Mã: {item.code}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
